"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const XLSX = __importStar(require("xlsx"));
const config_1 = require("./config");
class DatasetManager {
    static instance;
    datasets = {};
    activeDatasetName = null;
    activeData = {};
    constructor() {
        this.reload();
    }
    static getInstance() {
        if (!DatasetManager.instance) {
            DatasetManager.instance = new DatasetManager();
        }
        return DatasetManager.instance;
    }
    reload(customPath) {
        const config = (0, config_1.getConfig)();
        const targetFile = customPath || config.datasets || "./data/datasets.json";
        const resolvedPath = path_1.default.resolve(process.cwd(), targetFile);
        this.datasets = {};
        if (!fs_1.default.existsSync(resolvedPath)) {
            // Check if .xlsx or .csv exists as alternative
            const xlsxPath = resolvedPath.replace(/\.json$/, ".xlsx");
            const csvPath = resolvedPath.replace(/\.json$/, ".csv");
            if (fs_1.default.existsSync(xlsxPath)) {
                this.loadExcel(xlsxPath);
                return;
            }
            else if (fs_1.default.existsSync(csvPath)) {
                this.loadExcel(csvPath);
                return;
            }
            console.warn(`[Dataset] No dataset file found at ${targetFile}. Using empty dataset.`);
            return;
        }
        if (resolvedPath.endsWith(".xlsx") ||
            resolvedPath.endsWith(".xls") ||
            resolvedPath.endsWith(".csv")) {
            this.loadExcel(resolvedPath);
        }
        else {
            this.loadJson(resolvedPath);
        }
    }
    loadJson(filePath) {
        try {
            const raw = fs_1.default.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                parsed.forEach((row, idx) => {
                    const key = row.name || `row_${idx + 1}`;
                    this.datasets[key] = row.data || row;
                });
            }
            else if (typeof parsed === "object") {
                this.datasets = parsed;
            }
            console.log(`[Dataset] Loaded ${Object.keys(this.datasets).length} dataset(s) from ${path_1.default.basename(filePath)}`);
        }
        catch (e) {
            console.error(`[Dataset] Error parsing JSON dataset: ${e.message}`);
        }
    }
    loadExcel(filePath) {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet);
            rows.forEach((row, idx) => {
                const key = row.name || row.Name || row.id || `row_${idx + 1}`;
                this.datasets[key] = row;
            });
            console.log(`[Dataset] Loaded ${Object.keys(this.datasets).length} dataset(s) from Excel ${path_1.default.basename(filePath)}`);
        }
        catch (e) {
            console.error(`[Dataset] Error parsing Excel dataset: ${e.message}`);
        }
    }
    useDataset(name) {
        if (!this.datasets[name]) {
            console.warn(`[Dataset] Warning: Dataset "${name}" not found. Available datasets: ${Object.keys(this.datasets).join(", ") || "(none)"}`);
            this.activeDatasetName = name;
            this.activeData = {};
            return this.activeData;
        }
        this.activeDatasetName = name;
        this.activeData = this.datasets[name];
        console.log(`[Dataset] Active dataset set to: "${name}"`);
        return this.activeData;
    }
    getActiveDatasetName() {
        return this.activeDatasetName;
    }
    getActiveData() {
        return this.activeData;
    }
    get(key, defaultValue = "") {
        if (this.activeData[key] !== undefined) {
            return this.activeData[key];
        }
        return defaultValue;
    }
    /**
     * Automatically replaces bracketed variables like '[username]' with dataset values.
     */
    interpolate(value) {
        if (typeof value !== "string")
            return value;
        return value.replace(/\[([a-zA-Z0-9_\-]+)\]/g, (match, key) => {
            if (this.activeData[key] !== undefined) {
                return String(this.activeData[key]);
            }
            return match;
        });
    }
    getAllDatasets() {
        return this.datasets;
    }
}
exports.DatasetManager = DatasetManager;
