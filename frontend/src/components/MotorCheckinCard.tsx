import { CheckCircle2, Crosshair, Play, RotateCcw, Timer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createMotorCheckin } from "../api/client";
import type { MotorCheckinContext, MotorCheckinRecord } from "../types/telemetry";

interface MotorCheckinCardProps {
  onCompleted: () => Promise<void> | void;
}

type CheckinPhase = "idle" | "hold" | "taps" | "submitting" | "done";

const HOLD_DURATION_SEC = 10;
const STAGE_W = 440;
const STAGE_H = 220;
const CENTER_X = STAGE_W / 2;
const CENTER_Y = STAGE_H / 2;

const TAP_TARGETS: { x: number; y: number }[] = [
  { x: 96, y: 64 },
  { x: 344, y: 64 },
  { x: 112, y: 162 },
  { x: 328, y: 162 },
];

const CONTEXT_OPTIONS: { value: MotorCheckinContext; label: string }[] = [
  { value: "routine", label: "Routine Check" },
  { value: "pre_medication", label: "Pre-Medication (OFF)" },
  { value: "post_medication", label: "Post-Medication (ON)" },
  { value: "baseline", label: "Morning Baseline" },
  { value: "flare", label: "During Tremor Flare" },
];

export function MotorCheckinCard({ onCompleted }: MotorCheckinCardProps) {
  const [phase, setPhase] = useState<CheckinPhase>("idle");
  const [contextTag, setContextTag] = useState<MotorCheckinContext>("routine");
  const [notes, setNotes] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState<number>(HOLD_DURATION_SEC);
  const [tapIndex, setTapIndex] = useState<number>(0);
  const [cursorPt, setCursorPt] = useState<{ x: number; y: number }>({
    x: CENTER_X,
    y: CENTER_Y,
  });
  const [result, setResult] = useState<MotorCheckinRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const holdSamplesRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const tapsRef = useRef<
    { target_x: number; target_y: number; click_x: number; click_y: number; reaction_ms: number }[]
  >([]);
  const holdStartRef = useRef<number>(0);
  const tapShownAtRef = useRef<number>(0);
  const latestPosRef = useRef<{ x: number; y: number }>({ x: CENTER_X, y: CENTER_Y });

  useEffect(() => {
    if (phase !== "hold") {
      return;
    }
    const sampler = window.setInterval(() => {
      const elapsed = (performance.now() - holdStartRef.current) / 1000.0;
      holdSamplesRef.current.push({
        x: latestPosRef.current.x,
        y: latestPosRef.current.y,
        t: Number(elapsed.toFixed(4)),
      });
      const remaining = Math.max(0, HOLD_DURATION_SEC - elapsed);
      setSecondsLeft(Number(remaining.toFixed(1)));
      if (elapsed >= HOLD_DURATION_SEC) {
        window.clearInterval(sampler);
        setTapIndex(0);
        tapShownAtRef.current = performance.now();
        setPhase("taps");
      }
    }, 33);
    return () => window.clearInterval(sampler);
  }, [phase]);

  const startCheckin = () => {
    setError(null);
    setResult(null);
    holdSamplesRef.current = [];
    tapsRef.current = [];
    latestPosRef.current = { x: CENTER_X, y: CENTER_Y };
    setCursorPt({ x: CENTER_X, y: CENTER_Y });
    setSecondsLeft(HOLD_DURATION_SEC);
    holdStartRef.current = performance.now();
    setPhase("hold");
  };

  const resetCheckin = () => {
    setPhase("idle");
    setError(null);
    setSecondsLeft(HOLD_DURATION_SEC);
    setTapIndex(0);
  };

  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * STAGE_W;
    const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * STAGE_H;
    latestPosRef.current = { x, y };
    setCursorPt({ x, y });
    if (phase === "hold") {
      const elapsed = (performance.now() - holdStartRef.current) / 1000.0;
      holdSamplesRef.current.push({ x, y, t: Number(elapsed.toFixed(4)) });
    }
  };

  const handleStagePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "taps") {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * STAGE_W;
    const clickY = ((e.clientY - rect.top) / Math.max(1, rect.height)) * STAGE_H;
    const target = TAP_TARGETS[tapIndex];
    const reactionMs = Math.round(performance.now() - tapShownAtRef.current);

    tapsRef.current.push({
      target_x: target.x,
      target_y: target.y,
      click_x: clickX,
      click_y: clickY,
      reaction_ms: reactionMs,
    });

    if (tapIndex + 1 < TAP_TARGETS.length) {
      setTapIndex(tapIndex + 1);
      tapShownAtRef.current = performance.now();
      return;
    }

    setPhase("submitting");
    setError(null);
    try {
      const saved = await createMotorCheckin({
        hold_samples: holdSamplesRef.current,
        target_x: CENTER_X,
        target_y: CENTER_Y,
        taps: tapsRef.current,
        tap_hit_radius_px: 28,
        context_tag: contextTag,
        notes: notes.trim(),
      });
      setResult(saved);
      setPhase("done");
      setNotes("");
      await onCompleted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save check-in to backend."
      );
      setPhase("idle");
    }
  };

  const holdPct = Math.max(0, Math.min(100, ((HOLD_DURATION_SEC - secondsLeft) / HOLD_DURATION_SEC) * 100));
  const activeTap = TAP_TARGETS[tapIndex];

  return (
    <section aria-labelledby="motor-checkin-heading" className="cc-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-[var(--tc-primary-ink)]" aria-hidden="true" />
            <h3 id="motor-checkin-heading" className="text-lg font-semibold text-[var(--tc-ink)]">
              15-Second Guided Motor Check-In
            </h3>
          </div>
          <p className="max-w-2xl text-sm text-[var(--tc-ink-muted)]">
            Standardized 10-second steady hold plus 4 target taps. Ideal before or after medication doses so your report has consistent daily baselines even on light computer-use days.
          </p>
        </div>

        {phase !== "idle" && (
          <button
            type="button"
            onClick={resetCheckin}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--tc-border)] bg-[var(--tc-surface)] px-3.5 text-xs font-semibold text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-[var(--tc-alert-bg)] px-4 py-3 text-sm font-medium text-[var(--tc-alert)]"
        >
          {error}
        </div>
      )}

      {phase === "idle" && (
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--tc-ink-muted)]">
            <span>Context</span>
            <select
              aria-label="Check-in context"
              value={contextTag}
              onChange={(e) => setContextTag(e.target.value as MotorCheckinContext)}
              className="min-h-12 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-3.5 text-sm font-medium text-[var(--tc-ink)]"
            >
              {CONTEXT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 text-xs font-medium text-[var(--tc-ink-muted)]">
            <span>Optional Note</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 45 min after morning dose"
              className="min-h-12 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-3.5 text-sm text-[var(--tc-ink)]"
            />
          </label>

          <button
            type="button"
            onClick={startCheckin}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)]"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>Start 15-Sec Check-In</span>
          </button>
        </div>
      )}

      {(phase === "hold" || phase === "taps" || phase === "submitting") && (
        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-[var(--tc-ink)]">
              {phase === "hold"
                ? "Step 1 of 2: Hold your pointer steadily inside the center ring"
                : phase === "taps"
                  ? `Step 2 of 2: Click target ${tapIndex + 1} of ${TAP_TARGETS.length}`
                  : "Scoring postural hold and tap accuracy..."}
            </span>
            <span className="font-mono text-sm font-semibold text-[var(--tc-primary-ink)] tabular-nums">
              {phase === "hold" ? `${secondsLeft.toFixed(1)}s left` : `${tapIndex}/${TAP_TARGETS.length} taps`}
            </span>
          </div>

          <div
            onPointerMove={handleStagePointerMove}
            onPointerDown={(e) => void handleStagePointerDown(e)}
            role="application"
            aria-label="Guided motor check-in interactive stage"
            className="relative mx-auto h-[220px] w-full max-w-[440px] select-none overflow-hidden rounded-2xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface-alt)] cursor-crosshair"
          >
            <svg viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} className="h-full w-full">
              {phase === "hold" && (
                <>
                  <circle
                    cx={CENTER_X}
                    cy={CENTER_Y}
                    r="38"
                    fill="var(--tc-surface)"
                    stroke="var(--tc-border-strong)"
                    strokeWidth="2"
                  />
                  <circle
                    cx={CENTER_X}
                    cy={CENTER_Y}
                    r="38"
                    fill="none"
                    stroke="var(--tc-primary)"
                    strokeWidth="4"
                    strokeDasharray={`${(holdPct / 100) * 239} 239`}
                    transform={`rotate(-90 ${CENTER_X} ${CENTER_Y})`}
                  />
                  <circle cx={CENTER_X} cy={CENTER_Y} r="5" fill="var(--tc-primary)" />
                  <circle
                    cx={cursorPt.x}
                    cy={cursorPt.y}
                    r="6"
                    fill="var(--tc-alert)"
                    fillOpacity="0.8"
                  />
                </>
              )}

              {phase === "taps" && activeTap && (
                <>
                  <circle
                    cx={activeTap.x}
                    cy={activeTap.y}
                    r="28"
                    fill="var(--tc-mint)"
                    stroke="var(--tc-primary)"
                    strokeWidth="2.5"
                  />
                  <circle cx={activeTap.x} cy={activeTap.y} r="6" fill="var(--tc-primary)" />
                </>
              )}
            </svg>
          </div>
        </div>
      )}

      {phase === "done" && result && (
        <div className="mt-5 rounded-2xl bg-[var(--tc-success-bg)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--tc-success)]">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>Check-In Recorded ({result.context_tag.replace("_", " ")})</span>
            </div>
            <button
              type="button"
              onClick={resetCheckin}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--tc-surface)] px-3 text-xs font-semibold text-[var(--tc-ink)]"
            >
              <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Run Another</span>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[var(--tc-surface)] px-3.5 py-2.5">
              <p className="text-xs text-[var(--tc-ink-muted)]">Overall Score</p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--tc-ink)] tabular-nums">
                {result.overall_score.toFixed(1)}/100
              </p>
            </div>
            <div className="rounded-xl bg-[var(--tc-surface)] px-3.5 py-2.5">
              <p className="text-xs text-[var(--tc-ink-muted)]">Hold RMS Sway</p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--tc-ink)] tabular-nums">
                {result.hold_rms_mm.toFixed(2)} mm
              </p>
            </div>
            <div className="rounded-xl bg-[var(--tc-surface)] px-3.5 py-2.5">
              <p className="text-xs text-[var(--tc-ink-muted)]">Dominant Freq</p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--tc-ink)] tabular-nums">
                {result.hold_dominant_hz !== null ? `${result.hold_dominant_hz.toFixed(1)} Hz` : "None"}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--tc-surface)] px-3.5 py-2.5">
              <p className="text-xs text-[var(--tc-ink-muted)]">Tap Accuracy</p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--tc-ink)] tabular-nums">
                {result.tap_accuracy_pct !== null ? `${result.tap_accuracy_pct.toFixed(0)}%` : "-"}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
