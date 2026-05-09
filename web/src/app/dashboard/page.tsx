"use client";

import Sidebar from "@/components/Sidebar";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <Sidebar />
      <main className="flex-1 p-10 flex flex-col items-center justify-center">
        <div className="text-center space-y-6">
          <div className="text-6xl animate-bounce">📊</div>
          <h1 className="text-4xl font-black tracking-tighter">AI INSIGHTS DASHBOARD</h1>
          <p className="text-gray-500 max-w-md mx-auto">
            We are working on a revolutionary AI-driven dashboard that will automatically detect 
            vulnerabilities and performance bottlenecks across all your test flows.
          </p>
          <div className="inline-block px-6 py-2 bg-blue-600/10 border border-blue-500/20 text-blue-500 rounded-full font-bold text-sm tracking-widest uppercase">
            Coming Soon
          </div>
        </div>
      </main>
    </div>
  );
}
