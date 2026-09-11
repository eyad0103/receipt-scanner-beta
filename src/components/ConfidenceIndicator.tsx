import { confidenceColor, confidenceLabel } from '../utils/helpers';

interface ConfidenceIndicatorProps {
  confidence: number;
  showLabel?: boolean;
}

export function ConfidenceIndicator({ confidence, showLabel = true }: ConfidenceIndicatorProps) {
  const percentage = Math.round(confidence * 100);

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="h-1.5 w-12 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor:
              confidence >= 0.95 ? 'var(--color-emerald-500)' :
              confidence >= 0.85 ? 'var(--color-amber-500)' :
              'var(--color-rose-500)',
          }}
        />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${confidenceColor(confidence)}`}>
          {confidenceLabel(confidence)} ({percentage}%)
        </span>
      )}
    </div>
  );
}
