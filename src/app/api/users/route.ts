import { NextResponse } from "next/server";
import { requireAdult } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateUser = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADULT", "KID"]),
  password: z.string().min(4),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdult();
    const familyId = (session.user as any).familyId;

    const body = await req.json();
    const parsed = CreateUser.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (exists) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const user = await prisma.user.create({
      data: { email: parsed.data.email, name: parsed.data.name, role: parsed.data.role, passwordHash, familyId },
    });

    return NextResponse.json({ user });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
