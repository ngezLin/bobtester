import { Browser, BrowserContext, Page } from "playwright";
export interface BrowserSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    isCloud: boolean;
}
export declare class BrowserManager {
    private static currentSession;
    static getSession(): Promise<BrowserSession>;
    static closeSession(): Promise<void>;
}
