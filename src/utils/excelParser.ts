import * as XLSX from 'xlsx';
import type { ColumnMapping, ParsedWorkbook } from '../types/analytics';

const MISSING_TOKENS = new Set(['', 'na', 'n/a', 'null', 'nan', 'none', 'undefined', '-']);

export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number') return Number.isNaN(value);
  if (value instanceof Date) return Number.isNaN(value.getTime());
  if (typeof value === 'string') {
    return MISSING_TOKENS.has(value.trim().toLowerCase());
  }
  return false;
}

export function parseNumericValue(value: unknown): number | null {
  if (isMissingValue(value)) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return null;
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/[$₹€£¥,\s]/g, '');
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

export function parseDateValue(value: unknown): Date | null {
  if (isMissingValue(value)) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    // Excel serial date range sanity check (1900 to 2100)
    if (value > 1 && value < 100000) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed && parsed.y >= 1900 && parsed.y <= 2100) {
        return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
      }
    }
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Handle DD/MM/YYYY or DD-MM-YYYY when day > 12 or standard format
    const dmyMatch = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:\s.*)?$/.exec(trimmed);
    if (dmyMatch) {
      const first = Number(dmyMatch[1]);
      const second = Number(dmyMatch[2]);
      let year = Number(dmyMatch[3]);
      if (year < 100) year += 2000;

      // If first > 12, it is definitely DD/MM/YYYY
      if (first > 12 && second >= 1 && second <= 12) {
        const dt = new Date(year, second - 1, first);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
      // If second > 12, it is MM/DD/YYYY
      if (second > 12 && first >= 1 && first <= 12) {
        const dt = new Date(year, first - 1, second);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() >= 1970 && parsed.getFullYear() <= 2100) {
      return parsed;
    }
  }
  return null;
}

export function parseReturnBoolean(value: unknown): boolean | null {
  if (isMissingValue(value)) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === 'string') {
    const norm = value.trim().toLowerCase();
    if (['yes', 'y', 'true', '1', 'returned', 'return', 'refunded', 'refund'].includes(norm)) {
      return true;
    }
    if (['no', 'n', 'false', '0', 'not returned', 'delivered', 'completed', 'kept', 'none'].includes(norm)) {
      return false;
    }
  }
  return null;
}

export async function readWorkbookFromFile(file: File): Promise<{
  workbook: XLSX.WorkBook;
  fileName: string;
  fileSizeBytes: number;
  sheetNames: string[];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, cellNF: true });
  return {
    workbook,
    fileName: file.name,
    fileSizeBytes: file.size,
    sheetNames: workbook.SheetNames,
  };
}

export function extractSheetData(
  workbook: XLSX.WorkBook,
  sheetName: string,
  fileName: string,
  fileSizeBytes: number
): ParsedWorkbook {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return {
      fileName,
      fileSizeBytes,
      sheetNames: workbook.SheetNames,
      activeSheet: sheetName,
      headers: [],
      rows: [],
      detectedCurrencySymbol: '$',
      dateIsExcelSerial: {},
    };
  }

  // Extract raw array of arrays first to preserve exact header names and detect empty columns cleanly
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  if (matrix.length === 0) {
    return {
      fileName,
      fileSizeBytes,
      sheetNames: workbook.SheetNames,
      activeSheet: sheetName,
      headers: [],
      rows: [],
      detectedCurrencySymbol: '$',
      dateIsExcelSerial: {},
    };
  }

  // Find first non-empty header row
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(matrix.length, 10); i++) {
    const row = matrix[i];
    if (Array.isArray(row) && row.filter((cell) => !isMissingValue(cell)).length >= 2) {
      headerRowIdx = i;
      break;
    }
  }

  const rawHeaders = (matrix[headerRowIdx] || []).map((cell, idx) => {
    const label = cell === null || cell === undefined ? '' : String(cell).trim();
    return label || `Column_${idx + 1}`;
  });

  // Deduplicate identical header names if any exist
  const headerCounts = new Map<string, number>();
  const headers = rawHeaders.map((h) => {
    const count = headerCounts.get(h) || 0;
    headerCounts.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });

  const rows: Record<string, unknown>[] = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const rowArr = matrix[r];
    if (!Array.isArray(rowArr)) continue;
    const hasAnyValue = rowArr.some((cell) => !isMissingValue(cell));
    if (!hasAnyValue) continue;

    const obj: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = c < rowArr.length ? rowArr[c] : null;
    }
    rows.push(obj);
  }

  // Detect currency symbol from formatted display strings or header names
  let detectedCurrencySymbol = '$';
  const currencyCounts: Record<string, number> = { '$': 0, '₹': 0, '€': 0, '£': 0 };

  for (const h of headers) {
    if (h.includes('₹') || /inr|rs\b|rupee/i.test(h)) currencyCounts['₹'] += 5;
    if (h.includes('€') || /eur\b/i.test(h)) currencyCounts['€'] += 5;
    if (h.includes('£') || /gbp\b/i.test(h)) currencyCounts['£'] += 5;
    if (h.includes('$') || /usd\b/i.test(h)) currencyCounts['$'] += 5;
  }

  // Sample formatted cell strings from sheet object
  let sampledCells = 0;
  for (const addr of Object.keys(sheet)) {
    if (addr.startsWith('!') || sampledCells > 250) continue;
    const cell = sheet[addr] as XLSX.CellObject | undefined;
    if (cell && typeof cell.w === 'string') {
      if (cell.w.includes('₹')) currencyCounts['₹'] += 1;
      else if (cell.w.includes('€')) currencyCounts['€'] += 1;
      else if (cell.w.includes('£')) currencyCounts['£'] += 1;
      else if (cell.w.includes('$')) currencyCounts['$'] += 1;
      sampledCells++;
    }
  }

  let bestSym = '$';
  let bestCount = 0;
  for (const [sym, count] of Object.entries(currencyCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestSym = sym;
    }
  }
  if (bestCount > 0) {
    detectedCurrencySymbol = bestSym;
  }

  return {
    fileName,
    fileSizeBytes,
    sheetNames: workbook.SheetNames,
    activeSheet: sheetName,
    headers,
    rows,
    detectedCurrencySymbol,
    dateIsExcelSerial: {},
  };
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchHeader(headers: string[], exactCandidates: string[], keywordGroups: string[][]): string | null {
  const normalizedMap = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));

  for (const cand of exactCandidates) {
    const found = normalizedMap.find((item) => item.norm === cand);
    if (found) return found.raw;
  }

  for (const group of keywordGroups) {
    const found = normalizedMap.find((item) => group.every((kw) => item.norm.includes(kw)));
    if (found) return found.raw;
  }

  return null;
}

