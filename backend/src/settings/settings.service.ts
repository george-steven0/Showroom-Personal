import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'
import * as path from 'path'
import { PrismaService } from '../prisma/prisma.service'
import { performBackup, resolveDatabasePath, type BackupKind } from '../common/backup'
import { InvalidBackupFileError, swapDatabaseFile, validateBackupFile } from '../common/restore'
import type { UpdateSettingsDto } from './dto/update-settings.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

const SETTINGS_ID = 'singleton'
// This file lives at src/settings/settings.service.ts, compiled to
// dist/settings/settings.service.js — two levels down from the backend
// root, unlike main.ts (dist/main.js, one level down).
const BACKEND_ROOT = path.resolve(__dirname, '..', '..')

/** The `@@map` table names from schema.prisma — what a real Showroom backup must contain. */
const REQUIRED_TABLES = [
  'users',
  'suppliers',
  'purchase_bills',
  'purchase_bill_lines',
  'selling_bills',
  'expenses',
  'cash_transactions',
  'system_settings',
]

const BACKUP_FILENAME_RE = /^SHP-(backup|pre-reset|pre-restore)-[0-9T-]+Z\.db$/

export interface BackupFileInfo {
  filename: string
  kind: BackupKind
  createdAt: string
  size: number
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async get() {
    return this.prisma.systemSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } })
  }

  async update(dto: UpdateSettingsDto, actor: RequestUser) {
    return this.prisma.systemSettings.update({
      where: { id: SETTINGS_ID },
      data: { ...dto, updatedAt: new Date(), updatedBy: actor.id, updatedByName: actor.fullName },
    })
  }

  private backupDir(): string {
    return path.resolve(BACKEND_ROOT, this.config.get<string>('BACKUP_DIR') || './backups')
  }

  private runBackup(kind: BackupKind) {
    return performBackup(
      this.prisma,
      BACKEND_ROOT,
      this.config.get<string>('DATABASE_URL'),
      this.config.get<string>('BACKUP_DIR'),
      kind,
    )
  }

  async listBackups(): Promise<BackupFileInfo[]> {
    const dir = this.backupDir()
    if (!fs.existsSync(dir)) return []

    return fs
      .readdirSync(dir)
      .filter((filename) => BACKUP_FILENAME_RE.test(filename))
      .map((filename) => {
        const stat = fs.statSync(path.join(dir, filename))
        const kind: BackupKind = filename.startsWith('SHP-pre-reset-')
          ? 'pre-reset'
          : filename.startsWith('SHP-pre-restore-')
            ? 'pre-restore'
            : 'backup'
        return { filename, kind, createdAt: stat.mtime.toISOString(), size: stat.size }
      })
      .sort((a, b) => (a.filename < b.filename ? 1 : -1))
  }

  async createBackup() {
    const result = await this.runBackup('backup')
    return { success: true, filename: result.filename, createdAt: result.createdAt }
  }

  /** Pattern-match first, existence check second — path-traversal defense before `filename` ever becomes a filesystem path. */
  resolveBackupFilePath(filename: string): string {
    if (!BACKUP_FILENAME_RE.test(filename)) {
      throw new BadRequestException('Not a valid backup filename.')
    }
    const filePath = path.join(this.backupDir(), filename)
    if (!fs.existsSync(filePath)) throw new NotFoundException('That backup file no longer exists.')
    return filePath
  }

  /**
   * Row-level wipe of business data, keeping `User` and `SystemSettings`
   * intact — the admin who just did this can still log in, and the
   * showroom's own name/logo survive. Deletes run in explicit dependency
   * order (children before parents) inside one transaction so it never
   * depends on SQLite's own cascade timing; `VACUUM` runs separately
   * afterward since SQLite refuses it inside a transaction and
   * `deleteMany()` alone only frees pages without shrinking the file.
   */
  async resetAllData(actor: RequestUser) {
    const snapshot = await this.runBackup('pre-reset')

    await this.prisma.$transaction([
      this.prisma.cashTransaction.deleteMany(),
      this.prisma.sellingBill.deleteMany(),
      this.prisma.purchaseBillLine.deleteMany(),
      this.prisma.purchaseBill.deleteMany(),
      this.prisma.expense.deleteMany(),
      this.prisma.supplier.deleteMany(),
    ])

    await this.prisma.$executeRawUnsafe('VACUUM;')

    this.logger.warn(`Database reset by ${actor.username} (${actor.id}); previous database captured as ${snapshot.filename}`)

    return { success: true, backupFilename: snapshot.filename }
  }

  /**
   * Shared by both restore entry points below. Order matters: validate
   * the candidate completely while the live DB is untouched, THEN
   * snapshot the current database, THEN disconnect/swap/reconnect — a
   * bad file fails having changed nothing, and a failed swap still leaves
   * a connected app (the `finally` reconnects regardless).
   */
  private async restoreFrom(sourcePath: string, actor: RequestUser) {
    await validateBackupFile(sourcePath, BACKEND_ROOT, REQUIRED_TABLES)

    const dbPath = resolveDatabasePath(BACKEND_ROOT, this.config.get<string>('DATABASE_URL'))
    const snapshot = await this.runBackup('pre-restore')
    this.logger.warn(`Database restore starting (by ${actor.username}); previous database captured as ${snapshot.filename}`)

    await this.prisma.$disconnect()
    try {
      await swapDatabaseFile(sourcePath, dbPath)
    } finally {
      await this.prisma.$connect()
      await this.prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
      await this.prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
    }

    this.logger.warn(`Database restore completed by ${actor.username} (${actor.id})`)

    return { success: true, backupFilename: snapshot.filename }
  }

  async restoreFromUpload(tempFilePath: string, actor: RequestUser) {
    try {
      return await this.restoreFrom(tempFilePath, actor)
    } catch (error) {
      if (error instanceof InvalidBackupFileError) throw new BadRequestException(error.message)
      throw error
    } finally {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath)
    }
  }

  /** Restores from a backup already sitting in backend/backups — no upload needed since it's on the same machine. */
  async restoreFromBackupFile(filename: string, actor: RequestUser) {
    const filePath = this.resolveBackupFilePath(filename)
    try {
      return await this.restoreFrom(filePath, actor)
    } catch (error) {
      if (error instanceof InvalidBackupFileError) throw new BadRequestException(error.message)
      throw error
    }
  }
}
