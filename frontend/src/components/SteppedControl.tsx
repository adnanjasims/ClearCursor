import type { CSSProperties } from "react";
import { Minus, Plus } from "lucide-react";

interface SteppedControlProps {
  id: string;
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals?: number;
  onChange: (nextValue: number) => void;
}

export function SteppedControl({
  id,
  label,
  description,
  value,
  min,
  max,
  step,
  unit = "",
  decimals = 0,
  onChange,
}: SteppedControlProps) {
  const clampAndRound = (raw: number): number => {
    const clamped = Math.max(min, Math.min(max, raw));
    const factor = Math.pow(10, decimals);
    return Math.round(clamped * factor) / factor;
  };

  const formatted = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;

  return (
    <div className="cc-card p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={id}
            className="block text-base font-semibold text-[var(--tc-ink)]"
          >
            {label}
          </label>
          <p className="mt-0.5 text-sm text-[var(--tc-ink-muted)]">
            {description}
          </p>
        </div>
        <div
          aria-live="polite"
          className="rounded-lg bg-[var(--tc-surface-alt)] px-3 py-1.5 font-mono text-sm font-semibold text-[var(--tc-ink)] tabular-nums"
        >
          {formatted}
          {unit ? ` ${unit}` : ""}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(clampAndRound(value - step))}
          disabled={value <= min}
          aria-label={`Decrease ${label} by ${step}${unit ? ` ${unit}` : ""}`}
          className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ "--slider-pct": `${pct}%` } as CSSProperties}
          aria-valuetext={`${formatted}${unit ? ` ${unit}` : ""}`}
          onChange={(e) => onChange(clampAndRound(Number(e.target.value)))}
          className="tc-slider"
        />

        <button
          type="button"
          onClick={() => onChange(clampAndRound(value + step))}
          disabled={value >= max}
          aria-label={`Increase ${label} by ${step}${unit ? ` ${unit}` : ""}`}
          className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
