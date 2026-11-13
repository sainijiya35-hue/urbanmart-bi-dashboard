import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js/auto';
import type { AnalysisResult } from '../../types/analytics';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { ChartCanvas } from '../ChartCanvas';
import { KpiCard } from '../KpiCard';
import { MissingNotice } from '../MissingNotice';

interface Task4DeliveryReturnsProps {
  analysis: AnalysisResult;
  onOpenMapper: () => void;
}

export function Task4DeliveryReturns({ analysis, onOpenMapper }: Task4DeliveryReturnsProps) {
  const deliveryRatingChartConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.deliveryCapability.available || analysis.deliveryBuckets.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: analysis.deliveryBuckets.map((b) => b.bucketLabel),
        datasets: [
          {
            label: 'Average Customer Rating',
            data: analysis.deliveryBuckets.map((b) => Number(b.avgRating.toFixed(2))),
            backgroundColor: '#1d4ed8',
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
              label: (ctx) => `Avg Rating: ${Number(ctx.parsed.y).toFixed(2)}`,
              afterLabel: (ctx) => {
                const b = analysis.deliveryBuckets[ctx.dataIndex];
                return b ? `Orders: ${formatNumber(b.orderCount)}` : '';
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: `Delivery Time (${analysis.deliveryUnitLabel})`,
              font: { size: 11, weight: 'bold' },
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            suggestedMax: 5,
            title: { display: true, text: 'Average Rating', font: { size: 11, weight: 'bold' } },
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
          },
        },
      },
    };
  }, [analysis.deliveryCapability.available, analysis.deliveryBuckets, analysis.deliveryUnitLabel]);

  const categoryReturnChartConfig = useMemo<ChartConfiguration | null>(() => {
    if (!analysis.returnCapability.available || analysis.categoryReturns.length === 0) return null;
    return {
      type: 'bar',
      data: {
        labels: analysis.categoryReturns.map((c) => c.category),
        datasets: [
          {
            label: 'Return Rate (%)',
            data: analysis.categoryReturns.map((c) => Number(c.returnRate.toFixed(2))),
            backgroundColor: analysis.categoryReturns.map((_, idx) =>
              idx === 0 ? '#0f2544' : '#60a5fa'
            ),
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
              label: (ctx) => `Return Rate: ${Number(ctx.parsed.y).toFixed(1)}%`,
              afterLabel: (ctx) => {
                const c = analysis.categoryReturns[ctx.dataIndex];
                return c
                  ? `${formatNumber(c.returnedCount)} returned / ${formatNumber(c.totalEvaluated)} orders`
                  : '';
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Product Category', font: { size: 11, weight: 'bold' } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Return Rate (%)', font: { size: 11, weight: 'bold' } },
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            ticks: {
              callback: (val) => `${val}%`,
            },
          },
        },
      },
    };
  }, [analysis.returnCapability.available, analysis.categoryReturns]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-[#1d4ed8]">
          Task 4 · Delivery &amp; Customer Satisfaction Analysis
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0f2544]">
          Delivery Performance, Satisfaction Correlation &amp; Product Returns
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Examines how fulfillment speed relates to customer ratings and identifies categories with elevated product return rates.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Avg Delivery Time"
          value={
            analysis.avgDeliveryTime !== null
              ? `${analysis.avgDeliveryTime.toFixed(2)} ${analysis.deliveryUnitLabel}`
              : 'Unavailable'
          }
          subtext={
            analysis.deliveryCapability.available
              ? `From ${formatNumber(analysis.deliveryCapability.validPairCount)} rated orders`
              : 'Delivery column missing'
          }
          accent="navy"
        />
        <KpiCard
          label="Avg Customer Rating"
          value={
            analysis.avgCustomerRating !== null
              ? analysis.avgCustomerRating.toFixed(2)
              : 'Unavailable'
          }
          subtext={
            analysis.deliveryRatingCorrelation !== null
              ? `Delivery correlation r = ${analysis.deliveryRatingCorrelation.toFixed(3)}`
              : 'Rating correlation unavailable'
          }
          accent="blue"
        />
        <KpiCard
          label="Overall Return Rate"
          value={
            analysis.overallReturnRate !== null
              ? formatPercent(analysis.overallReturnRate, 1)
              : 'Unavailable'
          }
          subtext={
            analysis.totalReturnedOrders !== null
              ? `${formatNumber(analysis.totalReturnedOrders)} of ${formatNumber(analysis.returnCapability.validReturnRows)} orders`
              : 'Return column missing'
          }
          accent="green"
        />
        <KpiCard
          label="Highest Return Category"
          value={analysis.highestReturnCategory ? analysis.highestReturnCategory.category : 'Unavailable'}
          subtext={
            analysis.highestReturnCategory
              ? `${formatPercent(analysis.highestReturnCategory.returnRate, 1)} return rate`
              : 'Category/Return data missing'
          }
          accent="navy"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Delivery Time Bracket vs. Average Rating
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Compares customer satisfaction ratings across actual delivery duration groups
          </p>
          {deliveryRatingChartConfig ? (
            <>
              <ChartCanvas
                config={deliveryRatingChartConfig}
                height={280}
                ariaLabel="Bar chart of average customer rating by delivery time bracket"
              />
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Interpretation: </span>
                {analysis.deliveryObservations[0]}
              </p>
            </>
          ) : (
            <MissingNotice
              title="Delivery vs. Rating Chart Unavailable"
              message={
                analysis.deliveryCapability.missingReason ||
                'Map Delivery Time and Customer Rating columns to inspect this relationship.'
              }
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Product Return Rate by Category
          </h3>
          <p className="mb-4 text-xs text-slate-500">
            Percentage of orders marked returned within each product category
          </p>
          {categoryReturnChartConfig ? (
            <>
              <ChartCanvas
                config={categoryReturnChartConfig}
                height={280}
                ariaLabel="Bar chart of product return rate by category"
              />
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Interpretation: </span>
                {analysis.highestReturnCategory
                  ? `"${analysis.highestReturnCategory.category}" has the highest return rate at ${formatPercent(analysis.highestReturnCategory.returnRate, 1)} (${formatNumber(analysis.highestReturnCategory.returnedCount)} returned out of ${formatNumber(analysis.highestReturnCategory.totalEvaluated)} orders).`
                  : 'Return rate calculated across evaluated rows.'}
              </p>
            </>
          ) : (
            <MissingNotice
              title="Category Return Rate Unavailable"
              message={
                analysis.returnCapability.missingReason ||
                'Map Return Status and Product Category columns to analyze return rates.'
              }
              actionLabel="Check Column Mapping"
              onAction={onOpenMapper}
            />
          )}
        </div>
      </div>

      {/* Supporting Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {analysis.deliveryCapability.available && analysis.deliveryBuckets.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-base font-semibold text-[#0f2544]">
              Delivery Speed vs. Rating Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2 pr-3">Delivery Window</th>
                    <th className="py-2 pr-3 text-right">Orders</th>
                    <th className="py-2 text-right">Avg Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.deliveryBuckets.map((b) => (
                    <tr key={b.bucketLabel} className="hover:bg-slate-50/70">
                      <td className="py-2 pr-3 font-medium text-slate-900">{b.bucketLabel}</td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatNumber(b.orderCount)}
                      </td>
                      <td className="py-2 text-right font-mono text-xs font-semibold text-[#1d4ed8] tabular-nums">
                        {b.avgRating.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {analysis.returnCapability.available && analysis.categoryReturns.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-base font-semibold text-[#0f2544]">
              Category Return Rate Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">Evaluated Orders</th>
                    <th className="py-2 pr-3 text-right">Returned</th>
                    <th className="py-2 text-right">Return Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.categoryReturns.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-50/70">
                      <td className="py-2 pr-3 font-medium text-slate-900">{c.category}</td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatNumber(c.totalEvaluated)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatNumber(c.returnedCount)}
                      </td>
                      <td className="py-2 text-right font-mono text-xs font-semibold text-[#0f2544] tabular-nums">
                        {formatPercent(c.returnRate, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Observations & Improvements */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Key Delivery &amp; Return Observations
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700">
            {analysis.deliveryObservations.map((obs, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="mt-0.5 font-mono text-xs font-semibold text-[#1d4ed8]">
                  0{idx + 1}.
                </span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-[#0f2544]">
            Two Practical Improvements for UrbanMart
          </h3>
          <div className="mt-3 space-y-3">
            {analysis.operationalImprovements.map((imp, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                <p className="text-xs font-semibold text-[#15803d]">
                  Improvement {idx + 1}
                </p>
                <h4 className="mt-0.5 text-sm font-semibold text-slate-900">{imp.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{imp.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
