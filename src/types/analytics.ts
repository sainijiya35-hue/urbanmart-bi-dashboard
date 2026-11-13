export type ColumnDataType = 'Numeric' | 'Date' | 'Categorical' | 'Boolean' | 'Identifier';

export interface ColumnProfile {
  name: string;
  dataType: ColumnDataType;
  nonNullCount: number;
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  sampleValues: string[];
}

export interface ColumnMapping {
  transactionId: string | null;
  orderDate: string | null;
  revenue: string | null;
  unitPrice: string | null;
  quantity: string | null;
  productCategory: string | null;
  customerId: string | null;
  customerSegment: string | null;
  deliveryTime: string | null;
  customerRating: string | null;
  returnStatus: string | null;
  repeatFlag: string | null;
}

export interface ParsedWorkbook {
  fileName: string;
  fileSizeBytes: number;
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: Record<string, unknown>[];
  detectedCurrencySymbol: string;
  dateIsExcelSerial: Record<string, boolean>;
}

export interface DashboardFilters {
  month: string; // 'ALL' or 'YYYY-MM'
  category: string; // 'ALL' or category name
  segment: string; // 'ALL' or segment name
}

export interface MonthlyRevenuePoint {
  monthKey: string;
  label: string;
  revenue: number;
  transactions: number;
  avgOrderValue: number;
}

export interface CategoryRevenuePoint {
  category: string;
  revenue: number;
  revenueShare: number;
  transactions: number;
  avgOrderValue: number;
}

export interface SegmentRepeatPoint {
  segment: string;
  totalCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  totalTransactions: number;
  repeatTransactions: number;
  totalRevenue: number;
  avgOrdersPerCustomer: number;
}

export interface DeliveryBucketPoint {
  bucketLabel: string;
  minDays: number;
  maxDays: number;
  orderCount: number;
  avgRating: number;
}

export interface DeliveryScatterPoint {
  x: number;
  y: number;
}

export interface CategoryReturnPoint {
  category: string;
  totalEvaluated: number;
  returnedCount: number;
  returnRate: number;
}

export interface DuplicateIdSummary {
  columnName: string;
  duplicateIdCount: number;
  extraDuplicateRows: number;
}

export interface AnalysisResult {
  // Dataset-wide (Task 1)
  totalRecords: number;
  totalColumns: number;
  totalMissingCells: number;
  completenessPct: number;
  exactDuplicateRows: number;
  duplicateIdSummary: DuplicateIdSummary | null;
  columnProfiles: ColumnProfile[];
  datasetOverview: string;
  explorationInsights: string[];
  dateSpanLabel: string | null;

  // Filter metadata
  filteredRecordCount: number;
  availableMonths: { key: string; label: string }[];
  availableCategories: string[];
  availableSegments: string[];

  // Task 2: Sales & Revenue
  revenueCapability: {
    available: boolean;
    sourceDescription: string;
    missingReason: string | null;
    validRevenueRows: number;
    missingRevenueRows: number;
  };
  dateCapability: {
    available: boolean;
    missingReason: string | null;
    validDateRows: number;
    invalidOrMissingDateRows: number;
  };
  totalRevenue: number | null;
  avgOrderValue: number | null;
  monthlyRevenue: MonthlyRevenuePoint[];
  highestMonth: MonthlyRevenuePoint | null;
  lowestMonth: MonthlyRevenuePoint | null;
  averageMonthlyRevenue: number | null;
  salesObservations: string[];

  // Task 3: Product & Customer
  categoryCapability: {
    available: boolean;
    missingReason: string | null;
  };
  categoryRevenue: CategoryRevenuePoint[];
  topCategory: CategoryRevenuePoint | null;

  repeatCapability: {
    available: boolean;
    method: 'customer_id' | 'explicit_flag' | 'none';
    description: string;
    missingReason: string | null;
  };
  overallRepeatRate: number | null;
  overallRepeatCustomers: number | null;
  overallUniqueCustomers: number | null;
  segmentRepeatStats: SegmentRepeatPoint[];
  topRepeatSegment: SegmentRepeatPoint | null;
  lowestRepeatSegment: SegmentRepeatPoint | null;
  retentionStrategies: { title: string; detail: string }[];

  // Task 4: Delivery & Returns
  deliveryCapability: {
    available: boolean;
    missingReason: string | null;
    validPairCount: number;
  };
  avgDeliveryTime: number | null;
  avgCustomerRating: number | null;
  deliveryRatingCorrelation: number | null;
  deliveryBuckets: DeliveryBucketPoint[];
  deliveryScatterPoints: DeliveryScatterPoint[];
  deliveryUnitLabel: string;

  returnCapability: {
    available: boolean;
    missingReason: string | null;
    validReturnRows: number;
  };
  overallReturnRate: number | null;
  totalReturnedOrders: number | null;
  categoryReturns: CategoryReturnPoint[];
  highestReturnCategory: CategoryReturnPoint | null;
  deliveryObservations: string[];
  operationalImprovements: { title: string; detail: string }[];

  // Task 5: Synthesis
  executiveRecommendations: { area: string; recommendation: string; impact: string }[];
  overallConclusion: string;
}
