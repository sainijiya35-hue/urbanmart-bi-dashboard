import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import type * as XLSX from 'xlsx';
import {
  BarChart3,
  CheckSquare,
  Database,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  Menu,
  Package,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import type { ColumnMapping, DashboardFilters, ParsedWorkbook } from './types/analytics';
import { analyzeDataset } from './utils/analyzer';
import {
  autoDetectColumnMapping,
  extractSheetData,
  readWorkbookFromFile,
} from './utils/excelParser';
import { formatNumber } from './utils/formatters';
import { ColumnMapperModal } from './components/ColumnMapperModal';
import { UploadWorkspace } from './components/UploadWorkspace';
import { OverviewSection } from './components/sections/OverviewSection';
import { Task1Exploration } from './components/sections/Task1Exploration';
import { Task2Sales } from './components/sections/Task2Sales';
import { Task3ProductCustomer } from './components/sections/Task3ProductCustomer';
import { Task4DeliveryReturns } from './components/sections/Task4DeliveryReturns';
import { Task5Conclusion } from './components/sections/Task5Conclusion';

type NavTab = 'overview' | 'task1' | 'task2' | 'task3' | 'task4' | 'task5' | 'all';

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Executive Dashboard', icon: LayoutDashboard },
  { id: 'task1', label: '01. Dataset Exploration', icon: Database },
  { id: 'task2', label: '02. Sales & Revenue', icon: TrendingUp },
  { id: 'task3', label: '03. Product & Customer', icon: Package },
  { id: 'task4', label: '04. Delivery & Returns', icon: Truck },
  { id: 'task5', label: '05. Summary & Strategy', icon: CheckSquare },
  { id: 'all', label: 'Full Lab Report View', icon: BarChart3 },
];

