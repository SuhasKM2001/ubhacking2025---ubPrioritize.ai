import express from "express";
import { buildWeekSchedule } from "../controllers/scheduleController.js";
import { getUserSchedules } from "../controllers/calendarController.js"

const router = express.Router();
router.post("/priorityschedule", buildWeekSchedule);
router.get('/weekschedules/:email', getUserSchedules);
export default router;


