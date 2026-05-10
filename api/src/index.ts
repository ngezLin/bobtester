import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});