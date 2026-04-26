"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, MagnifyingGlass, X, CalendarCheck,
  Trophy, Student, ChartBar, ClockCounterClockwise,
  TrendUp, TrendDown, Minus,
} from "@phosphor-icons/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type TestResult = {
  testName: string;
  testDate: string;
  rank: number | null;
  total: number;
  percentage: number;
  percentile: number | null;
  scores: Record<string, number>;
  totalInBatch: number | null;
};

type StudentData = {
  id: string;
  name: string;
  enrollmentNo: string;
  batch: string;
  attendancePct: number;
  presentDays: number;
  totalWorkingDays: number;
  lastSeen: string | null;
  results: TestResult[];
};

type BatchDetail = {
  batchName: string;
  totalStudents: number;
  totalWorkingDays: number;
  students: StudentData[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const COLORS = ["#0064E0", "#6441D2", "#059669", "#D97706", "#0891B2", "#7C3AED", "#BE185D", "#DC2626"];

function attColor(p: number) {
  return p >= 75 ? "#059669" : p >= 50 ? "#D97706" : "#DC2626";
}
function scoreColor(p: number) {
  return p >= 70 ? "#059669" : p >= 50 ? "#D97706" : "#DC2626";
}
function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function formatLastSeen(ts: string | null) {
  if (!ts) return "Never";
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function rankBadge(rank: number | null, total: number | null) {
  if (!rank || !total) return null;
  if (rank === 1) return { label: `#1`, bg: "#FEF9C3", color: "#854D0E" };
  if (rank === 2) return { label: `#2`, bg: "#F1F5F9", color: "#475569" };
  if (rank === 3) return { label: `#3`, bg: "#FEF2F2", color: "#9A3412" };
  return { label: `#${rank}`, bg: "#F3F4F6", color: "#374151" };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const spring = { type: "spring" as const, stiffness: 110, damping: 20 };

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: spring },
};

// Custom tooltip for recharts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1E293B", color: "#F1F5F9", borderRadius: 10, padding: "8px 14px", fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name}>{p.value}</div>
      ))}
    </div>
  );
}

