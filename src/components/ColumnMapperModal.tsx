import { X } from 'lucide-react';
import type { ColumnMapping } from '../types/analytics';

interface ColumnMapperModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  sheetNames: string[];
  activeSheet: string;
  onSheetChange: (sheetName: string) => void;
  mapping: ColumnMapping;
  onMappingChange: (next: ColumnMapping) => void;
}

const MAPPING_FIELDS: {
  key: keyof ColumnMapping;
  label: string;
  helper: string;
}[] = [
  {
    key: 'transactionId',
    label: 'Transaction / Order ID',
    helper: 'Used to check duplicate IDs in Task 1.',
  },
  {
    key: 'orderDate',
    label: 'Order / Transaction Date',
    helper: 'Required for Monthly Revenue Trend & Month filter.',
  },
  {
    key: 'revenue',
    label: 'Total Revenue / Sales Amount',
    helper: 'Primary revenue column. Leave blank to compute Unit Price × Quantity.',
  },
  {
    key: 'unitPrice',
    label: 'Unit Price (fallback)',
    helper: 'Used with Quantity if Total Revenue is not provided.',
  },
  {
    key: 'quantity',
    label: 'Quantity (fallback)',
    helper: 'Multiplied by Unit Price when Total Revenue is blank.',
  },
  {
    key: 'productCategory',
    label: 'Product Category',
    helper: 'Required for Task 3 category revenue & Task 4 category returns.',
  },
  {
    key: 'customerId',
    label: 'Customer ID',
    helper: 'Used to calculate repeat purchase behavior (2+ orders).',
  },
  {
    key: 'customerSegment',
    label: 'Customer Segment',
    helper: 'Required for segment repeat purchase breakdown & Segment filter.',
  },
  {
    key: 'deliveryTime',
    label: 'Delivery Time (Days / Hours)',
    helper: 'Required for Task 4 delivery vs. satisfaction analysis.',
  },
  {
    key: 'customerRating',
    label: 'Customer Rating / Score',
    helper: 'Required for Task 4 customer satisfaction correlation.',
  },
  {
    key: 'returnStatus',
    label: 'Return Status / Returned Flag',
    helper: 'Required for Task 4 product return rate analysis.',
  },
  {
    key: 'repeatFlag',
    label: 'Repeat Purchase Flag (optional)',
    helper: 'Fallback if Customer ID only appears once per row.',
  },
];

export function ColumnMapperModal({
  isOpen,
  onClose,
  headers,
  sheetNames,
  activeSheet,
  onSheetChange,
  mapping,
  onMappingChange,
}: ColumnMapperModalProps) {
  if (!isOpen) return null;

  const handleFieldChange = (key: keyof ColumnMapping, value: string) => {
    onMappingChange({
      ...mapping,
      [key]: value === '__NONE__' ? null : value,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="column-mapper-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="column-mapper-title" className="text-lg font-semibold text-[#0f2544]">
              Worksheet &amp; Column Mapping
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Verify or adjust how columns in your uploaded file map to each analysis task.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close column mapping"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {sheetNames.length > 1 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label
                htmlFor="sheet-selector"
                className="block text-xs font-semibold text-slate-700"
              >
                Active Excel Worksheet ({sheetNames.length} sheets found)
              </label>
              <select
                id="sheet-selector"
                value={activeSheet}
                onChange={(e) => onSheetChange(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0f2544] focus:outline-none"
              >
                {sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MAPPING_FIELDS.map((field) => (
              <div key={field.key} className="rounded-lg border border-slate-200 p-3">
                <label
                  htmlFor={`map-${field.key}`}
                  className="block text-xs font-semibold text-slate-800"
                >
                  {field.label}
                </label>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                  {field.helper}
                </p>
                <select
                  id={`map-${field.key}`}
                  value={mapping[field.key] ?? '__NONE__'}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#0f2544] focus:outline-none"
                >
                  <option value="__NONE__">— Not Mapped —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0f2544] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a365d]"
          >
            Apply &amp; View Results
          </button>
        </div>
      </div>
    </div>
  );
}
