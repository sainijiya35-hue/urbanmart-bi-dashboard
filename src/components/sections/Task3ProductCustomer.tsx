import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import type { AnalysisResult } from '../../types/analytics';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { ChartCanvas } from '../ChartCanvas';
import { KpiCard } from '../KpiCard';
import { MissingNotice } from '../MissingNotice';

interface Task3ProductCustomerProps {
  analysis: AnalysisResult;
  currencySymbol: string;
  onOpenMapper: () => void;
}

export function Task3ProductCustomer({
  analysis,
  currencySymbol,
  onOpenMapper,
}: Task3ProductCustomerProps) {
  const categoryBarConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.categoryCapability.available || analysis.categoryRevenue.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: analysis.categoryRevenue.map((c) => c.category),
        datasets: [
          {
            label: 'Total Revenue',
            data: analysis.categoryRevenue.map((c) => c.revenue),
            backgroundColor: analysis.categoryRevenue.map((_, idx) =>
              idx === 0 ? '#0f2544' : idx === 1 ? '#1d4ed8' : '#60a5fa'
            ),
            borderRadius: 6,
            maxBarThickness: 36,
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
              label: (ctx) => `Revenue: ${formatCurrency(Number(ctx.parsed.x), currencySymbol)}`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: `Revenue (${currencySymbol})`, font: { size: 11, weight: 'bold' } },
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: {
              callback: (val) => formatCurrency(Number(val), currencySymbol),
            },
          },
          y: { grid: { display: false } },
        },
      },
    };
  }, [analysis.categoryCapability.available, analysis.categoryRevenue, currencySymbol]);

  const segmentRepeatConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.repeatCapability.available || analysis.segmentRepeatStats.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: analysis.segmentRepeatStats.map((s) => s.segment),
        datasets: [
          {
            label: 'Repeat Customers',
            data: analysis.segmentRepeatStats.map((s) => s.repeatCustomers),
            backgroundColor: '#16a34a',
            borderRadius: 6,
          },
          {
            label: 'One-Time Customers',
            data: analysis.segmentRepeatStats.map((s) =>
              Math.max(0, s.totalCustomers - s.repeatCustomers)
            ),
            backgroundColor: '#93c5fd',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                const seg = idx !== undefined ? analysis.segmentRepeatStats[idx] : undefined;
                return seg ? `Repeat Rate: ${formatPercent(seg.repeatRate, 1)}` : '';
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            title: { display: true, text: 'Customer Segment', font: { size: 11, weight: 'bold' } },
            grid: { display: false },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'Unique Customers', font: { size: 11, weight: 'bold' } },
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
          },
        },
      },
    };
  }, [analysis.repeatCapability.available, analysis.segmentRepeatStats]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-[#1d4ed8]">
          Task 3 · Product &amp; Customer Analysis
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0f2544]">
          Category Revenue Leaders &amp; Segment Repeat Purchases
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Evaluates which product categories drive top-line sales and how repeat buying varies across customer segments.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Top Product Category"
          value={analysis.topCategory ? analysis.topCategory.category : 'Unavailable'}
          subtext={
            analysis.topCategory
              ? `${formatCurrency(analysis.topCategory.revenue, currencySymbol)} (${formatPercent(analysis.topCategory.revenueShare, 1)} share)`
              : 'Category/Revenue missing'
          }
          accent="navy"
        />
        <KpiCard
          label="Categories Evaluated"
          value={
            analysis.categoryCapability.available
              ? formatNumber(analysis.categoryRevenue.length)
              : 'Unavailable'
          }
          subtext="Distinct product categories in filter"
          accent="blue"
        />
        <KpiCard
          label="Overall Repeat Rate"
          value={
            analysis.overallRepeatRate !== null
              ? formatPercent(analysis.overallRepeatRate, 1)
              : 'Unavailable'
          }
          subtext={
            analysis.overallRepeatCustomers !== null && analysis.overallUniqueCustomers !== null
              ? `${formatNumber(analysis.overallRepeatCustomers)} of ${formatNumber(analysis.overallUniqueCustomers)} customers`
              : 'Customer ID / flag missing'
          }
          accent="green"
        />
        <KpiCard
          label="Top Repeat Segment"
          value={analysis.topRepeatSegment ? analysis.topRepeatSegment.segment : 'Unavailable'}
          subtext={
            analysis.topRepeatSegment
              ? `${formatPercent(analysis.topRepeatSegment.repeatRate, 1)} repeat rate`
              : 'Segment or repeat data missing'
          }
          accent="navy"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Revenue Generated by Product Category
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Total revenue ranked from highest-earning to lowest-earning category
          </p>
          {categoryBarConfig ? (
            <>
              <ChartCanvas
                config={categoryBarConfig}
                height={Math.max(250, analysis.categoryRevenue.length * 36)}
                ariaLabel="Product category revenue horizontal bar chart"
              />
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Interpretation: </span>
                {analysis.topCategory && analysis.categoryRevenue.length > 1
                  ? `"${analysis.topCategory.category}" is the top revenue generator at ${formatCurrency(analysis.topCategory.revenue, currencySymbol)} (${formatPercent(analysis.topCategory.revenueShare, 1)}), outperforming "${analysis.categoryRevenue[analysis.categoryRevenue.length - 1].category}" (${formatCurrency(analysis.categoryRevenue[analysis.categoryRevenue.length - 1].revenue, currencySymbol)}).`
                  : analysis.topCategory
                    ? `"${analysis.topCategory.category}" generated ${formatCurrency(analysis.topCategory.revenue, currencySymbol)} across ${formatNumber(analysis.topCategory.transactions)} transactions.`
                    : 'No category revenue records available.'}
              </p>
            </>
          ) : (
            <MissingNotice
              title="Category Revenue Unavailable"
              message={analysis.categoryCapability.missingReason || 'Missing category or revenue column.'}
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Repeat vs. One-Time Customers by Segment
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            {analysis.repeatCapability.available
              ? analysis.repeatCapability.description
              : 'Repeat purchase distribution across segments'}
          </p>
          {segmentRepeatConfig ? (
            <>
              <ChartCanvas
                config={segmentRepeatConfig}
                height={280}
                ariaLabel="Stacked bar chart of repeat vs one-time customers per segment"
              />
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Interpretation: </span>
                {analysis.topRepeatSegment && analysis.lowestRepeatSegment
                  ? `"${analysis.topRepeatSegment.segment}" leads retention with a ${formatPercent(analysis.topRepeatSegment.repeatRate, 1)} repeat rate, whereas "${analysis.lowestRepeatSegment.segment}" trails at ${formatPercent(analysis.lowestRepeatSegment.repeatRate, 1)}.`
                  : analysis.topRepeatSegment
                    ? `"${analysis.topRepeatSegment.segment}" shows a ${formatPercent(analysis.topRepeatSegment.repeatRate, 1)} repeat purchase rate.`
                    : 'Repeat purchase calculation complete.'}
              </p>
            </>
          ) : (
            <MissingNotice
              title="Repeat Purchase Analysis Unavailable"
              message={analysis.repeatCapability.missingReason || 'Customer ID or repeat flag missing.'}
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          )}
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {analysis.categoryCapability.available && analysis.categoryRevenue.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-base font-semibold text-[#0f2544]">
              Product Category Revenue Table
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">Orders</th>
                    <th className="py-2 pr-3 text-right">Revenue</th>
                    <th className="py-2 pr-3 text-right">Share</th>
                    <th className="py-2 text-right">Avg Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.categoryRevenue.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-50/70">
                      <td className="py-2 pr-3 font-medium text-slate-900">{c.category}</td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatNumber(c.transactions)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs font-semibold text-[#0f2544] tabular-nums">
                        {formatCurrency(c.revenue, currencySymbol)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {formatPercent(c.revenueShare, 1)}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatCurrency(c.avgOrderValue, currencySymbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {analysis.repeatCapability.available && analysis.segmentRepeatStats.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-base font-semibold text-[#0f2544]">
              Segment Repeat Purchase Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2 pr-3">Segment</th>
                    <th className="py-2 pr-3 text-right">Customers</th>
                    <th className="py-2 pr-3 text-right">Repeat</th>
                    <th className="py-2 pr-3 text-right">Repeat Rate</th>
                    <th className="py-2 text-right">Avg Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.segmentRepeatStats.map((s) => (
                    <tr key={s.segment} className="hover:bg-slate-50/70">
                      <td className="py-2 pr-3 font-medium text-slate-900">{s.segment}</td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatNumber(s.totalCustomers)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatNumber(s.repeatCustomers)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs font-semibold text-[#15803d] tabular-nums">
                        {formatPercent(s.repeatRate, 1)}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {s.avgOrdersPerCustomer.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Retention Strategies */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-[#0f2544]">
          Two Practical Strategies to Improve Customer Retention
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {analysis.retentionStrategies.map((strategy, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold text-[#15803d]">
                Strategy {idx + 1}
              </p>
              <h4 className="mt-1 text-sm font-semibold text-slate-900">{strategy.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{strategy.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
