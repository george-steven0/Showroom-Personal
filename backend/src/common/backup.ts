import * as fs from 'fs'
import * as path from 'path'

const KEEP = 30
const FILE_PREFIX = 'backup-'

export interface BackupResult {
  path: string
  filename: string
  createdAt: Date
  prunedCount: number
}

/**
 * WAL-checkpoint-then-copy-then-prune, the one routine `npm run backup`
 * (scripts/backup.ts) and any future in-app backup button would both
 * call. `prisma` only needs `$queryRawUnsafe`.
 */
export async function performBackup(
  prisma: { $queryRawUnsafe: (query: string) => Promise<unknown> },
  backendRoot: string,
  databaseUrl: string | undefined,
  backupDirEnv: string | undefined,
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
  const filename = `${FILE_PREFIX}${createdAt.toISOString().replace(/[:.]/g, '-')}.db`
  const backupPath = path.join(backupDir, filename)
  fs.copyFileSync(dbPath, backupPath)

  // Roughly a month of daily runs — prune older ones so an unattended
  // machine's disk usage doesn't grow unbounded.
  const existing = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith(FILE_PREFIX) && f.endsWith('.db'))
    .sort()
  const toDelete = existing.slice(0, Math.max(0, existing.length - KEEP))
  for (const file of toDelete) fs.unlinkSync(path.join(backupDir, file))

  return { path: backupPath, filename, createdAt, prunedCount: toDelete.length }
}
