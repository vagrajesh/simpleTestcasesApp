interface Props {
  error: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ error, onRetry }: Props) {
  return (
    <div className="bg-red-950/60 border border-red-800 rounded-xl p-4 mb-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <span className="text-red-400 text-base leading-none mt-0.5 shrink-0">⚠</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-300">Generation failed</p>
          <p className="text-xs text-red-400 mt-1 font-mono break-all leading-relaxed">{error}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs px-3 py-1.5 bg-red-900/60 hover:bg-red-900 border border-red-700 rounded-lg text-red-300 transition-colors cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
}
