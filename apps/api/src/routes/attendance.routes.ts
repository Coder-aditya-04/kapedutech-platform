import { Router } from "express";
import { qrScan } from "../controllers/attendance.controller.js";

const router = Router();

router.post("/qr-scan", qrScan);

export default router;
