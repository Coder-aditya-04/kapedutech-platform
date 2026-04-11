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
      const [recRes, stuRes] = await Promise.all([
        fetch("/api/admin/attendance/today"),
        fetch("/api/admin/students"),
      ]);
      setRecords(recRes.ok ? await recRes.json() : []);
      setStudents(stuRes.ok ? await stuRes.json() : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const filtered = batch === "All" ? records : records.filter(r => r.student?.batch === batch);

  // Group by student
  const summaryMap = new Map<string, StudentSummary>();
  filtered.forEach(r => {
    if (!summaryMap.has(r.studentId)) {
      summaryMap.set(r.studentId, { student: r.student, punchIn: null, punchOut: null });
    }
    const s = summaryMap.get(r.studentId)!;
    if (r.type === "PUNCH_IN") s.punchIn = new Date(r.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    if (r.type === "PUNCH_OUT") s.punchOut = new Date(r.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  });
  const summaries = Array.from(summaryMap.values());
  const presentIds = new Set(filtered.map(r => r.studentId));

  const stats = [
    { label: "Total Students", value: students.length, color: "#4F46E5", bg: "#EEF2FF" },
    { label: "Present Today", value: presentIds.size, color: "#10B981", bg: "#D1FAE5" },
    { label: "Punch Ins", value: filtered.filter(r => r.type === "PUNCH_IN").length, color: "#2563EB", bg: "#DBEAFE" },
    { label: "Punch Outs", value: filtered.filter(r => r.type === "PUNCH_OUT").length, color: "#7C3AED", bg: "#EDE9FE" },
  ];

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Dashboard</h1>
        <p style={{ color: "#6B7280", marginTop: 4, fontSize: 14 }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value}</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Batch filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {BATCHES.map(b => (
          <button key={b} onClick={() => setBatch(b)} style={{
            padding: "6px 18px", borderRadius: 20, border: "1px solid",
            borderColor: batch === b ? "#4F46E5" : "#E5E7EB",
            background: batch === b ? "#EEF2FF" : "#fff",
            color: batch === b ? "#4F46E5" : "#6B7280",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}>{b}</button>
        ))}
        <button onClick={load} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 20, border: "1px solid #E5E7EB", background: "#fff", color: "#6B7280", fontSize: 13, cursor: "pointer" }}>
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Student Name", "Enrollment", "Batch", "Punch In", "Punch Out", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6B7280", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
              ) : summaries.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>No attendance records for today</td></tr>
              ) : (
                summaries.map(s => {
                  const status = s.punchIn && s.punchOut ? "Complete" : s.punchIn ? "Partial" : "Absent";
                  const statusColor = status === "Complete" ? "#10B981" : status === "Partial" ? "#F59E0B" : "#EF4444";
                  const statusBg = status === "Complete" ? "#D1FAE5" : status === "Partial" ? "#FEF3C7" : "#FEE2E2";
                  return (
                    <tr key={s.student.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500, color: "#111827" }}>{s.student.name}</td>
                      <td style={{ padding: "12px 16px", color: "#6B7280" }}>{s.student.enrollmentNo}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: "#EEF2FF", color: "#4F46E5", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{s.student.batch || "—"}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: s.punchIn ? "#10B981" : "#9CA3AF", fontWeight: s.punchIn ? 600 : 400 }}>{s.punchIn ?? "—"}</td>
                      <td style={{ padding: "12px 16px", color: s.punchOut ? "#2563EB" : "#9CA3AF", fontWeight: s.punchOut ? 600 : 400 }}>{s.punchOut ?? "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ background: statusBg, color: statusColor, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
