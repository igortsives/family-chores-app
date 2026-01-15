import { NextResponse } from "next/server";
import { requireAdult } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AwardInput = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  thresholdPoints: z.number().int().min(0),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

    const body = await req.json();
    const parsed = AwardInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const award = await prisma.award.create({
      data: { familyId, name: parsed.data.name, icon: parsed.data.icon, thresholdPoints: parsed.data.thresholdPoints },
    });

    return NextResponse.json({ award });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
