import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdult } from "@/lib/requireUser";

const UpdateAward = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  thresholdPoints: z.number().int().min(0),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdult({ source: "api/awards/[id].PUT" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const familyId = auth.me.familyId;

  const body = await req.json();
  const parsed = UpdateAward.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const existing = await prisma.award.findUnique({ where: { id } });
  if (!existing || existing.familyId !== familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const award = await prisma.award.update({
    where: { id },
    data: { name: parsed.data.name, icon: parsed.data.icon, thresholdPoints: parsed.data.thresholdPoints },
  });

  return NextResponse.json({ award });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const auth = await requireAdult({ source: "api/awards/[id].DELETE" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const familyId = auth.me.familyId;

  const existing = await prisma.award.findUnique({ where: { id } });
  if (!existing || existing.familyId !== familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.award.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
