import type {
  AnalysisResult,
  CategoryReturnPoint,
  CategoryRevenuePoint,
  ColumnDataType,
  ColumnMapping,
  ColumnProfile,
  DashboardFilters,
  DeliveryBucketPoint,
  DeliveryScatterPoint,
  DuplicateIdSummary,
  MonthlyRevenuePoint,
  ParsedWorkbook,
  SegmentRepeatPoint,
} from '../types/analytics';
import {
  isMissingValue,
  parseDateValue,
  parseNumericValue,
  parseReturnBoolean,
} from './excelParser';
import { formatCurrency, formatNumber, formatPercent } from './formatters';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthKey(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const mIdx = Number(mStr) - 1;
  return `${MONTH_NAMES[mIdx] || mStr} ${yStr}`;
}

function inferColumnType(
  colName: string,
  values: unknown[],
  mapping: ColumnMapping
): ColumnDataType {
  if (colName === mapping.orderDate) return 'Date';
  if (colName === mapping.transactionId || colName === mapping.customerId) return 'Identifier';

  const nonMissing = values.filter((v) => !isMissingValue(v));
  if (nonMissing.length === 0) return 'Categorical';

  const sample = nonMissing.slice(0, 200);
  let numCount = 0;
  let boolCount = 0;
  let dateCount = 0;

  for (const val of sample) {
    if (typeof val === 'boolean') {
      boolCount++;
      continue;
    }
    if (typeof val === 'string') {
      const low = val.trim().toLowerCase();
      if (['true', 'false', 'yes', 'no'].includes(low)) {
        boolCount++;
        continue;
      }
    }
    if (parseNumericValue(val) !== null) {
      numCount++;
      continue;
    }
    if (parseDateValue(val) !== null) {
      dateCount++;
    }
  }

  const total = sample.length;
  if (boolCount / total >= 0.85) return 'Boolean';
  if (numCount / total >= 0.85) return 'Numeric';
  if (dateCount / total >= 0.85) return 'Date';

  const uniqueRatio = new Set(nonMissing.map((v) => String(v).trim())).size / nonMissing.length;
  if (/id$/i.test(colName.trim()) && uniqueRatio > 0.7) return 'Identifier';

  return 'Categorical';
}

function getRowRevenue(row: Record<string, unknown>, mapping: ColumnMapping): number | null {
  if (mapping.revenue) {
    return parseNumericValue(row[mapping.revenue]);
  }
  if (mapping.unitPrice && mapping.quantity) {
    const p = parseNumericValue(row[mapping.unitPrice]);
    const q = parseNumericValue(row[mapping.quantity]);
    if (p !== null && q !== null) {
      return p * q;
    }
  }
  return null;
}

function computePearsonCorrelation(points: { x: number; y: number }[]): number | null {
  const n = points.length;
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return null;
  const r = num / Math.sqrt(denX * denY);
  return Number.isFinite(r) ? Math.max(-1, Math.min(1, r)) : null;
}

