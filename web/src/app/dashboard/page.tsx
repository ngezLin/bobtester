"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import { api } from "@/api/api";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/stats");
      setStats(res.stats);
    } catch (error) {
      console.error("Failed to fetch dashboard stats", error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    {
      name: "safe",
      value: stats?.runs?.safe || 0,
      color: "#10B981",
    },
    {
      name: "vulnerable",
      value: stats?.runs?.vulnerable || 0,
      color: "#EF4444",
    },
    {
      name: "failed",
      value: stats?.runs?.failed || 0,
      color: "#F59E0B",
    },
  ].filter((d) => d.value > 0);

  if (pieData.length === 0) {
    pieData.push({
      name: "No Runs",
      value: 1,
      color: "#E4E4E7",
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
        <Sidebar />

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-4 rounded-3xl border border-zinc-200/90 bg-white px-8 py-6 shadow-sm">
            <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="font-semibold text-zinc-900">Loading Dashboard</p>
              <p className="text-xs text-zinc-500">
                Fetching analytics and executions...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fafafa] text-zinc-900">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8">
          {/* HEADER */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-200">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">
                Dashboard
              </h1>
            </div>

            <Link
              href="/runs"
              className="self-start sm:self-auto inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs active:scale-95"
            >
              <span>View Full Reports</span>
              <span>→</span>
            </Link>
          </div>

          {/* METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* CARD 1 */}
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-xs hover:border-red-300 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Projects</span>
                <div className="w-11 h-11 rounded-2xl bg-zinc-100 border border-zinc-200/60 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  📁
                </div>
              </div>
              <div className="text-4xl font-bold text-zinc-900">
                {stats?.totalProjects || 0}
              </div>
            </div>

            {/* CARD 2 */}
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-xs hover:border-red-300 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Test Cases</span>
                <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  📄
                </div>
              </div>
              <div className="text-4xl font-bold text-zinc-900">
                {stats?.totalCases || 0}
              </div>
            </div>

            {/* CARD 3 */}
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-xs hover:border-red-300 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Executions</span>
                <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  🚀
                </div>
              </div>
              <div className="text-4xl font-bold text-red-600">
                {stats?.runs?.total || 0}
              </div>
            </div>

            {/* CARD 4 */}
            <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Time Saved</span>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
                  ⏱️
                </div>
              </div>
              <div className="flex items-end gap-2">
                {stats?.timeSaved?.hours > 0 && (
                  <div className="text-4xl font-bold text-emerald-600">
                    {stats.timeSaved.hours}
                    <span className="text-lg ml-1 font-semibold">h</span>
                  </div>
                )}
                <div className="text-4xl font-bold text-emerald-600">
                  {stats?.timeSaved?.minutes || 0}
                  <span className="text-lg ml-1 font-semibold">m</span>
                </div>
              </div>
              <p className="text-xs text-zinc-400 mt-3 font-medium">
                Estimated time saved
              </p>
            </div>
          </div>

          {/* CONTENT */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* CHART */}
            <div className="rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Results Breakdown</h2>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-lg">
                  🛡️
                </div>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={70}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #e4e4e7",
                        borderRadius: "14px",
                        color: "#18181b",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                {pieData.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl bg-zinc-50 border border-zinc-200/80 p-3 text-center"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full mx-auto mb-1.5"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{item.name}</div>
                    <div className="text-lg font-bold text-zinc-900 mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="xl:col-span-2 rounded-3xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">Recent Activity</h2>
                </div>

                <Link
                  href="/runs"
                  className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <span>→</span>
                </Link>
              </div>

              {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
                <div className="h-[320px] flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 bg-zinc-100 text-zinc-400 rounded-2xl flex items-center justify-center text-2xl mb-3">
                    📭
                  </div>
                  <h3 className="font-bold text-base text-zinc-900 mb-1">
                    No Recent Activity
                  </h3>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    Runs will appear here once executed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentActivity.map((run: any) => (
                    <div
                      key={run.id}
                      className="group rounded-2xl border border-zinc-200/90 bg-white p-4 hover:border-red-300 hover:shadow-xs transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-1.5 self-stretch rounded-full ${
                              run.status === "safe"
                                ? "bg-emerald-500"
                                : run.status === "vulnerable"
                                ? "bg-red-500"
                                : run.status === "failed"
                                ? "bg-amber-500"
                                : "bg-zinc-300"
                            }`}
                          />

                          <div>
                            <Link
                              href="/runs"
                              className="text-base font-bold text-zinc-900 hover:text-red-600 transition-colors"
                            >
                              {run.case_name}
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                              <span className="rounded-lg bg-zinc-100 px-2.5 py-0.5 text-zinc-600 font-medium">
                                📁 {run.project_name || "Standalone"}
                              </span>
                              <span className="text-zinc-400">
                                {new Date(run.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${
                              run.status === "safe"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : run.status === "vulnerable"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : run.status === "failed"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            {run.status}
                          </span>

                          <Link
                            href="/runs"
                            className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all text-sm font-bold"
                          >
                            →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
