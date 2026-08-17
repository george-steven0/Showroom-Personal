/**
 * `npm run backup` — a plain file-copy backup of the SQLite database.
 * Meant to be run from Windows Task Scheduler (see deploy/install-backup-task.ps1)
 * on a daily interval, since there's no in-app scheduler that could
 * survive a reboot on its own.
 */
import 'dotenv/config'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'
import { performBackup } from '../src/common/backup'

async function main() {
  const prisma = new PrismaClient()
  const result = await performBackup(prisma, path.resolve(__dirname, '..'), process.env.DATABASE_URL, process.env.BACKUP_DIR)
  await prisma.$disconnect()

  console.log(`Backup written to ${result.path}`)
  if (result.prunedCount > 0) console.log(`Pruned ${result.prunedCount} old backup(s)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
