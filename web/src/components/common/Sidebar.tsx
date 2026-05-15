"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: "📊", badge: "Soon" },
    { name: "Test Cases", href: "/cases", icon: "📁" },
    { name: "Record Test", href: "/record", icon: "⏺️" },
    { name: "Bob AI", href: "/ai-run", icon: "✨", badge: "New" },
    { name: "Recent Runs", href: "/runs", icon: "🕒" },
  ];

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg text-white">B</div>
        <span className="text-xl font-bold tracking-tight text-white">BobTester</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
              pathname === item.href
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-400 hover:bg-gray-900 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </div>
            {item.badge && (
              <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded font-bold uppercase">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
