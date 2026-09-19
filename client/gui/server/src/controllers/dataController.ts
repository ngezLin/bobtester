import { Request, Response } from "express";
import fs from "fs";
import path from "path";

// Default to the client bundled with this repository. Set BOBTESTER_CLIENT_DIR
// when the client lives in another checkout (for example D:\\projects\\testbob).
const CLIENT_DIR = process.env.BOBTESTER_CLIENT_DIR
  ? path.resolve(process.env.BOBTESTER_CLIENT_DIR)
  : path.resolve(__dirname, "../../../..");
const DATA_DIR = path.join(CLIENT_DIR, "data");

function getDataFilePath(filename: string): string {
  if (path.basename(filename) !== filename || !filename.endsWith(".json")) {
    throw new Error("Only JSON files in the data directory can be accessed");
  }
  return path.join(DATA_DIR, filename);
}

export class DataController {
  static getFiles(req: Request, res: Response) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
      res.json({ success: true, files, directory: DATA_DIR });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static getFile(req: Request, res: Response) {
    try {
      const filename = req.params.filename as string;
      const filePath = getDataFilePath(filename);
      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ success: false, message: "File not found" });
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
      const filePath = getDataFilePath(filename);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      res.json({ success: true, message: "File saved successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static renameFile(req: Request, res: Response) {
    try {
      const filename = req.params.filename as string;
      const { newFilename } = req.body;
      const sourcePath = getDataFilePath(filename);
      const targetPath = getDataFilePath(newFilename);

      if (!fs.existsSync(sourcePath)) {
        return res
          .status(404)
          .json({ success: false, message: "File not found" });
      }
      if (fs.existsSync(targetPath)) {
        return res.status(409).json({
          success: false,
          message: "A file with that name already exists",
        });
      }

      fs.renameSync(sourcePath, targetPath);
      res.json({ success: true, message: "File renamed successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static deleteFile(req: Request, res: Response) {
    try {
      const filename = req.params.filename as string;
      const filePath = getDataFilePath(filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.json({ success: true, message: "File deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
