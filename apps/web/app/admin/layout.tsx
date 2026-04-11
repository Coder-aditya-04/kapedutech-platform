"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/students", label: "Students", icon: "👥" },
  { href: "/admin/attendance", label: "Attendance", icon: "📋" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("admin_auth") !== "true") {
      router.replace("/admin");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("admin_auth");
    router.replace("/admin");
  }

  if (pathname === "/admin") return <>{children}</>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: "#fff", borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column", padding: "24px 0" }}>
        <div style={{ padding: "0 20px 24px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#4F46E5" }}>KapEduTech</div>
          <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>Admin Portal</div>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: "0 12px" }}>
          {NAV.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 500,
                background: active ? "#EEF2FF" : "transparent",
                color: active ? "#4F46E5" : "#374151",
              }}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "0 12px" }}>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "10px 12px", border: "1px solid #FCA5A5",
            borderRadius: 10, background: "transparent", color: "#EF4444",
            fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left",
          }}>
            🚪 Logout
          </button>
        </div>
      </aside>
      {/* Main */}
      <main style={{ flex: 1, background: "#F8F9FC", overflow: "auto" }}>{children}</main>
    </div>
  );
}
