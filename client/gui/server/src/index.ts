import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_DIR = path.resolve(__dirname, "../../../..");

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://bobtester.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      process.env.NODE_ENV !== "production" ||
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app")
    ) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve generated screenshots from the client report directory.
app.use("/storage", express.static(path.join(CLIENT_DIR, "report", "screenshots")));

app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "QA Automation Platform API running",
  });
});

app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
