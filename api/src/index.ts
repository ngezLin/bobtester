import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: ["http://localhost:3000", process.env.FRONTEND_URL].filter(Boolean) as string[],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Serve static files from storage/screenshots
app.use("/storage", express.static(path.join(process.cwd(), "storage")));

app.get("/", (_, res) => {
  res.json({
    success: true,
    message: "QA Automation Platform API running",
  });
});

app.use("/api", routes);

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;