"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/cases");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white font-sans selection:bg-blue-500/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full -z-10"></div>
        
        <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">B</div>
            <span className="text-xl font-bold tracking-tight">BobTester</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="px-6 py-2 rounded-full font-medium hover:text-blue-400 transition-colors">Sign In</Link>
            <Link href="/register" className="px-6 py-2 bg-blue-600 rounded-full font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">Get Started</Link>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Automate Testing <br /> with <span className="text-blue-500">Precision</span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-gray-400 mb-12">
            Record browser flows, parameterize test data, and execute comprehensive test cases in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register" className="w-full sm:w-auto px-10 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-200 transition-all">
              Start Free Trial
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-10 py-4 bg-gray-900 border border-gray-800 rounded-full font-bold text-lg hover:bg-gray-800 transition-all">
              View Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-32 grid md:grid-cols-3 gap-8">
        <div className="p-8 bg-gray-900 border border-gray-800 rounded-3xl hover:border-blue-500/50 transition-all group">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">⏺️</div>
          <h3 className="text-2xl font-bold mb-4">Record & Replay</h3>
          <p className="text-gray-400 leading-relaxed">
            Record your browser actions once and replay them across multiple data sets instantly.
          </p>
        </div>
        <div className="p-8 bg-gray-900 border border-gray-800 rounded-3xl hover:border-emerald-500/50 transition-all group">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">📊</div>
          <h3 className="text-2xl font-bold mb-4">Dynamic Data</h3>
          <p className="text-gray-400 leading-relaxed">
            Manage test assets and edge cases easily to ensure full coverage.
          </p>
        </div>
        <div className="p-8 bg-gray-900 border border-gray-800 rounded-3xl hover:border-purple-500/50 transition-all group">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">📊</div>
          <h3 className="text-2xl font-bold mb-4">Visual Reports</h3>
          <p className="text-gray-400 leading-relaxed">
            Get detailed execution history with screenshots and logs for every single run.
          </p>
        </div>
      </div>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-900 text-center text-gray-500">
        © 2026 BobTester. Built for the IBM Bob Hackathon.
      </footer>
    </main>
  );
}
