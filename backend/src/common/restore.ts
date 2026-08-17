import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'

const SQLITE_MAGIC = Buffer.from('SQLite format 3\0', 'binary')

export class InvalidBackupFileError extends Error {}

interface BackupInspection {
  tables: string[]
  migrations: string[]
}

/**
 * Opens the candidate file as its own short-lived Prisma client (a
 * datasource override, never touching the live app's own connection),
 * runs SQLite's own structural check, and reads back its table list and
 * applied-migration history.
 */
async function inspect(filePath: string): Promise<BackupInspection> {
  const client = new PrismaClient({
    datasources: { db: { url: `file:${path.resolve(filePath)}` } },
  })
  try {
    const integrity = await client.$queryRawUnsafe<{ integrity_check: string }[]>('PRAGMA integrity_check;')
    const verdict = integrity[0] ? Object.values(integrity[0])[0] : undefined
    if (verdict !== 'ok') {
      throw new InvalidBackupFileError('This backup file exists but its contents are damaged.')
    }

    const tableRows = await client.$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
    )
    const tables = tableRows.map((row) => row.name)

    let migrations: string[] = []
    if (tables.includes('_prisma_migrations')) {
      const migrationRows = await client.$queryRawUnsafe<{ migration_name: string }[]>(
        'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name;',
      )
      migrations = migrationRows.map((row) => row.migration_name)
    }

    return { tables, migrations }
  } catch (error) {
    if (error instanceof InvalidBackupFileError) throw error
    throw new InvalidBackupFileError(
      'This file could not be read as a Showroom database. It may be corrupted, incomplete, or from a different program.',
    )
  } finally {
    await client.$disconnect()
  }
}

function expectedMigrations(backendRoot: string): string[] {
  const migrationsDir = path.join(backendRoot, 'prisma', 'migrations')
  if (!fs.existsSync(migrationsDir)) return []
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

/**
 * Four independent checks, in order, before anything live is touched: not
 * empty, real SQLite file (magic header), passes SQLite's own integrity
 * check and has every table this app expects, and its migration history
 * matches this build's own `prisma/migrations` exactly — a backup from an
 * older or newer version of the app would otherwise "restore cleanly and
 * then crash at runtime on a column that doesn't exist."
 */
export async function validateBackupFile(
  filePath: string,
  backendRoot: string,
  requiredTables: readonly string[],
): Promise<BackupInspection> {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    throw new InvalidBackupFileError('The selected file is empty.')
  }

  const header = Buffer.alloc(SQLITE_MAGIC.length)
  const fd = fs.openSync(filePath, 'r')
  try {
    fs.readSync(fd, header, 0, header.length, 0)
  } finally {
    fs.closeSync(fd)
  }
  if (!header.equals(SQLITE_MAGIC)) {
    throw new InvalidBackupFileError('This is not a database file. Pick a .db backup created by this system.')
  }

  const info = await inspect(filePath)

  const missingTables = requiredTables.filter((table) => !info.tables.includes(table))
  if (missingTables.length > 0) {
    throw new InvalidBackupFileError(
      `This database is missing ${missingTables.length} expected table(s) — it isn't a Showroom backup.`,
    )
  }

  const expected = expectedMigrations(backendRoot)
  if (expected.length > 0) {
    const missing = expected.filter((name) => !info.migrations.includes(name))
    const extra = info.migrations.filter((name) => !expected.includes(name))
    if (missing.length > 0) {
      throw new InvalidBackupFileError(
        'This backup is from an OLDER version of the app — it is missing later database changes. Update this backup or restore it on the matching version first.',
      )
    }
    if (extra.length > 0) {
      throw new InvalidBackupFileError(
        'This backup is from a NEWER version of the app than the one installed here.',
      )
    }
  }

  return info
}

/**
 * The actual disk operation: overwrite the live database file with the
 * validated candidate, then clean up the OLD database's now-stale `-wal`/
 * `-shm` sidecar files. The caller must have already `$disconnect()`ed.
 * Retries with backoff because on Windows a just-resolved `$disconnect()`
 * doesn't guarantee the native SQLite driver has released its OS-level
 * file handle yet — never fatal even if every retry fails, since SQLite
 * detects and discards a stale `-wal` on its own re-open.
 */
export async function swapDatabaseFile(sourcePath: string, dbPath: string): Promise<void> {
  fs.copyFileSync(sourcePath, dbPath)

  for (const suffix of ['-wal', '-shm']) {
    const sibling = `${dbPath}${suffix}`
    for (let attempt = 1; attempt <= 5; attempt++) {
      if (!fs.existsSync(sibling)) break
      try {
        fs.unlinkSync(sibling)
        break
      } catch {
        if (attempt === 5) break
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt))
      }
    }
  }
}
