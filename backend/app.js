import express from 'express';
import scheduleRoutes from "./routes/scheduleRoutes.js";

const app = express();
const PORT = 8000;
app.use(express.json({ limit: '1mb' }));
app.use("/api/schedule", scheduleRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
