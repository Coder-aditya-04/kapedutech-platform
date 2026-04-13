"use client";
import { useEffect, useState, useCallback } from "react";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type AttendanceRecord = { id: string; studentId: string; date: string; type: "PUNCH_IN" | "PUNCH_OUT"; markedAt: string; student: Student };
type Summary = { student: Student; punchIn: string | null; punchOut: string | null; punchInMs: number | null; punchOutMs: number | null };

const BATCHES = ["All", "JEE", "NEET"];

function duration(inMs: number, outMs: number) {
  const diff = Math.floor((outMs - inMs) / 60000);
  const h = Math.floor(diff / 60), m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function exportCSV(summaries: Summary[], date: string) {
  const rows = [
    ["Name", "Enrollment", "Batch", "Punch In", "Punch Out", "Duration", "Status"],
    ...summaries.map(s => {
      const status = s.punchIn && s.punchOut ? "Complete" : s.punchIn ? "Partial" : "Absent";
      const dur = s.punchInMs && s.punchOutMs ? duration(s.punchInMs, s.punchOutMs) : "";
      return [s.student.name, s.student.enrollmentNo, s.student.batch || "", s.punchIn || "", s.punchOut || "", dur, status];
    }),
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `attendance_${date}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState("All");
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const load = useCallback(async () => {
    try {
      const url = date === today
        ? (batch === "All" ? "/api/admin/attendance/today" : `/api/admin/attendance/batch?batch=${batch}`)
        : `/api/admin/attendance/date?date=${date}${batch !== "All" ? `&batch=${batch}` : ""}`;
      const [recRes, stuRes] = await Promise.all([fetch(url), fetch("/api/admin/students")]);
      setRecords(recRes.ok ? await recRes.json() : []);
      setAllStudents(stuRes.ok ? await stuRes.json() : []);
    } catch {}
    setLoading(false);
  }, [batch, date, today]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const summaryMap = new Map<string, Summary>();
  records.forEach(r => {
    if (!summaryMap.has(r.studentId)) summaryMap.set(r.studentId, { student: r.student, punchIn: null, punchOut: null, punchInMs: null, punchOutMs: null });
    const s = summaryMap.get(r.studentId)!;
    const ms = new Date(r.markedAt).getTime();
    const time = new Date(r.markedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    if (r.type === "PUNCH_IN") { s.punchIn = time; s.punchInMs = ms; }
    if (r.type === "PUNCH_OUT") { s.punchOut = time; s.punchOutMs = ms; }
  });

  // Add absent students (those with no records for the selected date)
  const batchFiltered = batch === "All" ? allStudents : allStudents.filter(s => s.batch === batch);
  batchFiltered.forEach(s => {
    if (!summaryMap.has(s.id)) {
      summaryMap.set(s.id, { student: s, punchIn: null, punchOut: null, punchInMs: null, punchOutMs: null });
    }
  });

  const summaries = Array.from(summaryMap.values());
  const presentCount = summaries.filter(s => s.punchIn !== null).length;
  const totalCount = batchFiltered.length;
  const absentCount = Math.max(0, totalCount - presentCount);

  const statCards = [
    { label: "Present", value: presentCount, color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    { label: "Absent", value: absentCount, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
    { label: "Total", value: totalCount, color: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" },
  ];

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ padding: "32px 36px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1C2B33", margin: 0, letterSpacing: -0.3 }}>Attendance</h1>
          <p style={{ color: "#5D6C7B", marginTop: 4, fontSize: 14 }}>{displayDate}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #CED0D4", borderRadius: 8, fontSize: 14, outline: "none", color: "#1C2B33", background: "#fff", cursor: "pointer" }}
          />
          <button
            onClick={() => exportCSV(summaries, date)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "1px solid #CED0D4", borderRadius: 100, background: "#fff", color: "#1C2B33", fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.06)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats + Batch filter */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "14px 22px", display: "flex", alignItems: "center", gap: 12, border: `1px solid ${s.border}` }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{loading ? "—" : s.value}</span>
            <span style={{ fontSize: 13, color: s.color, fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {BATCHES.map(b => (
            <button key={b} onClick={() => setBatch(b)} style={{
              padding: "6px 16px", borderRadius: 100, border: "none",
              background: batch === b ? "#0064E0" : "#F1F4F7",
              color: batch === b ? "#fff" : "#5D6C7B",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}>{b}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#F9FAFB" }}>
                {["Name", "Enrollment", "Batch", "Punch In", "Punch Out", "Duration", "Status"].map(h => (
                  <th key={h} style={{ padding: "11px 18px", textAlign: "left", color: "#9CA3AF", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.7 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>Loading...</td></tr>
              ) : summaries.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>No records found</td></tr>
              ) : summaries.map(s => {
                const status = s.punchIn && s.punchOut ? "Complete" : s.punchIn ? "Partial" : "Absent";
                const dur = s.punchInMs && s.punchOutMs ? duration(s.punchInMs, s.punchOutMs) : "—";
                const statusColor = status === "Complete" ? "#059669" : status === "Partial" ? "#D97706" : "#DC2626";
                const statusBg = status === "Complete" ? "#ECFDF5" : status === "Partial" ? "#FFFBEB" : "#FEF2F2";
                return (
                  <tr key={s.student.id} style={{ borderTop: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "13px 18px", fontWeight: 600, color: "#111827" }}>{s.student.name}</td>
                    <td style={{ padding: "13px 18px", color: "#6B7280", fontFamily: "monospace", fontSize: 13 }}>{s.student.enrollmentNo}</td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ background: s.student.batch === "JEE" ? "#0064E0" : "#6441D2", color: "#fff", borderRadius: 100, padding: "4px 12px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: "inline-block" }}>{s.student.batch || "—"}</span>
                    </td>
                    <td style={{ padding: "13px 18px", color: s.punchIn ? "#059669" : "#9CA3AF", fontWeight: s.punchIn ? 600 : 400 }}>{s.punchIn ?? "—"}</td>
                    <td style={{ padding: "13px 18px", color: s.punchOut ? "#2563EB" : "#9CA3AF", fontWeight: s.punchOut ? 600 : 400 }}>{s.punchOut ?? "—"}</td>
                    <td style={{ padding: "13px 18px", color: "#374151", fontWeight: 500 }}>{dur}</td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ background: statusBg, color: statusColor, borderRadius: 20, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>{status}</span>
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
