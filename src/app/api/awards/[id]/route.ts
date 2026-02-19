import { NextResponse } from "next/server";
import { requireAdult } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateAward = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  thresholdPoints: z.number().int().min(0),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

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
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

    const existing = await prisma.award.findUnique({ where: { id } });
    if (!existing || existing.familyId !== familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.award.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
