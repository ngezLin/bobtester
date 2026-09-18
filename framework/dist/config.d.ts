export interface BobConfig {
    browserless?: {
        apiKey?: string;
        endpoint?: string;
        timeout?: number;
    };
    headless?: boolean;
    slowMo?: number;
    datasets?: string;
    screenshotsDir?: string;
    baseUrl?: string;
}
export declare function loadConfig(projectDir?: string): BobConfig;
export declare function getConfig(): BobConfig;