// Student detail slide panel
const StudentPanel = React.memo(function StudentPanel({
  student, batchColor, onClose,
}: { student: StudentData; batchColor: string; onClose: () => void }) {
  const [expandedTest, setExpandedTest] = useState<string | null>(null);
  const att = student.attendancePct;

  const subjectChartData = useMemo(() => {
    if (!student.results.length) return [];
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const r of student.results) {
      for (const [subj, score] of Object.entries(r.scores)) {
        if (!totals[subj]) totals[subj] = { sum: 0, count: 0 };
        totals[subj].sum += score;
        totals[subj].count += 1;
      }
    }
    return Object.entries(totals).map(([subj, d]) => ({
      subject: subj,
      avg: Math.round(d.sum / d.count),
    }));
  }, [student.results]);

  const avgPct = student.results.length
    ? Math.round(student.results.reduce((s, r) => s + r.percentage, 0) / student.results.length)
    : null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          zIndex: 50, backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 35 }}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(520px, 100vw)",
          background: "var(--admin-card-bg)",
          zIndex: 51,
          display: "flex", flexDirection: "column",
          boxShadow: "-4px 0 40px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid var(--admin-card-border)",
          display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: `${batchColor}18`, color: batchColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>{initials(student.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--admin-text)", letterSpacing: "-0.3px" }}>{student.name}</div>
            <div style={{ fontSize: 13, color: "var(--admin-text-muted)" }}>{student.enrollmentNo} · {student.batch}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: "var(--admin-text-muted)", borderRadius: 8, display: "flex" }}
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Attendance", value: `${att}%`, color: attColor(att), icon: <CalendarCheck size={16} weight="bold" /> },
              { label: "Avg Score", value: avgPct ? `${avgPct}%` : "—", color: avgPct ? scoreColor(avgPct) : "#9CA3AF", icon: <ChartBar size={16} weight="bold" /> },
              { label: "Tests", value: student.results.length, color: "#0064E0", icon: <Trophy size={16} weight="bold" /> },
            ].map(s => (
              <div key={s.label} style={{ background: "var(--admin-page-bg)", borderRadius: 12, padding: "12px 14px", border: "1px solid var(--admin-card-border)" }}>
                <div style={{ color: "var(--admin-text-faint)", marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--admin-text-faint)" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Attendance bar */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-text)", marginBottom: 10 }}>Attendance (Last 30 Days)</div>
            <div style={{ background: "var(--admin-page-bg)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--admin-card-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--admin-text-muted)" }}>
                  {student.presentDays} of {student.totalWorkingDays} working days
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: attColor(att) }}>{att}%</span>
              </div>
              <div style={{ height: 8, background: "var(--admin-card-border)", borderRadius: 100, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${att}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ height: "100%", background: attColor(att), borderRadius: 100 }}
                />
              </div>
              <div style={{ fontSize: 12, color: "var(--admin-text-faint)", marginTop: 6 }}>
                Last seen: {formatLastSeen(student.lastSeen)}
              </div>
            </div>
          </div>

          {/* Subject averages chart */}
          {subjectChartData.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-text)", marginBottom: 10 }}>Subject Averages</div>
              <div style={{ background: "var(--admin-page-bg)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--admin-card-border)" }}>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={subjectChartData} barSize={28} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                    <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--admin-text-muted)" as string }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--admin-text-faint)" as string }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                      {subjectChartData.map((entry, i) => (
                        <Cell key={entry.subject} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Test results */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-text)", marginBottom: 10 }}>
              Test History ({student.results.length})
            </div>
            {student.results.length === 0 ? (
              <div style={{ background: "var(--admin-page-bg)", borderRadius: 12, padding: 24, textAlign: "center", border: "1px dashed var(--admin-card-border)" }}>
                <span style={{ color: "var(--admin-text-faint)", fontSize: 13 }}>No test results yet</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {student.results.map((r, idx) => {
                  const badge = rankBadge(r.rank, r.totalInBatch);
                  const isExpanded = expandedTest === `${r.testName}-${r.testDate}`;
                  const scoreEntries = Object.entries(r.scores);
                  return (
                    <motion.div
                      key={`${r.testName}-${r.testDate}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: idx * 0.04 }}
                      style={{ background: "var(--admin-page-bg)", borderRadius: 12, border: "1px solid var(--admin-card-border)", overflow: "hidden" }}
                    >
                      <div
                        onClick={() => setExpandedTest(isExpanded ? null : `${r.testName}-${r.testDate}`)}
                        style={{
                          padding: "12px 14px", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.testName}</div>
                          <div style={{ fontSize: 11, color: "var(--admin-text-faint)", marginTop: 1 }}>{formatDate(r.testDate)}</div>
                        </div>
                        {badge && (
                          <span style={{ background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 100, flexShrink: 0 }}>{badge.label}</span>
                        )}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(r.percentage) }}>{r.percentage.toFixed(1)}%</div>
                          {r.percentile != null && <div style={{ fontSize: 11, color: "var(--admin-text-faint)" }}>{r.percentile}ile</div>}
                        </div>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--admin-card-border)" }}>
                              <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                                {scoreEntries.map(([subj, score]) => {
                                  const maxScore = r.total / scoreEntries.length;
                                  const pct = Math.min(100, Math.round((score / maxScore) * 100));
                                  return (
                                    <div key={subj}>
                                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                        <span style={{ fontSize: 12, color: "var(--admin-text-muted)" }}>{subj}</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-text)" }}>{score}</span>
                                      </div>
                                      <div style={{ height: 4, background: "var(--admin-card-border)", borderRadius: 100, overflow: "hidden" }}>
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.6, ease: "easeOut" }}
                                          style={{ height: "100%", background: scoreColor(pct), borderRadius: 100 }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 12, color: "var(--admin-text-faint)" }}>Total: {r.total}</span>
                                  {r.rank && r.totalInBatch && (
                                    <span style={{ fontSize: 12, color: "var(--admin-text-faint)" }}>Rank {r.rank} of {r.totalInBatch}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
});

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchName = decodeURIComponent(params["name"] as string);

  const [data, setData] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "attendance" | "score">("attendance");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/batches/detail/${encodeURIComponent(batchName)}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, [batchName]);

  useEffect(() => { load(); }, [load]);

  const batchColor = COLORS[
    (batchName.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % COLORS.length
  ];

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = [...data.students];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.enrollmentNo.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let av = 0, bv = 0;
      if (sortBy === "name") return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      if (sortBy === "attendance") { av = a.attendancePct; bv = b.attendancePct; }
      if (sortBy === "score") {
        av = a.results[0]?.percentage ?? -1;
        bv = b.results[0]?.percentage ?? -1;
      }
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return list;
  }, [data, search, sortBy, sortDir]);

  const stats = useMemo(() => {
    if (!data) return null;
    const atts = data.students.map(s => s.attendancePct);
    const avgAtt = atts.length ? Math.round(atts.reduce((a, b) => a + b, 0) / atts.length) : 0;
    const below75 = atts.filter(a => a < 75).length;
    const allResults = data.students.flatMap(s => s.results);
    const avgScore = allResults.length ? Math.round(allResults.reduce((a, r) => a + r.percentage, 0) / allResults.length) : null;
    const testsCount = new Set(allResults.map(r => r.testName)).size;
    return { avgAtt, below75, avgScore, testsCount };
  }, [data]);

  function toggleSort(by: "name" | "attendance" | "score") {
    if (sortBy === by) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(by); setSortDir("desc"); }
  }

  const SortIcon = ({ by }: { by: "name" | "attendance" | "score" }) => {
    if (sortBy !== by) return <Minus size={12} style={{ opacity: 0.3 }} />;
    return sortDir === "desc" ? <TrendDown size={12} /> : <TrendUp size={12} />;
  };

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", fontFamily: "var(--font-geist-sans), 'Geist', system-ui, sans-serif" }}>

      {/* Back + Header */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => router.back()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--admin-text-muted)", fontSize: 13, fontWeight: 500,
            padding: "4px 0", marginBottom: 14,
          }}
        >
          <ArrowLeft size={15} weight="bold" /> Back to Batches
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${batchColor}18`, color: batchColor,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Student size={22} weight="bold" />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--admin-text)", margin: 0, letterSpacing: "-0.4px" }}>{batchName}</h1>
            {data && <p style={{ color: "var(--admin-text-muted)", fontSize: 13, margin: "2px 0 0" }}>
              {data.totalStudents} students · {data.totalWorkingDays} working days
            </p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Avg Attendance", value: `${stats.avgAtt}%`, color: attColor(stats.avgAtt), sub: "Last 30 days" },
            { label: "Below 75%", value: stats.below75, color: stats.below75 > 0 ? "#DC2626" : "#059669", sub: `of ${data?.totalStudents} students` },
            { label: "Avg Score", value: stats.avgScore != null ? `${stats.avgScore}%` : "—", color: stats.avgScore ? scoreColor(stats.avgScore) : "#9CA3AF", sub: "Across all tests" },
            { label: "Tests Uploaded", value: stats.testsCount, color: "#0064E0", sub: "Total tests" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.07 }}
              style={{
                background: "var(--admin-card-bg)",
                borderRadius: 16, border: "1px solid var(--admin-card-border)",
                padding: "18px 20px",
                boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 11, color: "var(--admin-text-faint)", fontWeight: 500, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--admin-text-faint)", marginTop: 2 }}>{s.sub}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Search + Sort */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.3 }}
        style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap",
        }}
      >
        <div style={{
          flex: 1, minWidth: 200, position: "relative",
          display: "flex", alignItems: "center",
        }}>
          <MagnifyingGlass size={15} style={{ position: "absolute", left: 12, color: "var(--admin-text-faint)" as string }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or enrollment..."
            style={{
              width: "100%", padding: "9px 12px 9px 34px",
              border: "1.5px solid var(--admin-input-border)", borderRadius: 10,
              fontSize: 13, outline: "none", background: "var(--admin-card-bg)",
              color: "var(--admin-text)",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["name", "attendance", "score"] as const).map(key => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              style={{
                padding: "8px 14px", border: "1.5px solid var(--admin-card-border)",
                borderRadius: 10, fontSize: 12, fontWeight: 500, cursor: "pointer",
                background: sortBy === key ? batchColor : "var(--admin-card-bg)",
                color: sortBy === key ? "#fff" : "var(--admin-text-muted)",
                display: "flex", alignItems: "center", gap: 5,
                transition: "all 0.15s",
              }}
            >
              <SortIcon by={key} />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Student Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: "var(--admin-card-bg)", borderRadius: 16, border: "1px solid var(--admin-card-border)", padding: 20, height: 180 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--admin-card-border)", animation: "pulse 1.5s infinite" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, background: "var(--admin-card-border)", borderRadius: 6, marginBottom: 6, width: "70%" }} />
                  <div style={{ height: 11, background: "var(--admin-card-border)", borderRadius: 6, width: "45%" }} />
                </div>
              </div>
              <div style={{ height: 6, background: "var(--admin-card-border)", borderRadius: 100, marginBottom: 8 }} />
              <div style={{ height: 48, background: "var(--admin-page-bg)", borderRadius: 10 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            background: "var(--admin-card-bg)", borderRadius: 16,
            border: "1px dashed var(--admin-card-border)",
            padding: 48, textAlign: "center",
          }}
        >
          <Student size={40} style={{ color: "var(--admin-text-faint)" as string, marginBottom: 12 }} />
          <p style={{ color: "var(--admin-text-faint)", margin: 0, fontSize: 14 }}>
            {search ? "No students match your search." : "No students in this batch yet."}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((student, i) => {
            const att = student.attendancePct;
            const latestResult = student.results[0];
            const colorIdx = (student.name.charCodeAt(0) + i) % COLORS.length;
            const color = COLORS[colorIdx];

            return (
              <motion.div
                key={student.id}
                variants={cardVariants}
                layout
                whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(0,0,0,0.1)", transition: { duration: 0.15 } }}
                onClick={() => setSelectedStudent(student)}
                style={{
                  background: "var(--admin-card-bg)",
                  borderRadius: 16,
                  border: "1px solid var(--admin-card-border)",
                  padding: 20,
                  cursor: "pointer",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: color, borderRadius: "16px 16px 0 0",
                }} />

                {/* Student header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: `${color}18`, color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>{initials(student.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--admin-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{student.name}</div>
                    <div style={{ fontSize: 11, color: "var(--admin-text-faint)" }}>{student.enrollmentNo}</div>
                  </div>
                </div>

                {/* Attendance */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--admin-text-faint)" }}>Attendance</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: attColor(att) }}>{att}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--admin-card-border)", borderRadius: 100, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${att}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 + i * 0.03 }}
                      style={{ height: "100%", background: attColor(att), borderRadius: 100 }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--admin-text-faint)", marginTop: 2 }}>
                    {student.presentDays}/{student.totalWorkingDays} days
                  </div>
                </div>

                {/* Latest result */}
                <div style={{
                  background: "var(--admin-page-bg)",
                  borderRadius: 10, padding: "9px 12px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  border: "1px solid var(--admin-card-border)",
                }}>
                  {latestResult ? (
                    <>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--admin-text-faint)" }}>Latest</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-text)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {latestResult.testName}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor(latestResult.percentage) }}>
                          {latestResult.percentage.toFixed(1)}%
                        </div>
                        {latestResult.rank && (
                          <div style={{ fontSize: 11, color: "var(--admin-text-faint)" }}>
                            #{latestResult.rank}/{latestResult.totalInBatch}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--admin-text-faint)", width: "100%", textAlign: "center" }}>No tests yet</span>
                  )}
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <span style={{ fontSize: 11, color: "var(--admin-text-faint)" }}>
                    {student.results.length} test{student.results.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--admin-text-faint)" }}>
                    {formatLastSeen(student.lastSeen)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Student Detail Panel */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentPanel
            student={selectedStudent}
            batchColor={COLORS[(selectedStudent.name.charCodeAt(0)) % COLORS.length]}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