export function analyzeDataset(
  workbook: ParsedWorkbook,
  mapping: ColumnMapping,
  filters: DashboardFilters
): AnalysisResult {
  const { headers, rows, detectedCurrencySymbol: sym } = workbook;
  const totalRecords = rows.length;
  const totalColumns = headers.length;

  // ---------------------------------------------------------------------------
  // TASK 1: DATASET EXPLORATION (computed on the full uploaded dataset)
  // ---------------------------------------------------------------------------
  let totalMissingCells = 0;
  const columnProfiles: ColumnProfile[] = headers.map((header) => {
    const colValues = rows.map((r) => r[header]);
    let missingCount = 0;
    const uniqueSet = new Set<string>();
    const samples: string[] = [];

    for (const v of colValues) {
      if (isMissingValue(v)) {
        missingCount++;
      } else {
        const str = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim();
        uniqueSet.add(str);
        if (samples.length < 3 && !samples.includes(str)) {
          samples.push(str);
        }
      }
    }

    totalMissingCells += missingCount;
    const nonNullCount = totalRecords - missingCount;
    const missingPct = totalRecords > 0 ? (missingCount / totalRecords) * 100 : 0;

    return {
      name: header,
      dataType: inferColumnType(header, colValues, mapping),
      nonNullCount,
      missingCount,
      missingPct,
      uniqueCount: uniqueSet.size,
      sampleValues: samples,
    };
  });

  const totalCells = totalRecords * totalColumns;
  const completenessPct = totalCells > 0 ? ((totalCells - totalMissingCells) / totalCells) * 100 : 100;

  // Exact full-row duplicates
  const rowSignatures = new Set<string>();
  let exactDuplicateRows = 0;
  for (const row of rows) {
    const sig = headers
      .map((h) => {
        const v = row[h];
        if (isMissingValue(v)) return '__NULL__';
        if (v instanceof Date) return v.toISOString();
        return String(v).trim();
      })
      .join('||');
    if (rowSignatures.has(sig)) {
      exactDuplicateRows++;
    } else {
      rowSignatures.add(sig);
    }
  }

  // Duplicate Transaction/Order IDs if mapped
  let duplicateIdSummary: DuplicateIdSummary | null = null;
  if (mapping.transactionId) {
    const idCounts = new Map<string, number>();
    for (const row of rows) {
      const raw = row[mapping.transactionId];
      if (isMissingValue(raw)) continue;
      const key = String(raw).trim();
      idCounts.set(key, (idCounts.get(key) || 0) + 1);
    }
    let duplicateIdCount = 0;
    let extraDuplicateRows = 0;
    for (const count of idCounts.values()) {
      if (count > 1) {
        duplicateIdCount++;
        extraDuplicateRows += count - 1;
      }
    }
    duplicateIdSummary = {
      columnName: mapping.transactionId,
      duplicateIdCount,
      extraDuplicateRows,
    };
  }

  // Filter option extraction across full dataset
  const monthKeySet = new Set<string>();
  const categorySet = new Set<string>();
  const segmentSet = new Set<string>();
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (const row of rows) {
    if (mapping.orderDate) {
      const dt = parseDateValue(row[mapping.orderDate]);
      if (dt) {
        monthKeySet.add(getMonthKey(dt));
        if (!minDate || dt < minDate) minDate = dt;
        if (!maxDate || dt > maxDate) maxDate = dt;
      }
    }
    if (mapping.productCategory) {
      const cat = row[mapping.productCategory];
      if (!isMissingValue(cat)) categorySet.add(String(cat).trim());
    }
    if (mapping.customerSegment) {
      const seg = row[mapping.customerSegment];
      if (!isMissingValue(seg)) segmentSet.add(String(seg).trim());
    }
  }

  const availableMonths = Array.from(monthKeySet)
    .sort()
    .map((key) => ({ key, label: formatMonthLabel(key) }));
  const availableCategories = Array.from(categorySet).sort((a, b) => a.localeCompare(b));
  const availableSegments = Array.from(segmentSet).sort((a, b) => a.localeCompare(b));

  const dateSpanLabel =
    minDate && maxDate
      ? `${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : null;

  const colsWithMissing = columnProfiles.filter((c) => c.missingCount > 0);
  const typeCounts = columnProfiles.reduce<Record<string, number>>((acc, col) => {
    acc[col.dataType] = (acc[col.dataType] || 0) + 1;
    return acc;
  }, {});

  const datasetOverview = `The uploaded worksheet "${workbook.activeSheet}" from ${workbook.fileName} contains ${formatNumber(totalRecords)} records across ${totalColumns} columns${dateSpanLabel ? `, spanning ${dateSpanLabel}` : ''}. Overall data completeness is ${formatPercent(completenessPct, 2)} (${formatNumber(totalMissingCells)} missing cells out of ${formatNumber(totalCells)} total cells).`;

  const explorationInsights: string[] = [];
  if (colsWithMissing.length === 0) {
    explorationInsights.push('All columns have 100% populated values with zero missing cells detected.');
  } else {
    const worstCol = [...colsWithMissing].sort((a, b) => b.missingCount - a.missingCount)[0];
    explorationInsights.push(
      `${colsWithMissing.length} of ${totalColumns} columns contain missing values; "${worstCol.name}" has the highest gap with ${formatNumber(worstCol.missingCount)} missing entries (${formatPercent(worstCol.missingPct, 1)}).`
    );
  }

  if (exactDuplicateRows === 0) {
    explorationInsights.push('Zero exact full-row duplicate records were found across the dataset.');
  } else {
    explorationInsights.push(
      `Detected ${formatNumber(exactDuplicateRows)} exact duplicate row${exactDuplicateRows === 1 ? '' : 's'} that may represent repeated entries or log duplications.`
    );
  }

  const typeSummaryParts = Object.entries(typeCounts).map(([t, cnt]) => `${cnt} ${t}`);
  explorationInsights.push(
    `Schema composition includes ${typeSummaryParts.join(', ')} column${totalColumns === 1 ? '' : 's'}${availableCategories.length > 0 ? `, covering ${availableCategories.length} product categories` : ''}${availableSegments.length > 0 ? ` and ${availableSegments.length} customer segments` : ''}.`
  );

  // ---------------------------------------------------------------------------
  // APPLY INTERACTIVE FILTERS FOR TASKS 2–5
  // ---------------------------------------------------------------------------
  const filteredRows = rows.filter((row) => {
    if (filters.month !== 'ALL' && mapping.orderDate) {
      const dt = parseDateValue(row[mapping.orderDate]);
      if (!dt || getMonthKey(dt) !== filters.month) return false;
    }
    if (filters.category !== 'ALL' && mapping.productCategory) {
      const cat = row[mapping.productCategory];
      if (isMissingValue(cat) || String(cat).trim() !== filters.category) return false;
    }
    if (filters.segment !== 'ALL' && mapping.customerSegment) {
      const seg = row[mapping.customerSegment];
      if (isMissingValue(seg) || String(seg).trim() !== filters.segment) return false;
    }
    return true;
  });

  const filteredRecordCount = filteredRows.length;

  // ---------------------------------------------------------------------------
  // TASK 2: SALES AND REVENUE ANALYSIS
  // ---------------------------------------------------------------------------
  let revenueAvailable = false;
  let revenueSourceDescription = '';
  let revenueMissingReason: string | null = null;

  if (mapping.revenue) {
    revenueAvailable = true;
    revenueSourceDescription = `Calculated directly from column "${mapping.revenue}"`;
  } else if (mapping.unitPrice && mapping.quantity) {
    revenueAvailable = true;
    revenueSourceDescription = `Computed as "${mapping.unitPrice}" × "${mapping.quantity}"`;
  } else {
    revenueMissingReason =
      'No Revenue / Sales / Amount column (or Unit Price + Quantity pair) was found in the uploaded file. Map a revenue column in Column Mapping to enable revenue calculations.';
  }

  let totalRevenue: number | null = null;
  let validRevenueRows = 0;
  let missingRevenueRows = 0;
  let avgOrderValue: number | null = null;

  let validDateRows = 0;
  let invalidOrMissingDateRows = 0;

  const monthlyMap = new Map<string, { revenue: number; transactions: number }>();

  if (revenueAvailable) {
    let revSum = 0;
    for (const row of filteredRows) {
      const rev = getRowRevenue(row, mapping);
      if (rev === null) {
        missingRevenueRows++;
        continue;
      }
      validRevenueRows++;
      revSum += rev;

      if (mapping.orderDate) {
        const dt = parseDateValue(row[mapping.orderDate]);
        if (dt) {
          validDateRows++;
          const mKey = getMonthKey(dt);
          const cur = monthlyMap.get(mKey) || { revenue: 0, transactions: 0 };
          cur.revenue += rev;
          cur.transactions += 1;
          monthlyMap.set(mKey, cur);
        } else {
          invalidOrMissingDateRows++;
        }
      }
    }
    totalRevenue = validRevenueRows > 0 ? revSum : null;
    avgOrderValue = validRevenueRows > 0 ? revSum / validRevenueRows : null;
  } else if (mapping.orderDate) {
    for (const row of filteredRows) {
      if (parseDateValue(row[mapping.orderDate])) validDateRows++;
      else invalidOrMissingDateRows++;
    }
  }

  const dateAvailable = Boolean(mapping.orderDate) && validDateRows > 0;
  const dateMissingReason = !mapping.orderDate
    ? 'No valid Order Date / Transaction Date column was detected. Monthly trend analysis cannot be computed without a date column.'
    : validDateRows === 0
      ? `Column "${mapping.orderDate}" does not contain parseable dates in the current view.`
      : null;

  const monthlyRevenue: MonthlyRevenuePoint[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, stats]) => ({
      monthKey,
      label: formatMonthLabel(monthKey),
      revenue: stats.revenue,
      transactions: stats.transactions,
      avgOrderValue: stats.transactions > 0 ? stats.revenue / stats.transactions : 0,
    }));

  let highestMonth: MonthlyRevenuePoint | null = null;
  let lowestMonth: MonthlyRevenuePoint | null = null;
  let averageMonthlyRevenue: number | null = null;

  if (monthlyRevenue.length > 0) {
    highestMonth = [...monthlyRevenue].sort((a, b) => b.revenue - a.revenue)[0];
    lowestMonth = [...monthlyRevenue].sort((a, b) => a.revenue - b.revenue)[0];
    const sumMonthly = monthlyRevenue.reduce((acc, m) => acc + m.revenue, 0);
    averageMonthlyRevenue = sumMonthly / monthlyRevenue.length;
  }

  const salesObservations: string[] = [];
  if (totalRevenue !== null && validRevenueRows > 0) {
    if (highestMonth && lowestMonth && monthlyRevenue.length >= 2) {
      const diff = highestMonth.revenue - lowestMonth.revenue;
      const pctGap = lowestMonth.revenue > 0 ? (diff / lowestMonth.revenue) * 100 : 0;
      salesObservations.push(
        `Revenue peaked in ${highestMonth.label} at ${formatCurrency(highestMonth.revenue, sym)} across ${formatNumber(highestMonth.transactions)} transactions, while ${lowestMonth.label} recorded the lowest revenue at ${formatCurrency(lowestMonth.revenue, sym)} (${formatPercent(pctGap, 1)} gap from trough to peak).`
      );

      const firstHalf = monthlyRevenue.slice(0, Math.ceil(monthlyRevenue.length / 2));
      const secondHalf = monthlyRevenue.slice(Math.ceil(monthlyRevenue.length / 2));
      const avgFirst = firstHalf.reduce((s, m) => s + m.revenue, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s, m) => s + m.revenue, 0) / secondHalf.length;
      const trendPct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
      const direction = trendPct > 3 ? 'upward growth' : trendPct < -3 ? 'downward softening' : 'steady performance';
      salesObservations.push(
        `Average monthly revenue is ${formatCurrency(averageMonthlyRevenue, sym)} across ${monthlyRevenue.length} active months, showing ${direction} (${trendPct >= 0 ? '+' : ''}${formatPercent(trendPct, 1)} comparing the second half of the period to the first half).`
      );
    } else if (monthlyRevenue.length === 1) {
      salesObservations.push(
        `The filtered selection covers a single month (${monthlyRevenue[0].label}) generating ${formatCurrency(monthlyRevenue[0].revenue, sym)} across ${formatNumber(monthlyRevenue[0].transactions)} orders (average order value ${formatCurrency(avgOrderValue, sym)}).`
      );
      salesObservations.push(
        'Clear the Month filter to compare month-over-month revenue growth and identify seasonal highs and lows.'
      );
    } else {
      salesObservations.push(
        `Total computed revenue is ${formatCurrency(totalRevenue, sym)} across ${formatNumber(validRevenueRows)} valid transactions (average order value ${formatCurrency(avgOrderValue, sym)}).`
      );
      salesObservations.push(
        'Monthly breakdown is unavailable because a valid date column is not present or mapped.'
      );
    }
  } else {
    salesObservations.push(
      revenueMissingReason || 'No valid numeric revenue values were found in the current selection.'
    );
  }

  // ---------------------------------------------------------------------------
  // TASK 3: PRODUCT AND CUSTOMER ANALYSIS
  // ---------------------------------------------------------------------------
  const categoryAvailable = Boolean(mapping.productCategory) && revenueAvailable;
  const categoryMissingReason = !mapping.productCategory
    ? 'No Product Category column was detected in the uploaded dataset.'
    : !revenueAvailable
      ? 'Product category revenue requires a mapped Revenue (or Unit Price + Quantity) column.'
      : null;

  const categoryMap = new Map<string, { revenue: number; transactions: number }>();
  if (categoryAvailable && mapping.productCategory) {
    for (const row of filteredRows) {
      const rev = getRowRevenue(row, mapping);
      if (rev === null) continue;
      const rawCat = row[mapping.productCategory];
      const cat = isMissingValue(rawCat) ? 'Unspecified' : String(rawCat).trim();
      const cur = categoryMap.get(cat) || { revenue: 0, transactions: 0 };
      cur.revenue += rev;
      cur.transactions += 1;
      categoryMap.set(cat, cur);
    }
  }

  const totalCatRevenue = Array.from(categoryMap.values()).reduce((s, c) => s + c.revenue, 0);
  const categoryRevenue: CategoryRevenuePoint[] = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      revenue: stats.revenue,
      revenueShare: totalCatRevenue > 0 ? (stats.revenue / totalCatRevenue) * 100 : 0,
      transactions: stats.transactions,
      avgOrderValue: stats.transactions > 0 ? stats.revenue / stats.transactions : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const topCategory = categoryRevenue.length > 0 ? categoryRevenue[0] : null;

  // Repeat purchase analysis across customer segments
  // Check whether customerId actually has repeated occurrences across the full dataset
  let fullDatasetHasRepeatingIds = false;
  if (mapping.customerId) {
    const fullIdCount = new Map<string, number>();
    for (const row of rows) {
      const id = row[mapping.customerId];
      if (isMissingValue(id)) continue;
      const key = String(id).trim();
      const next = (fullIdCount.get(key) || 0) + 1;
      fullIdCount.set(key, next);
      if (next > 1) {
        fullDatasetHasRepeatingIds = true;
        break;
      }
    }
  }

  let repeatMethod: 'customer_id' | 'explicit_flag' | 'none' = 'none';
  let repeatDescription = '';
  let repeatMissingReason: string | null = null;

  if (mapping.customerId && (fullDatasetHasRepeatingIds || !mapping.repeatFlag)) {
    repeatMethod = 'customer_id';
    repeatDescription = `Measured by counting transactions per unique "${mapping.customerId}" (customers with 2+ orders are classified as repeat customers)`;
  } else if (mapping.repeatFlag) {
    repeatMethod = 'explicit_flag';
    repeatDescription = `Measured directly from repeat indicator column "${mapping.repeatFlag}"`;
  } else {
    repeatMissingReason =
      'Repeat purchase analysis requires either a Customer ID column with repeat transactions or an explicit Repeat Purchase flag column.';
  }

  let overallRepeatRate: number | null = null;
  let overallRepeatCustomers: number | null = null;
  let overallUniqueCustomers: number | null = null;
  const segmentRepeatStats: SegmentRepeatPoint[] = [];

  if (repeatMethod === 'customer_id' && mapping.customerId) {
    const globalCustOrders = new Map<string, number>();
    const segCustMap = new Map<
      string,
      Map<string, { orders: number; revenue: number }>
    >();

    for (const row of filteredRows) {
      const rawCid = row[mapping.customerId];
      if (isMissingValue(rawCid)) continue;
      const cid = String(rawCid).trim();
      globalCustOrders.set(cid, (globalCustOrders.get(cid) || 0) + 1);

      const seg =
        mapping.customerSegment && !isMissingValue(row[mapping.customerSegment])
          ? String(row[mapping.customerSegment]).trim()
          : 'All Customers';

      if (!segCustMap.has(seg)) segCustMap.set(seg, new Map());
      const custInSeg = segCustMap.get(seg)!;
      const prev = custInSeg.get(cid) || { orders: 0, revenue: 0 };
      const rev = revenueAvailable ? getRowRevenue(row, mapping) || 0 : 0;
      custInSeg.set(cid, { orders: prev.orders + 1, revenue: prev.revenue + rev });
    }

    overallUniqueCustomers = globalCustOrders.size;
    overallRepeatCustomers = Array.from(globalCustOrders.values()).filter((c) => c >= 2).length;
    overallRepeatRate =
      overallUniqueCustomers > 0 ? (overallRepeatCustomers / overallUniqueCustomers) * 100 : null;

    for (const [segment, custMap] of segCustMap.entries()) {
      const totalCustomers = custMap.size;
      let repeatCustomers = 0;
      let totalTransactions = 0;
      let repeatTransactions = 0;
      let segRevenue = 0;

      for (const stats of custMap.values()) {
        totalTransactions += stats.orders;
        segRevenue += stats.revenue;
        if (stats.orders >= 2) {
          repeatCustomers++;
          repeatTransactions += stats.orders;
        }
      }

      segmentRepeatStats.push({
        segment,
        totalCustomers,
        repeatCustomers,
        repeatRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
        totalTransactions,
        repeatTransactions,
        totalRevenue: segRevenue,
        avgOrdersPerCustomer: totalCustomers > 0 ? totalTransactions / totalCustomers : 0,
      });
    }

    segmentRepeatStats.sort((a, b) => b.repeatRate - a.repeatRate);
  } else if (repeatMethod === 'explicit_flag' && mapping.repeatFlag) {
    const segFlagMap = new Map<
      string,
      { total: number; repeat: number; revenue: number }
    >();
    let totalValid = 0;
    let totalRepeat = 0;

    for (const row of filteredRows) {
      const flag = parseReturnBoolean(row[mapping.repeatFlag]);
      if (flag === null) continue;
      totalValid++;
      if (flag) totalRepeat++;

      const seg =
        mapping.customerSegment && !isMissingValue(row[mapping.customerSegment])
          ? String(row[mapping.customerSegment]).trim()
          : 'All Customers';
      const cur = segFlagMap.get(seg) || { total: 0, repeat: 0, revenue: 0 };
      cur.total += 1;
      if (flag) cur.repeat += 1;
      if (revenueAvailable) cur.revenue += getRowRevenue(row, mapping) || 0;
      segFlagMap.set(seg, cur);
    }

    overallUniqueCustomers = totalValid;
    overallRepeatCustomers = totalRepeat;
    overallRepeatRate = totalValid > 0 ? (totalRepeat / totalValid) * 100 : null;

    for (const [segment, st] of segFlagMap.entries()) {
      segmentRepeatStats.push({
        segment,
        totalCustomers: st.total,
        repeatCustomers: st.repeat,
        repeatRate: st.total > 0 ? (st.repeat / st.total) * 100 : 0,
        totalTransactions: st.total,
        repeatTransactions: st.repeat,
        totalRevenue: st.revenue,
        avgOrdersPerCustomer: st.total > 0 ? (st.total + st.repeat) / st.total : 0,
      });
    }
    segmentRepeatStats.sort((a, b) => b.repeatRate - a.repeatRate);
  }

  const topRepeatSegment = segmentRepeatStats.length > 0 ? segmentRepeatStats[0] : null;
  const lowestRepeatSegment =
    segmentRepeatStats.length > 1 ? segmentRepeatStats[segmentRepeatStats.length - 1] : null;

  const retentionStrategies: { title: string; detail: string }[] = [];
  if (lowestRepeatSegment && topRepeatSegment) {
    retentionStrategies.push({
      title: `Targeted Second-Order Win-Back for "${lowestRepeatSegment.segment}"`,
      detail: `"${lowestRepeatSegment.segment}" currently shows the lowest repeat purchase rate at ${formatPercent(lowestRepeatSegment.repeatRate, 1)} compared to ${formatPercent(topRepeatSegment.repeatRate, 1)} in "${topRepeatSegment.segment}". Trigger a time-limited second-order voucher within 14 days of first purchase to convert one-time buyers.`,
    });
  } else {
    retentionStrategies.push({
      title: 'Post-Purchase Replenishment & Second-Order Incentive',
      detail: 'Encourage one-time buyers to return by sending personalized replenishment reminders and a modest discount code valid on their second order within 30 days.',
    });
  }

  if (topCategory) {
    retentionStrategies.push({
      title: `Tiered Loyalty Perks Anchored on "${topCategory.category}"`,
      detail: `Since "${topCategory.category}" drives ${formatPercent(topCategory.revenueShare, 1)} of revenue (${formatCurrency(topCategory.revenue, sym)}), bundle loyalty points, free express shipping, or cross-category coupons with "${topCategory.category}" purchases to increase repeat frequency.`,
    });
  } else {
    retentionStrategies.push({
      title: 'Segment-Specific Loyalty Tier & Cross-Sell Program',
      detail: 'Reward repeat buyers with tiered benefits (free shipping thresholds, early restock access) and track segment-level repeat rates monthly.',
    });
  }

  // ---------------------------------------------------------------------------
  // TASK 4: DELIVERY AND CUSTOMER SATISFACTION ANALYSIS
  // ---------------------------------------------------------------------------
  const deliveryAvailable = Boolean(mapping.deliveryTime && mapping.customerRating);
  let deliveryMissingReason: string | null = null;
  if (!mapping.deliveryTime && !mapping.customerRating) {
    deliveryMissingReason = 'Both Delivery Time and Customer Rating columns are missing from the dataset.';
  } else if (!mapping.deliveryTime) {
    deliveryMissingReason = 'No Delivery Time / Shipping Days column was found in the dataset.';
  } else if (!mapping.customerRating) {
    deliveryMissingReason = 'No Customer Rating / Satisfaction Score column was found in the dataset.';
  }

  const deliveryUnitLabel =
    mapping.deliveryTime && /hour|hr/i.test(mapping.deliveryTime) ? 'hrs' : 'days';

  const validPairs: { x: number; y: number }[] = [];
  if (deliveryAvailable && mapping.deliveryTime && mapping.customerRating) {
    for (const row of filteredRows) {
      const d = parseNumericValue(row[mapping.deliveryTime]);
      const r = parseNumericValue(row[mapping.customerRating]);
      if (d !== null && r !== null && d >= 0) {
        validPairs.push({ x: d, y: r });
      }
    }
  }

  let avgDeliveryTime: number | null = null;
  let avgCustomerRating: number | null = null;
  let deliveryRatingCorrelation: number | null = null;
  let deliveryBuckets: DeliveryBucketPoint[] = [];
  let deliveryScatterPoints: DeliveryScatterPoint[] = [];

  if (validPairs.length > 0) {
    avgDeliveryTime = validPairs.reduce((s, p) => s + p.x, 0) / validPairs.length;
    avgCustomerRating = validPairs.reduce((s, p) => s + p.y, 0) / validPairs.length;
    deliveryRatingCorrelation = computePearsonCorrelation(validPairs);

    // Check if integer days with <= 12 distinct values
    const distinctX = Array.from(new Set(validPairs.map((p) => p.x))).sort((a, b) => a - b);
    const allIntegers = distinctX.every((v) => Number.isInteger(v));

    if (allIntegers && distinctX.length <= 10) {
      deliveryBuckets = distinctX.map((day) => {
        const matching = validPairs.filter((p) => p.x === day);
        return {
          bucketLabel: `${day} ${deliveryUnitLabel === 'hrs' ? 'hr' : day === 1 ? 'day' : 'days'}`,
          minDays: day,
          maxDays: day,
          orderCount: matching.length,
          avgRating: matching.reduce((s, p) => s + p.y, 0) / matching.length,
        };
      });
    } else {
      const minX = distinctX[0];
      const maxX = distinctX[distinctX.length - 1];
      const range = maxX - minX;
      if (range === 0) {
        deliveryBuckets = [
          {
            bucketLabel: `${minX} ${deliveryUnitLabel}`,
            minDays: minX,
            maxDays: maxX,
            orderCount: validPairs.length,
            avgRating: avgCustomerRating,
          },
        ];
      } else {
        const numBuckets = Math.min(5, Math.max(3, Math.ceil(distinctX.length / 2)));
        const step = range / numBuckets;
        for (let i = 0; i < numBuckets; i++) {
          const lo = minX + i * step;
          const hi = i === numBuckets - 1 ? maxX : minX + (i + 1) * step;
          const matching = validPairs.filter((p) =>
            i === numBuckets - 1 ? p.x >= lo && p.x <= hi : p.x >= lo && p.x < hi
          );
          if (matching.length > 0) {
            deliveryBuckets.push({
              bucketLabel: `${lo.toFixed(1)}–${hi.toFixed(1)} ${deliveryUnitLabel}`,
              minDays: lo,
              maxDays: hi,
              orderCount: matching.length,
              avgRating: matching.reduce((s, p) => s + p.y, 0) / matching.length,
            });
          }
        }
      }
    }

    // Deterministic subsample up to 250 points for clean scatter chart rendering
    if (validPairs.length <= 250) {
      deliveryScatterPoints = validPairs;
    } else {
      const step = validPairs.length / 250;
      for (let i = 0; i < 250; i++) {
        deliveryScatterPoints.push(validPairs[Math.floor(i * step)]);
      }
    }
  } else if (deliveryAvailable) {
    deliveryMissingReason =
      'No rows contain valid numeric values for both Delivery Time and Customer Rating in the current selection.';
  }

  // Return Rate Analysis
  const returnAvailable = Boolean(mapping.returnStatus);
  let returnMissingReason: string | null = !mapping.returnStatus
    ? 'No Return Status / Returned column was found in the uploaded dataset.'
    : null;

  let validReturnRows = 0;
  let returnedTotal = 0;
  const catReturnMap = new Map<string, { total: number; returned: number }>();

  if (returnAvailable && mapping.returnStatus) {
    for (const row of filteredRows) {
      const parsedReturn = parseReturnBoolean(row[mapping.returnStatus]);
      if (parsedReturn === null) continue;
      validReturnRows++;
      if (parsedReturn) returnedTotal++;

      if (mapping.productCategory) {
        const rawCat = row[mapping.productCategory];
        const cat = isMissingValue(rawCat) ? 'Unspecified' : String(rawCat).trim();
        const cur = catReturnMap.get(cat) || { total: 0, returned: 0 };
        cur.total += 1;
        if (parsedReturn) cur.returned += 1;
        catReturnMap.set(cat, cur);
      }
    }
    if (validReturnRows === 0) {
      returnMissingReason = `Column "${mapping.returnStatus}" has no recognized return flags (e.g., Yes/No, True/False, Returned/Delivered, 1/0).`;
    }
  }

  const overallReturnRate = validReturnRows > 0 ? (returnedTotal / validReturnRows) * 100 : null;
  const totalReturnedOrders = validReturnRows > 0 ? returnedTotal : null;

  const categoryReturns: CategoryReturnPoint[] = Array.from(catReturnMap.entries())
    .map(([category, st]) => ({
      category,
      totalEvaluated: st.total,
      returnedCount: st.returned,
      returnRate: st.total > 0 ? (st.returned / st.total) * 100 : 0,
    }))
    .sort((a, b) => b.returnRate - a.returnRate);

  const highestReturnCategory = categoryReturns.length > 0 ? categoryReturns[0] : null;

  const deliveryObservations: string[] = [];
  if (validPairs.length > 0 && deliveryBuckets.length > 0) {
    const fastest = deliveryBuckets[0];
    const slowest = deliveryBuckets[deliveryBuckets.length - 1];
    const rText =
      deliveryRatingCorrelation !== null
        ? `Pearson correlation r = ${deliveryRatingCorrelation.toFixed(3)} (${
            deliveryRatingCorrelation <= -0.3
              ? 'moderate-to-strong negative relationship: slower deliveries noticeably reduce ratings'
              : deliveryRatingCorrelation < -0.1
                ? 'mild negative relationship: longer delivery times correspond with slightly lower ratings'
                : deliveryRatingCorrelation >= 0.1
                  ? 'slight positive relationship'
                  : 'very weak linear relationship'
          })`
        : 'correlation unavailable due to uniform values';

    deliveryObservations.push(
      `Across ${formatNumber(validPairs.length)} evaluated orders, average delivery time is ${avgDeliveryTime?.toFixed(2)} ${deliveryUnitLabel} with an average customer rating of ${avgCustomerRating?.toFixed(2)} (${rText}).`
    );
    if (deliveryBuckets.length >= 2) {
      deliveryObservations.push(
        `Orders delivered in the fastest bracket (${fastest.bucketLabel}) averaged ${fastest.avgRating.toFixed(2)} rating, compared to ${slowest.avgRating.toFixed(2)} in the slowest bracket (${slowest.bucketLabel}).`
      );
    }
  } else if (deliveryMissingReason) {
    deliveryObservations.push(deliveryMissingReason);
  }

  if (overallReturnRate !== null && totalReturnedOrders !== null) {
    if (highestReturnCategory && categoryReturns.length >= 2) {
      const lowestRet = categoryReturns[categoryReturns.length - 1];
      deliveryObservations.push(
        `Overall return rate is ${formatPercent(overallReturnRate, 1)} (${formatNumber(totalReturnedOrders)} of ${formatNumber(validReturnRows)} orders). "${highestReturnCategory.category}" has the highest return rate at ${formatPercent(highestReturnCategory.returnRate, 1)}, compared to ${formatPercent(lowestRet.returnRate, 1)} in "${lowestRet.category}".`
      );
    } else {
      deliveryObservations.push(
        `Overall product return rate is ${formatPercent(overallReturnRate, 1)} (${formatNumber(totalReturnedOrders)} returned out of ${formatNumber(validReturnRows)} evaluated orders).`
      );
    }
  } else if (returnMissingReason) {
    deliveryObservations.push(returnMissingReason);
  }

  const operationalImprovements: { title: string; detail: string }[] = [];
  if (deliveryBuckets.length >= 2 && avgDeliveryTime !== null) {
    const slowest = deliveryBuckets[deliveryBuckets.length - 1];
    operationalImprovements.push({
      title: `Tighten SLA & Carrier Routing for Orders Exceeding ${avgDeliveryTime.toFixed(1)} ${deliveryUnitLabel}`,
      detail: `Longer delivery brackets (such as ${slowest.bucketLabel} averaging ${slowest.avgRating.toFixed(2)} rating) pull down customer satisfaction. Prioritize regional warehouse fulfillment or alternate courier SLAs for delayed lanes.`,
    });
  } else {
    operationalImprovements.push({
      title: 'Standardize Delivery SLA Tracking & Proactive Delay Alerts',
      detail: 'Monitor carrier transit times per order and notify customers proactively before an expected delivery threshold is missed to protect satisfaction scores.',
    });
  }

  if (highestReturnCategory) {
    operationalImprovements.push({
      title: `Root-Cause Quality & Sizing Audit in "${highestReturnCategory.category}"`,
      detail: `"${highestReturnCategory.category}" leads all categories with a ${formatPercent(highestReturnCategory.returnRate, 1)} return rate (${formatNumber(highestReturnCategory.returnedCount)} returns). Introduce clearer product specifications, packaging protection, or pre-dispatch QC checks in this category.`,
    });
  } else {
    operationalImprovements.push({
      title: 'Capture Granular Return Reason Codes at Checkout/Support',
      detail: 'Log structured return reasons (damaged, wrong size, late arrival) across categories to pinpoint preventable post-purchase friction.',
    });
  }

  // ---------------------------------------------------------------------------
  // TASK 5: EXECUTIVE RECOMMENDATIONS & CONCLUSION
  // ---------------------------------------------------------------------------
  const executiveRecommendations: { area: string; recommendation: string; impact: string }[] = [];

  if (highestMonth && lowestMonth && monthlyRevenue.length >= 2) {
    executiveRecommendations.push({
      area: 'Sales & Seasonal Planning',
      recommendation: `Replicate top-performing campaign and inventory readiness from ${highestMonth.label} (${formatCurrency(highestMonth.revenue, sym)}) during slower periods like ${lowestMonth.label} (${formatCurrency(lowestMonth.revenue, sym)}).`,
      impact: 'Smooths monthly revenue volatility and lifts baseline order volume.',
    });
  } else {
    executiveRecommendations.push({
      area: 'Sales & Revenue Tracking',
      recommendation: 'Standardize monthly revenue and order-date logging across all channels to monitor seasonality and month-over-month momentum.',
      impact: 'Enables proactive inventory and promotional forecasting.',
    });
  }

  if (topCategory && lowestRepeatSegment && topRepeatSegment) {
    executiveRecommendations.push({
      area: 'Product Mix & Retention',
      recommendation: `Leverage "${topCategory.category}" (${formatPercent(topCategory.revenueShare, 1)} of revenue) as a loyalty anchor while deploying win-back incentives for "${lowestRepeatSegment.segment}" (${formatPercent(lowestRepeatSegment.repeatRate, 1)} repeat rate vs ${formatPercent(topRepeatSegment.repeatRate, 1)} in "${topRepeatSegment.segment}").`,
      impact: 'Increases customer lifetime value and reduces one-time buyer churn.',
    });
  } else if (topCategory) {
    executiveRecommendations.push({
      area: 'Category Growth',
      recommendation: `Protect stock availability and cross-sell complementary items alongside "${topCategory.category}", which generates ${formatPercent(topCategory.revenueShare, 1)} of total revenue.`,
      impact: 'Raises average order value and category margin contribution.',
    });
  }

  if (highestReturnCategory) {
    executiveRecommendations.push({
      area: 'Fulfillment & Returns',
      recommendation: `Audit supplier quality and fulfillment speed specifically for "${highestReturnCategory.category}" (${formatPercent(highestReturnCategory.returnRate, 1)} return rate)${avgDeliveryTime !== null ? ` and target delivery times below ${avgDeliveryTime.toFixed(1)} ${deliveryUnitLabel}` : ''}.`,
      impact: 'Cuts reverse-logistics costs and protects customer ratings.',
    });
  } else if (avgDeliveryTime !== null && avgCustomerRating !== null) {
    executiveRecommendations.push({
      area: 'Delivery Experience',
      recommendation: `Reduce tail-end delivery delays beyond ${avgDeliveryTime.toFixed(1)} ${deliveryUnitLabel} to sustain or lift the current ${avgCustomerRating.toFixed(2)} average customer rating.`,
      impact: 'Improves post-delivery customer satisfaction and repeat propensity.',
    });
  }

  // Overall Conclusion summarizing UrbanMart's actual performance
  const conclusionParts: string[] = [];
  if (totalRevenue !== null) {
    conclusionParts.push(
      `Based on ${formatNumber(filteredRecordCount)} analyzed UrbanMart transactions, the business generated ${formatCurrency(totalRevenue, sym)} in total revenue (average order value ${formatCurrency(avgOrderValue, sym)})`
    );
  } else {
    conclusionParts.push(
      `Across ${formatNumber(filteredRecordCount)} analyzed UrbanMart records, dataset structure and operational metrics were evaluated`
    );
  }

  if (topCategory) {
    conclusionParts[0] += `, led by "${topCategory.category}" (${formatPercent(topCategory.revenueShare, 1)} share).`;
  } else {
    conclusionParts[0] += '.';
  }

  if (overallRepeatRate !== null && topRepeatSegment) {
    conclusionParts.push(
      `Customer retention stands at an overall repeat rate of ${formatPercent(overallRepeatRate, 1)}, with "${topRepeatSegment.segment}" showing the strongest repeat engagement (${formatPercent(topRepeatSegment.repeatRate, 1)}).`
    );
  }

  if (avgDeliveryTime !== null && avgCustomerRating !== null) {
    conclusionParts.push(
      `Operations average ${avgDeliveryTime.toFixed(1)} ${deliveryUnitLabel} for delivery with a ${avgCustomerRating.toFixed(2)} rating${overallReturnRate !== null ? ` and a ${formatPercent(overallReturnRate, 1)} overall return rate` : ''}${highestReturnCategory ? ` (highest in "${highestReturnCategory.category}" at ${formatPercent(highestReturnCategory.returnRate, 1)})` : ''}.`
    );
  } else if (overallReturnRate !== null) {
    conclusionParts.push(
      `Overall return rate is ${formatPercent(overallReturnRate, 1)}${highestReturnCategory ? `, with "${highestReturnCategory.category}" recording the highest category return rate at ${formatPercent(highestReturnCategory.returnRate, 1)}` : ''}.`
    );
  }

  conclusionParts.push(
    'Focusing on repeat conversion in lagging segments, replicating peak-month execution, and tightening fulfillment/QC in high-return categories provides a clear, data-backed path to stronger profitability.'
  );

  return {
    totalRecords,
    totalColumns,
    totalMissingCells,
    completenessPct,
    exactDuplicateRows,
    duplicateIdSummary,
    columnProfiles,
    datasetOverview,
    explorationInsights,
    dateSpanLabel,

    filteredRecordCount,
    availableMonths,
    availableCategories,
    availableSegments,

    revenueCapability: {
      available: revenueAvailable,
      sourceDescription: revenueSourceDescription,
      missingReason: revenueMissingReason,
      validRevenueRows,
      missingRevenueRows,
    },
    dateCapability: {
      available: dateAvailable,
      missingReason: dateMissingReason,
      validDateRows,
      invalidOrMissingDateRows,
    },
    totalRevenue,
    avgOrderValue,
    monthlyRevenue,
    highestMonth,
    lowestMonth,
    averageMonthlyRevenue,
    salesObservations,

    categoryCapability: {
      available: categoryAvailable,
      missingReason: categoryMissingReason,
    },
    categoryRevenue,
    topCategory,

    repeatCapability: {
      available: repeatMethod !== 'none' && overallUniqueCustomers !== null && overallUniqueCustomers > 0,
      method: repeatMethod,
      description: repeatDescription,
      missingReason: repeatMissingReason,
    },
    overallRepeatRate,
    overallRepeatCustomers,
    overallUniqueCustomers,
    segmentRepeatStats,
    topRepeatSegment,
    lowestRepeatSegment,
    retentionStrategies,

    deliveryCapability: {
      available: deliveryAvailable && validPairs.length > 0,
      missingReason: deliveryMissingReason,
      validPairCount: validPairs.length,
    },
    avgDeliveryTime,
    avgCustomerRating,
    deliveryRatingCorrelation,
    deliveryBuckets,
    deliveryScatterPoints,
    deliveryUnitLabel,

    returnCapability: {
      available: returnAvailable && validReturnRows > 0,
      missingReason: returnMissingReason,
      validReturnRows,
    },
    overallReturnRate,
    totalReturnedOrders,
    categoryReturns,
    highestReturnCategory,
    deliveryObservations,
    operationalImprovements,

    executiveRecommendations,
    overallConclusion: conclusionParts.join(' '),
  };
}
