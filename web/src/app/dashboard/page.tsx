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
      color: "#374151",
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-black text-white">
        <Sidebar />

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="flex items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-xl px-8 py-6 shadow-2xl">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

            <div>
              <p className="font-semibold text-white">Loading Dashboard</p>

              <p className="text-sm text-gray-400">
                Fetching analytics and executions...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-white">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10">
          {/* HEADER */}
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-blue-400 text-sm font-medium mb-2 tracking-widest uppercase">
                Security Analytics
              </p>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Executive Dashboard
              </h1>

              <p className="text-gray-400 mt-3 max-w-2xl text-sm sm:text-base">
                Monitor automated security testing performance, vulnerability
                posture, and execution insights in real time.
              </p>
            </div>

            <Link
              href="/runs"
              className="
                self-start
                rounded-xl
                border border-blue-500/20
                bg-blue-500/10
                px-5 py-3
                text-sm font-medium text-blue-400
                hover:bg-blue-500/20
                transition-all duration-300
              "
            >
              View Full Reports →
            </Link>
          </div>

          {/* METRICS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {/* CARD */}
            <div className="group rounded-3xl border border-gray-800 bg-gray-900/70 p-6 backdrop-blur-xl hover:border-gray-700 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm text-gray-400">Total Projects</div>

                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-xl">
                  📁
                </div>
              </div>

              <div className="text-4xl font-bold">
                {stats?.totalProjects || 0}
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Active security testing projects
              </p>
            </div>

            {/* CARD */}
            <div className="group rounded-3xl border border-gray-800 bg-gray-900/70 p-6 backdrop-blur-xl hover:border-gray-700 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm text-gray-400">Test Cases</div>

                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-xl">
                  📄
                </div>
              </div>

              <div className="text-4xl font-bold">{stats?.totalCases || 0}</div>

              <p className="text-xs text-gray-500 mt-3">
                Automated workflow scenarios
              </p>
            </div>

            {/* CARD */}
            <div className="group rounded-3xl border border-blue-500/10 bg-gradient-to-br from-blue-500/10 to-gray-900 p-6 backdrop-blur-xl hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm text-gray-300">Total Executions</div>

                <div className="w-11 h-11 rounded-2xl bg-blue-500/20 flex items-center justify-center text-xl">
                  🚀
                </div>
              </div>

              <div className="text-4xl font-bold text-blue-400">
                {stats?.runs?.total || 0}
              </div>

              <p className="text-xs text-blue-300/70 mt-3">
                Total automated executions
              </p>
            </div>

            {/* CARD */}
            <div className="group rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-gray-900 p-6 backdrop-blur-xl hover:border-emerald-500/40 hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="text-sm text-emerald-300">Time Saved</div>

                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-xl">
                  ⏱️
                </div>
              </div>

              <div className="flex items-end gap-2">
                {stats?.timeSaved?.hours > 0 && (
                  <div className="text-4xl font-bold text-emerald-400">
                    {stats.timeSaved.hours}
                    <span className="text-lg ml-1">h</span>
                  </div>
                )}

                <div className="text-4xl font-bold text-emerald-400">
                  {stats?.timeSaved?.minutes || 0}
                  <span className="text-lg ml-1">m</span>
                </div>
              </div>

              <p className="text-xs text-emerald-300/70 mt-3">
                Compared to manual QA execution
              </p>
            </div>
          </div>

          {/* CONTENT */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* CHART */}
            <div className="rounded-3xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">Security Posture</h2>

                  <p className="text-sm text-gray-400 mt-1">
                    Current execution distribution
                  </p>
                </div>

                <div className="text-2xl">🛡️</div>
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
                        backgroundColor: "#111827",
                        border: "1px solid #374151",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                {pieData.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl bg-black/40 border border-gray-800 p-3"
                  >
                    <div
                      className="w-3 h-3 rounded-full mb-2"
                      style={{ backgroundColor: item.color }}
                    />

                    <div className="text-xs text-gray-400">{item.name}</div>

                    <div className="text-xl font-bold mt-1">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="xl:col-span-2 rounded-3xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold">Recent Activity</h2>

                  <p className="text-sm text-gray-400 mt-1">
                    Latest automated execution results
                  </p>
                </div>

                <Link
                  href="/runs"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  View All →
                </Link>
              </div>

              {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
                <div className="h-[320px] flex flex-col items-center justify-center text-center">
                  <div className="text-5xl mb-4">📭</div>

                  <h3 className="font-semibold text-lg mb-2">
                    No Recent Activity
                  </h3>

                  <p className="text-sm text-gray-500 max-w-sm">
                    Test executions will appear here once automated scans are
                    started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentActivity.map((run: any) => (
                    <div
                      key={run.id}
                      className="
                        group
                        rounded-2xl
                        border border-gray-800
                        bg-black/40
                        p-5
                        hover:border-gray-700
                        hover:bg-black/60
                        transition-all duration-300
                      "
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-2 self-stretch rounded-full ${
                              run.status === "safe"
                                ? "bg-emerald-500"
                                : run.status === "vulnerable"
                                  ? "bg-red-500"
                                  : run.status === "failed"
                                    ? "bg-amber-500"
                                    : "bg-gray-500"
                            }`}
                          />

                          <div>
                            <Link
                              href="/runs"
                              className="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
                            >
                              {run.case_name}
                            </Link>

                            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                              <span className="rounded-lg bg-gray-800 px-3 py-1 text-gray-300">
                                📁 {run.project_name || "Standalone"}
                              </span>

                              <span className="text-gray-500">
                                {new Date(run.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between lg:justify-end gap-4">
                          <span
                            className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide border ${
                              run.status === "safe"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : run.status === "vulnerable"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : run.status === "failed"
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    : "bg-gray-800 text-gray-400 border-gray-700"
                            }`}
                          >
                            {run.status}
                          </span>

                          <Link
                            href="/runs"
                            className="
                              w-10 h-10
                              rounded-xl
                              border border-gray-700
                              flex items-center justify-center
                              text-gray-400
                              hover:text-white
                              hover:border-gray-500
                              transition-all
                            "
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
