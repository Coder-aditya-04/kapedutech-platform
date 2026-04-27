import { ScrollView, View, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { getStudentResults, type TestResult } from "@/src/api/auth";

type Student = { id: string; name: string; enrollmentNo: string; batch: string };
type Parent = { id: string; name: string; phone: string; students: Student[] };

const PURPLE = "#4F46E5";
const CARD_BG = "#FFFFFF";

function getRankColor(rank: number | null) {
  if (!rank) return "#6B7280";
  if (rank === 1) return "#F59E0B";
  if (rank <= 3) return "#6366F1";
  if (rank <= 10) return "#059669";
  return "#6B7280";
}

function ScoreBar({ label, score, max = 180 }: { label: string; score: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color = pct >= 70 ? "#059669" : pct >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: "#374151", fontWeight: "600" }}>{label}</Text>
        <Text style={{ fontSize: 12, color, fontWeight: "700" }}>{score}/{max}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: "#F3F4F6", borderRadius: 3 }}>
        <View style={{ height: 6, width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function ResultCard({ result, expanded, onToggle }: { result: TestResult; expanded: boolean; onToggle: () => void }) {
  const rankColor = getRankColor(result.rank);
  const subjects = Object.entries(result.scores);
  const pctColor = result.percentage >= 70 ? "#059669" : result.percentage >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={{ backgroundColor: CARD_BG, borderRadius: 16, marginBottom: 12, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      {/* Header */}
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>{result.testName}</Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>
              {new Date(result.testDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: pctColor }}>{result.percentage.toFixed(1)}%</Text>
            <Text style={{ fontSize: 11, color: "#9CA3AF" }}>{result.total} marks</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {result.rank && (
            <View style={{ backgroundColor: `${rankColor}18`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: rankColor }}>
                #{result.rank} Rank
              </Text>
            </View>
          )}
          {result.percentile !== null && (
            <View style={{ backgroundColor: "#EEF2FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: PURPLE }}>
                {result.percentile}th %ile
              </Text>
            </View>
          )}
          {result.totalInBatch && (
            <View style={{ backgroundColor: "#F3F4F6", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: "#6B7280" }}>of {result.totalInBatch}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Expanded subject breakdown */}
      {expanded && subjects.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Subject Breakdown
          </Text>
          {subjects.map(([subject, score]) => (
            <ScoreBar key={subject} label={subject} score={score} max={result.subjectMaxes?.[subject] ?? 180} />
          ))}
        </View>
      )}

      <View style={{ paddingHorizontal: 16, paddingBottom: 12, alignItems: "center" }}>
        <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{expanded ? "▲ Less" : "▼ Details"}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ResultsScreen() {
  const { phone } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [parentStr, tokenStr] = await Promise.all([
        AsyncStorage.getItem("parent"),
        AsyncStorage.getItem("auth_token"),
      ]);
      if (!parentStr || !tokenStr) return;
      const parent: Parent = JSON.parse(parentStr);
      const student = parent.students?.[0];
      if (!student) return;
      setStudentName(student.name || "Student");
      const data = await getStudentResults(student.id, tokenStr);
      setResults(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onRefresh() { setRefreshing(true); load(true); }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FB", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={PURPLE} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F9FB" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#111827" }}>Results</Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>{studentName}</Text>
        </View>

        {results.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ fontSize: 40 }}>📊</Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151", marginTop: 12 }}>No results yet</Text>
            <Text style={{ fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
              Test results will appear here once uploaded by admin
            </Text>
          </View>
        ) : (
          <>
            {/* Summary row */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: CARD_BG, borderRadius: 14, padding: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: PURPLE }}>{results.length}</Text>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Tests</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: CARD_BG, borderRadius: 14, padding: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#059669" }}>
                  {(results.reduce((a, r) => a + r.percentage, 0) / results.length).toFixed(1)}%
                </Text>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Avg Score</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: CARD_BG, borderRadius: 14, padding: 16, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#F59E0B" }}>
                  {results.filter(r => r.rank && r.rank <= 3).length > 0
                    ? `#${Math.min(...results.map(r => r.rank ?? 999))}`
                    : `#${Math.min(...results.map(r => r.rank ?? 999))}`}
                </Text>
                <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>Best Rank</Text>
              </View>
            </View>

            {results.map(r => (
              <ResultCard
                key={r.id}
                result={r}
                expanded={expandedId === r.id}
                onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
