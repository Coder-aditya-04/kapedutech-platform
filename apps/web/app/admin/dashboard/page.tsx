"use client";
import { useEffect, useState, useCallback } from "react";

type Student = { id: string; name: string; enrollmentNo: string; batch: string; parent: { phone: string; name: string } };
type AttendanceRecord = { id: string; studentId: string; date: string; type: "PUNCH_IN" | "PUNCH_OUT"; markedAt: string; student: Student };
type StudentSummary = { student: Student; punchIn: string | null; punchOut: string | null };

const BATCHES = ["All", "JEE", "NEET"];

export default function DashboardPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState("All");

  const load = useCallback(async () => {
    try {
      const [recRes, stuRes] = await Promise.all([fetch("/api/admin/attendance/today"), fetch("/api/admin/students")]);
      setRecords(recRes.ok ? await recRes.json() : []);
      setStudents(stuRes.ok ? await stuRes.json() : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  const filtered = batch === "All" ? records : records.filter(r => r.student?.batch === batch);
  const summaryMap = new Map<string, StudentSummary>();
  filtered.forEach(r => {
    if (!summaryMap.has(r.studentId)) summaryMap.set(r.studentId, { student: r.student, punchIn: null, punchOut: null });
    const s = summaryMap.get(r.studentId)!;
    const time = new Date(r.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    if (r.type === "PUNCH_IN") s.punchIn = time;
    if (r.type === "PUNCH_OUT") s.punchOut = time;
  });
  const summaries = Array.from(summaryMap.values());
  const presentIds = new Set(filtered.map(r => r.studentId));

  const stats = [
    { label: "Total Students", value: students.length, color: "#4F46E5", bg: "linear-gradient(135deg,#EEF2FF,#E0E7FF)", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    )},
    { label: "Present Today", value: presentIds.size, color: "#059669", bg: "linear-gradient(135deg,#ECFDF5,#D1FAE5)", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    )},
    { label: "Punch Ins", value: filtered.filter(r => r.type === "PUNCH_IN").length, color: "#2563EB", bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
    )},
    { label: "Punch Outs", value: filtered.filter(r => r.type === "PUNCH_OUT").length, color: "#7C3AED", bg: "linear-gradient(135deg,#F5F3FF,#EDE9FE)", icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    )},
  ];

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: -0.5 }}>Dashboard</h1>
          <p style={{ color: "#6B7280", marginTop: 4, fontSize: 14 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid #E5E7EB", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: "20px 22px", border: "1px solid #E5E7EB", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{loading ? "—" : s.value}</div>
              <div style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827" }}>Today&apos;s Attendance</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9CA3AF" }}>Live — updates every 30 seconds</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {BATCHES.map(b => (
              <button key={b} onClick={() => setBatch(b)} style={{
                padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
                borderColor: batch === b ? "#4F46E5" : "#E5E7EB",
                background: batch === b ? "#EEF2FF" : "#fff",
                color: batch === b ? "#4F46E5" : "#6B7280",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>{b}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Student Name", "Enrollment", "Batch", "Punch In", "Punch Out", "Status"].map(h => (
                  <th key={h} style={{ padding: "11px 18px", textAlign: "left", color: "#9CA3AF", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>Loading...</td></tr>
              ) : summaries.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>No attendance records for today</td></tr>
              ) : summaries.map(s => {
                const status = s.punchIn && s.punchOut ? "Complete" : s.punchIn ? "In Progress" : "Absent";
                const statusStyles: Record<string, { color: string; bg: string }> = {
                  Complete: { color: "#059669", bg: "#ECFDF5" },
                  "In Progress": { color: "#D97706", bg: "#FFFBEB" },
                  Absent: { color: "#DC2626", bg: "#FEF2F2" },
                };
                const ss = statusStyles[status];
                return (
                  <tr key={s.student.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "13px 18px", fontWeight: 600, color: "#111827" }}>{s.student.name}</td>
                    <td style={{ padding: "13px 18px", color: "#6B7280", fontFamily: "monospace", fontSize: 13 }}>{s.student.enrollmentNo}</td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ background: s.student.batch === "JEE" ? "#EEF2FF" : "#FDF4FF", color: s.student.batch === "JEE" ? "#4F46E5" : "#7C3AED", borderRadius: 6, padding: "3px 9px", fontSize: 12, fontWeight: 700 }}>{s.student.batch || "—"}</span>
                    </td>
                    <td style={{ padding: "13px 18px", color: s.punchIn ? "#059669" : "#9CA3AF", fontWeight: s.punchIn ? 600 : 400 }}>{s.punchIn ?? "—"}</td>
                    <td style={{ padding: "13px 18px", color: s.punchOut ? "#2563EB" : "#9CA3AF", fontWeight: s.punchOut ? 600 : 400 }}>{s.punchOut ?? "—"}</td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ background: ss.bg, color: ss.color, borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
