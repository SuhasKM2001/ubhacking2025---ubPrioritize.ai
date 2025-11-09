// routes/chatRoutes.js
import { Router } from "express";
import { askStudyBot } from "../controllers/chatController.js";

const router = Router();
router.post("/ask", askStudyBot);

export default router;
