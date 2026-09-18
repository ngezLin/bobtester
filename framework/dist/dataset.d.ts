export interface DatasetRow {
    [key: string]: any;
}
export declare class DatasetManager {
    private static instance;
    private datasets;
    private activeDatasetName;
    private activeData;
    private constructor();
    static getInstance(): DatasetManager;
    reload(customPath?: string): void;
    private loadJson;
    private loadExcel;
    useDataset(name: string): DatasetRow;
    getActiveDatasetName(): string | null;
    getActiveData(): DatasetRow;
    get(key: string, defaultValue?: any): any;
    /**
     * Automatically replaces bracketed variables like '[username]' with dataset values.
     */
    interpolate(value: string): string;
    getAllDatasets(): Record<string, DatasetRow>;
}
