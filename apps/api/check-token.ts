import "dotenv/config";
import { prisma } from "./src/lib/prisma.js";

const parents = await prisma.parent.findMany({
  select: { id: true, name: true, phone: true, pushToken: true },
});
console.log("Parents:", JSON.stringify(parents, null, 2));
await prisma.$disconnect();
