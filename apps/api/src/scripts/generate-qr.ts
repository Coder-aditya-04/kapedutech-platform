import { prisma } from "../lib/prisma.js";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

const QR_OUTPUT_DIR = path.resolve(process.cwd(), "public/qrcodes");

async function generateQRCodes() {
  fs.mkdirSync(QR_OUTPUT_DIR, { recursive: true });

  const students = await prisma.student.findMany({
    where: { qrCodeGenerated: false },
  });

  if (students.length === 0) {
    console.log("No students pending QR code generation.");
    return;
  }

  console.log(`Generating QR codes for ${students.length} student(s)...`);

  for (const student of students) {
    const qrData = `${student.id}:${student.enrollmentNo}`;
    const filename = `${student.enrollmentNo}.png`;
    const filePath = path.join(QR_OUTPUT_DIR, filename);

    await QRCode.toFile(filePath, qrData, { type: "png" });

    await prisma.student.update({
      where: { id: student.id },
      data: {
        qrCode: qrData,
        qrCodeGenerated: true,
      },
    });

    console.log(`  [OK] ${student.enrollmentNo} -> public/qrcodes/${filename}`);
  }

  console.log("Done.");
}

generateQRCodes()
  .catch((err) => {
    console.error("Error generating QR codes:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect?.());
