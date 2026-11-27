import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Hand,
  Magnet,
  MousePointerClick,
  Waves,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import { clearCalibration, pushSteadyHandSample } from "../api/client";
import type { ConnectionState, TelemetryPoint } from "../hooks/useTelemetry";
import { CLINICAL_PRESETS, type ClinicalPreset } from "../presets";
import type {
  EngineToggleRequest,
  SettingsPayload,
  SettingsUpdate,
  TelemetryFrame,
} from "../types/telemetry";
import { GazePreviewFeed } from "./GazePreviewFeed";

interface ControlDeckProps {
  settings: SettingsPayload;
  frame: TelemetryFrame | null;
  smoothedScore: number;
  smoothedTremorIndex: number;
  history: TelemetryPoint[];
  connectionState: ConnectionState;
  toggling: boolean;
  onToggle: (payload: EngineToggleRequest) => Promise<void>;
  onApplyPreset: (updates: SettingsUpdate) => Promise<void>;
  onStartCalibration: () => void;
}

function NativeSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        checked ? "bg-[var(--tc-switch-on)]" : "bg-[var(--tc-switch-off)]"
      }`}
      aria-hidden="true"
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </span>
  );
}

export function ControlDeck({
  settings,
  frame,
  smoothedScore,
  smoothedTremorIndex,
  history,
  toggling,
  onToggle,
  onApplyPreset,
  onStartCalibration,
}: ControlDeckProps) {
  const [padCursor, setPadCursor] = useState<{ x: number; y: number } | null>(null);
  const [showTechnical, setShowTechnical] = useState<boolean>(false);
  const lastSentAtRef = useRef<number>(0);

  const steadyActive =
    frame?.stabilization_active ?? (settings.assistance_enabled && settings.steady_hand);
  const gazeActive = frame?.active_modes.gaze_control ?? settings.gaze_control;
  const simActive = frame?.active_modes.simulate_tremor ?? settings.simulate_tremor;
  const cameraRunning = frame?.gaze.running ?? false;
  const sysMouseActive = frame?.steadyhand.system_mouse_enabled ?? settings.system_mouse;

  const tremorHz = frame?.tremor_hz ?? null;
  const restingPct = frame?.resting_band_pct ?? 0;
  const actionPct = frame?.action_band_pct ?? 0;
  const rmsMm = frame?.rms_amplitude_mm ?? 0;
  const dampeningPct = Math.round(
    (frame?.steadyhand.strength ?? settings.tremor_strength / 100) * 100
  );
  const dragsPrevented = frame?.steadyhand.spastic_drags_prevented ?? 0;
  const clicksRescued = frame?.steadyhand.slip_clicks_rescued ?? 0;
  const bouncesBlocked = frame?.steadyhand.double_clicks_blocked ?? 0;
  const gravityActive = frame?.steadyhand.gravity_well_active ?? false;
  const tapMode = frame?.steadyhand.os_tap_mode ?? "idle";
  const tapError = frame?.steadyhand.os_tap_error ?? null;

  const handlePadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setPadCursor({ x, y });

    const now = performance.now();
    if (now - lastSentAtRef.current >= 32) {
      lastSentAtRef.current = now;
      void pushSteadyHandSample(x, y, undefined, true).catch(() => undefined);
    }
  };

  const handleSelectPreset = async (preset: ClinicalPreset) => {
    await onApplyPreset(preset.updates);
    if (preset.id === "hands_free") {
      await onToggle({
        gaze_control: true,
        camera: true,
        steady_hand: false,
        assistance_enabled: true,
      });
    } else {
      await onToggle({
        steady_hand: true,
        gaze_control: false,
        camera: false,
        assistance_enabled: true,
      });
    }
  };

  const chartData =
    history.length > 0
      ? history.map((pt, idx) => ({ idx, score: pt.stabilityScore }))
      : [{ idx: 0, score: 100 }];

  return (
    <div className="space-y-9">
      {/* Editorial Intro + Mode Photo */}
      <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <h2 className="text-[20px] font-semibold text-[var(--tc-ink)]">
            Active Assistance &amp; Comfort Presets
          </h2>
          <p className="text-[15.5px] leading-relaxed text-[var(--tc-ink-muted)]">
            Switch smoothing levels as your hands change through the day, or turn on webcam head pointing when you want a hands-free break.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--tc-border)] lg:col-span-5">
          <img
            src="/media/control-handsfree.webp"
            alt="Person seated comfortably at a laptop workspace in calm daylight"
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      </section>

      {/* Preset Selector */}
      <section aria-labelledby="medication-presets-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="medication-presets-heading" className="cc-section-label">
            Comfort Presets
          </h2>
          <span className="text-[14px] text-[var(--tc-ink-muted)]">
            Shortcut:{" "}
            <kbd className="font-mono font-semibold text-[var(--tc-ink)]">
              {settings.global_shortcut}
            </kbd>
          </span>
        </div>

        <div className="cc-sheet grid grid-cols-1 divide-y divide-[var(--tc-border)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {CLINICAL_PRESETS.map((preset) => {
            const selected = settings.profile === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={toggling}
                aria-pressed={selected}
                onClick={() => void handleSelectPreset(preset)}
                className={`flex min-h-[108px] flex-col justify-between p-5 text-left transition-colors ${
                  selected ? "bg-[var(--tc-mint)]" : "hover:bg-[var(--tc-surface-alt)]"
                }`}
              >
                <span
                  className={`text-[15px] font-semibold ${
                    selected ? "text-[var(--tc-primary-ink)]" : "text-[var(--tc-ink)]"
                  }`}
                >
                  {preset.label}
                </span>
                <span className="mt-2 block text-[14px] leading-snug text-[var(--tc-ink-muted)]">
                  {preset.tagline}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Primary Switches (Single Flat Sheet) */}
      <section aria-labelledby="primary-modes-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="primary-modes-heading" className="cc-section-label">
            Assistance Modes
          </h2>
          <button
            type="button"
            onClick={onStartCalibration}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[14.5px] font-medium text-[var(--tc-primary-ink)] hover:bg-[var(--tc-surface-alt)]"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>{frame?.gaze.calibrated ? "Recalibrate Gaze" : "Calibrate Gaze"}</span>
          </button>
        </div>

        <div className="cc-sheet divide-y divide-[var(--tc-border)] overflow-hidden">
          <button
            type="button"
            disabled={toggling}
            aria-pressed={steadyActive}
            onClick={() =>
              void onToggle({ steady_hand: !steadyActive, assistance_enabled: true })
            }
            className="flex min-h-[72px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--tc-surface-alt)]/60"
          >
            <div className="flex items-center gap-3.5">
              <Hand
                className={`h-5 w-5 shrink-0 ${
                  steadyActive ? "text-[var(--tc-primary)]" : "text-[var(--tc-ink-muted)]"
                }`}
                aria-hidden="true"
              />
              <div>
                <span className="block text-[15.5px] font-semibold text-[var(--tc-ink)]">
                  SteadyHand Stabilization
                </span>
                <span className="block text-[14px] text-[var(--tc-ink-muted)]">
                  Smooths cursor movement and blocks accidental clicks or file drags.
                </span>
              </div>
            </div>
            <NativeSwitch checked={steadyActive} />
          </button>

          <button
            type="button"
            disabled={toggling}
            aria-pressed={gazeActive}
            onClick={() =>
              void onToggle(
                gazeActive
                  ? {
                      gaze_control: false,
                      camera: false,
                      system_mouse: false,
                      assistance_enabled: true,
                    }
                  : {
                      gaze_control: true,
                      camera: true,
                      assistance_enabled: true,
                    }
              )
            }
            className="flex min-h-[72px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--tc-surface-alt)]/60"
          >
            <div className="flex items-center gap-3.5">
              <Camera
                className={`h-5 w-5 shrink-0 ${
                  gazeActive ? "text-[var(--tc-primary)]" : "text-[var(--tc-ink-muted)]"
                }`}
                aria-hidden="true"
              />
              <div>
                <span className="block text-[15.5px] font-semibold text-[var(--tc-ink)]">
                  GazeControl Tracking
                  {gazeActive && (
                    <span className="ml-2 text-[14px] font-normal text-[var(--tc-ink-muted)]">
                      ({cameraRunning ? "Camera Live" : "Starting"})
                    </span>
                  )}
                </span>
                <span className="block text-[14px] text-[var(--tc-ink-muted)]">
                  Webcam head or eye pointing with dwell and blink clicking.
                </span>
              </div>
            </div>
            <NativeSwitch checked={gazeActive} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={toggling}
            aria-pressed={sysMouseActive}
            onClick={() => void onToggle({ system_mouse: !sysMouseActive })}
            className={`inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 text-[14.5px] font-medium transition-colors ${
              sysMouseActive
                ? "border-[var(--tc-primary)] bg-[var(--tc-mint)] text-[var(--tc-primary-ink)]"
                : "border-[var(--tc-border-strong)] bg-[var(--tc-surface)] text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
            }`}
          >
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            <span>System-Wide Stabilization: {sysMouseActive ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            disabled={toggling}
            aria-pressed={simActive}
            onClick={() => void onToggle({ simulate_tremor: !simActive })}
            className={`inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 text-[14.5px] font-medium transition-colors ${
              simActive
                ? "border-[var(--tc-alert)]/40 bg-[var(--tc-alert-bg)] text-[var(--tc-alert)]"
                : "border-[var(--tc-border-strong)] bg-[var(--tc-surface)] text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
            }`}
          >
            <Waves className="h-4 w-4" aria-hidden="true" />
            <span>Tremor Simulation: {simActive ? "ON" : "OFF"}</span>
          </button>
        </div>

        {tapError && sysMouseActive && (
          <div
            role="status"
            className="rounded-xl bg-[var(--tc-alert-bg)] px-4 py-3 text-[14px] font-medium text-[var(--tc-alert)]"
          >
            System pointer access: {tapError}
          </div>
        )}
      </section>

      {gazeActive && (
        <section className="grid grid-cols-1 items-start gap-6 border-t border-[var(--tc-border)] pt-7 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <GazePreviewFeed gaze={frame?.gaze} active={gazeActive} />
          </div>
          <div className="space-y-4 lg:col-span-7">
            <h3 className="text-[18px] font-semibold text-[var(--tc-ink)]">GazeCam Setup</h3>
            <div className="cc-sheet divide-y divide-[var(--tc-border)] text-[14.5px]">
              <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                <span className="font-medium text-[var(--tc-ink)]">1. Camera &amp; Face Lock</span>
                <span
                  className={`font-semibold ${
                    frame?.gaze.face_detected ? "text-[var(--tc-success)]" : "text-[var(--tc-alert)]"
                  }`}
                >
                  {frame?.gaze.face_detected ? "Face Locked" : "Center Face in Preview"}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <span className="font-medium text-[var(--tc-ink)]">2. Calibrate Screen Edges</span>
                <div className="flex items-center gap-2">
                  {frame?.gaze.calibrated && (
                    <button
                      type="button"
                      onClick={() => void clearCalibration().catch(() => undefined)}
                      className="min-h-11 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-3.5 text-[14px] font-medium text-[var(--tc-ink)]"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onStartCalibration}
                    className="min-h-11 rounded-xl bg-[var(--tc-primary)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--tc-primary-hover)]"
                  >
                    {frame?.gaze.calibrated ? "Recalibrate" : "Calibrate Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Calm Live Monitor (Steadiness + Hz always visible; technical metrics tucked away) */}
      <section aria-labelledby="telemetry-heading" className="space-y-6 border-t border-[var(--tc-border)] pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="telemetry-heading" className="text-[18px] font-semibold text-[var(--tc-ink)]">
            Live Monitor
          </h2>

          <button
            type="button"
            aria-expanded={showTechnical}
            onClick={() => setShowTechnical((prev) => !prev)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-4 text-[14px] font-medium text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
          >
            <span>{showTechnical ? "Hide Technical Details" : "Show Technical Details"}</span>
            {showTechnical ? (
              <ChevronUp className="h-4 w-4 text-[var(--tc-ink-muted)]" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--tc-ink-muted)]" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Two Clean Primary Readouts: Steadiness & Hz */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-[14.5px] font-medium text-[var(--tc-teal)]">Stability Score</p>
            <p className="text-[36px] leading-none font-semibold tracking-[-0.025em] text-[var(--tc-ink)] tabular-nums">
              {smoothedScore.toFixed(1)}
              <span className="ml-1.5 text-[16px] font-normal text-[var(--tc-ink-muted)]">/ 100</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[14.5px] font-medium text-[var(--tc-coral)]">Dominant Frequency</p>
            <p className="text-[36px] leading-none font-semibold tracking-[-0.025em] text-[var(--tc-ink)] tabular-nums">
              {tremorHz !== null ? tremorHz.toFixed(2) : "0.00"}
              <span className="ml-1.5 text-[16px] font-normal text-[var(--tc-ink-muted)]">Hz</span>
            </p>
          </div>
        </div>

        {/* Progressive Disclosure: Technical Telemetry Details */}
        {showTechnical && (
          <div className="cc-sheet grid grid-cols-1 divide-y divide-[var(--tc-border)] sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
            <div className="p-4">
              <p className="text-[13.5px] text-[var(--tc-ink-muted)]">Spectral Split &amp; RMS</p>
              <p className="mt-1 font-mono text-[14.5px] font-semibold text-[var(--tc-ink)] tabular-nums">
                Rest {restingPct.toFixed(0)}% | Act {actionPct.toFixed(0)}%
              </p>
              <p className="mt-0.5 text-[13.5px] text-[var(--tc-ink-muted)] tabular-nums">
                RMS {rmsMm.toFixed(2)} mm | Power {smoothedTremorIndex.toFixed(0)}%
              </p>
            </div>

            <div className="p-4">
              <p className="text-[13.5px] text-[var(--tc-ink-muted)]">Click &amp; Drag Guards</p>
              <p className="mt-1 text-[14.5px] font-semibold text-[var(--tc-ink)] tabular-nums">
                Dampening {dampeningPct}%
                {frame?.steadyhand.click_freeze_active ? " | Frozen" : ""}
              </p>
              <p className="mt-0.5 text-[13.5px] text-[var(--tc-ink-muted)] tabular-nums">
                Rescued {clicksRescued} | Drags {dragsPrevented} | Bounces {bouncesBlocked}
              </p>
            </div>

            <div className="p-4">
              <p className="text-[13.5px] text-[var(--tc-ink-muted)]">Button Magnetism</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-[var(--tc-ink)]">
                <Magnet className="h-4 w-4 text-[var(--tc-primary)]" aria-hidden="true" />
                <span>
                  Gravity Wells:{" "}
                  {settings.gravity_wells
                    ? gravityActive
                      ? `Locked (${(frame?.steadyhand.gravity_target_role ?? "Control").replace(/^AX/, "")})`
                      : "Armed"
                    : "Off"}
                </span>
              </p>
            </div>

            <div className="p-4">
              <p className="text-[13.5px] text-[var(--tc-ink-muted)]">OS Pointer Hook</p>
              <p className="mt-1 font-mono text-[14.5px] font-semibold text-[var(--tc-ink)]">
                {tapMode}
              </p>
              <p className="mt-0.5 text-[13.5px] text-[var(--tc-ink-muted)]">
                Gaze: {frame?.gaze.face_detected ? "Face locked" : "Standby"}
              </p>
            </div>
          </div>
        )}

        {/* Real-Time Stability Trace + Test Strip Side by Side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="cc-sheet p-5 lg:col-span-7">
            <h3 className="mb-3 text-[15px] font-semibold text-[var(--tc-ink)]">
              Real-Time Stability Trace
            </h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tcStabilityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--tc-teal)" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="var(--tc-teal)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--tc-chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <YAxis
                    domain={[0, 100]}
                    width={32}
                    stroke="var(--tc-chart-axis)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReferenceLine
                    y={85}
                    stroke="var(--tc-teal)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--tc-surface)",
                      border: "1px solid var(--tc-border-strong)",
                      borderRadius: "10px",
                      color: "var(--tc-ink)",
                      fontSize: "13px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--tc-teal)"
                    strokeWidth={2.5}
                    fill="url(#tcStabilityGrad)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            onPointerMove={handlePadPointerMove}
            className="flex min-h-[216px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--tc-border-strong)] bg-[var(--tc-surface)] p-6 text-center lg:col-span-5"
          >
            <p className="pointer-events-none text-[15.5px] font-semibold text-[var(--tc-ink)]">
              Quick Pointer Test Area
            </p>
            <p className="pointer-events-none mt-1.5 max-w-xs text-[14px] text-[var(--tc-ink-muted)]">
              Move your mouse across this box to feel your current smoothing setting right away.
            </p>
            {padCursor && (
              <span className="mt-3 font-mono text-[13.5px] text-[var(--tc-ink-muted)] tabular-nums">
                {padCursor.x}, {padCursor.y}
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
