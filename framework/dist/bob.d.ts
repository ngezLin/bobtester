import { Page } from "playwright";
import { DatasetRow } from "./dataset";
export declare class BobDriver {
    private datasetManager;
    constructor();
    /**
     * Switch the active dataset for variable interpolation (e.g. 'lalala1')
     */
    useDataset(name: string): DatasetRow;
    /**
     * Get the active dataset row object
     */
    get dataset(): DatasetRow;
    /**
     * Get a specific value from the active dataset
     */
    get(key: string, defaultValue?: any): any;
    /**
     * Resolve an underlying Playwright Page instance
     */
    getPage(): Promise<Page>;
    /**
     * Navigate to a URL with automatic variable resolution (e.g. '[targetUrl]')
     */
    goto(url: string, options?: any): Promise<any>;
    /**
     * Click an element matching selector
     */
    click(selector: string, options?: any): Promise<void>;
    /**
     * Fill input element. Supports both:
     * 1. fill(selector, '[username]')
     * 2. fill('[username]') -> smart selector based on variable key
     */
    fill(selectorOrVariable: string, valueOrOptions?: any, options?: any): Promise<void>;
    /**
     * Type text into an element with optional delay
     */
    type(selector: string, text: string, options?: any): Promise<void>;
    /**
     * Press a keyboard key (e.g. 'Enter')
     */
    press(selector: string, key: string, options?: any): Promise<void>;
    /**
     * Capture step screenshot
     */
    screenshot(name?: string): Promise<string>;
    /**
     * Pause execution for specified milliseconds
     */
    sleep(ms?: number): Promise<void>;
    waitForTimeout(ms: number): Promise<void>;
    /**
     * Wait for selector to appear in DOM
     */
    waitForSelector(selector: string, options?: any): Promise<any>;
    /**
     * Assert element is visible
     */
    expectVisible(selector: string, timeout?: number): Promise<boolean>;
    /**
     * Direct access to underlying Playwright Page for advanced scripts
     */
    get page(): Promise<Page>;
    /**
     * Runner entrypoint for standalone test script execution
     */
    run(testFn: () => Promise<void> | void): Promise<void>;
}
export declare const bob: BobDriver;
export declare const test: (title: string, fn: () => Promise<void> | void) => Promise<void>;
