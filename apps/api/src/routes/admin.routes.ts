import { Router } from "express";
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  todayAttendance,
  batchAttendance,
  dateAttendance,
  searchStudents,
  getStudentAttendanceHistory,
} from "../controllers/admin.controller.js";

const router = Router();

router.get("/students/search", searchStudents);
router.get("/students/:studentId/attendance", getStudentAttendanceHistory);
router.get("/students", listStudents);
router.post("/students", createStudent);
router.put("/students/:id", updateStudent);
router.delete("/students/:id", deleteStudent);
router.get("/attendance/today", todayAttendance);
router.get("/attendance/batch", batchAttendance);
router.get("/attendance/date", dateAttendance);

export default router;
