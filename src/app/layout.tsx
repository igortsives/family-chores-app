import Providers from "./providers";
export const metadata = { title: "Family Chores", description: "Chores + rewards + leaderboard" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><Providers>{children}</Providers></body></html>);
}
