const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function upsertUser(username, email, name, role, password, familyId) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: { username, name, role, passwordHash, familyId },
    create: { username, email, name, role, passwordHash, familyId },
  });
}

async function main() {
  // Create or reuse demo family
  let family = await prisma.family.findFirst({ where: { name: "Demo Family" } });
  if (!family) family = await prisma.family.create({ data: { name: "Demo Family" } });

  await upsertUser("parent", "parent@example.com", "Parent", "ADULT", "parent1234", family.id);
  await upsertUser("kid1", "kid1@example.com", "Kid 1", "KID", "kid1234", family.id);
  await upsertUser("kid2", "kid2@example.com", "Kid 2", "KID", "kid1234", family.id);

  // Ensure baseline awards
  const awards = [
    { name: "Bronze Star", icon: "🥉", thresholdPoints: 5 },
    { name: "Silver Star", icon: "🥈", thresholdPoints: 15 },
    { name: "Gold Star", icon: "🥇", thresholdPoints: 30 },
  ];

  for (const a of awards) {
    const existing = await prisma.award.findFirst({ where: { familyId: family.id, name: a.name } });
    if (!existing) await prisma.award.create({ data: { familyId: family.id, ...a } });
  }

  // Ensure at least one chore
  const anyChore = await prisma.chore.findFirst({ where: { familyId: family.id } });
  if (!anyChore) {
    const kid1 = await prisma.user.findUnique({ where: { email: "kid1@example.com" } });
    const kid2 = await prisma.user.findUnique({ where: { email: "kid2@example.com" } });
    await prisma.chore.create({
      data: {
        familyId: family.id,
        title: "Make bed",
        description: "Make your bed in the morning",
        points: 2,
        schedules: { create: { frequency: "DAILY" } },
        assignments: { create: [{ userId: kid1.id }, { userId: kid2.id }] },
      },
    });
  }

  console.log("Seed complete. Demo logins:");
  console.log("  parent@example.com / parent1234");
  console.log("  kid1@example.com / kid1234");
  console.log("  kid2@example.com / kid1234");
}

main()
  .then(async () => {
    const u = await prisma.user.findUnique({ where: { email: "parent@example.com" } });
    console.log("parent@example.com exists?", Boolean(u));
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
