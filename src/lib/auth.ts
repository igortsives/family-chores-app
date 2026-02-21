import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authObsNow, logAuthObservability } from "@/lib/auth-observability";

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
        const startedAt = authObsNow();
        const username = String(credentials?.username ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!username || !password) {
          logAuthObservability("authorize.reject", {
            reason: "missing_credentials",
            username,
            totalMs: authObsNow() - startedAt,
          });
          return null;
        }

        const userLookupStartedAt = authObsNow();
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
        const userLookupMs = authObsNow() - userLookupStartedAt;

        if (!user?.passwordHash) {
          logAuthObservability("authorize.reject", {
            reason: "user_not_found",
            username,
            userLookupMs,
            totalMs: authObsNow() - startedAt,
          });
          return null;
        }

        if (!user.isActive) {
          logAuthObservability("authorize.reject", {
            reason: "inactive_user",
            userId: user.id,
            username,
            userLookupMs,
            totalMs: authObsNow() - startedAt,
          });
          return null;
        }
        if (user.isHidden) {
          logAuthObservability("authorize.reject", {
            reason: "hidden_user",
            userId: user.id,
            username,
            userLookupMs,
            totalMs: authObsNow() - startedAt,
          });
          return null;
        }

        const passwordCheckStartedAt = authObsNow();
        const ok = await bcrypt.compare(password, user.passwordHash);
        const passwordCheckMs = authObsNow() - passwordCheckStartedAt;
        if (!ok) {
          logAuthObservability("authorize.reject", {
            reason: "password_mismatch",
            userId: user.id,
            username,
            userLookupMs,
            passwordCheckMs,
            totalMs: authObsNow() - startedAt,
          });
          return null;
        }

        logAuthObservability("authorize.ok", {
          userId: user.id,
          username,
          role: user.role,
          familyId: user.familyId,
          userLookupMs,
          passwordCheckMs,
          totalMs: authObsNow() - startedAt,
        });

        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        } catch (error: unknown) {
          logAuthObservability("authorize.last_login_update_failed", {
            userId: user.id,
            username,
            message: error instanceof Error ? error.message : String(error),
          });
        }

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
