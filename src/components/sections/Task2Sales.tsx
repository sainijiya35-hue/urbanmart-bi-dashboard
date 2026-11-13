import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import type { AnalysisResult } from '../../types/analytics';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { ChartCanvas } from '../ChartCanvas';
import { KpiCard } from '../KpiCard';
import { MissingNotice } from '../MissingNotice';

interface Task2SalesProps {
  analysis: AnalysisResult;
  currencySymbol: string;
  onOpenMapper: () => void;
}

export function Task2Sales({ analysis, currencySymbol, onOpenMapper }: Task2SalesProps) {
  const lineChartConfig = useMemo<ChartConfiguration | null>(() => {
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
            backgroundColor: 'rgba(29, 78, 216, 0.12)',
            borderWidth: 2.5,
            pointBackgroundColor: '#1d4ed8',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4.5,
            fill: true,
            tension: 0.2,
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
              label: (ctx) => `Revenue: ${formatCurrency(Number(ctx.parsed.y), currencySymbol)}`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Month', font: { size: 11, weight: 'bold' } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: `Revenue (${currencySymbol})`, font: { size: 11, weight: 'bold' } },
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: {
              callback: (val) => formatCurrency(Number(val), currencySymbol),
            },
          },
        },
      },
    };
  }, [analysis.dateCapability.available, analysis.monthlyRevenue, currencySymbol]);

  const barChartConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.dateCapability.available || analysis.monthlyRevenue.length === 0) return null;
    const maxKey = analysis.highestMonth?.monthKey;
    const minKey = analysis.lowestMonth?.monthKey;

    return {
      type: 'bar',
      data: {
        labels: analysis.monthlyRevenue.map((m) => m.label),
        datasets: [
          {
            label: 'Month-wise Revenue',
            data: analysis.monthlyRevenue.map((m) => m.revenue),
            backgroundColor: analysis.monthlyRevenue.map((m) =>
              m.monthKey === maxKey
                ? '#16a34a'
                : m.monthKey === minKey
                  ? '#93c5fd'
                  : '#1e3a8a'
            ),
            borderRadius: 6,
            maxBarThickness: 44,
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
              afterLabel: (ctx) => {
                const pt = analysis.monthlyRevenue[ctx.dataIndex];
                return pt ? `Orders: ${formatNumber(pt.transactions)}` : '';
              },
              label: (ctx) => `Revenue: ${formatCurrency(Number(ctx.parsed.y), currencySymbol)}`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Month', font: { size: 11, weight: 'bold' } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: `Revenue (${currencySymbol})`, font: { size: 11, weight: 'bold' } },
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: {
              callback: (val) => formatCurrency(Number(val), currencySymbol),
            },
          },
        },
      },
    };
  }, [
    analysis.dateCapability.available,
    analysis.monthlyRevenue,
    analysis.highestMonth,
    analysis.lowestMonth,
    currencySymbol,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-[#1d4ed8]">
          Task 2 · Sales &amp; Revenue Analysis
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0f2544]">
          Total Revenue, Monthly Performance &amp; Trend Analysis
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {analysis.revenueCapability.available
            ? `${analysis.revenueCapability.sourceDescription} across ${formatNumber(analysis.revenueCapability.validRevenueRows)} valid rows.`
            : 'Revenue calculation requires a mapped Revenue or Unit Price + Quantity column.'}
        </p>
      </div>

      {!analysis.revenueCapability.available ? (
        <MissingNotice
          title="Revenue Data Not Detected"
          message={analysis.revenueCapability.missingReason || 'No revenue column found.'}
          actionLabel="Open Column Mapping"
          onAction={onOpenMapper}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total Revenue"
              value={formatCurrency(analysis.totalRevenue, currencySymbol)}
              subtext={`Avg order value: ${formatCurrency(analysis.avgOrderValue, currencySymbol)}`}
              accent="navy"
            />
            <KpiCard
              label="Highest Revenue Month"
              value={analysis.highestMonth ? analysis.highestMonth.label : 'Unavailable'}
              subtext={
                analysis.highestMonth
                  ? formatCurrency(analysis.highestMonth.revenue, currencySymbol)
                  : 'Date column missing'
              }
              accent="green"
            />
            <KpiCard
              label="Lowest Revenue Month"
              value={analysis.lowestMonth ? analysis.lowestMonth.label : 'Unavailable'}
              subtext={
                analysis.lowestMonth
                  ? formatCurrency(analysis.lowestMonth.revenue, currencySymbol)
                  : 'Date column missing'
              }
              accent="blue"
            />
            <KpiCard
              label="Average Monthly Revenue"
              value={
                analysis.averageMonthlyRevenue !== null
                  ? formatCurrency(analysis.averageMonthlyRevenue, currencySymbol)
                  : 'Unavailable'
              }
              subtext={
                analysis.monthlyRevenue.length > 0
                  ? `Across ${analysis.monthlyRevenue.length} active months`
                  : 'Date column missing'
              }
              accent="navy"
            />
          </div>

          {!analysis.dateCapability.available ? (
            <MissingNotice
              title="Monthly Breakdown Unavailable"
              message={analysis.dateCapability.missingReason || 'Order Date column is missing.'}
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-[#0f2544]">
                    Monthly Revenue Trend (Line Chart)
                  </h3>
                  <p className="mb-4 text-xs text-slate-500">
                    Tracks continuous revenue momentum across the active timeline
                  </p>
                  {lineChartConfig && (
                    <ChartCanvas
                      config={lineChartConfig}
                      height={290}
                      ariaLabel="Monthly revenue trend line chart"
                    />
                  )}
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-800">Interpretation: </span>
                    {analysis.salesObservations[1] || analysis.salesObservations[0]}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-[#0f2544]">
                    Month-wise Revenue Comparison (Bar Chart)
                  </h3>
                  <p className="mb-4 text-xs text-slate-500">
                    Green marks peak month; light blue marks lowest revenue month
                  </p>
                  {barChartConfig && (
                    <ChartCanvas
                      config={barChartConfig}
                      height={290}
                      ariaLabel="Month-wise revenue comparison bar chart"
                    />
                  )}
                  <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-800">Interpretation: </span>
                    {analysis.salesObservations[0]}
                  </p>
                </div>
              </div>

              {/* Month-wise Revenue Table */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-base font-semibold text-[#0f2544]">
                  Month-wise Revenue Breakdown Table
                </h3>
                <p className="mb-4 text-xs text-slate-500">
                  Exact monthly revenue, transaction counts, revenue share, and average order value
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 pr-4">Month</th>
                        <th className="py-2.5 pr-4 text-right">Transactions</th>
                        <th className="py-2.5 pr-4 text-right">Monthly Revenue</th>
                        <th className="py-2.5 pr-4 text-right">Share of Total</th>
                        <th className="py-2.5 text-right">Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.monthlyRevenue.map((m) => {
                        const share =
                          analysis.totalRevenue && analysis.totalRevenue > 0
                            ? (m.revenue / analysis.totalRevenue) * 100
                            : 0;
                        const isPeak = m.monthKey === analysis.highestMonth?.monthKey;
                        const isLow = m.monthKey === analysis.lowestMonth?.monthKey;
                        return (
                          <tr key={m.monthKey} className="hover:bg-slate-50/70">
                            <td className="py-2.5 pr-4 font-medium text-slate-900">
                              {m.label}
                              {isPeak && (
                                <span className="ml-2 text-xs font-medium text-[#15803d]">
                                  (Highest)
                                </span>
                              )}
                              {isLow && !isPeak && (
                                <span className="ml-2 text-xs font-medium text-[#1d4ed8]">
                                  (Lowest)
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 pr-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                              {formatNumber(m.transactions)}
                            </td>
                            <td className="py-2.5 pr-4 text-right font-mono text-xs font-semibold text-[#0f2544] tabular-nums">
                              {formatCurrency(m.revenue, currencySymbol)}
                            </td>
                            <td className="py-2.5 pr-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                              {formatPercent(share, 1)}
                            </td>
                            <td className="py-2.5 text-right font-mono text-xs text-slate-700 tabular-nums">
                              {formatCurrency(m.avgOrderValue, currencySymbol)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Observations */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-[#0f2544]">
              Key Sales &amp; Revenue Observations
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700">
              {analysis.salesObservations.map((obs, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 font-mono text-xs font-semibold text-[#1d4ed8]">
                    0{i + 1}.
                  </span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
