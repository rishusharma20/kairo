import { prisma } from '../src/lib/db'

async function main() {
  console.log('Clearing database...')
  await prisma.auditLog.deleteMany()
  await prisma.dailyUsage.deleteMany()
  await prisma.userKeyAssignment.deleteMany()
  await prisma.geminiKey.deleteMany()
  await prisma.user.deleteMany()

  console.log('Creating Admin User...')
  const admin = await prisma.user.create({
    data: {
      full_name: 'Kairo System Admin',
      email: 'admin@gmail.com',
      password_hash: 'hashed_admin_password', // Placeholder
      plan: 'PREMIUM',
      status: 'ACTIVE',
      daily_limit: 999999,
    },
  })

  console.log('Creating Free User...')
  const freeUser = await prisma.user.create({
    data: {
      full_name: 'Free Trial User',
      email: 'free@gmail.com',
      password_hash: 'hashed_password', // Placeholder
      plan: 'FREE',
      status: 'ACTIVE',
      daily_limit: 1,
    },
  })

  console.log('Creating Premium User...')
  const premiumUser = await prisma.user.create({
    data: {
      full_name: 'Alex Chen',
      email: 'alex@gmail.com',
      password_hash: 'hashed_password', // Placeholder
      plan: 'PREMIUM',
      status: 'ACTIVE',
      daily_limit: 3000,
    },
  })

  console.log('Creating Gemini API Keys...')
  const key1 = await prisma.geminiKey.create({
    data: {
      encrypted_api_key: 'enc_abc123',
      status: 'ASSIGNED',
      assigned_user_id: premiumUser.id,
      priority: 10,
    },
  })

  const key2 = await prisma.geminiKey.create({
    data: {
      encrypted_api_key: 'enc_def456',
      status: 'AVAILABLE',
      priority: 5,
    },
  })

  const key3 = await prisma.geminiKey.create({
    data: {
      encrypted_api_key: 'enc_ghi789',
      status: 'AVAILABLE',
      priority: 1,
    },
  })

  console.log('Simulating Key Assignment History...')
  await prisma.userKeyAssignment.create({
    data: {
      user_id: premiumUser.id,
      gemini_key_id: key1.id,
      release_reason: 'PREMIUM_UPGRADE',
    },
  })

  console.log('Simulating Daily Usage...')
  await prisma.dailyUsage.create({
    data: {
      user_id: premiumUser.id,
      usage_date: new Date(),
      requests_used: 142,
      daily_limit: 3000,
    },
  })

  console.log('Creating Audit Log...')
  await prisma.auditLog.create({
    data: {
      action: 'KEY_ASSIGNED',
      user_id: premiumUser.id,
      admin_id: admin.id,
      metadata: JSON.stringify({ key_id: key1.id, event: "auto_provisioning" }),
    },
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
