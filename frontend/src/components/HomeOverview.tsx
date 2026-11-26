import {
  Activity,
  ArrowRight,
  ChevronRight,
  Eye,
  FileBarChart2,
  Hand,
  Magnet,
  ShieldCheck,
  Target,
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface HomeOverviewProps {
  stabilizationActive: boolean;
  onStartStabilizing: () => void;
  onOpenPlayground: () => void;
  onOpenControlDeck: () => void;
  onOpenClinicianReport?: () => void;
  activeProfile?: string;
  stabilityScore?: number | null;
}

function TrajectoryIllustration() {
  return (
    <div
      role="img"
      aria-label="Calm Everyday Desktop Control - Raw 4-12 Hz jitter smoothed cleanly toward target"
      className="flex h-full min-h-[210px] w-full flex-col justify-between rounded-2xl bg-[var(--tc-surface-alt)] p-5"
    >
      <svg viewBox="0 0 280 132" className="h-32 w-full" aria-hidden="true">
        <rect
          x="8"
          y="8"
          width="264"
          height="116"
          rx="14"
          fill="var(--tc-surface)"
          stroke="var(--tc-border)"
          strokeWidth="1.5"
        />
        <path
          d="M30 84 C54 54, 78 102, 108 72 C136 46, 166 94, 232 58"
          stroke="var(--tc-alert)"
          strokeOpacity="0.6"
          strokeWidth="2.2"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d="M30 78 C92 70, 160 64, 232 58"
          stroke="var(--tc-primary)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle
          cx="232"
          cy="58"
          r="16"
          fill="var(--tc-mint)"
          stroke="var(--tc-primary)"
          strokeWidth="1.75"
          strokeDasharray="3 3"
        />
        <circle cx="232" cy="58" r="6" fill="var(--tc-primary)" />
        <rect x="28" y="24" width="76" height="8" rx="4" fill="var(--tc-border)" />
        <rect x="28" y="102" width="128" height="7" rx="3.5" fill="var(--tc-surface-alt)" />
      </svg>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--tc-ink)]">
          Calm Everyday Desktop Control
        </span>
        <span className="text-[var(--tc-ink-muted)]">4-12 Hz Delta Filtering</span>
      </div>
    </div>
  );
}

const PROTECTION_ROWS = [
  {
    title: "Delta-Space Tremor Smoothing",
    detail: "Dampens 4-12 Hz hand shaking while preserving full intentional pointer travel across monitors.",
    icon: Hand,
  },
  {
    title: "Click-Freeze & Bounce Guard",
    detail: "Holds the pointer steady during clicks, blocks tremor double-clicks, and filters accidental file drags.",
    icon: ShieldCheck,
  },
  {
    title: "Async Button Magnetism",
    detail: "Gently expands small toolbar hitboxes via native Accessibility trees without adding cursor lag.",
    icon: Magnet,
  },
];

const CLINICAL_ROWS = [
  {
    title: "Functional Motor Telemetry",
    detail: "Tracks 4-6 Hz resting vs. 6-12 Hz action bands, physical RMS amplitude (mm), and honest hourly coverage.",
    icon: Activity,
  },
  {
    title: "15-Second Guided Check-Ins & Diary",
    detail: "Pair quick standardized hold-and-tap tests with medication doses to spot ON/OFF patterns clearly.",
    icon: FileBarChart2,
  },
  {
    title: "Hands-Free Gaze Mode",
    detail: "Switch to webcam head or eye pointing with dwell and blink clicking whenever your hands need rest.",
    icon: Eye,
  },
];

