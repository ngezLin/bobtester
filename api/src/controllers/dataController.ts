import { Request, Response } from "express";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(process.cwd(), "../projects/data");

export class DataController {
  static getFiles(req: Request, res: Response) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
      res.json({ success: true, files });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static getFile(req: Request, res: Response) {
    try {
      const filename = req.params.filename as string;
      const filePath = path.join(DATA_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "File not found" });
      }
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ success: true, data: JSON.parse(content) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static saveFile(req: Request, res: Response) {
    try {
      const filename = req.params.filename as string;
      const { data } = req.body;
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const filePath = path.join(DATA_DIR, filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      res.json({ success: true, message: "File saved successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static deleteFile(req: Request, res: Response) {
    try {
      const filename = req.params.filename as string;
      const filePath = path.join(DATA_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ success: true, message: "File deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