export default function App() {
  const [rawWorkbookRef, setRawWorkbookRef] = useState<{
    workbook: XLSX.WorkBook;
    fileName: string;
    fileSizeBytes: number;
  } | null>(null);
  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedWorkbook | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>({
    month: 'ALL',
    category: 'ALL',
    segment: 'ALL',
  });
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isMapperOpen, setIsMapperOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const loadSheetIntoState = (
    workbook: XLSX.WorkBook,
    sheetName: string,
    fileName: string,
    fileSizeBytes: number
  ) => {
    const extracted = extractSheetData(workbook, sheetName, fileName, fileSizeBytes);
    if (extracted.headers.length === 0 || extracted.rows.length === 0) {
      setErrorMessage(
        `Worksheet "${sheetName}" appears empty or has no recognizable header and data rows.`
      );
      return;
    }

    const detected = autoDetectColumnMapping(extracted.headers, extracted.rows);
    setParsedWorkbook(extracted);
    setMapping(detected);
    setFilters({ month: 'ALL', category: 'ALL', segment: 'ALL' });
    setErrorMessage(null);
  };

  const handleFileSelected = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { workbook, fileName, fileSizeBytes, sheetNames } = await readWorkbookFromFile(file);
      if (sheetNames.length === 0) {
        setErrorMessage('The uploaded workbook contains no worksheets.');
        return;
      }

      // Pick first non-empty sheet automatically
      let chosenSheet = sheetNames[0];
      for (const name of sheetNames) {
        const probe = extractSheetData(workbook, name, fileName, fileSizeBytes);
        if (probe.rows.length > 0) {
          chosenSheet = name;
          break;
        }
      }

      setRawWorkbookRef({ workbook, fileName, fileSizeBytes });
      loadSheetIntoState(workbook, chosenSheet, fileName, fileSizeBytes);
      setActiveTab('overview');
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? `Could not read Excel file: ${err.message}`
          : 'Could not read the uploaded file. Please ensure it is a valid .xlsx, .xls, or .csv file.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetSwitch = (sheetName: string) => {
    if (!rawWorkbookRef) return;
    loadSheetIntoState(
      rawWorkbookRef.workbook,
      sheetName,
      rawWorkbookRef.fileName,
      rawWorkbookRef.fileSizeBytes
    );
  };

  const handleReplaceInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  };

  const analysis = useMemo(() => {
    if (!parsedWorkbook || !mapping) return null;
    return analyzeDataset(parsedWorkbook, mapping, filters);
  }, [parsedWorkbook, mapping, filters]);

  const hasActiveFilters =
    filters.month !== 'ALL' || filters.category !== 'ALL' || filters.segment !== 'ALL';

  const resetFilters = () => {
    setFilters({ month: 'ALL', category: 'ALL', segment: 'ALL' });
  };

  const handleSelectNav = (tab: NavTab) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <input
        ref={replaceInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleReplaceInputChange}
        className="hidden"
        aria-label="Replace uploaded UrbanMart Excel file"
      />

      {!parsedWorkbook || !analysis || !mapping ? (
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-4 sm:px-6 lg:px-8">
              <span className="text-lg font-bold tracking-tight text-[#0f2544] whitespace-nowrap shrink-0">
                UrbanMart Analytics
              </span>
              <span className="hidden text-sm font-medium text-slate-600 sm:inline whitespace-nowrap shrink-0">
                Business Intelligence Workspace
              </span>
              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0f2544] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a365d] whitespace-nowrap shrink-0"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload Dataset</span>
              </button>
            </div>
          </header>

          <UploadWorkspace
            onFileSelected={handleFileSelected}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </div>
      ) : (
        <div className="flex min-h-screen">
          {/* Desktop Sidebar */}
          <aside className="hidden w-[260px] shrink-0 flex-col justify-between bg-[#0f2544] text-white lg:flex">
            <div className="p-5">
              <div className="border-b border-white/10 pb-4">
                <p className="text-lg font-bold tracking-tight text-white">
                  UrbanMart Analytics
                </p>
                <p className="mt-1 text-xs text-blue-200/80">
                  Business Intelligence Lab
                </p>
              </div>

              <nav className="mt-5 space-y-1" aria-label="Dashboard sections">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectNav(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#1d4ed8] text-white'
                          : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-white/10 p-5 space-y-3">
              <div className="rounded-lg bg-white/5 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-100">
                  <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#4ade80]" aria-hidden="true" />
                  <span className="truncate">{parsedWorkbook.fileName}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-blue-200/75 tabular-nums">
                  {formatNumber(analysis.totalRecords)} rows · {analysis.totalColumns} columns
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMapperOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Column Mapping</span>
              </button>

              <button
                type="button"
                onClick={() => replaceInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-[#0f2544] transition-colors hover:bg-blue-50"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload New File</span>
              </button>
            </div>
          </aside>

          {/* Mobile Drawer Navigation */}
          {isMobileNavOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <div
                className="fixed inset-0 bg-slate-900/50"
                onClick={() => setIsMobileNavOpen(false)}
              />
              <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col justify-between bg-[#0f2544] p-5 text-white">
                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-base font-bold">UrbanMart Analytics</span>
                    <button
                      type="button"
                      onClick={() => setIsMobileNavOpen(false)}
                      className="rounded-lg p-1.5 text-blue-100 hover:bg-white/10"
                      aria-label="Close navigation menu"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <nav className="mt-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectNav(item.id)}
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                            isActive
                              ? 'bg-[#1d4ed8] text-white'
                              : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileNavOpen(false);
                      setIsMapperOpen(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium text-white"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Column Mapping</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => replaceInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-[#0f2544]"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Upload New File</span>
                  </button>
                </div>
              </aside>
            </div>
          )}

          {/* Main Workspace */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top Header */}
            <header className="no-print border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsMobileNavOpen(true)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <h1 className="truncate text-base font-semibold text-[#0f2544] sm:text-lg">
                      AI-Powered Business Data Analysis Using UrbanMart Dataset
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMapperOpen(true)}
                    className="hidden items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex whitespace-nowrap shrink-0"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Map Columns</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => replaceInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f2544] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a365d] whitespace-nowrap shrink-0"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Replace File</span>
                  </button>
                </div>
              </div>
            </header>

            {/* Interactive Filters Toolbar */}
            <div className="no-print border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0f2544]">
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Filters</span>
                  </div>

                  {/* Month Filter */}
                  <select
                    aria-label="Filter by Month"
                    value={filters.month}
                    disabled={analysis.availableMonths.length === 0}
                    onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#0f2544] focus:outline-none disabled:opacity-50"
                  >
                    <option value="ALL">
                      {analysis.availableMonths.length > 0 ? 'All Months' : 'No Date Column'}
                    </option>
                    {analysis.availableMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  {/* Category Filter */}
                  <select
                    aria-label="Filter by Product Category"
                    value={filters.category}
                    disabled={analysis.availableCategories.length === 0}
                    onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#0f2544] focus:outline-none disabled:opacity-50"
                  >
                    <option value="ALL">
                      {analysis.availableCategories.length > 0
                        ? 'All Product Categories'
                        : 'No Category Column'}
                    </option>
                    {analysis.availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>

                  {/* Segment Filter */}
                  <select
                    aria-label="Filter by Customer Segment"
                    value={filters.segment}
                    disabled={analysis.availableSegments.length === 0}
                    onChange={(e) => setFilters((f) => ({ ...f, segment: e.target.value }))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-[#0f2544] focus:outline-none disabled:opacity-50"
                  >
                    <option value="ALL">
                      {analysis.availableSegments.length > 0
                        ? 'All Customer Segments'
                        : 'No Segment Column'}
                    </option>
                    {analysis.availableSegments.map((seg) => (
                      <option key={seg} value={seg}>
                        {seg}
                      </option>
                    ))}
                  </select>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 tabular-nums">
                  Showing <span className="font-semibold text-[#0f2544]">{formatNumber(analysis.filteredRecordCount)}</span> of{' '}
                  <span className="font-semibold text-[#0f2544]">{formatNumber(analysis.totalRecords)}</span> transactions
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-6 lg:mx-8">
                {errorMessage}
              </div>
            )}

            {/* Main Content Viewport */}
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
              {analysis.filteredRecordCount === 0 && hasActiveFilters ? (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                  <h2 className="text-lg font-semibold text-[#0f2544]">
                    No Matching Transactions for Current Filters
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    The selected combination of Month, Product Category, and Customer Segment returned zero rows.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0f2544] px-4 py-2 text-xs font-medium text-white hover:bg-[#1a365d]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              ) : (
                <>
                  {activeTab === 'overview' && (
                    <OverviewSection
                      analysis={analysis}
                      currencySymbol={parsedWorkbook.detectedCurrencySymbol}
                      onOpenMapper={() => setIsMapperOpen(true)}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  )}
                  {activeTab === 'task1' && (
                    <Task1Exploration workbook={parsedWorkbook} analysis={analysis} />
                  )}
                  {activeTab === 'task2' && (
                    <Task2Sales
                      analysis={analysis}
                      currencySymbol={parsedWorkbook.detectedCurrencySymbol}
                      onOpenMapper={() => setIsMapperOpen(true)}
                    />
                  )}
                  {activeTab === 'task3' && (
                    <Task3ProductCustomer
                      analysis={analysis}
                      currencySymbol={parsedWorkbook.detectedCurrencySymbol}
                      onOpenMapper={() => setIsMapperOpen(true)}
                    />
                  )}
                  {activeTab === 'task4' && (
                    <Task4DeliveryReturns
                      analysis={analysis}
                      onOpenMapper={() => setIsMapperOpen(true)}
                    />
                  )}
                  {activeTab === 'task5' && (
                    <Task5Conclusion
                      analysis={analysis}
                      currencySymbol={parsedWorkbook.detectedCurrencySymbol}
                    />
                  )}
                  {activeTab === 'all' && (
                    <div className="space-y-12">
                      <OverviewSection
                        analysis={analysis}
                        currencySymbol={parsedWorkbook.detectedCurrencySymbol}
                        onOpenMapper={() => setIsMapperOpen(true)}
                        onNavigateTab={(tab) => setActiveTab(tab)}
                      />
                      <hr className="border-slate-200" />
                      <Task1Exploration workbook={parsedWorkbook} analysis={analysis} />
                      <hr className="border-slate-200" />
                      <Task2Sales
                        analysis={analysis}
                        currencySymbol={parsedWorkbook.detectedCurrencySymbol}
                        onOpenMapper={() => setIsMapperOpen(true)}
                      />
                      <hr className="border-slate-200" />
                      <Task3ProductCustomer
                        analysis={analysis}
                        currencySymbol={parsedWorkbook.detectedCurrencySymbol}
                        onOpenMapper={() => setIsMapperOpen(true)}
                      />
                      <hr className="border-slate-200" />
                      <Task4DeliveryReturns
                        analysis={analysis}
                        onOpenMapper={() => setIsMapperOpen(true)}
                      />
                      <hr className="border-slate-200" />
                      <Task5Conclusion
                        analysis={analysis}
                        currencySymbol={parsedWorkbook.detectedCurrencySymbol}
                      />
                    </div>
                  )}
                </>
              )}
            </main>
          </div>
        </div>
      )}

      {parsedWorkbook && mapping && (
        <ColumnMapperModal
          isOpen={isMapperOpen}
          onClose={() => setIsMapperOpen(false)}
          headers={parsedWorkbook.headers}
          sheetNames={parsedWorkbook.sheetNames}
          activeSheet={parsedWorkbook.activeSheet}
          onSheetChange={handleSheetSwitch}
          mapping={mapping}
          onMappingChange={setMapping}
        />
      )}
    </div>
  );
}
