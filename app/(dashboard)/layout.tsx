import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/dashboard/sidebar";
import { LogoutButton } from "@/components/dashboard/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><BarChart3 size={20} /></span><span>SIBI CBN</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: ".8rem" }}>
          <span>{user.name}<br /><small style={{ color: "#bed0df" }}>{user.roles.join(", ")}</small></span>
          <LogoutButton />
        </div>
      </header>
      <Sidebar user={user} />
      <main className="main">{children}</main>
    </div>
  );
}
