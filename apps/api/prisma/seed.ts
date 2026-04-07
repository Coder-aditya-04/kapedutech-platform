import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";

async function main() {
  // Seed parent first
  const parent = await prisma.parent.upsert({
    where: { id: "parent001" },
    update: { name: "Mr. Sharma", phone: "+919876543210" },
    create: {
      id: "parent001",
      name: "Mr. Sharma",
      phone: "+919876543210",
    },
  });
  console.log(`Seeded parent: ${parent.name} (${parent.phone})`);

  const id = "test123";
  const enrollmentNo = "JEE2026-001";
  const qrCode = `${id}:${enrollmentNo}`;

  const student = await prisma.student.upsert({
    where: { id },
    update: {},
    create: {
      id,
      userId: "seed-user",
      enrollmentNo,
      name: "Rahul Sharma",
      qrCode,
      qrCodeGenerated: true,
      parentId: parent.id,
    },
  });

  console.log(`Seeded student: ${student.name} (${student.enrollmentNo})`);

  // Generate QR code image
  const outDir = path.resolve(process.cwd(), "public/qrcodes");
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `${enrollmentNo}.png`);
  await QRCode.toFile(filePath, qrCode, { type: "png", width: 300 });
  console.log(`QR code saved to: ${filePath}`);
  console.log(`QR code data: "${qrCode}"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect?.());
