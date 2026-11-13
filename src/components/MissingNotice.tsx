import { AlertCircle } from 'lucide-react';

interface MissingNoticeProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function MissingNotice({ title, message, actionLabel, onAction }: MissingNoticeProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-slate-800">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{message}</p>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition-colors hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f2544]"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
