"use client";
import { useEffect, useState, useCallback } from "react";

type Batch = { id: string; name: string; createdAt: string };
type Analytics = Batch & { totalStudents: number; avgAttendancePct: number; totalWorkingDays?: number };

export default function BatchesPage() {
  const [batches, setBatches] = useState<Analytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/batches/analytics");
      setBatches(res.ok ? await res.json() : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const d = await res.json();
      if (res.ok) { showToast(`Batch "${newName.trim()}" created`, true); setNewName(""); load(); }
      else showToast(d.message ?? "Failed", false);
    } catch { showToast("Network error", false); }
    setCreating(false);
  }

  async function handleDelete(batch: Analytics) {
    if (!confirm(`Delete batch "${batch.name}"?`)) return;
    const res = await fetch(`/api/admin/batches/${batch.id}`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) { showToast("Batch deleted", true); load(); }
    else showToast(d.message ?? "Failed", false);
  }

  const COLORS = ["#0064E0", "#6441D2", "#059669", "#D97706", "#DC2626", "#0891B2", "#7C3AED", "#BE185D"];

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, background: toast.ok ? "#ECFDF5" : "#FEF2F2", color: toast.ok ? "#059669" : "#DC2626", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", border: `1px solid ${toast.ok ? "#A7F3D0" : "#FECACA"}` }}>
          {toast.ok ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C2B33", margin: 0 }}>Batches</h1>
        <p style={{ color: "#5D6C7B", marginTop: 4, fontSize: 14 }}>Manage batches and view attendance analytics</p>
      </div>

      {/* Create batch */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, marginBottom: 28, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 14px" }}>Create New Batch</h2>
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="e.g. JEE 2026, NEET Morning, CONQUER+"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 10, fontSize: 14, outline: "none", color: "#111827" }}
          />
          <button type="submit" disabled={creating || !newName.trim()} style={{ padding: "10px 24px", background: "#0064E0", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: creating ? 0.7 : 1 }}>
            {creating ? "Creating..." : "Create Batch"}
          </button>
        </form>
      </div>

      {/* Analytics cards */}
      {loading ? (
        <p style={{ color: "#9CA3AF", textAlign: "center", padding: 40 }}>Loading...</p>
      ) : batches.length === 0 ? (
        <div style={{ background: "#F9FAFB", borderRadius: 16, border: "1px dashed #D1D5DB", padding: 48, textAlign: "center" }}>
          <p style={{ color: "#9CA3AF", margin: 0, fontSize: 15 }}>No batches yet. Create your first batch above.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {batches.map((batch, i) => {
            const color = COLORS[i % COLORS.length];
            const pct = batch.avgAttendancePct;
            return (
              <div key={batch.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: color, borderRadius: "16px 16px 0 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <span style={{ background: `${color}18`, color, borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{batch.name}</span>
                    <p style={{ color: "#6B7280", fontSize: 13, margin: "8px 0 0" }}>{batch.totalStudents} student{batch.totalStudents !== 1 ? "s" : ""}</p>
                  </div>
                  <button onClick={() => handleDelete(batch)} title="Delete batch" style={{ border: "1px solid #FCA5A5", borderRadius: 8, background: "#FFF5F5", color: "#DC2626", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>✕</button>
                </div>

                {/* Attendance bar */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>Avg attendance (30 days)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 75 ? "#059669" : pct >= 50 ? "#D97706" : "#DC2626" }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, background: "#F3F4F6", borderRadius: 100, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: pct >= 75 ? "#059669" : pct >= 50 ? "#D97706" : "#DC2626", borderRadius: 100, transition: "width 0.6s ease" }} />
                  </div>
                  {batch.totalWorkingDays !== undefined && (
                    <p style={{ fontSize: 11, color: "#9CA3AF", margin: "4px 0 0" }}>{batch.totalWorkingDays} working day{batch.totalWorkingDays !== 1 ? "s" : ""} in period</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
