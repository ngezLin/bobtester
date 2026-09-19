"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // Auto-close mobile drawer when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  interface NavItem {
    name: string;
    href: string;
    icon: React.ReactNode;
    badge?: string;
  }

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: "Projects",
      href: "/projects",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      name: "All Test Cases",
      href: "/cases",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: "Recorder & Converter",
      href: "/record",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      name: "Recent Runs",
      href: "/runs",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Mobile Sticky Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-white/95 backdrop-blur border-b border-zinc-200 sticky top-0 z-30 w-full">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md shadow-red-500/20">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900">
            BobTester
          </span>
        </Link>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors active:scale-95"
          aria-label="Open navigation menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Navigation Drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-[84vw] max-w-[320px] bg-white z-50 shadow-2xl flex flex-col h-[100dvh] transition-transform duration-300 ease-out border-r border-zinc-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header with Logo & Dedicated Close Button */}
        <div className="p-5 flex items-center justify-between border-b border-zinc-100">
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md shadow-red-500/20">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">
              BobTester
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors active:scale-95"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-all active:scale-[0.99] ${
                  isActive
                    ? "bg-red-600 text-white font-semibold shadow-md shadow-red-500/25"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`shrink-0 ${isActive ? "text-white" : "text-zinc-400"}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-red-700 text-white"
                        : "bg-red-50 text-red-600 border border-red-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer with User & Logout */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/70 space-y-3">
          {user?.email && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                {user.email.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-zinc-900 truncate">
                  {user.name || user.email.split("@")[0]}
                </p>
                <p className="text-[11px] text-zinc-500 truncate font-mono">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-semibold text-sm shadow-xs active:scale-[0.99]"
          >
            <svg className="w-4 h-4 text-zinc-400 group-hover:text-red-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-zinc-200 flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-100">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-md shadow-red-500/20">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">BobTester</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all group ${
                  isActive
                    ? "bg-red-600 text-white shadow-md shadow-red-500/25 font-medium"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`shrink-0 transition-colors ${isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700"}`}>
                    {item.icon}
                  </span>
                  <span className="font-semibold text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isActive ? "bg-red-700 text-white" : "bg-red-50 text-red-600 border border-red-200"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 space-y-3">
          {user?.email && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                {user.email.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-zinc-900 truncate">
                  {user.name || user.email.split("@")[0]}
                </p>
                <p className="text-[11px] text-zinc-500 truncate font-mono">
                  {user.email}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all font-semibold text-sm shadow-xs group"
          >
            <svg className="w-4 h-4 text-zinc-400 group-hover:text-red-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
