import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!username || !password) return null;

        const user = await prisma.user.findUnique({
          where: { username },
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            role: true,
            familyId: true,
            passwordHash: true,
            isActive: true,
            isHidden: true,
          },
        });

        if (!user?.passwordHash) return null;

        if (!user.isActive) return null;
        if (user.isHidden) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          username: user.username,
          email: user.email ?? undefined, // stored for contact, not login
          name: user.name ?? undefined,
          role: user.role,
          familyId: user.familyId,
        } as any;
      },
    }),
  ],

  callbacks: {
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}
      return `${baseUrl}/app`;
    },

    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.familyId = (user as any).familyId;
        token.email = (user as any).email;
        token.name = (user as any).name;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).familyId = token.familyId;

        // Keep email/name for display only
        (session.user as any).email = token.email;
        session.user.name = (token.name as any) ?? session.user.name;
      }
      return session;
    },
  },
};
