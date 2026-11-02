import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { currentAccount } from "@/lib/auth";
import "../site.css";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await currentAccount()) redirect("/app");
  return (
    <div className="site auth-page">
      <header className="site-header">
        <Brand />
      </header>
      <main className="auth-card">{children}</main>
    </div>
  );
}
