import * as fs from 'fs'
import * as path from 'path'

const KEEP = 30

/** Every backup filename this app writes starts with this — lets you tell them apart from other apps' backups in a shared folder (e.g. a synced Drive folder). */
const APP_PREFIX = 'SHP'

export type BackupKind = 'backup' | 'pre-reset' | 'pre-restore'

export interface BackupResult {
  path: string
  filename: string
  createdAt: Date
  prunedCount: number
}

/**
 * WAL-checkpoint-then-copy-then-prune — the one routine every backup in
 * this app goes through: the manual "Create backup" button, `npm run
 * backup` (scripts/backup.ts), and the automatic safety copy taken right
 * before a database reset or restore (see settings.service.ts). `kind`
 * becomes the filename prefix, so a listing can tell them apart at a
 * glance; only plain `backup-*` files are pruned to the most recent 30 —
 * a pre-reset/pre-restore safety copy is a rare, deliberate event worth
 * keeping indefinitely rather than silently rotated away. `prisma` only
 * needs `$queryRawUnsafe`.
 */
export async function performBackup(
  prisma: { $queryRawUnsafe: (query: string) => Promise<unknown> },
  backendRoot: string,
  databaseUrl: string | undefined,
  backupDirEnv: string | undefined,
  kind: BackupKind = 'backup',
): Promise<BackupResult> {
  if (!databaseUrl?.startsWith('file:')) {
    throw new Error('DATABASE_URL must be a file: URL for backups to work')
  }

  // Prisma resolves a relative `file:` URL against schema.prisma's own
  // directory (prisma/), not the process's cwd.
  const relativePath = databaseUrl.slice('file:'.length)
  const dbPath = path.resolve(backendRoot, 'prisma', relativePath)
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found at ${dbPath}`)
  }

  // WAL mode means recent commits can still be sitting in the -wal file.
  // A TRUNCATE checkpoint folds everything back into the main file, so a
  // plain copy right after is a complete, self-consistent snapshot. Safe
  // against a live server — a checkpoint doesn't need exclusive access.
  await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);')

  const backupDir = path.resolve(backendRoot, backupDirEnv || './backups')
  fs.mkdirSync(backupDir, { recursive: true })

  const createdAt = new Date()
  const filename = `${APP_PREFIX}-${kind}-${createdAt.toISOString().replace(/[:.]/g, '-')}.db`
  const backupPath = path.join(backupDir, filename)
  fs.copyFileSync(dbPath, backupPath)

  let prunedCount = 0
  if (kind === 'backup') {
    // Roughly a month of daily runs — prune older ones so an unattended
    // machine's disk usage doesn't grow unbounded.
    const existing = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith(`${APP_PREFIX}-backup-`) && f.endsWith('.db'))
      .sort()
    const toDelete = existing.slice(0, Math.max(0, existing.length - KEEP))
    for (const file of toDelete) fs.unlinkSync(path.join(backupDir, file))
    prunedCount = toDelete.length
  }

  return { path: backupPath, filename, createdAt, prunedCount }
}

export function resolveDatabasePath(backendRoot: string, databaseUrl: string | undefined): string {
  if (!databaseUrl?.startsWith('file:')) {
    throw new Error('DATABASE_URL must be a file: URL for this to work')
  }
  return path.resolve(backendRoot, 'prisma', databaseUrl.slice('file:'.length))
}
