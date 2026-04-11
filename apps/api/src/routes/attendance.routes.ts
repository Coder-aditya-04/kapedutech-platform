import { Router } from "express";
import { qrScan, getStudentAttendance, getStudentTodayAttendance } from "../controllers/attendance.controller.js";

const router = Router();

router.post("/qr-scan", qrScan);
router.get("/student/:studentId", getStudentAttendance);
router.get("/student/:studentId/today", getStudentTodayAttendance);

export default router;
