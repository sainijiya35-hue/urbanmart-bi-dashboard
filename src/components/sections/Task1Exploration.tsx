import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import { Search } from 'lucide-react';
import type { AnalysisResult, ParsedWorkbook } from '../../types/analytics';
import { formatCellPreview, formatFileSize, formatNumber, formatPercent } from '../../utils/formatters';
import { ChartCanvas } from '../ChartCanvas';
import { KpiCard } from '../KpiCard';

interface Task1ExplorationProps {
  workbook: ParsedWorkbook;
  analysis: AnalysisResult;
}

export function Task1Exploration({ workbook, analysis }: Task1ExplorationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const missingCols = useMemo(
    () => analysis.columnProfiles.filter((c) => c.missingCount > 0),
    [analysis.columnProfiles]
  );

  const missingChartConfig = useMemo<ChartConfiguration | null>(() => {
    if (missingCols.length === 0) return null;
    const sorted = [...missingCols].sort((a, b) => b.missingCount - a.missingCount);
    return {
      type: 'bar',
      data: {
        labels: sorted.map((c) => c.name),
        datasets: [
          {
            label: 'Missing Values',
            data: sorted.map((c) => c.missingCount),
            backgroundColor: '#2563eb',
            borderRadius: 6,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${formatNumber(Number(ctx.parsed.x))} missing values`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
          },
          y: { grid: { display: false } },
        },
      },
    };
  }, [missingCols]);

  const searchedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return workbook.rows;
    return workbook.rows.filter((row) =>
      workbook.headers.some((h) => String(row[h] ?? '').toLowerCase().includes(q))
    );
  }, [workbook.rows, workbook.headers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(searchedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = searchedRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-[#1d4ed8]">
          Task 1 · Dataset Exploration &amp; Data Quality Audit
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0f2544]">
          Dataset Structure, Types, Missing Values &amp; Duplicates
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Full schema audit of the uploaded file <span className="font-medium text-slate-800">{workbook.fileName}</span> ({formatFileSize(workbook.fileSizeBytes)} · Sheet: {workbook.activeSheet}).
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Records"
          value={formatNumber(analysis.totalRecords)}
          subtext={analysis.dateSpanLabel ? `Span: ${analysis.dateSpanLabel}` : 'Uploaded transaction rows'}
          accent="navy"
        />
        <KpiCard
          label="Total Columns"
          value={formatNumber(analysis.totalColumns)}
          subtext="Fields detected in worksheet"
          accent="blue"
        />
        <KpiCard
          label="Data Completeness"
          value={formatPercent(analysis.completenessPct, 2)}
          subtext={`${formatNumber(analysis.totalMissingCells)} missing cells total`}
          accent="green"
        />
        <KpiCard
          label="Exact Duplicate Rows"
          value={formatNumber(analysis.exactDuplicateRows)}
          subtext={
            analysis.duplicateIdSummary
              ? `${formatNumber(analysis.duplicateIdSummary.duplicateIdCount)} duplicate IDs in "${analysis.duplicateIdSummary.columnName}"`
              : 'Full-row exact matches'
          }
          accent="navy"
        />
      </div>

      {/* Overview & Key Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Brief Dataset Overview
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {analysis.datasetOverview}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Key Data Quality Insights
          </h3>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">
            {analysis.explorationInsights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="mt-0.5 font-mono text-xs font-semibold text-[#1d4ed8]">
                  0{idx + 1}.
                </span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Column Profiles Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Column Names, Data Types &amp; Missing Values
          </h3>
          <p className="text-xs text-slate-500">
            Detailed profile of every column present in the uploaded UrbanMart sheet
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 pr-4">Column Name</th>
                <th className="py-2.5 pr-4">Detected Type</th>
                <th className="py-2.5 pr-4 text-right">Non-Null</th>
                <th className="py-2.5 pr-4 text-right">Missing</th>
                <th className="py-2.5 pr-4 text-right">Missing %</th>
                <th className="py-2.5 pr-4 text-right">Unique Values</th>
                <th className="py-2.5">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analysis.columnProfiles.map((col) => (
                <tr key={col.name} className="hover:bg-slate-50/70">
                  <td className="py-2.5 pr-4 font-medium text-slate-900">{col.name}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{col.dataType}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {formatNumber(col.nonNullCount)}
                  </td>
                  <td
                    className={`py-2.5 pr-4 text-right font-mono text-xs tabular-nums ${
                      col.missingCount > 0 ? 'font-semibold text-amber-700' : 'text-slate-500'
                    }`}
                  >
                    {formatNumber(col.missingCount)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                    {formatPercent(col.missingPct, 1)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                    {formatNumber(col.uniqueCount)}
                  </td>
                  <td className="py-2.5 text-xs text-slate-500">
                    {col.sampleValues.length > 0 ? col.sampleValues.join(' · ') : 'All missing'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Missing values chart (when missing values exist) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#0f2544]">
          Missing Value Distribution Across Columns
        </h3>
        <p className="text-xs text-slate-500">
          Visual check of incomplete cells per column in the uploaded dataset
        </p>

        {missingChartConfig ? (
          <div className="mt-4">
            <ChartCanvas
              config={missingChartConfig}
              height={Math.max(180, missingCols.length * 36)}
              ariaLabel="Missing values per column horizontal bar chart"
            />
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-800">Interpretation: </span>
              {missingCols.length} column{missingCols.length === 1 ? '' : 's'} had blank or N/A cells. All downstream KPI calculations exclude missing values rather than assuming zeros.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            Zero missing values found across all {analysis.totalColumns} columns and {formatNumber(analysis.totalRecords)} rows. The uploaded file is 100% complete.
          </div>
        )}
      </div>

      {/* Raw Dataset Inspector */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-[#0f2544]">
              Uploaded Records Preview
            </h3>
            <p className="text-xs text-slate-500">
              Inspect actual rows from your Excel file ({formatNumber(searchedRows.length)} matching rows)
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search rows..."
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0f2544] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2 pr-3 font-mono text-slate-400">#</th>
                {workbook.headers.map((h) => (
                  <th key={h} className="py-2 pr-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.map((row, idx) => (
                <tr key={safePage * pageSize + idx} className="hover:bg-slate-50/70">
                  <td className="py-2 pr-3 font-mono text-slate-400 tabular-nums">
                    {safePage * pageSize + idx + 1}
                  </td>
                  {workbook.headers.map((h) => (
                    <td key={h} className="py-2 pr-4 whitespace-nowrap text-slate-700 tabular-nums">
                      {formatCellPreview(row[h])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span className="tabular-nums">
            Page {safePage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded-md border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
