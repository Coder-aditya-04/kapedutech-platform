"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash, ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";

type Batch = { id: string; name: string; createdAt: string };
type Analytics = Batch & { totalStudents: number; avgAttendancePct: number; totalWorkingDays?: number };

const PALETTE = ["#1D6BF3","#7C3AED","#0D9488","#B45309","#0891B2","#BE185D","#16A34A","#DC2626"];
function attColor(p: number) { return p >= 75 ? "#16A34A" : p >= 50 ? "#D97706" : "#DC2626"; }

// Spotlight card — zero-state glow
function SpotlightBatch({ children, accent, onClick }: { children: React.ReactNode; accent: string; onClick: () => void }) {
  const ref  = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={e => {
        if (!ref.current || !glow.current) return;
        const r = ref.current.getBoundingClientRect();
        glow.current.style.opacity = "1";
        glow.current.style.background = `radial-gradient(280px circle at ${e.clientX-r.left}px ${e.clientY-r.top}px, ${accent}1E, transparent 60%)`;
      }}
      onMouseLeave={() => { if (glow.current) glow.current.style.opacity = "0"; }}
      style={{ position:"relative", cursor:"pointer", overflow:"hidden",
        background:"var(--admin-card-bg)",
        borderRadius:20,
        border:"1px solid var(--admin-card-border)",
        boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
        transition:"transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s cubic-bezier(0.16,1,0.3,1)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform="translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow="0 14px 36px rgba(0,0,0,0.1)"; }}
    >
      <div ref={glow} style={{ position:"absolute", inset:0, borderRadius:"inherit", pointerEvents:"none", opacity:0, transition:"opacity 0.3s ease", zIndex:10 }} />
      {children}
    </div>
  );
}

const sp = { type:"spring" as const, stiffness:110, damping:22 };
const grid = { hidden:{}, show:{ transition:{ staggerChildren:0.07, delayChildren:0.05 } } };
const item = { hidden:{ opacity:0, y:20, scale:0.97 }, show:{ opacity:1, y:0, scale:1, transition:sp } };

