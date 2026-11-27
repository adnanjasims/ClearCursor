import { ArrowRight, Check, FileBarChart2, Target } from "lucide-react";
import { CLINICAL_PRESETS, type ClinicalPreset } from "../presets";
import type { SettingsUpdate, TelemetryFrame } from "../types/telemetry";

interface HomeOverviewProps {
  stabilizationActive: boolean;
  onStartStabilizing: () => void;
  onOpenPlayground: () => void;
  onOpenControlDeck: () => void;
  onOpenClinicianReport?: () => void;
  onApplyPreset?: (updates: SettingsUpdate) => Promise<void>;
  activeProfile?: string;
  frame?: TelemetryFrame | null;
  stabilityScore?: number | null;
  busy?: boolean;
}

export function HomeOverview({
  stabilizationActive,
  onStartStabilizing,
  onOpenPlayground,
  onOpenControlDeck,
  onOpenClinicianReport,
  onApplyPreset,
  activeProfile = "moderate",
  frame = null,
  stabilityScore = null,
  busy = false,
}: HomeOverviewProps) {
  const score = stabilityScore ?? frame?.stability_score ?? null;
  const tremorHz = frame?.tremor_hz ?? null;
  const totalProtected =
    (frame?.steadyhand.slip_clicks_rescued ?? 0) +
    (frame?.steadyhand.spastic_drags_prevented ?? 0) +
    (frame?.steadyhand.double_clicks_blocked ?? 0);

  const scorePct = score !== null ? Math.max(0, Math.min(100, score)) : 0;
  const normalizedProfile =
    activeProfile === "parkinsons" ? "moderate" : activeProfile;
  const activePresetMeta = CLINICAL_PRESETS.find((p) => p.id === normalizedProfile);

  const handleQuickPreset = (preset: ClinicalPreset) => {
    if (onApplyPreset) {
      void onApplyPreset(preset.updates);
    } else {
      onOpenControlDeck();
    }
  };

  return (
    <div className="space-y-10">
      {/* Editorial Calm Workspace Banner */}
      <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <p className="text-[14px] font-semibold text-[var(--tc-primary-ink)]">
            ClearCursor Assistive Desktop
          </p>
          <h2 className="text-[24px] leading-snug font-semibold tracking-[-0.02em] text-[var(--tc-ink)]">
            {stabilizationActive
              ? "Stabilization is active across your desktop."
              : "Stabilization is paused."}
          </h2>
          <p className="text-[15.5px] leading-relaxed text-[var(--tc-ink-muted)]">
            {activePresetMeta
              ? `${activePresetMeta.label}: ${activePresetMeta.tagline}`
              : "Calm Everyday Desktop Control"}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onStartStabilizing}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)]"
            >
              <span>{stabilizationActive ? "Open Control Deck" : "Start Stabilizing"}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenPlayground}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-5 text-[15px] font-medium text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)]"
            >
              <Target className="h-4 w-4 text-[var(--tc-primary)]" aria-hidden="true" />
              <span>Try Sandbox Playground</span>
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--tc-border)] lg:col-span-5">
          <img
            src="/media/summary-workspace.webp"
            alt="Sunlit home desk workspace with laptop in soft morning light"
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
      </section>

      {/* Comfort Preset Picker — Single-Level Flat Sheet, Zero Nesting */}
      <section aria-labelledby="summary-presets-heading" className="space-y-3 border-t border-[var(--tc-border)] pt-8">
        <h2 id="summary-presets-heading" className="text-[18px] font-semibold text-[var(--tc-ink)]">
          Comfort Level
        </h2>
        <div
          role="group"
          aria-label="Comfort level presets"
          className="cc-sheet grid grid-cols-1 divide-y divide-[var(--tc-border)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x"
        >
          {CLINICAL_PRESETS.map((preset) => {
            const selected = normalizedProfile === preset.id;
            const shortName = preset.label.split(" (")[0];
            return (
              <button
                key={preset.id}
                type="button"
                disabled={busy}
                aria-pressed={selected}
                onClick={() => handleQuickPreset(preset)}
                className={`flex min-h-[88px] flex-col justify-between p-4 text-left transition-colors ${
                  selected ? "bg-[var(--tc-mint)]" : "hover:bg-[var(--tc-surface-alt)]"
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-[15px] font-semibold text-[var(--tc-ink)]">
                  <span>{shortName}</span>
                  {selected && (
                    <Check className="h-4 w-4 text-[var(--tc-primary)]" aria-hidden="true" />
                  )}
                </span>
                <span className="mt-1 block text-[14px] text-[var(--tc-ink-muted)]">
                  {preset.id === "hands_free"
                    ? "Webcam head pointing"
                    : `${preset.updates.tremor_strength}% smoothing`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Calm Today-at-a-Glance Metrics (Open Flat Typography, No Nested Boxes) */}
      <section aria-labelledby="today-heading" className="space-y-5 border-t border-[var(--tc-border)] pt-8">
        <h2 id="today-heading" className="text-[18px] font-semibold text-[var(--tc-ink)]">
          Today at a Glance
        </h2>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-[14.5px] font-medium text-[var(--tc-teal)]">Pointer Steadiness</p>
            <p className="text-[34px] leading-none font-semibold tracking-[-0.025em] text-[var(--tc-ink)] tabular-nums">
              {score !== null ? score.toFixed(0) : "--"}
              <span className="ml-1 text-[16px] font-normal text-[var(--tc-ink-muted)]">/ 100</span>
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--tc-surface-alt)]">
              <div
                className="h-full rounded-full bg-[var(--tc-teal)] transition-all duration-200"
                style={{ width: `${scorePct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[14.5px] font-medium text-[var(--tc-coral)]">Dominant Frequency</p>
            <p className="text-[34px] leading-none font-semibold tracking-[-0.025em] text-[var(--tc-ink)] tabular-nums">
              {tremorHz !== null ? tremorHz.toFixed(1) : "0.0"}
              <span className="ml-1.5 text-[16px] font-normal text-[var(--tc-ink-muted)]">Hz</span>
            </p>
            <p className="text-[14px] text-[var(--tc-ink-muted)]">
              {tremorHz !== null && tremorHz >= 4 && tremorHz <= 12
                ? "Active tremor band detected"
                : "No sustained tremor band"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-[14.5px] font-medium text-[var(--tc-primary-ink)]">
              Clicks Steadied
            </p>
            <p className="text-[34px] leading-none font-semibold tracking-[-0.025em] text-[var(--tc-ink)] tabular-nums">
              {totalProtected}
            </p>
            <p className="text-[14px] text-[var(--tc-ink-muted)]">
              Slips, bounces, and stray drags caught
            </p>
          </div>
        </div>
      </section>

      {/* Two Clear Next Steps */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--tc-border)] pt-7">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenClinicianReport ?? onOpenControlDeck}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-5 text-[15px] font-medium text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
          >
            <FileBarChart2 className="h-4 w-4 text-[var(--tc-coral)]" aria-hidden="true" />
            <span>Take 15-Second Check-In</span>
          </button>
          <button
            type="button"
            onClick={onOpenControlDeck}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-[15px] font-medium text-[var(--tc-primary-ink)] hover:bg-[var(--tc-surface-alt)]"
          >
            <span>Open Live Monitor</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <span className="text-[14px] text-[var(--tc-ink-muted)]">
          Calm Everyday Desktop Control
        </span>
      </section>
    </div>
  );
}
