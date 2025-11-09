import express from 'express';
import scheduleRoutes from "./routes/scheduleRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();
const PORT = 8000;
app.use(express.json({ limit: '1mb' }));
app.use("/api/schedule", scheduleRoutes);
app.use("/api/chat", chatRoutes);

app.listen(PORT, '0.0.0.0',() => {
  console.log(`Server running on port ${PORT}`);
});
