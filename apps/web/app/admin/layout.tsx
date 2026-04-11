"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const NAV = [
  {
    href: "/admin/dashboard", label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/students", label: "Students",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/attendance", label: "Attendance",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: "/admin/qr-codes", label: "QR Codes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="5" /><rect x="16" y="3" width="5" height="5" />
        <rect x="3" y="16" width="5" height="5" />
        <path d="M21 16h-3a2 2 0 0 0-2 2v3" /><line x1="21" y1="21" x2="21" y2="21" />
        <path d="M3 10h4" /><path d="M10 3v4" /><path d="M10 10h.01" />
        <path d="M10 14h.01" /><path d="M14 10h.01" /><path d="M17 10h.01" />
      </svg>
    ),
  },
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
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: "#F1F5F9" }}>
      {/* Sidebar */}
      <aside style={{
        width: 248, background: "linear-gradient(180deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)",
        display: "flex", flexDirection: "column", padding: "0", position: "fixed",
        top: 0, left: 0, bottom: 0, zIndex: 40, boxShadow: "4px 0 24px rgba(30,27,75,0.18)"
      }}>
        {/* Logo */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Image src="/kap_fav.png" alt="KAP" width={32} height={32} style={{ objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: -0.3 }}>KapEduTech</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: 1.2, textTransform: "uppercase", padding: "0 8px", marginBottom: 8 }}>Menu</div>
          {NAV.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, textDecoration: "none", fontSize: 14, fontWeight: 500,
                background: active ? "rgba(255,255,255,0.15)" : "transparent",
                color: active ? "#fff" : "rgba(255,255,255,0.65)",
                transition: "all 0.15s",
                borderLeft: active ? "3px solid #A5B4FC" : "3px solid transparent",
              }}>
                <span style={{ opacity: active ? 1 : 0.75 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 12px 20px" }}>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.07)", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Signed in as</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600, marginTop: 1 }}>Admin</div>
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "10px 12px", border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 10, background: "rgba(239,68,68,0.1)", color: "#FCA5A5",
            fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, marginLeft: 248, minHeight: "100vh", background: "#F1F5F9" }}>{children}</main>
    </div>
  );
}
