import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import type { AnalysisResult } from '../../types/analytics';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { ChartCanvas } from '../ChartCanvas';
import { KpiCard } from '../KpiCard';
import { MissingNotice } from '../MissingNotice';

interface OverviewSectionProps {
  analysis: AnalysisResult;
  currencySymbol: string;
  onOpenMapper: () => void;
  onNavigateTab: (tab: 'overview' | 'task1' | 'task2' | 'task3' | 'task4' | 'task5') => void;
}

export function OverviewSection({
  analysis,
  currencySymbol,
  onOpenMapper,
  onNavigateTab,
}: OverviewSectionProps) {
  const monthlyTrendConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.dateCapability.available || analysis.monthlyRevenue.length === 0) return null;
    return {
      type: 'line',
      data: {
        labels: analysis.monthlyRevenue.map((m) => m.label),
        datasets: [
          {
            label: 'Monthly Revenue',
            data: analysis.monthlyRevenue.map((m) => m.revenue),
            borderColor: '#0f2544',
            backgroundColor: 'rgba(37, 99, 235, 0.10)',
            borderWidth: 2.5,
            pointBackgroundColor: '#1d4ed8',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            fill: true,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Revenue: ${formatCurrency(Number(ctx.parsed.y), currencySymbol)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, minRotation: 0, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: {
              font: { size: 11 },
              callback: (val) => formatCurrency(Number(val), currencySymbol),
            },
          },
        },
      },
    };
  }, [analysis.dateCapability.available, analysis.monthlyRevenue, currencySymbol]);

  const categoryBarConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.categoryCapability.available || analysis.categoryRevenue.length === 0) return null;
    const topCategories = analysis.categoryRevenue.slice(0, 8);
    return {
      type: 'bar',
      data: {
        labels: topCategories.map((c) => c.category),
        datasets: [
          {
            label: 'Category Revenue',
            data: topCategories.map((c) => c.revenue),
            backgroundColor: topCategories.map((_, idx) =>
              idx === 0 ? '#0f2544' : idx === 1 ? '#1d4ed8' : '#60a5fa'
            ),
            borderRadius: 6,
            maxBarThickness: 42,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Revenue: ${formatCurrency(Number(ctx.parsed.y), currencySymbol)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: {
              font: { size: 11 },
              callback: (val) => formatCurrency(Number(val), currencySymbol),
            },
          },
        },
      },
    };
  }, [analysis.categoryCapability.available, analysis.categoryRevenue, currencySymbol]);

  const repeatSegmentConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.repeatCapability.available || analysis.segmentRepeatStats.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: analysis.segmentRepeatStats.map((s) => s.segment),
        datasets: [
          {
            label: 'Repeat Purchase Rate (%)',
            data: analysis.segmentRepeatStats.map((s) => Number(s.repeatRate.toFixed(1))),
            backgroundColor: '#16a34a',
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Repeat Rate: ${Number(ctx.parsed.y).toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: {
              callback: (val) => `${val}%`,
            },
          },
        },
      },
    };
  }, [analysis.repeatCapability.available, analysis.segmentRepeatStats]);

  const deliveryBucketConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.deliveryCapability.available || analysis.deliveryBuckets.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: analysis.deliveryBuckets.map((b) => b.bucketLabel),
        datasets: [
          {
            label: 'Average Customer Rating',
            data: analysis.deliveryBuckets.map((b) => Number(b.avgRating.toFixed(2))),
            backgroundColor: '#2563eb',
            borderRadius: 6,
            maxBarThickness: 40,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Avg Rating: ${Number(ctx.parsed.y).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            suggestedMax: 5,
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
          },
        },
      },
    };
  }, [analysis.deliveryCapability.available, analysis.deliveryBuckets]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium text-[#1d4ed8]">
            Task 5 · Executive BI Dashboard
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0f2544]">
            UrbanMart Performance Overview
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Interactive key performance indicators and visualizations computed directly from your active filter scope.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('task5')}
          className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0f2544] transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          View Full Recommendations &amp; Conclusion
        </button>
      </div>

      {/* Five Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total Revenue"
          value={
            analysis.totalRevenue !== null
              ? formatCurrency(analysis.totalRevenue, currencySymbol)
              : 'Unavailable'
          }
          subtext={
            analysis.avgOrderValue !== null
              ? `Avg order: ${formatCurrency(analysis.avgOrderValue, currencySymbol)}`
              : 'Revenue column not mapped'
          }
          accent="navy"
        />
        <KpiCard
          label="Total Transactions"
          value={formatNumber(analysis.filteredRecordCount)}
          subtext={`Of ${formatNumber(analysis.totalRecords)} uploaded rows`}
          accent="blue"
        />
        <KpiCard
          label="Top Performing Category"
          value={analysis.topCategory ? analysis.topCategory.category : 'Unavailable'}
          subtext={
            analysis.topCategory
              ? `${formatCurrency(analysis.topCategory.revenue, currencySymbol)} (${formatPercent(analysis.topCategory.revenueShare, 1)} share)`
              : 'Category or revenue missing'
          }
          accent="navy"
        />
        <KpiCard
          label="Avg Monthly Revenue"
          value={
            analysis.averageMonthlyRevenue !== null
              ? formatCurrency(analysis.averageMonthlyRevenue, currencySymbol)
              : 'Unavailable'
          }
          subtext={
            analysis.highestMonth
              ? `Peak: ${analysis.highestMonth.label}`
              : 'Date or revenue missing'
          }
          accent="blue"
        />
        <KpiCard
          label="Customer Repeat Rate"
          value={
            analysis.overallRepeatRate !== null
              ? formatPercent(analysis.overallRepeatRate, 1)
              : 'Unavailable'
          }
          subtext={
            analysis.topRepeatSegment
              ? `Top segment: ${analysis.topRepeatSegment.segment}`
              : 'Customer ID / flag missing'
          }
          accent="green"
        />
      </div>

      {/* Primary Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#0f2544]">
                Monthly Revenue Trend
              </h3>
              <p className="text-xs text-slate-500">
                Chronological revenue trajectory across active months
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('task2')}
              className="text-xs font-medium text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
            >
              Task 2 Details
            </button>
          </div>
          {monthlyTrendConfig ? (
            <>
              <ChartCanvas
                config={monthlyTrendConfig}
                height={270}
                ariaLabel="Monthly revenue trend line chart"
              />
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Interpretation: </span>
                {analysis.salesObservations[0]}
              </p>
            </>
          ) : (
            <MissingNotice
              title="Monthly Trend Unavailable"
              message={
                analysis.dateCapability.missingReason ||
                analysis.revenueCapability.missingReason ||
                'Upload or map both Date and Revenue columns.'
              }
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#0f2544]">
                Product Category Revenue
              </h3>
              <p className="text-xs text-slate-500">
                Revenue contribution ranked by product category
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('task3')}
              className="text-xs font-medium text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
            >
              Task 3 Details
            </button>
          </div>
          {categoryBarConfig ? (
            <>
              <ChartCanvas
                config={categoryBarConfig}
                height={270}
                ariaLabel="Product category revenue bar chart"
              />
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Interpretation: </span>
                {analysis.topCategory
                  ? `"${analysis.topCategory.category}" leads UrbanMart with ${formatCurrency(analysis.topCategory.revenue, currencySymbol)} (${formatPercent(analysis.topCategory.revenueShare, 1)} of category revenue across ${formatNumber(analysis.topCategory.transactions)} orders).`
                  : 'Category revenue calculated from filtered records.'}
              </p>
            </>
          ) : (
            <MissingNotice
              title="Category Performance Unavailable"
              message={
                analysis.categoryCapability.missingReason ||
                'Map Product Category and Revenue columns to view category performance.'
              }
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#0f2544]">
                Customer Repeat Purchase Rate by Segment
              </h3>
              <p className="text-xs text-slate-500">
                Share of repeat customers across customer segments
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('task3')}
              className="text-xs font-medium text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
            >
              Segment Analysis
            </button>
          </div>
          {repeatSegmentConfig ? (
            <>
              <ChartCanvas
                config={repeatSegmentConfig}
                height={260}
                ariaLabel="Customer segment repeat purchase rate chart"
              />
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Interpretation: </span>
                {analysis.topRepeatSegment
                  ? `"${analysis.topRepeatSegment.segment}" shows the highest repeat purchase rate at ${formatPercent(analysis.topRepeatSegment.repeatRate, 1)} (${formatNumber(analysis.topRepeatSegment.repeatCustomers)} of ${formatNumber(analysis.topRepeatSegment.totalCustomers)} customers).`
                  : 'Repeat purchase rate across segments.'}
              </p>
            </>
          ) : (
            <MissingNotice
              title="Repeat Purchase Analysis Unavailable"
              message={
                analysis.repeatCapability.missingReason ||
                'Map Customer ID or Repeat Purchase flag to compute repeat activity.'
              }
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#0f2544]">
                Delivery Time vs. Customer Rating
              </h3>
              <p className="text-xs text-slate-500">
                Average satisfaction rating across delivery speed brackets
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('task4')}
              className="text-xs font-medium text-[#1d4ed8] hover:underline whitespace-nowrap shrink-0"
            >
              Task 4 Details
            </button>
          </div>
          {deliveryBucketConfig ? (
            <>
              <ChartCanvas
                config={deliveryBucketConfig}
                height={260}
                ariaLabel="Average customer rating by delivery time bracket"
              />
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Interpretation: </span>
                {analysis.deliveryObservations[0]}
              </p>
            </>
          ) : (
            <MissingNotice
              title="Delivery Satisfaction Unavailable"
              message={
                analysis.deliveryCapability.missingReason ||
                'Map Delivery Time and Customer Rating columns to inspect satisfaction trends.'
              }
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          )}
        </div>
      </div>
    </div>
  );
}
