import { Router } from "express";
import { requestOtp, verifyOtp, savePushToken } from "../controllers/auth.controller.js";

const router = Router();

router.post("/parent/request-otp", requestOtp);
router.post("/parent/verify-otp", verifyOtp);
router.post("/parent/push-token", savePushToken);

export default router;
