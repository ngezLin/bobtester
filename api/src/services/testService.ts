import pool from "../db";
import { PlaywrightService } from "./playwrightService";
import { LoggerService } from "./loggerService";

export class TestService {
  static async createTestRun(url: string) {
    const [result]: any = await pool.execute(
      "INSERT INTO test_runs (target_url, status) VALUES (?, ?)",
      [url, "running"]
    );
    return result.insertId;
  }

  static async updateTestRun(id: number, status: string, executionTime: number, errorMessage?: string) {
    await pool.execute(
      "UPDATE test_runs SET status = ?, execution_time = ?, error_message = ? WHERE id = ?",
      [status, executionTime, errorMessage || null, id]
    );
  }

  static async saveScreenshot(testRunId: number, path: string) {
    await pool.execute(
      "INSERT INTO screenshots (test_run_id, path) VALUES (?, ?)",
      [testRunId, path]
    );
  }

  static async executeLoginTest(url: string, email: string, password: string) {
    const startTime = Date.now();
    const testRunId = await this.createTestRun(url);

    try {
      await LoggerService.info(testRunId, `Starting login test for ${url}`);
      
      const result = await PlaywrightService.runLoginTest(testRunId, url, email, password);
      
      const executionTime = Date.now() - startTime;
      const status = result.success ? "passed" : "failed";

      await this.updateTestRun(testRunId, status, executionTime, result.error);
      
      if (result.screenshot) {
        await this.saveScreenshot(testRunId, result.screenshot);
      }

      return {
        success: result.success,
        status: status,
        screenshot: result.screenshot,
        executionTime: executionTime,
        error: result.error,
        testRunId: testRunId
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      await this.updateTestRun(testRunId, "failed", executionTime, error.message);
      
      return {
        success: false,
        status: "failed",
        executionTime: executionTime,
        error: error.message,
        testRunId: testRunId
      };
    }
  }
}
