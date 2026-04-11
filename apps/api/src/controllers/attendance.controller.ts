import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { sendPushNotification } from "../services/notification.service.js";

export async function qrScan(req: Request, res: Response): Promise<void> {
  const { qrCode } = req.body as { qrCode?: string };

  if (!qrCode || typeof qrCode !== "string") {
    res.status(400).json({ message: "qrCode is required." });
    return;
  }

  const [studentId] = qrCode.split(":");
  if (!studentId) {
    res.status(400).json({ message: "Invalid QR code format." });
    return;
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { parent: true },
  });

  if (!student) {
    res.status(404).json({ message: "Student not found." });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const studentName = student.name || student.enrollmentNo;
  const time = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const todayRecords = await prisma.attendance.findMany({
    where: { studentId: student.id, date: today },
  });

  const hasPunchIn = todayRecords.some(r => r.type === "PUNCH_IN");
  const hasPunchOut = todayRecords.some(r => r.type === "PUNCH_OUT");

  if (hasPunchIn && hasPunchOut) {
    res.status(409).json({ message: "Already completed attendance for today." });
    return;
  }

  const type = hasPunchIn ? "PUNCH_OUT" : "PUNCH_IN";

  const record = await prisma.attendance.create({
    data: { studentId: student.id, date: today, type, notificationSent: false },
  });

  const notifTitle = type === "PUNCH_IN" ? "Attendance Marked" : "Punch Out";
  const notifBody = type === "PUNCH_IN"
    ? `${studentName} punched in at ${time}`
    : `${studentName} punched out at ${time}`;

  await sendPushNotification(student.parent.pushToken ?? null, notifTitle, notifBody);
  await prisma.attendance.update({ where: { id: record.id }, data: { notificationSent: true } });

  console.log(`[${type}] ${studentName} at ${time}`);
  res.status(200).json({ success: true, studentName, time, type });
}

export async function getStudentAttendance(req: Request, res: Response): Promise<void> {
  const studentId = req.params["studentId"] as string;
  const records = await prisma.attendance.findMany({
    where: { studentId },
    orderBy: { markedAt: "desc" },
    take: 30,
  });
  res.json(records);
}

export async function getStudentTodayAttendance(req: Request, res: Response): Promise<void> {
  const studentId = req.params["studentId"] as string;
  const today = new Date().toISOString().slice(0, 10);
  const records = await prisma.attendance.findMany({
    where: { studentId, date: today },
  });
  const punchIn = records.find(r => r.type === "PUNCH_IN");
  const punchOut = records.find(r => r.type === "PUNCH_OUT");
  // Return raw ISO timestamps so the mobile client formats in its own timezone
  res.json({
    punchIn: punchIn ? punchIn.markedAt.toISOString() : null,
    punchOut: punchOut ? punchOut.markedAt.toISOString() : null,
  });
}
