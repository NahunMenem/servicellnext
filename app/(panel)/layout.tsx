import { LogoutForm } from "@/components/logout-form";
import { PanelNotice } from "@/components/panel-notice";
import { Sidebar } from "@/components/sidebar";
import { requireSession } from "@/lib/auth";

export default async function PanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="shell">
      <Sidebar role={session.role} username={session.username} />
      <main className="content">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <LogoutForm />
        </div>
        <PanelNotice />
        {children}
      </main>
    </div>
  );
}