export function HomeOverview({
  stabilizationActive,
  onStartStabilizing,
  onOpenPlayground,
  onOpenControlDeck,
  onOpenClinicianReport,
  activeProfile = "moderate",
  stabilityScore = null,
}: HomeOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Apple Health Style Summary Hero */}
      <section className="cc-card p-6 sm:p-7">
        <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-3">
              <BrandLogo className="h-10 w-10 shrink-0 rounded-xl" />
              <div>
                <p className="text-sm font-semibold text-[var(--tc-primary-ink)]">
                  ClearCursor Assistive Desktop
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--tc-ink-muted)]">
                  <span
                    className={`inline-flex items-center gap-1.5 font-medium ${
                      stabilizationActive
                        ? "text-[var(--tc-success)]"
                        : "text-[var(--tc-ink-muted)]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        stabilizationActive
                          ? "bg-[var(--tc-success)]"
                          : "bg-[var(--tc-border-strong)]"
                      }`}
                      aria-hidden="true"
                    />
                    {stabilizationActive ? "Stabilization Active" : "Stabilization Paused"}
                  </span>
                  <span>|</span>
                  <span className="capitalize">Preset: {activeProfile}</span>
                  {stabilityScore !== null && (
                    <>
                      <span>|</span>
                      <span className="tabular-nums font-medium text-[var(--tc-ink)]">
                        Stability {stabilityScore.toFixed(0)}/100
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-[var(--tc-ink)] sm:text-3xl">
              Steadier clicks and calmer computing for trembling hands.
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-[var(--tc-ink-muted)]">
              ClearCursor runs quietly alongside every desktop app to smooth 4-12 Hz tremor, stop accidental drags and double-clicks, magnetize small buttons, and compile objective motor reports for your clinician.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onStartStabilizing}
                className="inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-[var(--tc-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)]"
              >
                <span>{stabilizationActive ? "Open Control Deck" : "Start Stabilizing"}</span>
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onOpenPlayground}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-5 text-sm font-semibold text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)]"
              >
                <Target className="h-4 w-4 shrink-0 text-[var(--tc-primary-ink)]" aria-hidden="true" />
                <span>Try Sandbox Playground</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <TrajectoryIllustration />
          </div>
        </div>
      </section>

      {/* Quick Destinations Strip */}
      <section aria-label="Quick workspace actions" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onOpenControlDeck}
          className="cc-card flex min-h-16 items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--tc-surface-alt)]"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--tc-ink)]">Live Control Deck</p>
            <p className="mt-0.5 truncate text-xs text-[var(--tc-ink-muted)]">
              Switch presets, OS hook &amp; live telemetry
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tc-ink-muted)]" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onOpenPlayground}
          className="cc-card flex min-h-16 items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--tc-surface-alt)]"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--tc-ink)]">Practice Sandbox</p>
            <p className="mt-0.5 truncate text-xs text-[var(--tc-ink-muted)]">
              Compare raw vs. stabilized clicking safely
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tc-ink-muted)]" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onOpenClinicianReport ?? onOpenControlDeck}
          className="cc-card flex min-h-16 items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--tc-surface-alt)]"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--tc-ink)]">Clinician Report &amp; Check-In</p>
            <p className="mt-0.5 truncate text-xs text-[var(--tc-ink-muted)]">
              15-sec motor check, diary &amp; PDF export
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--tc-ink-muted)]" aria-hidden="true" />
        </button>
      </section>

      {/* Apple Health Grouped List Sections (No Nested Cards) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="protection-heading" className="cc-card overflow-hidden">
          <div className="border-b border-[var(--tc-border)] px-5 py-4">
            <h2 id="protection-heading" className="text-base font-semibold text-[var(--tc-ink)]">
              Everyday Pointer Protection
            </h2>
          </div>
          <ul className="divide-y divide-[var(--tc-border)]">
            {PROTECTION_ROWS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3.5 px-5 py-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tc-mint)] text-[var(--tc-primary-ink)]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--tc-ink)]">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--tc-ink-muted)]">
                      {item.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="clinical-heading" className="cc-card overflow-hidden">
          <div className="border-b border-[var(--tc-border)] px-5 py-4">
            <h2 id="clinical-heading" className="text-base font-semibold text-[var(--tc-ink)]">
              Clinical Telemetry &amp; Hands-Free Control
            </h2>
          </div>
          <ul className="divide-y divide-[var(--tc-border)]">
            {CLINICAL_ROWS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex items-start gap-3.5 px-5 py-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tc-mint)] text-[var(--tc-primary-ink)]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--tc-ink)]">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-[var(--tc-ink-muted)]">
                      {item.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Shortcuts & Privacy Footer Strip */}
      <section className="cc-card flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-sm text-[var(--tc-ink-muted)]">
        <p>
          Hold <kbd className="rounded-md bg-[var(--tc-surface-alt)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--tc-ink)]">Alt / Option</kbd> for momentary bypass, or press{" "}
          <kbd className="rounded-md bg-[var(--tc-surface-alt)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--tc-ink)]">Cmd/Ctrl+Shift+S</kbd> anytime to pause stabilization.
        </p>
        <span className="text-xs font-medium text-[var(--tc-ink-muted)]">
          100% local SQLite storage. No cloud telemetry.
        </span>
      </section>
    </div>
  );
}
