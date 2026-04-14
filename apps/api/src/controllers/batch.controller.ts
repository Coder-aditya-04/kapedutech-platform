import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export async function listBatches(req: Request, res: Response): Promise<void> {
  const batches = await prisma.batch.findMany({ orderBy: { createdAt: "asc" } });
  res.json(batches);
}

export async function createBatch(req: Request, res: Response): Promise<void> {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) { res.status(400).json({ message: "Batch name is required." }); return; }
  const existing = await prisma.batch.findFirst({ where: { name: name.trim() } });
  if (existing) { res.status(409).json({ message: "Batch already exists." }); return; }
  const batch = await prisma.batch.create({ data: { name: name.trim() } });
  res.status(201).json(batch);
}

export async function deleteBatch(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const count = await prisma.student.count({ where: { batch: (await prisma.batch.findUnique({ where: { id } }))?.name ?? "" } });
  if (count > 0) { res.status(400).json({ message: `Cannot delete — ${count} student(s) are in this batch.` }); return; }
  await prisma.batch.delete({ where: { id } });
  res.json({ message: "Batch deleted." });
}

export async function batchAnalytics(req: Request, res: Response): Promise<void> {
  const batches = await prisma.batch.findMany({ orderBy: { createdAt: "asc" } });
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const endDate = today.toISOString().slice(0, 10);

  const analytics = await Promise.all(batches.map(async (batch) => {
    const students = await prisma.student.findMany({ where: { batch: batch.name }, select: { id: true } });
    const studentIds = students.map(s => s.id);
    const totalStudents = studentIds.length;

    if (totalStudents === 0) return { ...batch, totalStudents: 0, avgAttendancePct: 0 };

    // Count unique present days per student in last 30 days
    const attendances = await prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, date: { gte: startDate, lte: endDate }, type: "PUNCH_IN" },
      select: { studentId: true, date: true },
    });

    // Unique days in range
    const allDates = new Set(attendances.map(a => a.date));
    const totalWorkingDays = allDates.size;

    if (totalWorkingDays === 0) return { ...batch, totalStudents, avgAttendancePct: 0 };

    // Per student: count unique days present
    const perStudent = new Map<string, Set<string>>();
    for (const a of attendances) {
      if (!perStudent.has(a.studentId)) perStudent.set(a.studentId, new Set());
      perStudent.get(a.studentId)!.add(a.date);
    }

    const totalPresent = Array.from(perStudent.values()).reduce((sum, days) => sum + days.size, 0);
    const avgAttendancePct = Math.round((totalPresent / (totalStudents * totalWorkingDays)) * 100);

    return { ...batch, totalStudents, avgAttendancePct, totalWorkingDays };
  }));

  res.json(analytics);
}
