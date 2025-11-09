// routes/scheduleRoutes.js
import express from "express";
import { buildWeekSchedule } from "../controllers/scheduleController.js";

const router = express.Router();
router.post("/priorityschedule", buildWeekSchedule);
export default router;


