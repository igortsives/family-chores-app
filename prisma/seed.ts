import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function upsertUser(
  username: string,
  email: string,
  name: string,
  role: "ADULT" | "KID",
  password: string,
  familyId: string
) {
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

  console.log("==> Seed ensured demo accounts exist and passwords reset:");
  console.log("   parent@example.com / parent1234");
  console.log("   kid1@example.com / kid1234");
  console.log("   kid2@example.com / kid1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
