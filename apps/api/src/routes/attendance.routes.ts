import { Router } from "express";
import { qrScan, getStudentAttendance, getStudentTodayAttendance } from "../controllers/attendance.controller.js";
import { getStudentResults } from "../controllers/result.controller.js";

const router = Router();

router.post("/qr-scan", qrScan);
router.get("/student/:studentId", getStudentAttendance);
router.get("/student/:studentId/today", getStudentTodayAttendance);
router.get("/student/:studentId/results", getStudentResults);

export default router;
