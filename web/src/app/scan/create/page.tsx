"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const scanOptions = [
  { id: "xss", label: "XSS Injection Vulnerability Scan", description: "Detect cross-site scripting issues." },
  { id: "headers", label: "Security Header Check", description: "Verify common HTTP security headers." },
  { id: "crypto", label: "Cryptographic Failure Check", description: "Inspect insecure or missing crypto settings." },
];

export default function ScanCreatePage() {
  const router = useRouter();
  const [testName, setTestName] = useState("");
  const [targetLink, setTargetLink] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const toggleOption = (optionId: string) => {
    setSelectedOptions((current) =>
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId]
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Currently this page only captures scan settings.
    // Add backend submit logic here when available.
    router.push("/scan");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">New Scan</h1>
            <p className="text-gray-400 mt-2">Enter the scan details and select the checks to run.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/scan")}
            className="rounded-full border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
          >
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-lg shadow-black/20">
          <label className="block">
            <span className="text-sm font-semibold text-gray-300">Test Name</span>
            <input
              type="text"
              value={testName}
              onChange={(event) => setTestName(event.target.value)}
              placeholder="Enter a name for this scan"
              className="mt-3 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-300">Target Link</span>
            <input
              type="url"
              value={targetLink}
              onChange={(event) => setTargetLink(event.target.value)}
              placeholder="https://example.com"
              className="mt-3 w-full rounded-2xl border border-gray-700 bg-gray-950 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </label>

          <div>
            <div className="mb-4">
              <span className="text-sm font-semibold text-gray-300">Select Scan Types</span>
              <p className="text-gray-500 text-sm mt-1">Pick one or more security checks to include in this scan.</p>
            </div>
            <div className="grid gap-4">
              {scanOptions.map((option) => {
                const isSelected = selectedOptions.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    className={`w-full rounded-3xl border px-5 py-5 text-left transition ${isSelected ? "border-blue-500 bg-blue-600/10" : "border-gray-700 bg-gray-950 hover:border-gray-500"}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{option.label}</p>
                        <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                      </div>
                      <div className={`h-5 w-5 rounded-full border-2 ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-600"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-400">
              {selectedOptions.length} option{selectedOptions.length === 1 ? "" : "s"} selected
            </div>
            <button
              type="submit"
              className="rounded-2xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-500"
            >
              Start Scan
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
