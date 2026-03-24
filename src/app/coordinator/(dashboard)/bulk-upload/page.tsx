"use client";

import { useState, useRef } from "react";

interface UploadResult {
  courses: { created: number; updated: number };
  learningOutcomes: { created: number; skipped: number };
  topics: { created: number; skipped: number };
  errors: string[];
}

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function downloadTemplate() {
    const res = await fetch("/api/coordinator/bulk-upload/template");
    if (!res.ok) { setError("Failed to download template"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "course-upload-template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true); setError(""); setResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/coordinator/bulk-upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Upload failed"); }
      else { setResult(data); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }
    } catch {
      setError("Network error");
    } finally { setUploading(false); }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bulk Upload</h1>
      <p className="text-gray-600 text-sm mb-6">
        Upload an Excel file (.xlsx) to import courses, learning outcomes, and topics in bulk.
        Download the template below for the correct format.
      </p>

      {/* Template Download */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">1. Download Template</h2>
        <p className="text-gray-500 text-sm mb-3">
          The template contains three sheets: <strong>Courses</strong>, <strong>LearningOutcomes</strong>, and <strong>Topics</strong>.
          It includes sample data to guide you.
        </p>
        <button onClick={downloadTemplate} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition">
          Download Template
        </button>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">2. Upload Your File</h2>
        <p className="text-gray-500 text-sm mb-3">
          Select your filled-in Excel file. Only courses belonging to your assigned majors will be imported.
        </p>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); setError(""); }}
            className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Upload Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-teal-50 rounded-lg p-4">
              <p className="text-xs text-teal-600 font-medium uppercase">Courses</p>
              <p className="text-2xl font-bold text-teal-700">{result.courses.created + result.courses.updated}</p>
              <p className="text-xs text-gray-500">{result.courses.created} created, {result.courses.updated} updated</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <p className="text-xs text-emerald-600 font-medium uppercase">Learning Outcomes</p>
              <p className="text-2xl font-bold text-emerald-700">{result.learningOutcomes.created}</p>
              <p className="text-xs text-gray-500">{result.learningOutcomes.skipped} skipped (existing)</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-4">
              <p className="text-xs text-cyan-600 font-medium uppercase">Topics</p>
              <p className="text-2xl font-bold text-cyan-700">{result.topics.created}</p>
              <p className="text-xs text-gray-500">{result.topics.skipped} skipped (existing)</p>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm font-medium mb-2">Warnings ({result.errors.length})</p>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
