"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const NAV = [
  {
    href: "/admin/dashboard", label: "Dashboard",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/students", label: "Students",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/attendance", label: "Attendance",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/admin/qr-codes", label: "QR Codes",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: "#F1F4F7" }}>

      {/* Sidebar */}
      <aside style={{
        width: 248,
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        zIndex: 40,
        borderRight: "1px solid #DEE3E9",
        boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
      }}>

        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #DEE3E9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#F1F4F7", border: "1px solid #DEE3E9",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Image src="/kap_fav.png" alt="KAP" width={26} height={26} style={{ objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ lineHeight: 1.2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1C2B33", letterSpacing: -0.2 }}>KAP</span>
                <span style={{ fontSize: 16, fontWeight: 400, color: "#5D6C7B" }}> Edutech</span>
              </div>
              <div style={{ fontSize: 11, color: "#BCC0C4", marginTop: 2 }}>Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#BCC0C4", letterSpacing: 1.2, textTransform: "uppercase", padding: "6px 10px 8px" }}>Menu</div>
          {NAV.map(item => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                background: active ? "#E8F3FF" : "transparent",
                color: active ? "#0064E0" : "#5D6C7B",
                transition: "background 0.15s, color 0.15s",
                borderLeft: active ? "3px solid #0064E0" : "3px solid transparent",
              }}>
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: "10px 10px 16px", borderTop: "1px solid #DEE3E9" }}>
          <div style={{ padding: "9px 12px", borderRadius: 8, background: "#F7F8FA", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "#BCC0C4" }}>Signed in as</div>
            <div style={{ fontSize: 13, color: "#1C2B33", fontWeight: 600, marginTop: 2 }}>Admin</div>
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "9px 12px",
            border: "1px solid #CED0D4",
            borderRadius: 8, background: "#fff",
            color: "#5D6C7B", fontSize: 13, fontWeight: 500, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 248, minHeight: "100vh", background: "#F1F4F7" }}>{children}</main>
    </div>
  );
}