export function autoDetectColumnMapping(headers: string[], rows: Record<string, unknown>[]): ColumnMapping {
  const transactionId = matchHeader(
    headers,
    ['transactionid', 'orderid', 'invoiceno', 'invoiceid', 'txnid', 'receiptid', 'id'],
    [['transaction', 'id'], ['order', 'id'], ['invoice', 'id'], ['txn', 'id']]
  );

  const orderDate = matchHeader(
    headers,
    ['orderdate', 'transactiondate', 'date', 'purchasedate', 'salesdate', 'createdat', 'invoicedate'],
    [['order', 'date'], ['transaction', 'date'], ['purchase', 'date'], ['date']]
  );

  const revenue = matchHeader(
    headers,
    [
      'totalrevenue',
      'revenue',
      'totalsales',
      'sales',
      'orderamount',
      'totalamount',
      'amount',
      'netamount',
      'totalprice',
      'totalvalue',
      'salesamount',
    ],
    [['total', 'revenue'], ['total', 'sales'], ['total', 'amount'], ['revenue'], ['sales'], ['amount']]
  );

  const unitPrice = matchHeader(
    headers,
    ['unitprice', 'price', 'itemprice', 'sellingprice', 'rate'],
    [['unit', 'price'], ['price']]
  );

  const quantity = matchHeader(
    headers,
    ['quantity', 'qty', 'units', 'unitssold', 'count', 'itemcount'],
    [['quantity'], ['qty'], ['units']]
  );

  const productCategory = matchHeader(
    headers,
    ['productcategory', 'category', 'itemcategory', 'department', 'producttype', 'productline'],
    [['product', 'category'], ['category'], ['department']]
  );

  const customerId = matchHeader(
    headers,
    ['customerid', 'custid', 'userid', 'clientid', 'buyerid', 'memberid'],
    [['customer', 'id'], ['cust', 'id'], ['user', 'id'], ['client', 'id']]
  );

  const customerSegment = matchHeader(
    headers,
    ['customersegment', 'segment', 'customertype', 'tier', 'membership', 'loyaltytier', 'clientsegment'],
    [['customer', 'segment'], ['segment'], ['customer', 'type'], ['loyalty']]
  );

  const deliveryTime = matchHeader(
    headers,
    [
      'deliverytimedays',
      'deliverytime',
      'deliverydays',
      'shippingdays',
      'shippingtime',
      'leadtime',
      'fulfillmentdays',
      'daystodeliver',
    ],
    [['delivery', 'time'], ['delivery', 'day'], ['shipping', 'day'], ['shipping', 'time'], ['delivery']]
  );

  const customerRating = matchHeader(
    headers,
    ['customerrating', 'rating', 'ratings', 'reviewscore', 'satisfactionscore', 'csat', 'score', 'stars'],
    [['customer', 'rating'], ['rating'], ['satisfaction'], ['review', 'score'], ['csat']]
  );

  const returnStatus = matchHeader(
    headers,
    ['returnstatus', 'returned', 'isreturned', 'returnflag', 'refunded', 'isrefunded', 'return'],
    [['return', 'status'], ['is', 'return'], ['returned'], ['refund']]
  );

  const repeatFlag = matchHeader(
    headers,
    ['repeatpurchase', 'isrepeat', 'repeatcustomer', 'repeatorder', 'returningcustomer'],
    [['repeat', 'purchase'], ['repeat', 'customer'], ['returning']]
  );

  // Validate that matched date column actually parses as dates on sample rows
  let verifiedOrderDate = orderDate;
  if (verifiedOrderDate && rows.length > 0) {
    const sample = rows.slice(0, 25).map((r) => r[verifiedOrderDate!]).filter((v) => !isMissingValue(v));
    if (sample.length > 0 && sample.filter((v) => parseDateValue(v) !== null).length === 0) {
      verifiedOrderDate = null;
    }
  }

  return {
    transactionId,
    orderDate: verifiedOrderDate,
    revenue,
    unitPrice,
    quantity,
    productCategory,
    customerId,
    customerSegment,
    deliveryTime,
    customerRating,
    returnStatus,
    repeatFlag,
  };
}
