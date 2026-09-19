import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { getConfig } from "./config";

export interface DatasetRow {
  [key: string]: any;
}

export class DatasetManager {
  private static instance: DatasetManager;
  private datasets: Record<string, DatasetRow> = {};
  private activeDatasetName: string | null = null;
  private activeData: DatasetRow = {};

  private constructor() {
    this.reload();
  }

  public static getInstance(): DatasetManager {
    if (!DatasetManager.instance) {
      DatasetManager.instance = new DatasetManager();
    }
    return DatasetManager.instance;
  }

  public reload(customPath?: string): void {
    const config = getConfig();
    const targetFile = customPath || config.datasets || "./data/datasets.json";
    const resolvedPath = path.resolve(process.cwd(), targetFile);

    this.datasets = {};

    if (!fs.existsSync(resolvedPath)) {
      // Check if .xlsx or .csv exists as alternative
      const xlsxPath = resolvedPath.replace(/\.json$/, ".xlsx");
      const csvPath = resolvedPath.replace(/\.json$/, ".csv");

      if (fs.existsSync(xlsxPath)) {
        this.loadExcel(xlsxPath);
        return;
      } else if (fs.existsSync(csvPath)) {
        this.loadExcel(csvPath);
        return;
      }

      console.warn(
        `[Dataset] No dataset file found at ${targetFile}. Using empty dataset.`,
      );
      return;
    }

    if (
      resolvedPath.endsWith(".xlsx") ||
      resolvedPath.endsWith(".xls") ||
      resolvedPath.endsWith(".csv")
    ) {
      this.loadExcel(resolvedPath);
    } else {
      this.loadJson(resolvedPath);
    }
  }

  private loadJson(filePath: string): void {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((row: any, idx: number) => {
          const key = row.name || `row_${idx + 1}`;
          this.datasets[key] = row.data || row;
        });
      } else if (typeof parsed === "object") {
        this.datasets = parsed;
      }
      console.log(
        `[Dataset] Loaded ${Object.keys(this.datasets).length} dataset(s) from ${path.basename(filePath)}`,
      );
    } catch (e: any) {
      console.error(`[Dataset] Error parsing JSON dataset: ${e.message}`);
    }
  }

  private loadExcel(filePath: string): void {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      rows.forEach((row, idx) => {
        const key = row.name || row.Name || row.id || `row_${idx + 1}`;
        this.datasets[key] = row;
      });
      console.log(
        `[Dataset] Loaded ${Object.keys(this.datasets).length} dataset(s) from Excel ${path.basename(filePath)}`,
      );
    } catch (e: any) {
      console.error(`[Dataset] Error parsing Excel dataset: ${e.message}`);
    }
  }

  public useDataset(name: string): DatasetRow {
    if (!this.datasets[name]) {
      console.warn(
        `[Dataset] Warning: Dataset "${name}" not found. Available datasets: ${Object.keys(this.datasets).join(", ") || "(none)"}`,
      );
      this.activeDatasetName = name;
      this.activeData = {};
      return this.activeData;
    }

    this.activeDatasetName = name;
    this.activeData = this.datasets[name];
    console.log(`[Dataset] Active dataset set to: "${name}"`);
    return this.activeData;
  }

  public getActiveDatasetName(): string | null {
    return this.activeDatasetName;
  }

  public getActiveData(): DatasetRow {
    return this.activeData;
  }

  public get(key: string, defaultValue: any = ""): any {
    if (this.activeData[key] !== undefined) {
      return this.activeData[key];
    }
    return defaultValue;
  }

  /**
   * Automatically replaces bracketed variables like '[username]' with dataset values.
   */
  public interpolate(value: string): string {
    if (typeof value !== "string") return value;

    return value.replace(/\[([a-zA-Z0-9_\-]+)\]/g, (match, key) => {
      if (this.activeData[key] !== undefined) {
        return String(this.activeData[key]);
      }
      return match;
    });
  }

  public getAllDatasets(): Record<string, DatasetRow> {
    return this.datasets;
  }
}
