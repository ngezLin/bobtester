import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import pool from "../db";

export class StatsController {
  static async getDashboardStats(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    try {
      // 1. Total Projects
      const [projectsResult]: any = await pool.execute(
        "SELECT COUNT(*) as total FROM projects WHERE user_id = ?",
        [userId as number]
      );
      
      // 2. Total Cases
      const [casesResult]: any = await pool.execute(
        "SELECT COUNT(*) as total FROM test_cases WHERE user_id = ?",
        [userId as number]
      );

      // 3. Run Stats (Success, Failed, Vulnerable)
      const [runsResult]: any = await pool.execute(
        "SELECT status, COUNT(*) as count FROM test_runs WHERE user_id = ? GROUP BY status",
        [userId as number]
      );

      // 4. Recent Activity
      const [recentRuns]: any = await pool.execute(
        `SELECT r.id, r.status, r.created_at, c.name as case_name, p.name as project_name 
         FROM test_runs r 
         JOIN test_cases c ON r.case_id = c.id
         LEFT JOIN projects p ON c.project_id = p.id
         WHERE r.user_id = ? 
         ORDER BY r.created_at DESC LIMIT 5`,
        [userId as number]
      );

      let safeRuns = 0;
      let vulnerableRuns = 0;
      let failedRuns = 0;
      let totalRuns = 0;

      runsResult.forEach((row: any) => {
        totalRuns += row.count;
        if (row.status === "SAFE" || row.status === "success") safeRuns += row.count;
        if (row.status === "VULNERABLE") vulnerableRuns += row.count;
        if (row.status === "failed" || row.status === "error") failedRuns += row.count;
      });

      // Let's estimate each automated run saves 5 minutes of manual QA time
      const timeSavedMinutes = totalRuns * 5;
      const hoursSaved = Math.floor(timeSavedMinutes / 60);
      const remainingMinutes = timeSavedMinutes % 60;

      res.json({
        success: true,
        stats: {
          totalProjects: projectsResult[0].total,
          totalCases: casesResult[0].total,
          runs: {
            total: totalRuns,
            safe: safeRuns,
            vulnerable: vulnerableRuns,
            failed: failedRuns
          },
          timeSaved: {
            hours: hoursSaved,
            minutes: remainingMinutes
          },
          recentActivity: recentRuns
        }
      });
    } catch (error: any) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ success: false, message: "Server error fetching dashboard stats" });
    }
  }
}
