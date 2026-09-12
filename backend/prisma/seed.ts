/**
 * First-run bootstrap: the one account needed to log in at all, and the
 * settings singleton so the app has real branding to render from the
 * first request. Nothing else — no demo suppliers or bills. Safe to
 * re-run: every write here is an upsert with `update: {}`, so
 * `prisma migrate reset` (which re-seeds automatically) never overwrites
 * an admin whose password was already changed post-install, or a system
 * name/logo an admin already set from Settings.
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
  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      passwordHash,
      fullName: 'Administrator',
    },
  })

  const branches: { name: string; nameAr: string }[] = [
    { name: 'Railway branch', nameAr: 'فرع الطريق السريع' },
    { name: 'El mahalla branch', nameAr: 'فرع المحلة الكبرى' },
    { name: 'Kafr el sheikh branch', nameAr: 'فرع كفر الشيخ' },
  ]
  for (const { name, nameAr } of branches) {
    await prisma.inventoryBranch.upsert({
      where: { name },
      update: {},
      create: { name, nameAr, createdBy: admin.id, createdByName: admin.fullName },
    })
  }

  await prisma.systemSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      systemName: 'Showroom',
      systemNameAr: 'المعرض',
      logo: null,
    },
  })

  // eslint-disable-next-line no-console
  console.log(`Seeded admin user "${adminUsername}" and system settings.`)
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