export default function BatchesPage() {
  const router = useRouter();
  const [batches,  setBatches]  = useState<Analytics[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [newName,  setNewName]  = useState("");
  const [creating, setCreating] = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/batches/analytics");
      setBatches(res.ok ? await res.json() : []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/batches", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ name:newName.trim() }),
      });
      const d = await res.json();
      if (res.ok) { showToast(`"${newName.trim()}" created`, true); setNewName(""); load(); }
      else showToast(d.message ?? "Failed", false);
    } catch { showToast("Network error", false); }
    setCreating(false);
  }

  async function handleDelete(batch: Analytics) {
    if (!confirm(`Delete batch "${batch.name}"?`)) return;
    const res = await fetch(`/api/admin/batches/${batch.id}`, { method:"DELETE" });
    const d = await res.json();
    if (res.ok) { showToast("Batch deleted", true); load(); }
    else showToast(d.message ?? "Failed", false);
  }

  return (
    <div className="admin-page" style={{ fontFamily:"var(--font-geist-sans,'Geist',system-ui,sans-serif)" }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity:0, y:-16, scale:0.96 }}
            animate={{ opacity:1, y:0, scale:1 }}
            exit={{ opacity:0, y:-12, scale:0.96 }}
            transition={sp}
            style={{
              position:"fixed", top:22, right:22, zIndex:200,
              background:"var(--admin-card-bg)",
              border:`1px solid ${toast.ok ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}`,
              color: toast.ok ? "#16A34A" : "#DC2626",
              padding:"11px 18px", borderRadius:14, fontWeight:600, fontSize:13,
              boxShadow:"0 8px 28px rgba(0,0,0,0.12)",
              display:"flex", alignItems:"center", gap:8,
            }}
          >
            {toast.ok ? <CheckCircle size={15} weight="bold"/> : <WarningCircle size={15} weight="bold"/>}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ ...sp, delay:0.04 }}
        style={{ marginBottom:28 }}
      >
        <h1 style={{ fontSize:24, fontWeight:700, color:"var(--admin-text)", margin:0, letterSpacing:"-0.5px" }}>Batches</h1>
        <p style={{ color:"var(--admin-text-muted)", marginTop:4, fontSize:13 }}>Manage batches and track attendance analytics</p>
      </motion.div>

      {/* Create batch form */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ ...sp, delay:0.08 }}
        style={{ background:"var(--admin-card-bg)", borderRadius:18, border:"1px solid var(--admin-card-border)", padding:"20px 24px", marginBottom:28, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}
      >
        <h2 style={{ fontSize:14, fontWeight:600, color:"var(--admin-text)", margin:"0 0 14px", letterSpacing:"-0.2px" }}>New Batch</h2>
        <form onSubmit={handleCreate} style={{ display:"flex", gap:8 }}>
          <input
            placeholder="e.g. JEE 2026, NEET Morning, CONQUER+"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{
              flex:1, padding:"9px 14px",
              border:"1px solid var(--admin-card-border)", borderRadius:12,
              fontSize:13, outline:"none",
              background:"var(--admin-input-bg)", color:"var(--admin-text)",
              transition:"border-color 0.15s",
            }}
            onFocus={e =>  { e.target.style.borderColor = "#1D6BF3"; }}
            onBlur={e =>   { e.target.style.borderColor = "var(--admin-card-border)"; }}
          />
          <motion.button
            type="submit"
            disabled={creating || !newName.trim()}
            whileTap={{ scale:0.97 }}
            style={{
              padding:"9px 20px", background:"#1D6BF3", color:"#fff",
              border:"none", borderRadius:12, fontSize:13, fontWeight:600,
              cursor:"pointer", opacity: creating || !newName.trim() ? 0.55 : 1,
              display:"flex", alignItems:"center", gap:6,
              transition:"opacity 0.15s",
            }}
          >
            <Plus size={14} weight="bold"/>
            {creating ? "Creating…" : "Create"}
          </motion.button>
        </form>
      </motion.div>

      {/* Batch cards */}
      {loading ? (
        <div className="card-grid">
          {Array.from({length:4}).map((_,i) => (
            <div key={i} style={{ background:"var(--admin-card-bg)", borderRadius:20, border:"1px solid var(--admin-card-border)", padding:24, height:176 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <div className="admin-skeleton" style={{ height:20, width:110, borderRadius:100, marginBottom:10 }} />
                  <div className="admin-skeleton" style={{ height:11, width:72 }} />
                </div>
                <div className="admin-skeleton" style={{ width:26, height:26, borderRadius:8 }} />
              </div>
              <div className="admin-skeleton" style={{ height:6, borderRadius:100, marginBottom:8 }} />
              <div className="admin-skeleton" style={{ height:10, width:"50%" }} />
            </div>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          style={{ background:"var(--admin-card-bg)", borderRadius:20, border:"1px dashed var(--admin-card-border)", padding:56, textAlign:"center" }}
        >
          <p style={{ color:"var(--admin-text-faint)", margin:0, fontSize:14 }}>No batches yet. Create your first batch above.</p>
        </motion.div>
      ) : (
        <motion.div variants={grid} initial="hidden" animate="show" className="card-grid">
          {batches.map((batch, i) => {
            const color = PALETTE[i % PALETTE.length];
            const pct   = batch.avgAttendancePct;
            return (
              <motion.div key={batch.id} variants={item}>
                <SpotlightBatch accent={color} onClick={() => router.push(`/admin/batches/${encodeURIComponent(batch.name)}`)}>
                  {/* Accent strip */}
                  <div style={{ height:2, background:`linear-gradient(90deg,${color},${color}55,transparent)` }} />

                  <div style={{ padding:"20px 22px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                      <div>
                        <span style={{
                          background:`${color}14`, color, borderRadius:100,
                          padding:"4px 12px", fontSize:12, fontWeight:700, letterSpacing:"-0.2px",
                        }}>{batch.name}</span>
                        <p style={{ color:"var(--admin-text-muted)", fontSize:13, margin:"8px 0 0" }}>
                          {batch.totalStudents} student{batch.totalStudents!==1?"s":""}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                        onClick={e => { e.stopPropagation(); handleDelete(batch); }}
                        title="Delete batch"
                        style={{
                          border:"1px solid var(--admin-card-border)", borderRadius:9,
                          background:"transparent", color:"var(--admin-text-faint)",
                          width:30, height:30, cursor:"pointer",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          flexShrink:0, transition:"color 0.15s, border-color 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color="#DC2626"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(220,38,38,0.3)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color="var(--admin-text-faint)"; (e.currentTarget as HTMLButtonElement).style.borderColor="var(--admin-card-border)"; }}
                      >
                        <Trash size={13} weight="bold"/>
                      </motion.button>
                    </div>

                    {/* Attendance bar */}
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:11, color:"var(--admin-text-faint)", fontWeight:500 }}>Avg attendance · 30 days</span>
                        <span style={{ fontSize:12, fontWeight:700, color:attColor(pct), fontVariantNumeric:"tabular-nums" }}>{pct}%</span>
                      </div>
                      <div style={{ height:6, background:"var(--admin-card-border)", borderRadius:100, overflow:"hidden" }}>
                        <motion.div
                          initial={{ scaleX:0 }} animate={{ scaleX:pct/100 }}
                          transition={{ duration:0.9, ease:[0.16,1,0.3,1], delay:i*0.06+0.15 }}
                          style={{
                            height:"100%", width:"100%",
                            background:`linear-gradient(90deg,${attColor(pct)},${attColor(pct)}70)`,
                            borderRadius:100, transformOrigin:"left center",
                          }}
                        />
                      </div>
                      {batch.totalWorkingDays !== undefined && (
                        <p style={{ fontSize:10, color:"var(--admin-text-faint)", margin:"5px 0 0" }}>
                          {batch.totalWorkingDays} working day{batch.totalWorkingDays!==1?"s":""}
                        </p>
                      )}
                    </div>

                    {/* CTA footer */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, paddingTop:14, borderTop:"1px solid var(--admin-card-border)" }}>
                      <span style={{ fontSize:12, color:color, fontWeight:600 }}>View details</span>
                      <ArrowRight size={14} weight="bold" color={color}/>
                    </div>
                  </div>
                </SpotlightBatch>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
