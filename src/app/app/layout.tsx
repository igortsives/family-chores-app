import * as React from "react";
import Providers from "@/components/Providers";
import ThemeRegistry from "@/components/ThemeRegistry";
import BrandShell from "@/components/BrandShell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as "ADULT" | "KID" | undefined;
  const username = (session?.user as any)?.username as string | undefined;
  const name = (session?.user as any)?.name as string | undefined;

  return (
    <ThemeRegistry>
      <Providers>
        <BrandShell role={role} username={username} name={name}>
          {children}
        </BrandShell>
      </Providers>
    </ThemeRegistry>
  );
}
