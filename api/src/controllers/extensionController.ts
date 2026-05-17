import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class ExtensionController {
  static async downloadExtension(req: Request, res: Response) {
    try {
      const extensionPath = path.join(process.cwd(), "..", "extension");
      const zipPath = path.join(process.cwd(), "bobtester-recorder-extension.zip");

      // Check if extension folder exists
      if (!fs.existsSync(extensionPath)) {
        return res.status(404).json({
          success: false,
          message: "Extension folder not found",
        });
      }

      // Create ZIP using native commands (cross-platform)
      const isWindows = process.platform === "win32";
      
      try {
        if (isWindows) {
          // Windows: Use PowerShell Compress-Archive
          await execAsync(
            `powershell Compress-Archive -Path "${extensionPath}\\*" -DestinationPath "${zipPath}" -Force`
          );
        } else {
          // Unix/Mac: Use zip command
          await execAsync(
            `cd "${path.dirname(extensionPath)}" && zip -r "${zipPath}" extension/`
          );
        }
      } catch (zipError: any) {
        console.error("[Extension Download] ZIP creation error:", zipError);
        return res.status(500).json({
          success: false,
          message: "Failed to create ZIP file",
          error: zipError.message,
        });
      }

      // Check if ZIP was created
      if (!fs.existsSync(zipPath)) {
        return res.status(500).json({
          success: false,
          message: "ZIP file was not created",
        });
      }

      // Send the ZIP file
      res.download(zipPath, "bobtester-recorder-extension.zip", (err) => {
        // Clean up the ZIP file after sending
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }

        if (err) {
          console.error("[Extension Download] Download error:", err);
        } else {
          console.log("[Extension Download] Extension ZIP sent successfully");
        }
      });
    } catch (error: any) {
      console.error("[Extension Download] Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to download extension",
        error: error.message,
      });
    }
  }
}

// Made with Bob
