/**
 * First-run bootstrap: the one account needed to log in at all. Nothing
 * else — no demo suppliers or bills. Safe to re-run: the write is an
 * upsert with `update: {}`, so `prisma migrate reset` (which re-seeds
 * automatically) never overwrites an admin whose password was already
 * changed post-install.
 */
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminUsername = process.env.SEED_ADMIN_USERNAME
  const adminPassword = process.env.SEED_ADMIN_PASSWORD
  if (!adminUsername || !adminPassword) {
    throw new Error(
      'SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD must be set in .env before seeding — see .env.example.',
    )
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10)
  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash,
      fullName: 'Administrator',
    },
  })

  // eslint-disable-next-line no-console
  console.log(`Seeded admin user "${adminUsername}".`)
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
