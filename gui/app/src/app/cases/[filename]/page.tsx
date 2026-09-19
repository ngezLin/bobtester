"use client";

import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/common/Sidebar";
import DataGridEditor from "@/components/data/DataGridEditor";

export default function DataSetEditorPage() {
  const router = useRouter();
  const params = useParams<{ filename: string }>();
  const filename = decodeURIComponent(params.filename);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <DataGridEditor filename={filename} onClose={() => router.push("/cases")} onSaved={(newFilename) => router.replace(`/cases/${encodeURIComponent(newFilename)}`)} />
      </main>
    </div>
  );
}