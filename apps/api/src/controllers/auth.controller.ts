import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "dev_secret_change_in_prod";
const OTP_TTL_MINUTES = 10;

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone?: string };

  if (!phone || !/^\d{10}$/.test(phone)) {
    res.status(400).json({ message: "A valid 10-digit phone number is required." });
    return;
  }

  const parent = await prisma.parent.findFirst({ where: { phone } });
  if (!parent) {
    res.status(404).json({ message: "No parent account found for this number." });
    return;
  }

  // Invalidate any previous unused OTPs for this phone
  await prisma.otp.updateMany({
    where: { phone, verified: false },
    data: { verified: true },
  });

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otp.create({ data: { phone, otp, expiresAt } });

  // Send OTP via Fast2SMS (India) if API key is set, otherwise log to console
  const fast2smsKey = process.env["FAST2SMS_API_KEY"];
  if (fast2smsKey) {
    try {
      const smsRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: phone,
        }),
      });
      const smsData = await smsRes.json() as { return: boolean; message?: string[] };
      if (!smsData.return) {
        console.error(`[OTP] SMS failed:`, smsData.message);
      } else {
        console.log(`[OTP] SMS sent to ${phone}`);
      }
    } catch (e) {
      console.error(`[OTP] SMS error:`, e);
    }
  } else {
    // Development fallback — read from Render/server logs
    console.log(`[OTP] Phone: ${phone}  OTP: ${otp}  Expires: ${expiresAt.toISOString()}`);
  }

  res.status(200).json({ message: "OTP sent successfully." });
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  const { phone, otp } = req.body as { phone?: string; otp?: string };

  if (!phone || !otp) {
    res.status(400).json({ message: "phone and otp are required." });
    return;
  }

  const record = await prisma.otp.findFirst({
    where: { phone, otp, verified: false },
    orderBy: { expiresAt: "desc" },
  });

  if (!record) {
    res.status(401).json({ message: "Invalid OTP." });
    return;
  }

  if (record.expiresAt < new Date()) {
    res.status(401).json({ message: "OTP has expired. Please request a new one." });
    return;
  }

  await prisma.otp.update({ where: { id: record.id }, data: { verified: true } });

  const parent = await prisma.parent.findFirst({
    where: { phone },
    include: {
      students: {
        select: {
          id: true,
          name: true,
          enrollmentNo: true,
          qrCode: true,
        },
      },
    },
  });

  if (!parent) {
    res.status(404).json({ message: "Parent not found." });
    return;
  }

  const token = jwt.sign({ parentId: parent.id, phone: parent.phone }, JWT_SECRET, {
    expiresIn: "30d",
  });

  res.status(200).json({
    token,
    parent: {
      id: parent.id,
      name: parent.name,
      phone: parent.phone,
      students: parent.students,
    },
  });
}

export async function savePushToken(req: Request, res: Response): Promise<void> {
  const { parentId, pushToken } = req.body as { parentId?: string; pushToken?: string };

  if (!parentId || !pushToken) {
    res.status(400).json({ message: "parentId and pushToken are required." });
    return;
  }

  await prisma.parent.update({ where: { id: parentId }, data: { pushToken } });

  res.status(200).json({ message: "Push token saved." });
}
