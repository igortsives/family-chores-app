import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function requireAdult() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) return { status: 401 as const, error: "Unauthorized" as const };

  const me = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, familyId: true, role: true },
  });

  if (!me) return { status: 401 as const, error: "Unauthorized" as const };
  if (me.role !== "ADULT") return { status: 403 as const, error: "Forbidden" as const };

  return { me };
}

export async function GET() {
  const auth = await requireAdult();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const members = await prisma.user.findMany({
    where: { familyId: me.familyId },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      // optional if your schema has them:
      isActive: true,
      isHidden: true,
      createdAt: true,
    } as any,
    orderBy: [{ role: "asc" }, { name: "asc" }, { username: "asc" }],
  });

  return NextResponse.json({ members });
}

export async function POST(req: Request) {
  const auth = await requireAdult();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim().toLowerCase();
  const email = String(body?.email ?? "").trim().toLowerCase(); // contact-only
  const name = body?.name ? String(body.name).trim() : null;
  const role = body?.role === "ADULT" ? "ADULT" : "KID";
  const password = String(body?.password ?? "");

  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "Password must be at least 6 chars" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const created = await prisma.user.create({
      data: {
        familyId: me.familyId,
        username,
        email,
        name,
        role,
        passwordHash,
        isActive: true,
        isHidden: false,
      } as any,
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ error: "Could not create member (email may already exist)" }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdult();
  if ("status" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { me } = auth;

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const member = await prisma.user.findFirst({
    where: { id, familyId: me.familyId },
    select: { id: true, username: true },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const username = body?.username !== undefined ? String(body.username).trim().toLowerCase() : undefined;
  const email = body?.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
  const name = body?.name !== undefined ? String(body.name).trim() : undefined;
  const role = body?.role === "ADULT" ? "ADULT" : body?.role === "KID" ? "KID" : undefined;
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : undefined;
  const isHidden = typeof body?.isHidden === "boolean" ? body.isHidden : undefined;
  const password = body?.password ? String(body.password) : "";

  const data: any = {};
  if (email !== undefined) data.email = email;
  if (name !== undefined) data.name = name || null;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (isHidden !== undefined) data.isHidden = isHidden;

  // Username updates: allow change ONLY if you want it. If you want to lock it after set, uncomment the guard.
  if (username !== undefined) {
    // Optional lock-after-set:
    // if (member.username) return NextResponse.json({ error: "Username cannot be changed" }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing && existing.id !== member.id) return NextResponse.json({ error: "Username already taken" }, { status: 400 });
    data.username = username;
  }

  if (password) {
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 chars" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  try {
    await prisma.user.update({ where: { id }, data });
  } catch {
    return NextResponse.json({ error: "Could not update (email may already exist)" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
