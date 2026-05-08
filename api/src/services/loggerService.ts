import pool from "../db";

export enum LogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export class LoggerService {
  static async log(testRunId: number, message: string, level: LogLevel = LogLevel.INFO) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] [TestRun: ${testRunId}] ${message}`);

    try {
      await pool.execute(
        "INSERT INTO logs (test_run_id, message, level) VALUES (?, ?, ?)",
        [testRunId, message, level]
      );
    } catch (error) {
      console.error("Failed to save log to database:", error);
    }
  }

  static async info(testRunId: number, message: string) {
    await this.log(testRunId, message, LogLevel.INFO);
  }

  static async warn(testRunId: number, message: string) {
    await this.log(testRunId, message, LogLevel.WARN);
  }

  static async error(testRunId: number, message: string) {
    await this.log(testRunId, message, LogLevel.ERROR);
  }
}
