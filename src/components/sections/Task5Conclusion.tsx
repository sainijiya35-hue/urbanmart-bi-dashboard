import { Printer } from 'lucide-react';
import type { AnalysisResult } from '../../types/analytics';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

interface Task5ConclusionProps {
  analysis: AnalysisResult;
  currencySymbol: string;
}

export function Task5Conclusion({ analysis, currencySymbol }: Task5ConclusionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium text-[#1d4ed8]">
            Task 5 · Business Recommendations &amp; Overall Conclusion
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0f2544]">
            Executive Summary &amp; Strategic Action Plan
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Presentation-ready synthesis of UrbanMart&apos;s verified performance, actionable recommendations, and overall conclusion.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 self-start rounded-lg bg-[#0f2544] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a365d] whitespace-nowrap shrink-0"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span>Print / Save PDF Report</span>
        </button>
      </div>

      {/* Verified Metrics Snapshot */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#0f2544]">
          Verified Performance Snapshot
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="border-b border-slate-100 pb-3 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
            <p className="text-xs text-slate-500">Total Revenue</p>
            <p className="mt-1 text-lg font-bold text-[#0f2544] tabular-nums">
              {analysis.totalRevenue !== null
                ? formatCurrency(analysis.totalRevenue, currencySymbol)
                : 'N/A'}
            </p>
          </div>
          <div className="border-b border-slate-100 pb-3 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
            <p className="text-xs text-slate-500">Transactions Analyzed</p>
            <p className="mt-1 text-lg font-bold text-[#1d4ed8] tabular-nums">
              {formatNumber(analysis.filteredRecordCount)}
            </p>
          </div>
          <div className="border-b border-slate-100 pb-3 lg:border-r lg:border-b-0 lg:pr-4 lg:pb-0">
            <p className="text-xs text-slate-500">Top Category</p>
            <p className="mt-1 text-lg font-bold text-[#0f2544]">
              {analysis.topCategory ? analysis.topCategory.category : 'N/A'}
            </p>
          </div>
          <div className="border-b border-slate-100 pb-3 sm:border-r sm:border-b-0 sm:pr-4 sm:pb-0">
            <p className="text-xs text-slate-500">Peak Month</p>
            <p className="mt-1 text-lg font-bold text-[#0f2544]">
              {analysis.highestMonth ? analysis.highestMonth.label : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Repeat Purchase Rate</p>
            <p className="mt-1 text-lg font-bold text-[#15803d] tabular-nums">
              {analysis.overallRepeatRate !== null
                ? formatPercent(analysis.overallRepeatRate, 1)
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Business Recommendations */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#0f2544]">
          Data-Backed Business Recommendations
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Practical next steps grounded directly in the calculated revenue, retention, and fulfillment findings
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {analysis.executiveRecommendations.map((rec, idx) => (
            <div key={idx} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <p className="text-xs font-semibold text-[#1d4ed8]">
                  0{idx + 1}. {rec.area}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-800">{rec.recommendation}</p>
              </div>
              <p className="mt-3 border-t border-slate-200/80 pt-2.5 text-xs text-slate-600">
                <span className="font-semibold text-[#15803d]">Expected Impact: </span>
                {rec.impact}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Overall Conclusion */}
      <div className="rounded-xl border border-[#0f2544]/15 bg-white p-6">
        <h3 className="text-base font-semibold text-[#0f2544]">
          Overall Conclusion on UrbanMart Business Performance
        </h3>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          {analysis.overallConclusion}
        </p>
      </div>
    </div>
  );
}
