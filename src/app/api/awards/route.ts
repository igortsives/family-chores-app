import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireAdult } from "@/lib/requireUser";

const AwardInput = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  thresholdPoints: z.number().int().min(0),
});

export async function POST(req: Request) {
  const auth = await requireAdult({ source: "api/awards.POST" });
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const familyId = auth.me.familyId;

  const body = await req.json();
  const parsed = AwardInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const award = await prisma.award.create({
    data: { familyId, name: parsed.data.name, icon: parsed.data.icon, thresholdPoints: parsed.data.thresholdPoints },
  });

  return NextResponse.json({ award });
}
