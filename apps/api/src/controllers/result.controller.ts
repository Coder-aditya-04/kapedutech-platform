import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

// Admin: upload results for a batch test
export async function uploadResults(req: Request, res: Response): Promise<void> {
  const { testName, testDate, results } = req.body as {
    testName?: string;
    testDate?: string;
    results?: {
      studentId: string;
      rank: number;
      totalInBatch: number;
      scores: Record<string, number>;
      total: number;
      percentage: number;
    }[];
  };

  if (!testName || !testDate || !results?.length) {
    res.status(400).json({ message: "testName, testDate, and results are required." });
    return;
  }

  // Calculate percentile for each student: (students below / total - 1) * 100
  const withPercentile = results.map(r => {
    const studentsBelow = r.totalInBatch - r.rank;
    const percentile = r.totalInBatch > 1
      ? Math.round((studentsBelow / (r.totalInBatch - 1)) * 100 * 10) / 10
      : 100;
    return { ...r, percentile };
  });

  // Delete existing results for same test + students to allow re-upload
  await prisma.testResult.deleteMany({
    where: {
      testName,
      testDate,
      studentId: { in: results.map(r => r.studentId) },
    },
  });

  await prisma.testResult.createMany({
    data: withPercentile.map(r => ({
      testName,
      testDate,
      studentId: r.studentId,
      rank: r.rank,
      totalInBatch: r.totalInBatch,
      scores: r.scores,
      total: r.total,
      percentage: r.percentage,
      percentile: r.percentile,
    })),
  });

  res.status(201).json({ message: `${results.length} results uploaded.` });
}

// Admin: list all tests uploaded
export async function listTests(req: Request, res: Response): Promise<void> {
  const tests = await prisma.testResult.groupBy({
    by: ["testName", "testDate"],
    _count: { id: true },
    orderBy: { testDate: "desc" },
  });
  res.json(tests.map(t => ({ testName: t.testName, testDate: t.testDate, count: t._count.id })));
}

// Admin: get all results for a specific test
export async function getTestResults(req: Request, res: Response): Promise<void> {
  const testName = decodeURIComponent(req.params["testName"] as string);
  const testDate = req.query["date"] as string;
  const results = await prisma.testResult.findMany({
    where: { testName, ...(testDate ? { testDate } : {}) },
    include: { student: { select: { name: true, enrollmentNo: true, batch: true } } },
    orderBy: { rank: "asc" },
  });
  res.json(results);
}

// Parent/mobile: get results for a specific student
export async function getStudentResults(req: Request, res: Response): Promise<void> {
  const { studentId } = req.params;
  const results = await prisma.testResult.findMany({
    where: { studentId },
    orderBy: { testDate: "desc" },
    take: 20,
  });
  res.json(results);
}
