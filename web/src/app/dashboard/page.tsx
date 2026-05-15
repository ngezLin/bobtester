"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import { api } from "@/api/api";
import Link from "next/link";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 text-white">
        <Sidebar />
        <main className="flex-1 p-10 flex items-center justify-center">
          <div className="p-8 text-gray-400 flex items-center gap-3"><span className="animate-spin">⏳</span> Loading dashboard analytics...</div>
        </main>
      </div>
    );
  }

  // Prepare data for Pie Chart
  const pieData = [
    { name: "Safe", value: stats?.runs?.safe || 0, color: "#10B981" }, // Emerald 500
    { name: "Vulnerable", value: stats?.runs?.vulnerable || 0, color: "#EF4444" }, // Red 500
    { name: "Failed", value: stats?.runs?.failed || 0, color: "#F59E0B" }, // Amber 500
  ].filter(d => d.value > 0);

  // Default if completely empty
  if (pieData.length === 0) {
    pieData.push({ name: "No Runs", value: 1, color: "#374151" });
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-10 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Executive Dashboard</h1>
            <p className="text-gray-400">Overview of your automated security testing posture.</p>
          </div>

          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2">
                <span>📁</span> Total Projects
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalProjects || 0}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2">
                <span>📄</span> Test Cases
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalCases || 0}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors"></div>
              <div className="relative">
                <div className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2">
                  <span>🚀</span> Total Executions
                </div>
                <div className="text-3xl font-bold text-blue-400">{stats?.runs?.total || 0}</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-900/40 to-gray-900 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">⏱️</div>
              <div className="relative">
                <div className="text-emerald-400/80 text-sm font-medium mb-1 flex items-center gap-2">
                  <span>⏱️</span> Estimated Time Saved
                </div>
                <div className="text-3xl font-bold text-emerald-400 flex items-baseline gap-1">
                  {stats?.timeSaved?.hours > 0 && <span>{stats.timeSaved.hours}<span className="text-sm font-normal opacity-70 ml-1">hrs</span></span>}
                  <span>{stats?.timeSaved?.minutes || 0}<span className="text-sm font-normal opacity-70 ml-1">mins</span></span>
                </div>
                <div className="text-xs text-emerald-500/60 mt-2">Vs. manual QA execution</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Security Posture Chart */}
            <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
              <h3 className="text-lg font-bold text-white mb-6">Security Posture</h3>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-500">
                  Total Vulnerabilities: <span className="font-bold text-red-400">{stats?.runs?.vulnerable || 0}</span>
                </span>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">Recent Activity</h3>
                <Link href="/runs" className="text-sm text-blue-400 hover:text-blue-300">View All →</Link>
              </div>
              
              {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <span className="text-3xl mb-2">📭</span>
                  <p>No test runs recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentActivity.map((run: any) => (
                    <div key={run.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-950 border border-gray-800/50 hover:border-gray-700 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full ${
                          run.status === 'SAFE' ? 'bg-emerald-500' :
                          run.status === 'VULNERABLE' ? 'bg-red-500' :
                          run.status === 'failed' ? 'bg-amber-500' : 'bg-gray-500'
                        }`}></div>
                        <div>
                          <Link href="/runs" className="font-bold text-white hover:text-blue-400 transition-colors">
                            {run.case_name}
                          </Link>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            {run.project_name ? (
                              <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400">📁 {run.project_name}</span>
                            ) : (
                              <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-400">Standalone</span>
                            )}
                            <span>{new Date(run.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          run.status === 'SAFE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          run.status === 'VULNERABLE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          run.status === 'failed' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {run.status}
                        </span>
                        <Link href="/runs" className="text-gray-400 hover:text-white p-2">
                          →
                        </Link>
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
