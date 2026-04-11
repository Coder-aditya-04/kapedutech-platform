import { Router } from "express";
import {
  listStudents,
  createStudent,
  todayAttendance,
  batchAttendance,
  searchStudents,
  getStudentAttendanceHistory,
} from "../controllers/admin.controller.js";

const router = Router();

router.get("/students/search", searchStudents);
router.get("/students/:studentId/attendance", getStudentAttendanceHistory);
router.get("/students", listStudents);
router.post("/students", createStudent);
router.get("/attendance/today", todayAttendance);
router.get("/attendance/batch", batchAttendance);

export default router;
