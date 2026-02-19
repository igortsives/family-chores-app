import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

export const E2E_FAMILY_NAME = "E2E Playwright Family";
export const E2E_PARENT_USERNAME = "e2e_parent";
export const E2E_PARENT_PASSWORD = "e2e_parent_pw";
export const E2E_PARENT_EMAIL = "e2e_parent@example.com";
export const E2E_KID_USERNAME = "e2e_kid";
export const E2E_KID_PASSWORD = "e2e_kid_pw";
export const E2E_KID_EMAIL = "e2e_kid@example.com";
export const E2E_KID_NAME = "E2E Kid";
export const E2E_CHORE_TITLE = "E2E Dishwasher Reset";
const E2E_CHORE_DESCRIPTION = "Playwright deterministic chore";

async function withPrisma<T>(fn: (prisma: PrismaClient) => Promise<T>) {
  const prisma = new PrismaClient();
  try {
    return await fn(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function resetE2ETestState() {
  await withPrisma(async (prisma) => {
    const family = await prisma.family.findFirst({
      where: { name: E2E_FAMILY_NAME },
      select: { id: true },
    });
    if (!family) return;

    const users = await prisma.user.findMany({
      where: { familyId: family.id },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const instances = await prisma.choreInstance.findMany({
      where: { familyId: family.id },
      select: { id: true },
    });
    const instanceIds = instances.map((x) => x.id);

    await prisma.userAward.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.choreCompletion.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { choreInstanceId: { in: instanceIds } },
        ],
      },
    });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.starExchange.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { reviewedById: { in: userIds } },
        ],
      },
    });
    await prisma.starWeek.deleteMany({ where: { userId: { in: userIds } } });
  });
}

export async function ensureE2ETestData() {
  await withPrisma(async (prisma) => {
    let family = await prisma.family.findFirst({
      where: { name: E2E_FAMILY_NAME },
      select: { id: true },
    });
    if (!family) {
      family = await prisma.family.create({
        data: { name: E2E_FAMILY_NAME },
        select: { id: true },
      });
    }

    const parentPasswordHash = await bcrypt.hash(E2E_PARENT_PASSWORD, 10);
    const kidPasswordHash = await bcrypt.hash(E2E_KID_PASSWORD, 10);

    await prisma.user.upsert({
      where: { email: E2E_PARENT_EMAIL },
      update: {
        username: E2E_PARENT_USERNAME,
        name: "E2E Parent",
        role: "ADULT",
        passwordHash: parentPasswordHash,
        familyId: family.id,
        isActive: true,
        isHidden: false,
      },
      create: {
        username: E2E_PARENT_USERNAME,
        email: E2E_PARENT_EMAIL,
        name: "E2E Parent",
        role: "ADULT",
        passwordHash: parentPasswordHash,
        familyId: family.id,
        isActive: true,
        isHidden: false,
      },
      select: { id: true },
    });

    const kid = await prisma.user.upsert({
      where: { email: E2E_KID_EMAIL },
      update: {
        username: E2E_KID_USERNAME,
        name: E2E_KID_NAME,
        role: "KID",
        passwordHash: kidPasswordHash,
        familyId: family.id,
        isActive: true,
        isHidden: false,
      },
      create: {
        username: E2E_KID_USERNAME,
        email: E2E_KID_EMAIL,
        name: E2E_KID_NAME,
        role: "KID",
        passwordHash: kidPasswordHash,
        familyId: family.id,
        isActive: true,
        isHidden: false,
      },
      select: { id: true },
    });

    let chore = await prisma.chore.findFirst({
      where: { familyId: family.id, title: E2E_CHORE_TITLE },
      select: { id: true },
    });
    if (!chore) {
      chore = await prisma.chore.create({
        data: {
          familyId: family.id,
          title: E2E_CHORE_TITLE,
          description: E2E_CHORE_DESCRIPTION,
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
  });

  await resetE2ETestState();
}

export async function cleanupE2ETestData() {
  await withPrisma(async (prisma) => {
    const family = await prisma.family.findFirst({
      where: { name: E2E_FAMILY_NAME },
      select: { id: true },
    });
    if (!family) return;

    const users = await prisma.user.findMany({
      where: { familyId: family.id },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const chores = await prisma.chore.findMany({
      where: { familyId: family.id },
      select: { id: true },
    });
    const choreIds = chores.map((c) => c.id);
    const instances = await prisma.choreInstance.findMany({
      where: { familyId: family.id },
      select: { id: true },
    });
    const instanceIds = instances.map((i) => i.id);

    await prisma.userAward.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.choreCompletion.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { choreInstanceId: { in: instanceIds } },
        ],
      },
    });
    await prisma.choreAssignment.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { choreId: { in: choreIds } },
        ],
      },
    });
    await prisma.choreSchedule.deleteMany({ where: { choreId: { in: choreIds } } });
    await prisma.choreInstance.deleteMany({ where: { id: { in: instanceIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.starExchange.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { reviewedById: { in: userIds } },
        ],
      },
    });
    await prisma.starWeek.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.chore.deleteMany({ where: { id: { in: choreIds } } });
    await prisma.award.deleteMany({ where: { familyId: family.id } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.family.delete({ where: { id: family.id } });
  });
}

export async function cleanupLegacyE2EArtifacts() {
  await withPrisma(async (prisma) => {
    const staleChores = await prisma.chore.findMany({
      where: {
        title: E2E_CHORE_TITLE,
        description: E2E_CHORE_DESCRIPTION,
      },
      select: { id: true },
    });
    const choreIds = staleChores.map((c) => c.id);
    if (choreIds.length === 0) return;

    const instances = await prisma.choreInstance.findMany({
      where: { choreId: { in: choreIds } },
      select: { id: true },
    });
    const instanceIds = instances.map((i) => i.id);
    const completions = await prisma.choreCompletion.findMany({
      where: { choreInstanceId: { in: instanceIds } },
      select: { id: true },
    });
    const completionIds = completions.map((c) => c.id);

    await prisma.userAward.deleteMany({ where: { completionId: { in: completionIds } } });
    await prisma.choreCompletion.deleteMany({ where: { id: { in: completionIds } } });
    await prisma.choreAssignment.deleteMany({ where: { choreId: { in: choreIds } } });
    await prisma.choreSchedule.deleteMany({ where: { choreId: { in: choreIds } } });
    await prisma.choreInstance.deleteMany({ where: { id: { in: instanceIds } } });
    await prisma.chore.deleteMany({ where: { id: { in: choreIds } } });
  });
}
