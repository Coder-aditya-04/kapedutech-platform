"use client";
import { useEffect, useState, useCallback } from "react";

type Student = { id: string; name: string; enrollmentNo: string; batch: string; parent: { phone: string; name: string } };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", enrollmentNo: "", batch: "JEE", parentName: "", parentPhone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async (q?: string) => {
    try {
      const url = q ? `/api/admin/students/search?q=${encodeURIComponent(q)}` : "/api/admin/students";
      const res = await fetch(url);
      setStudents(res.ok ? await res.json() : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setToast({ msg: "Student added successfully!", ok: true });
        setShowModal(false);
        setForm({ name: "", enrollmentNo: "", batch: "JEE", parentName: "", parentPhone: "" });
        load();
      } else {
        const d = await res.json();
        setToast({ msg: d.message ?? "Failed to add student", ok: false });
      }
    } catch {
      setToast({ msg: "Network error", ok: false });
    }
    setSubmitting(false);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div style={{ padding: 32 }}>
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, background: toast.ok ? "#D1FAE5" : "#FEE2E2", color: toast.ok ? "#065F46" : "#991B1B", padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14, zIndex: 100 }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Students</h1>
        <button onClick={() => setShowModal(true)} style={{ background: "#4F46E5", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          + Add Student
        </button>
      </div>

      <input
        placeholder="Search by name or enrollment no..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: "100%", padding: "10px 14px", border: "1px solid #E5E7EB", borderRadius: 10, fontSize: 14, marginBottom: 20, boxSizing: "border-box", outline: "none" }}
      />

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Name", "Enrollment No", "Batch", "Parent Name", "Parent Phone"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6B7280", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>No students found</td></tr>
              ) : students.map(s => (
                <tr key={s.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "#111827" }}>{s.name}</td>
                  <td style={{ padding: "12px 16px", color: "#6B7280" }}>{s.enrollmentNo}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "#EEF2FF", color: "#4F46E5", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{s.batch || "—"}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#374151" }}>{s.parent?.name ?? "—"}</td>
                  <td style={{ padding: "12px 16px", color: "#6B7280" }}>{s.parent?.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 460, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <h2 style={{ margin: "0 0 24px", fontSize: 18, fontWeight: 700, color: "#111827" }}>Add New Student</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Student Name", key: "name", type: "text", placeholder: "Full name" },
                { label: "Enrollment No", key: "enrollmentNo", type: "text", placeholder: "e.g. JEE2026-001" },
                { label: "Parent Name", key: "parentName", type: "text", placeholder: "Parent full name" },
                { label: "Parent Phone", key: "parentPhone", type: "tel", placeholder: "10 digit mobile number" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{f.label}</label>
                  <input
                    type={f.type} placeholder={f.placeholder} required
                    value={(form as Record<string, string>)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Batch</label>
                <select value={form.batch} onChange={e => setForm(prev => ({ ...prev, batch: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, boxSizing: "border-box", outline: "none" }}>
                  <option value="JEE">JEE</option>
                  <option value="NEET">NEET</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: "10px", border: "1px solid #E5E7EB", borderRadius: 10, background: "#fff", color: "#374151", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, background: "#4F46E5", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {submitting ? "Adding..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
