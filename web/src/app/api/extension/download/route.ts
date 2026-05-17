import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Path to extension folder (relative to project root)
    const extensionPath = path.join(process.cwd(), '..', 'extension');
    const tempDir = path.join(process.cwd(), 'temp-extension');
    const zipPath = path.join(process.cwd(), 'bobtester-recorder-extension.zip');

    // Check if extension folder exists
    if (!fs.existsSync(extensionPath)) {
      return NextResponse.json(
        { success: false, message: 'Extension folder not found' },
        { status: 404 }
      );
    }

    // Create temp directory and copy extension files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    const targetDir = path.join(tempDir, 'bobtester-recorder-extension');
    fs.mkdirSync(targetDir, { recursive: true });

    // Copy all files recursively
    copyFolderRecursive(extensionPath, targetDir);

    // Create ZIP using native commands
    const isWindows = process.platform === 'win32';
    
    try {
      if (isWindows) {
        // Windows: Use PowerShell Compress-Archive
        await execAsync(
          `powershell "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipPath}' -Force"`
        );
      } else {
        // Unix/Mac: Use zip command
        await execAsync(
          `cd "${tempDir}" && zip -r "${zipPath}" .`
        );
      }
    } catch (zipError: any) {
      console.error('[Extension Download] ZIP creation error:', zipError);
      // Cleanup
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      return NextResponse.json(
        { success: false, message: 'Failed to create ZIP file', error: zipError.message },
        { status: 500 }
      );
    }

    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Check if ZIP was created
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json(
        { success: false, message: 'ZIP file was not created' },
        { status: 500 }
      );
    }
    
    // Helper function to copy folder recursively
    function copyFolderRecursive(source: string, target: string) {
      const files = fs.readdirSync(source);
    
      files.forEach((file) => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);
        
        if (fs.statSync(sourcePath).isDirectory()) {
          fs.mkdirSync(targetPath, { recursive: true });
          copyFolderRecursive(sourcePath, targetPath);
        } else {
          fs.copyFileSync(sourcePath, targetPath);
        }
      });
    }

    // Read the ZIP file
    const fileBuffer = fs.readFileSync(zipPath);

    // Clean up the ZIP file
    fs.unlinkSync(zipPath);

    // Return the file as a download
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="bobtester-recorder-extension.zip"',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('[Extension Download] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to download extension', error: error.message },
      { status: 500 }
    );
  }
}

// Made with Bob
