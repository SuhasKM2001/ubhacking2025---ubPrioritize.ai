import express from 'express';
import cors from 'cors';
import scheduleRoutes from "./routes/scheduleRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();
const PORT = 8000;


const allowedOrigins = [
  'http://localhost:8080',
  'https://ub-calendar-hub.onrender.com',
  
];

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // allow curl/postman/same-origin
    return allowedOrigins.includes(origin)
      ? cb(null, true)
      : cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false, // set true ONLY if you use cookies/withCredentials
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    // cors() above already set the Access-Control-* headers
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use("/api/schedule", scheduleRoutes);
app.use("/api/chat", chatRoutes);
app.use(cors());

app.listen(PORT, '0.0.0.0',() => {
  console.log(`Server running on port ${PORT}`);
});
