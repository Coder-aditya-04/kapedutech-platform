"use client";
import { useEffect, useState, useCallback } from "react";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type AttendanceRecord = { id: string; studentId: string; date: string; type: "PUNCH_IN" | "PUNCH_OUT"; markedAt: string; student: Student };
type Summary = { student: Student; punchIn: string | null; punchOut: string | null; punchInMs: number | null; punchOutMs: number | null };

const BATCHES = ["All", "JEE", "NEET"];

function duration(inMs: number, outMs: number) {
  const diff = Math.floor((outMs - inMs) / 60000);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState("All");

  const load = useCallback(async () => {
    try {
      const url = batch === "All" ? "/api/admin/attendance/today" : `/api/admin/attendance/batch?batch=${batch}`;
      const [recRes, stuRes] = await Promise.all([fetch(url), fetch("/api/admin/students")]);
      setRecords(recRes.ok ? await recRes.json() : []);
      setAllStudents(stuRes.ok ? await stuRes.json() : []);
    } catch {}
    setLoading(false);
  }, [batch]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Build summary map
  const summaryMap = new Map<string, Summary>();
  records.forEach(r => {
    if (!summaryMap.has(r.studentId)) {
      summaryMap.set(r.studentId, { student: r.student, punchIn: null, punchOut: null, punchInMs: null, punchOutMs: null });
    }
    const s = summaryMap.get(r.studentId)!;
    const ms = new Date(r.markedAt).getTime();
    const time = new Date(r.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    if (r.type === "PUNCH_IN") { s.punchIn = time; s.punchInMs = ms; }
    if (r.type === "PUNCH_OUT") { s.punchOut = time; s.punchOutMs = ms; }
  });
  const summaries = Array.from(summaryMap.values());
  const presentCount = summaries.length;
  const totalCount = batch === "All" ? allStudents.length : allStudents.filter(s => s.batch === batch).length;
  const absentCount = Math.max(0, totalCount - presentCount);

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", margin: 0 }}>Attendance</h1>
        <p style={{ color: "#6B7280", marginTop: 4, fontSize: 14 }}>Today — {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* Summary bar */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Present", value: presentCount, color: "#10B981", bg: "#D1FAE5" },
          { label: "Absent", value: absentCount, color: "#EF4444", bg: "#FEE2E2" },
          { label: "Total", value: totalCount, color: "#4F46E5", bg: "#EEF2FF" },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value}</span>
            <span style={{ fontSize: 13, color: s.color, fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Batch tabs */}
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
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Name", "Enrollment", "Batch", "Punch In", "Punch Out", "Duration", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6B7280", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
              ) : summaries.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#9CA3AF" }}>No attendance records found</td></tr>
              ) : summaries.map(s => {
                const status = s.punchIn && s.punchOut ? "Complete" : "Partial";
                const statusColor = status === "Complete" ? "#10B981" : "#F59E0B";
                const statusBg = status === "Complete" ? "#D1FAE5" : "#FEF3C7";
                const dur = s.punchInMs && s.punchOutMs ? duration(s.punchInMs, s.punchOutMs) : "—";
                return (
                  <tr key={s.student.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 500, color: "#111827" }}>{s.student.name}</td>
                    <td style={{ padding: "12px 16px", color: "#6B7280" }}>{s.student.enrollmentNo}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#EEF2FF", color: "#4F46E5", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{s.student.batch || "—"}</span>
                    </td>
                    <td style={{ padding: "12px 16px", color: s.punchIn ? "#10B981" : "#9CA3AF", fontWeight: s.punchIn ? 600 : 400 }}>{s.punchIn ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: s.punchOut ? "#2563EB" : "#9CA3AF", fontWeight: s.punchOut ? 600 : 400 }}>{s.punchOut ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#374151" }}>{dur}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: statusBg, color: statusColor, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{status}</span>
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
