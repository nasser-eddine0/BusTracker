import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  HiCloudUpload,
  HiCheck,
  HiArrowRight,
  HiRefresh,
} from "react-icons/hi";
import { parseImportHeaders, finalizeImport } from "../../../api/admin";

// The DB fields that the admin needs to map
const DB_FIELDS = [
  { key: "student_name",    label: "Student Name",   required: true  },
  { key: "grade",           label: "Grade / Class",  required: false },
  { key: "student_address", label: "Student Address", required: false },
  { key: "parent_cin",      label: "Parent CIN",     required: true  },
  { key: "parent_name",     label: "Parent Name",    required: false },
  { key: "parent_email",    label: "Parent Email",   required: false },
  { key: "parent_phone",    label: "Parent Phone",   required: false },
];

export default function ImportStudentsTab({ onRefresh }) {
  // Phase: "upload" | "mapping" | "processing" | "done"
  const [phase, setPhase] = useState("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Data from backend after header extraction
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [tempFilePath, setTempFilePath] = useState("");
  const [fileName, setFileName] = useState("");

  // The mapping object: { db_field_key: excel_header_key }
  const [mapping, setMapping] = useState({});

  // ── Phase 1: Upload ──
  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);
    try {
      const data = await parseImportHeaders(file);
      setExcelHeaders(data.headers || []);
      setTempFilePath(data.temporary_file_path || "");

      // Auto-map exact matches & synonyms (smart default)
      const autoMapping = {};
      const synonyms = {
        student_address: ["address", "adresse", "localisation", "student_address", "studentaddress"],
        grade: ["grade", "class", "classe", "niveau"],
        student_name: ["name", "nom", "nom_eleve", "nomeleve", "student_name", "studentname", "full_name", "fullname"],
        parent_cin: ["cin", "parent_cin", "parentcin", "c_i_n", "id_card"],
        parent_name: ["parent", "parent_name", "parentname", "nom_parent", "nomparent"],
      };

      for (const field of DB_FIELDS) {
        const exactMatch = (data.headers || []).find((h) => {
          const cleanH = h.toLowerCase().replace(/[\s_-]/g, "");
          
          // Check standard key match
          if (cleanH === field.key.replace(/_/g, "")) return true;
          
          // Check synonyms
          if (synonyms[field.key]) {
            return synonyms[field.key].some(syn => cleanH.includes(syn.replace(/_/g, "")));
          }
          return false;
        });
        
        if (exactMatch) {
          autoMapping[field.key] = exactMatch;
        }
      }
      setMapping(autoMapping);

      setPhase("mapping");
      toast.success("Headers extracted! Map your columns below.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to parse file.");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: false,
    disabled: isUploading,
  });

  // ── Phase 2: Mapping helpers ──
  const updateMapping = (dbKey, excelKey) => {
    setMapping((prev) => ({ ...prev, [dbKey]: excelKey }));
  };

  const requiredMet = DB_FIELDS
    .filter((f) => f.required)
    .every((f) => mapping[f.key]);

  // ── Phase 3: Finalize ──
  const handleFinalize = async () => {
    if (!requiredMet) {
      toast.error("Please map all required fields before importing.");
      return;
    }

    setIsImporting(true);
    setPhase("processing");
    try {
      await finalizeImport(tempFilePath, mapping);
      toast.success("Import completed successfully!");
      setPhase("done");
      if (onRefresh) await onRefresh();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Import failed.");
      setPhase("mapping"); // let them retry
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setPhase("upload");
    setExcelHeaders([]);
    setTempFilePath("");
    setMapping({});
    setFileName("");
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  // ── Phase 1: Dropzone ──
  if (phase === "upload") {
    return (
      <div
        {...getRootProps()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-300 ${
          isDragActive
            ? "border-[#71d9cd] bg-[#71d9cd]/10 scale-[1.01]"
            : "border-white/20 bg-[#0b1220] hover:border-[#71d9cd]/60 hover:bg-[#71d9cd]/5"
        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="rounded-full bg-[#71d9cd]/20 p-4">
          <HiCloudUpload
            className={`text-4xl text-[#71d9cd] ${isUploading ? "animate-pulse" : ""}`}
          />
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">
          {isUploading
            ? "Reading headers..."
            : isDragActive
            ? "Drop the Excel file here"
            : "Drag & drop an Excel file here"}
        </h3>
        <p className="mt-2 text-sm text-gray-400">
          Supports .xlsx, .xls, and .csv — any column names accepted.
        </p>
      </div>
    );
  }

  // ── Phase 3: Processing spinner ──
  if (phase === "processing") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#0b1220] p-14">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#71d9cd]/30 border-t-[#71d9cd]" />
        <p className="mt-4 text-sm font-medium text-gray-300">
          Importing students & parents...
        </p>
        <p className="mt-1 text-xs text-gray-500">
          This may take a few seconds for large files.
        </p>
      </div>
    );
  }

  // ── Phase 4: Done ──
  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#71d9cd]/30 bg-[#0b1220] p-14">
        <div className="rounded-full bg-[#71d9cd]/20 p-4">
          <HiCheck className="text-4xl text-[#71d9cd]" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">Import Complete!</h3>
        <p className="mt-2 text-sm text-gray-400">
          Students and parents have been registered successfully.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="mt-5 flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#71d9cd]/50 hover:bg-white/10"
        >
          <HiRefresh className="text-base" />
          Import Another File
        </button>
      </div>
    );
  }

  // ── Phase 2: Mapping UI ──
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1220] p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Map Your Columns</h3>
          <p className="mt-0.5 text-sm text-gray-400">
            File: <span className="font-medium text-[#71d9cd]">{fileName}</span>
            {" · "}
            {excelHeaders.length} columns detected
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-gray-500 underline hover:text-white transition"
        >
          Cancel & re-upload
        </button>
      </div>

      {/* Mapping grid */}
      <div className="space-y-3">
        {DB_FIELDS.map((field) => (
          <div
            key={field.key}
            className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                {field.label}
              </span>
              {field.required && (
                <span className="rounded bg-[#71d9cd]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#71d9cd]">
                  REQUIRED
                </span>
              )}
            </div>

            <div className="relative">
              <select
                value={mapping[field.key] || ""}
                onChange={(e) => updateMapping(field.key, e.target.value)}
                className={`w-full min-w-[220px] appearance-none rounded-lg border px-3 py-2 pr-8 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#71d9cd]/50 ${
                  mapping[field.key]
                    ? "border-[#71d9cd]/40 bg-[#71d9cd]/10 text-[#71d9cd]"
                    : "border-white/20 bg-white/5 text-gray-400"
                }`}
              >
                <option value="">— Select column —</option>
                {excelHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
              {/* Dropdown arrow */}
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500">
                ▾
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          {requiredMet
            ? "✓ All required fields mapped. Ready to import."
            : "⚠ Please map all required fields to proceed."}
        </p>
        <button
          type="button"
          onClick={handleFinalize}
          disabled={!requiredMet || isImporting}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition ${
            requiredMet
              ? "bg-[#71d9cd] text-[#0b1220] hover:bg-[#5ec4b8] cursor-pointer"
              : "bg-white/10 text-gray-500 cursor-not-allowed"
          }`}
        >
          <HiArrowRight className="text-base" />
          Start Import
        </button>
      </div>
    </div>
  );
}
