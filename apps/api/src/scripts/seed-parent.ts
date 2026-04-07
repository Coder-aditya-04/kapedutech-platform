import "dotenv/config";
import { prisma } from "../lib/prisma.js";

async function main() {
  const parent = await prisma.parent.upsert({
    where: { id: "seed-parent-suresh" },
    update: {},
    create: {
      id: "seed-parent-suresh",
      name: "Suresh Sharma",
      phone: "9876543210",
    },
  });
  console.log(`Parent upserted: ${parent.name} (${parent.phone})`);

  const student = await prisma.student.upsert({
    where: { qrCode: "test123:JEE2026-001" },
    update: {},
    create: {
      name: "Rahul Sharma",
      userId: "test123",
      enrollmentNo: "JEE2026-001",
      qrCode: "test123:JEE2026-001",
      parentId: parent.id,
    },
  });
  console.log(`Student upserted: ${student.name} (${student.enrollmentNo})`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
