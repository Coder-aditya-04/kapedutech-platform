import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { sendPushNotification } from "../services/notification.service.js";

export async function qrScan(req: Request, res: Response): Promise<void> {
  const { qrCode } = req.body as { qrCode?: string };

  if (!qrCode || typeof qrCode !== "string") {
    res.status(400).json({ message: "qrCode is required." });
    return;
  }

  // QR data format: "<studentId>:<enrollmentNo>"
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

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const existing = await prisma.attendance.findFirst({
    where: { studentId: student.id, date: today },
  });

  if (existing) {
    res.status(409).json({ message: "Attendance already marked for today." });
    return;
  }

  const time = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const studentName = student.name || student.enrollmentNo;

  const record = await prisma.attendance.create({
    data: {
      studentId: student.id,
      date: today,
      notificationSent: false,
    },
  });

  await sendPushNotification(student.parent.pushToken ?? null, studentName, time);
  await prisma.attendance.update({
    where: { id: record.id },
    data: { notificationSent: true },
  });
  console.log(`Push notification sent to parent of ${studentName}`);

  res.status(200).json({
    success: true,
    studentName,
    time,
  });
}
