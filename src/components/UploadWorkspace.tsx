import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, ShieldCheck, BarChart3 } from 'lucide-react';

interface UploadWorkspaceProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export function UploadWorkspace({
  onFileSelected,
  isLoading,
  errorMessage,
}: UploadWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = '';
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-medium text-[#1e40af]">
          Lab Assignment · Business Intelligence &amp; Data Analytics
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#0f2544] sm:text-4xl [text-wrap:balance]">
          AI-Powered Business Data Analysis Using UrbanMart Dataset
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Upload your UrbanMart Excel workbook (`.xlsx`, `.xls`, or `.csv`) to generate a verified, interactive Business Intelligence dashboard covering all five assignment tasks. Every KPI, table, and Chart.js visualization is computed strictly from your uploaded rows.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
          isDragging
            ? 'border-[#1d4ed8] bg-blue-50/70'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-[#0f2544] text-white">
          <FileSpreadsheet className="h-7 w-7" aria-hidden="true" />
        </div>

        <h2 className="mt-5 text-xl font-semibold text-[#0f2544]">
          {isLoading ? 'Parsing UrbanMart Workbook...' : 'Upload UrbanMart Excel Dataset'}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Drag and drop your Excel file here, or click the button below to browse from your computer. Supports `.xlsx`, `.xls`, and `.csv`.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleChange}
          className="hidden"
          aria-label="Upload UrbanMart Excel or CSV file"
        />

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0f2544] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a365d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f2544] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{isLoading ? 'Reading File...' : 'Select Excel File'}</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mx-auto mt-6 max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-800">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 text-[#0f2544]">
            <ShieldCheck className="h-5 w-5 text-[#16a34a]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Zero Fictional Values</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Calculations run directly in your browser on the exact rows uploaded. Missing columns or null cells are flagged transparently without fabricating estimates.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 text-[#0f2544]">
            <BarChart3 className="h-5 w-5 text-[#2563eb]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">All 5 Assignment Tasks</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Covers Dataset Exploration, Sales &amp; Revenue Trends, Product &amp; Customer Repeat Analysis, Delivery vs. Rating &amp; Returns, and Executive BI KPIs.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2.5 text-[#0f2544]">
            <CheckCircle2 className="h-5 w-5 text-[#0f2544]" aria-hidden="true" />
            <h3 className="text-sm font-semibold">Flexible Column Mapping</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Automatically detects standard UrbanMart headers (Order Date, Revenue, Category, Segment, Delivery Time, Rating, Returns) and lets you adjust mappings anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
