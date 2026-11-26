import { CheckSquare, Play, RotateCcw, Square, Waves } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pushSteadyHandSample } from "../api/client";
import type { EngineToggleRequest, SettingsPayload } from "../types/telemetry";
import { SteppedControl } from "./SteppedControl";

type AssistMode = "baseline" | "smoothing" | "targets" | "full";
type StepId = "doctor" | "date" | "time" | "review" | "book";

interface TargetBox {
  id: StepId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ModeMeta {
  id: AssistMode;
  title: string;
  subtitle: string;
  useSmoothing: boolean;
  useExtendedTargets: boolean;
}

const MODES: ModeMeta[] = [
  {
    id: "baseline",
    title: "Baseline",
    subtitle: "Raw cursor, standard button edges only.",
    useSmoothing: false,
    useExtendedTargets: false,
  },
  {
    id: "smoothing",
    title: "Smoothing Only",
    subtitle: "Filters 4-7 Hz tremor; standard edges.",
    useSmoothing: true,
    useExtendedTargets: false,
  },
  {
    id: "targets",
    title: "Larger Targets Only",
    subtitle: "Raw cursor + dashed extended hitboxes.",
    useSmoothing: false,
    useExtendedTargets: true,
  },
  {
    id: "full",
    title: "Full Assist",
    subtitle: "One Euro filter, 180ms click-freeze, and extended zones.",
    useSmoothing: true,
    useExtendedTargets: true,
  },
];

const SEQUENCE: StepId[] = [
  "doctor",
  "date",
  "time",
  "review",
  "book",
  "doctor",
  "date",
  "time",
  "review",
  "book",
];

const STEP_LABELS: Record<StepId, string> = {
  doctor: "1. Doctor",
  date: "2. Date",
  time: "3. Time",
  review: "4. Review",
  book: "5. Book",
};

const CANVAS_W = 880;
const CANVAS_H = 340;
const MAX_TRAIL_POINTS = 64;

function buildAppointmentTargets(): TargetBox[] {
  const keys: StepId[] = ["doctor", "date", "time", "review", "book"];
  const width = 136;
  const height = 56;
  const marginX = 44;
  const stepX = (CANVAS_W - 2 * marginX - width) / (keys.length - 1);
  return keys.map((id, idx) => ({
    id,
    label: STEP_LABELS[id],
    x: Math.round(marginX + idx * stepX),
    y: Math.round(138 + (idx % 2 === 0 ? -34 : 34)),
    width,
    height,
  }));
}

function pointInTarget(target: TargetBox, x: number, y: number, padding: number): boolean {
  return (
    target.x - padding <= x &&
    x <= target.x + target.width + padding &&
    target.y - padding <= y &&
    y <= target.y + target.height + padding
  );
}

function distanceToTarget(target: TargetBox, x: number, y: number): number {
  const dx = Math.max(target.x - x, 0, x - (target.x + target.width));
  const dy = Math.max(target.y - y, 0, y - (target.y + target.height));
  return Math.hypot(dx, dy);
}

function selectTarget(
  targets: TargetBox[],
  x: number,
  y: number,
  assisted: boolean,
  padding: number
): TargetBox | null {
  const direct = targets.filter((t) => pointInTarget(t, x, y, 0));
  if (direct.length > 0) {
    return direct[0];
  }
  if (!assisted || padding <= 0) {
    return null;
  }
  const extended = targets.filter((t) => pointInTarget(t, x, y, padding));
  if (extended.length === 0) {
    return null;
  }
  return extended.reduce((best, item) =>
    distanceToTarget(item, x, y) < distanceToTarget(best, x, y) ? item : best
  );
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

interface AppointmentPlaygroundProps {
  settings: SettingsPayload;
  toggling: boolean;
  onToggle: (payload: EngineToggleRequest) => Promise<void>;
}

export function AppointmentPlayground({
  settings,
  toggling,
  onToggle,
}: AppointmentPlaygroundProps) {
  const targets = useMemo(() => buildAppointmentTargets(), []);
  const [mode, setMode] = useState<AssistMode>("full");
  const [paddingPx, setPaddingPx] = useState<number>(18);
  const [trialStep, setTrialStep] = useState<number>(0);
  const [trialActive, setTrialActive] = useState<boolean>(true);
  const [hits, setHits] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const [inside, setInside] = useState<boolean>(false);
  const [liveHz, setLiveHz] = useState<number | null>(null);
  const [lastFeedback, setLastFeedback] = useState<string>(
    "Move across the dual-trace canvas and click target 1 of 10: 1. Doctor"
  );

  const [sandboxChecks, setSandboxChecks] = useState<boolean[]>([true, false, false]);
  const [sandboxNote, setSandboxNote] = useState<string>("");
  const [sandboxClickCount, setSandboxClickCount] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const anchorPosRef = useRef<[number, number]>([440, 170]);
  const rawPosRef = useRef<[number, number]>([440, 170]);
  const stablePosRef = useRef<[number, number]>([440, 170]);
  const rawTrailRef = useRef<[number, number][]>([]);
  const stableTrailRef = useRef<[number, number][]>([]);
  const inFlightRef = useRef<boolean>(false);

  const activeMode = useMemo(
    () => MODES.find((m) => m.id === mode) ?? MODES[3],
    [mode]
  );

  const expectedId = trialStep < SEQUENCE.length ? SEQUENCE[trialStep] : null;

  const paintCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const backingW = Math.round(CANVAS_W * dpr);
    const backingH = Math.round(CANVAS_H * dpr);
    if (canvas.width !== backingW || canvas.height !== backingH) {
      canvas.width = backingW;
      canvas.height = backingH;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = isDark ? "#11151C" : "#F6F7FA";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Calibration dot matrix
    ctx.fillStyle = isDark ? "rgba(155, 165, 180, 0.18)" : "rgba(85, 85, 94, 0.2)";
    for (let gx = 20; gx < CANVAS_W; gx += 30) {
      for (let gy = 20; gy < CANVAS_H; gy += 30) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const activeCursor = activeMode.useSmoothing ? stablePosRef.current : rawPosRef.current;
    const candidate = inside
      ? selectTarget(
          targets,
          activeCursor[0],
          activeCursor[1],
          activeMode.useExtendedTargets,
          paddingPx
        )
      : null;

    for (const target of targets) {
      const isExpected = target.id === expectedId;
      const isCandidate = candidate?.id === target.id;
      if (activeMode.useExtendedTargets && paddingPx > 0) {
        ctx.save();
        drawRoundedRect(
          ctx,
          target.x - paddingPx,
          target.y - paddingPx,
          target.width + paddingPx * 2,
          target.height + paddingPx * 2,
          12
        );
        ctx.fillStyle = isDark
          ? isCandidate
            ? "rgba(59, 130, 246, 0.24)"
            : "rgba(59, 130, 246, 0.10)"
          : isCandidate
            ? "#DBEAFE"
            : "#EFF6FF";
        ctx.fill();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = isExpected
          ? isDark
            ? "#60A5FA"
            : "#0066CC"
          : isDark
            ? "#475569"
            : "#94A3B8";
        ctx.lineWidth = isCandidate ? 2 : 1.4;
        ctx.stroke();
        ctx.restore();
      }

      drawRoundedRect(ctx, target.x, target.y, target.width, target.height, 10);
      ctx.fillStyle = isExpected
        ? isDark
          ? "#1D68D8"
          : "#0066CC"
        : isDark
          ? "#1C222C"
          : "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = isCandidate
        ? isDark
          ? "#93C5FD"
          : "#0052A3"
        : isExpected
          ? isDark
            ? "#60A5FA"
            : "#0052A3"
          : isDark
            ? "#363F4F"
            : "#CBD5E1";
      ctx.lineWidth = isCandidate ? 2.8 : 1.5;
      ctx.stroke();

      ctx.fillStyle = isExpected ? "#FFFFFF" : isDark ? "#F2F4F8" : "#1C1C1E";
      ctx.font = "600 15px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(target.label, target.x + target.width / 2, target.y + target.height / 2);
    }

    const drawTrail = (pts: [number, number][], color: string, width: number, dashed: boolean) => {
      if (pts.length < 2) {
        return;
      }
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      if (dashed) {
        ctx.setLineDash([4, 3]);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    };

    drawTrail(rawTrailRef.current, isDark ? "rgba(251, 113, 133, 0.65)" : "rgba(190, 18, 60, 0.55)", 2, true);
    drawTrail(stableTrailRef.current, isDark ? "rgba(52, 211, 153, 0.9)" : "rgba(21, 128, 61, 0.9)", 3.2, false);

    if (inside || settings.simulate_tremor) {
      const [rx, ry] = rawPosRef.current;
      const [sx, sy] = stablePosRef.current;

      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(rx, ry);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = isDark ? "rgba(251, 113, 133, 0.7)" : "rgba(190, 18, 60, 0.65)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      ctx.beginPath();
      ctx.arc(rx, ry, 9, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? "#FB7185" : "#BE123C";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "#60A5FA" : "#0066CC";
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [activeMode, expectedId, inside, paddingPx, settings.simulate_tremor, targets]);

  useEffect(() => {
    paintCanvas();
    const observer = new MutationObserver(() => paintCanvas());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [paintCanvas]);

  const recordTrail = (raw: [number, number], stable: [number, number]) => {
    rawPosRef.current = raw;
    stablePosRef.current = stable;
    rawTrailRef.current = [...rawTrailRef.current, raw].slice(-MAX_TRAIL_POINTS);
    stableTrailRef.current = [...stableTrailRef.current, stable].slice(-MAX_TRAIL_POINTS);
    paintCanvas();
  };

  const sampleBackend = useCallback(
    async (x: number, y: number, pressed?: boolean) => {
      if (inFlightRef.current && pressed === undefined) {
        return;
      }
      inFlightRef.current = true;
      try {
        const snap = await pushSteadyHandSample(x, y, pressed, true);
        recordTrail(snap.raw_pos, snap.stable_pos);
        setLiveHz(snap.tremor_hz);
      } catch {
        recordTrail([x, y], [x, y]);
      } finally {
        inFlightRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paintCanvas]
  );

  useEffect(() => {
    if (!inside && !settings.simulate_tremor) {
      return;
    }
    const id = window.setInterval(() => {
      const [ax, ay] = anchorPosRef.current;
      void sampleBackend(ax, ay);
    }, 35);
    return () => window.clearInterval(id);
  }, [inside, sampleBackend, settings.simulate_tremor]);

  const toStageCoords = (clientX: number, clientY: number): [number, number] => {
    const el = canvasRef.current;
    if (!el) {
      return [440, 170];
    }
    const rect = el.getBoundingClientRect();
    const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * CANVAS_W;
    const ny = ((clientY - rect.top) / Math.max(1, rect.height)) * CANVAS_H;
    return [
      Math.max(0, Math.min(CANVAS_W, nx)),
      Math.max(0, Math.min(CANVAS_H, ny)),
    ];
  };

  const handleSelectMode = async (nextMode: ModeMeta) => {
    setMode(nextMode.id);
    await onToggle({
      steady_hand: nextMode.useSmoothing,
      assistance_enabled: true,
    });
  };

  const handleResetTrial = () => {
    setTrialStep(0);
    setTrialActive(true);
    setHits(0);
    setMisses(0);
    rawTrailRef.current = [];
    stableTrailRef.current = [];
    paintCanvas();
    setLastFeedback("Trial started: click target 1 of 10 (1. Doctor).");
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = toStageCoords(e.clientX, e.clientY);
    anchorPosRef.current = [x, y];
    setInside(true);
    void sampleBackend(x, y);
  };

  const handleCanvasPointerDown = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    const [x, y] = toStageCoords(e.clientX, e.clientY);
    anchorPosRef.current = [x, y];
    setInside(true);
    try {
      const snap = await pushSteadyHandSample(x, y, true, true);
      recordTrail(snap.raw_pos, snap.stable_pos);
      const clickPos = activeMode.useSmoothing ? snap.stable_pos : snap.raw_pos;
      const hitTarget = selectTarget(
        targets,
        clickPos[0],
        clickPos[1],
        activeMode.useExtendedTargets,
        paddingPx
      );
      void pushSteadyHandSample(x, y, false, true).catch(() => undefined);

      if (!trialActive || expectedId === null) {
        return;
      }
      if (hitTarget && hitTarget.id === expectedId) {
        const nextStep = trialStep + 1;
        setHits((h) => h + 1);
        setTrialStep(nextStep);
        if (nextStep >= SEQUENCE.length) {
          setTrialActive(false);
          setLastFeedback(
            `Completed all 10 appointment steps (${hits + 1} hits, ${misses} misses).`
          );
        } else {
          setLastFeedback(
            `Hit ${hitTarget.label}. Next target (${nextStep + 1}/10): ${STEP_LABELS[SEQUENCE[nextStep]]}`
          );
        }
      } else {
        setMisses((m) => m + 1);
        setLastFeedback(
          hitTarget
            ? `Clicked ${hitTarget.label}, expected ${STEP_LABELS[expectedId]}.`
            : `Missed target boundary. Aim for ${STEP_LABELS[expectedId]}.`
        );
      }
    } catch {
      const hitTarget = selectTarget(
        targets,
        x,
        y,
        activeMode.useExtendedTargets,
        paddingPx
      );
      if (trialActive && expectedId !== null && hitTarget?.id === expectedId) {
        const nextStep = trialStep + 1;
        setHits((h) => h + 1);
        setTrialStep(nextStep);
        if (nextStep >= SEQUENCE.length) {
          setTrialActive(false);
        }
      } else if (trialActive) {
        setMisses((m) => m + 1);
      }
    }
  };

  const totalAttempts = hits + misses;
  const accuracyPct = totalAttempts > 0 ? Math.round((hits / totalAttempts) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--tc-ink)]">
            Sandbox Test Playground &amp; 10-Step Trial
          </h2>
          <p className="mt-0.5 text-sm text-[var(--tc-ink-muted)]">
            Compare the dashed crimson raw input path against the solid green One Euro stabilized path across targets and controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={toggling}
            aria-pressed={settings.simulate_tremor}
            onClick={() =>
              void onToggle({
                simulate_tremor: !settings.simulate_tremor,
                assistance_enabled: true,
              })
            }
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors ${
              settings.simulate_tremor
                ? "border-[var(--tc-alert)]/40 bg-[var(--tc-alert-bg)] text-[var(--tc-alert)]"
                : "border-[var(--tc-border-strong)] bg-[var(--tc-surface)] text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
            }`}
          >
            <Waves className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Shaky Tremor Sim: {settings.simulate_tremor ? "ON (4-7 Hz)" : "OFF"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleResetTrial}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)]"
          >
            {trialActive && trialStep > 0 ? (
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{trialStep > 0 ? "Restart 10-Step Trial" : "Start 10-Step Trial"}</span>
          </button>
        </div>
      </div>

      {/* Mode Comparison Selector */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MODES.map((item) => {
          const selected = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => void handleSelectMode(item)}
              className={`min-h-[82px] rounded-2xl border p-4 text-left transition-colors ${
                selected
                  ? "border-[var(--tc-primary)] bg-[var(--tc-mint)]"
                  : "border-[var(--tc-border)] bg-[var(--tc-surface)] shadow-[var(--tc-shadow)] hover:bg-[var(--tc-surface-alt)]"
              }`}
            >
              <span className="block text-sm font-semibold text-[var(--tc-ink)]">{item.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--tc-ink-muted)]">
                {item.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dual-Trace Canvas Card */}
      <section className="cc-card space-y-3.5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="status"
            aria-live="polite"
            className="text-sm font-semibold text-[var(--tc-ink)] tabular-nums"
          >
            {expectedId !== null
              ? `Step ${trialStep + 1} of 10: Click ${STEP_LABELS[expectedId]}`
              : "10-Step Trial Complete"}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[var(--tc-ink)] tabular-nums">
            <span>Hits: {hits}</span>
            <span>Misses: {misses}</span>
            <span className="text-[var(--tc-primary-ink)]">Accuracy: {accuracyPct}%</span>
            <span className="font-mono text-xs text-[var(--tc-ink-muted)]">
              FFT: {liveHz !== null ? `${liveHz.toFixed(2)} Hz` : "Idle"}
            </span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
          onPointerMove={handleCanvasPointerMove}
          onPointerDown={(e) => void handleCanvasPointerDown(e)}
          onPointerLeave={() => setInside(false)}
          aria-label="Dual-trace HTML5 canvas showing raw tremor trail, stabilized pointer trail, and 5 appointment targets with extended boundaries"
          className="w-full cursor-crosshair select-none rounded-xl border border-[var(--tc-border)] bg-[var(--tc-bg)]"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--tc-ink-muted)]">
          <span>
            Dashed crimson: raw input | Solid green: One Euro stabilized path | Dashed blue: extended boundary
          </span>
          <span className="font-medium text-[var(--tc-ink)]">{lastFeedback}</span>
        </div>
      </section>

      <SteppedControl
        id="extended-boundary-padding"
        label="Extended Click Boundary Padding"
        description="Expands forgiving hitboxes around the 5 clinic booking targets for Larger Targets and Full Assist modes."
        value={paddingPx}
        min={0}
        max={36}
        step={4}
        unit="px"
        onChange={setPaddingPx}
      />

      {/* Everyday UI Target Sandbox */}
      <section className="cc-card p-5">
        <h3 className="text-base font-semibold text-[var(--tc-ink)]">
          Everyday Control Practice Area
        </h3>
        <p className="mt-0.5 text-sm text-[var(--tc-ink-muted)]">
          Test checkboxes, text inputs, and click-freeze buttons while pointer stabilization or tremor simulation is active.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-2.5">
            {[
              "Confirm morning appointment",
              "Bring medication schedule list",
              "Send copy to caregiver",
            ].map((labelText, idx) => (
              <button
                key={labelText}
                type="button"
                role="checkbox"
                aria-checked={sandboxChecks[idx]}
                onClick={() =>
                  setSandboxChecks((prev) =>
                    prev.map((v, i) => (i === idx ? !v : v))
                  )
                }
                className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3.5 text-left text-sm font-medium transition-colors ${
                  sandboxChecks[idx]
                    ? "border-[var(--tc-primary)] bg-[var(--tc-mint)] text-[var(--tc-ink)]"
                    : "border-[var(--tc-border)] bg-[var(--tc-surface-alt)]/60 text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
                }`}
              >
                {sandboxChecks[idx] ? (
                  <CheckSquare
                    className="h-5 w-5 shrink-0 text-[var(--tc-primary-ink)]"
                    aria-hidden="true"
                  />
                ) : (
                  <Square
                    className="h-5 w-5 shrink-0 text-[var(--tc-ink-muted)]"
                    aria-hidden="true"
                  />
                )}
                <span>{labelText}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <label
              htmlFor="sandbox-note-input"
              className="block text-sm font-semibold text-[var(--tc-ink)]"
            >
              Visit Note Practice Input
            </label>
            <input
              id="sandbox-note-input"
              type="text"
              value={sandboxNote}
              onChange={(e) => setSandboxNote(e.target.value)}
              placeholder="Click inside and type a short test note..."
              className="min-h-12 w-full rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3.5 text-sm text-[var(--tc-ink)]"
            />
            <button
              type="button"
              onClick={() => setSandboxNote("")}
              className="inline-flex min-h-11 items-center rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-4 text-sm font-medium text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
            >
              Clear Note
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-[var(--tc-surface-alt)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--tc-ink)]">
                Quick Target Tap Counter
              </p>
              <p className="mt-1 text-3xl font-semibold text-[var(--tc-primary-ink)] tabular-nums">
                {sandboxClickCount} clicks
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSandboxClickCount((c) => c + 1)}
              className="mt-4 min-h-12 w-full rounded-xl bg-[var(--tc-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)]"
            >
              Tap Cleanly to Test Click-Freeze
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
