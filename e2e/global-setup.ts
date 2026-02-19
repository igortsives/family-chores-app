import { PrismaClient } from "@prisma/client";

const E2E_CHORE_TITLE = "E2E Dishwasher Reset";

export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const family = await prisma.family.findFirst({
      where: { name: "Demo Family" },
      select: { id: true },
    });
    if (!family) throw new Error("Demo Family not found. Run seed first.");

    const kid = await prisma.user.findFirst({
      where: { username: "kid1", familyId: family.id },
      select: { id: true },
    });
    if (!kid) throw new Error("Seed kid user kid1 not found.");

    let chore = await prisma.chore.findFirst({
      where: { familyId: family.id, title: E2E_CHORE_TITLE },
      select: { id: true },
    });

    if (!chore) {
      chore = await prisma.chore.create({
        data: {
          familyId: family.id,
          title: E2E_CHORE_TITLE,
          description: "Playwright deterministic chore",
          points: 1,
          active: true,
        },
        select: { id: true },
      });
    }

    await prisma.choreAssignment.upsert({
      where: { choreId_userId: { choreId: chore.id, userId: kid.id } },
      update: {},
      create: { choreId: chore.id, userId: kid.id },
    });

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    let inst = await prisma.choreInstance.findFirst({
      where: {
        familyId: family.id,
        choreId: chore.id,
        dueDate: { gte: start, lte: end },
      },
      select: { id: true },
    });

    if (!inst) {
      inst = await prisma.choreInstance.create({
        data: {
          familyId: family.id,
          choreId: chore.id,
          dueDate: now,
        },
        select: { id: true },
      });
    }

    await prisma.choreCompletion.deleteMany({
      where: {
        userId: kid.id,
        choreInstance: { choreId: chore.id },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}
