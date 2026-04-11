"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("admin_auth") === "true") {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise(r => setTimeout(r, 350));
    if (password === "admin@kap123") {
      localStorage.setItem("admin_auth", "true");
      router.push("/admin/dashboard");
    } else {
      setError("Incorrect password. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)",
      fontFamily: "'Inter', system-ui, sans-serif", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.25)", marginBottom: 16 }}>
            <Image src="/kap_fav.png" alt="KAP" width={52} height={52} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ fontSize: 26, letterSpacing: 0 }}>
            <span style={{ fontWeight: 900, color: "#fff", letterSpacing: 1 }}>KAP</span>
            <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.8)" }}> Edutech</span>
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>Admin Portal — Sign in to continue</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Admin Password</label>
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                required
                autoFocus
                style={{
                  width: "100%", padding: "11px 14px", border: "1.5px solid",
                  borderColor: error ? "#FCA5A5" : "#E5E7EB",
                  borderRadius: 10, fontSize: 14, boxSizing: "border-box",
                  outline: "none", color: "#111827", background: "#fff",
                }}
              />
              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, color: "#EF4444" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {error}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px", border: "none", borderRadius: 10, marginTop: 4,
                background: loading ? "#A5B4FC" : "linear-gradient(135deg, #4F46E5, #7C3AED)",
                color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(79,70,229,0.35)",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
          KAP Edutech Attendance System © 2026
        </div>
      </div>
    </main>
  );
}
