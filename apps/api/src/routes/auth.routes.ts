import { Router } from "express";
import { requestOtp, verifyOtp, savePushToken } from "../controllers/auth.controller.js";
import { prisma } from "../lib/prisma.js";
import type { Request, Response } from "express";

const router = Router();

router.post("/parent/request-otp", requestOtp);
router.post("/parent/verify-otp", verifyOtp);
router.post("/parent/push-token", savePushToken);

router.get("/parent/students/:parentId", async (req: Request, res: Response) => {
  const parentId = req.params["parentId"] as string;
  const students = await prisma.student.findMany({ where: { parentId } });
  res.json(students);
});

export default router;
