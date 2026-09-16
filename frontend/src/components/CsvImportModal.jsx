import { useState } from "react";
import { X, Download, Upload } from "lucide-react";
import { downloadBlob } from "../utils/download";

// Reusable "Import CSV" modal: pick a file, submit, then show the
// imported/skipped/failed summary the backend returns. Used by both the
// Leads and Contacts pages — only the column spec and the import call differ.
export default function CsvImportModal({
  title,
  templateHeaders,
  templateExampleRow,
  templateFilename,
  onImport,
  onClose,
  onImported,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);

  const downloadTemplate = () => {
    const rows = [templateHeaders, templateExampleRow].filter(Boolean);
    const csv = rows.map((r) => r.join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), templateFilename);
  };

  const handleSubmit = async () => {
    if (!file) return setError("Choose a CSV file first");
    setLoading(true);
    setError("");
    try {
      const res = await onImport(file);
      setSummary(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to import CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    if (summary?.imported > 0) onImported();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="card w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
            {error}
          </div>
        )}

        {!summary ? (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected columns:</p>
            <p className="text-xs font-mono text-gray-600 dark:text-gray-300 mb-3 break-all">
              {templateHeaders.join(", ")}
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mb-4"
            >
              <Download size={12} /> Download CSV template
            </button>

            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              CSV file
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="input"
            />

            <div className="flex gap-2 mt-5">
              <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
              <button className="btn-primary flex-1 flex items-center justify-center gap-1.5" onClick={handleSubmit} disabled={loading || !file}>
                {loading ? "Importing..." : (<><Upload size={13} /> Import</>)}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 py-3">
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">{summary.imported}</p>
                <p className="text-[10px] text-green-600 dark:text-green-500">Imported</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 py-3">
                <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">{summary.skipped}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500">Skipped</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 py-3">
                <p className="text-lg font-semibold text-red-700 dark:text-red-400">{summary.failed}</p>
                <p className="text-[10px] text-red-600 dark:text-red-500">Failed</p>
              </div>
            </div>

            {summary.errors?.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 mb-4">
                {summary.errors.map((e, i) => (
                  <div key={i} className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    Row {e.row}: {e.reason}
                  </div>
                ))}
              </div>
            )}

            <button className="btn-primary w-full" onClick={handleDone}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}
