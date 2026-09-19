import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import supabase from "../db";

export class StatsController {
  static async getDashboardStats(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    try {
      // 1. Total Projects
      // 1. Total Projects
      const { count: totalProjects, error: projectError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (projectError) throw projectError;
      
      // 2. Total Cases
      const { count: totalCases, error: caseError } = await supabase
        .from("test_cases")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (caseError) throw caseError;

      // 3. Run Stats (Success, Failed, Vulnerable)
      const { data: runsData, error: runsError } = await supabase
        .from("test_runs")
        .select("status")
        .eq("user_id", userId);

      if (runsError) throw runsError;

      // 4. Recent Activity
      const { data: recentRunsRaw, error: recentError } = await supabase
        .from("test_runs")
        .select(`
          id, 
          status, 
          created_at, 
          test_cases!inner(name, projects(name))
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const recentRuns = (recentRunsRaw || []).map((r: any) => ({
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        case_name: r.test_cases?.name,
        project_name: r.test_cases?.projects?.name
      }));

      let safeRuns = 0;
      let vulnerableRuns = 0;
      let failedRuns = 0;
      let totalRuns = 0;

      runsData.forEach((row: any) => {
        totalRuns++;
        if (row.status === "SAFE" || row.status === "success") safeRuns++;
        if (row.status === "VULNERABLE") vulnerableRuns++;
        if (row.status === "failed" || row.status === "error") failedRuns++;
      });

      // Let's estimate each automated run saves 5 minutes of manual QA time
      const timeSavedMinutes = totalRuns * 5;
      const hoursSaved = Math.floor(timeSavedMinutes / 60);
      const remainingMinutes = timeSavedMinutes % 60;

      res.json({
        success: true,
        stats: {
          totalProjects: totalProjects || 0,
          totalCases: totalCases || 0,
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
