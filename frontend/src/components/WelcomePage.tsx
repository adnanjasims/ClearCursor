import { ArrowRight, Check, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CLINICAL_PRESETS, type ClinicalPreset } from "../presets";
import type { SettingsUpdate } from "../types/telemetry";

interface WelcomePageProps {
  isReturningUser: boolean;
  tutorialActive: boolean;
  stabilizationActive: boolean;
  activeProfile: string;
  onCompleteTutorial: () => void;
  onReplayTutorial: () => void;
  onApplyPreset: (updates: SettingsUpdate) => Promise<void>;
  onGoToSummary: () => void;
  onGoToControlDeck: () => void;
  onGoToPlayground: () => void;
  onGoToClinicianReport: () => void;
}

/** Interactive animated live demonstration comparing shaky 5.5 Hz hand input vs. stabilized motion. */
function LiveSmoothingDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [smoothingOn, setSmoothingOn] = useState<boolean>(true);
  const [interactive, setInteractive] = useState<boolean>(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const smoothPosRef = useRef<{ x: number; y: number }>({ x: 80, y: 120 });
  const rawTrailRef = useRef<{ x: number; y: number }[]>([]);
  const smoothTrailRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const W = 620;
      const H = 220;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }

      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const t = (now - start) / 1000;

      // Target guide trajectory (or user's live pointer position)
      let baseX: number;
      let baseY: number;
      if (interactive && pointerRef.current) {
        baseX = pointerRef.current.x;
        baseY = pointerRef.current.y;
      } else {
        const loop = (t * 0.42) % 1;
        const eased = 0.5 - 0.5 * Math.cos(loop * Math.PI * 2);
        baseX = 72 + eased * (W - 144);
        baseY = H / 2 + Math.sin(loop * Math.PI * 2) * 34;
      }

      // Realistic 5.5 Hz involuntary tremor overlay
      const rawX = baseX + Math.sin(t * Math.PI * 2 * 5.5) * 11.5 + Math.cos(t * 23) * 3.5;
      const rawY = baseY + Math.cos(t * Math.PI * 2 * 5.2) * 9.5 + Math.sin(t * 19) * 3.0;

      // Smooth exponential filter simulation when stabilization is ON
      const alpha = smoothingOn ? 0.11 : 1.0;
      smoothPosRef.current = {
        x: smoothPosRef.current.x + (rawX - smoothPosRef.current.x) * alpha,
        y: smoothPosRef.current.y + (rawY - smoothPosRef.current.y) * alpha,
      };

      rawTrailRef.current.push({ x: rawX, y: rawY });
      smoothTrailRef.current.push({ ...smoothPosRef.current });
      if (rawTrailRef.current.length > 56) rawTrailRef.current.shift();
      if (smoothTrailRef.current.length > 56) smoothTrailRef.current.shift();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = isDark ? "#13161C" : "#F3F4F7";
      ctx.fillRect(0, 0, W, H);

      // Subtle guide targets on left & right
      for (const tx of [72, W - 72]) {
        ctx.beginPath();
        ctx.arc(tx, H / 2, 24, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? "rgba(10, 132, 255, 0.12)" : "rgba(0, 113, 227, 0.08)";
        ctx.fill();
        ctx.strokeStyle = isDark ? "rgba(130, 196, 255, 0.45)" : "rgba(0, 113, 227, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Raw tremor path (dashed coral)
      if (rawTrailRef.current.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(rawTrailRef.current[0].x, rawTrailRef.current[0].y);
        for (let i = 1; i < rawTrailRef.current.length; i += 1) {
          ctx.lineTo(rawTrailRef.current[i].x, rawTrailRef.current[i].y);
        }
        ctx.strokeStyle = isDark ? "rgba(255, 98, 126, 0.55)" : "rgba(217, 38, 78, 0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Stabilized path (solid teal)
      if (smoothTrailRef.current.length > 1) {
        ctx.beginPath();
        ctx.moveTo(smoothTrailRef.current[0].x, smoothTrailRef.current[0].y);
        for (let i = 1; i < smoothTrailRef.current.length; i += 1) {
          ctx.lineTo(smoothTrailRef.current[i].x, smoothTrailRef.current[i].y);
        }
        ctx.strokeStyle = isDark ? "#34D399" : "#0D8568";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }

      // Raw hand ring
      ctx.beginPath();
      ctx.arc(rawX, rawY, 9, 0, Math.PI * 2);
      ctx.strokeStyle = isDark ? "#FF627E" : "#D9264E";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Stabilized pointer dot
      ctx.beginPath();
      ctx.arc(smoothPosRef.current.x, smoothPosRef.current.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? "#0A84FF" : "#0071E3";
      ctx.fill();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2.2;
      ctx.stroke();

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [interactive, smoothingOn]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 620;
    const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 220;
    pointerRef.current = { x, y };
    setInteractive(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-semibold text-[var(--tc-ink)]">
            See Stabilization in Action
          </h3>
          <p className="mt-0.5 text-[14.5px] text-[var(--tc-ink-muted)]">
            Move your pointer over the canvas or toggle smoothing below to compare raw 5.5 Hz shaking against ClearCursor.
          </p>
        </div>

        <button
          type="button"
          aria-pressed={smoothingOn}
          onClick={() => setSmoothingOn((prev) => !prev)}
          className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-4 text-[14.5px] font-medium text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
        >
          <span>Demo Smoothing</span>
          <span
            className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
              smoothingOn ? "bg-[var(--tc-switch-on)]" : "bg-[var(--tc-switch-off)]"
            }`}
            aria-hidden="true"
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                smoothingOn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={620}
        height={220}
        style={{ aspectRatio: "620 / 220" }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setInteractive(false)}
        aria-label="Live interactive animation showing dashed red shaky hand motion smoothed into a calm teal cursor path"
        className="w-full cursor-crosshair rounded-2xl border border-[var(--tc-border)] bg-[var(--tc-surface-alt)]"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-[var(--tc-ink-muted)]">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--tc-coral)]" aria-hidden="true" />
            <span>Raw hand input (5.5 Hz tremor)</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--tc-teal)]" aria-hidden="true" />
            <span>Stabilized ClearCursor path</span>
          </span>
        </div>
        <span>{interactive ? "Following your pointer" : "Auto-demo active"}</span>
      </div>
    </div>
  );
}

export function WelcomePage({
  isReturningUser,
  tutorialActive,
  stabilizationActive,
  activeProfile,
  onCompleteTutorial,
  onReplayTutorial,
  onApplyPreset,
  onGoToSummary,
  onGoToControlDeck,
  onGoToPlayground,
  onGoToClinicianReport,
}: WelcomePageProps) {
  const [step, setStep] = useState<number>(0);
  const [selectedPreset, setSelectedPreset] = useState<string>(
    activeProfile === "parkinsons" ? "moderate" : activeProfile
  );
  const [applying, setApplying] = useState<boolean>(false);

  const handleChoosePreset = async (preset: ClinicalPreset) => {
    setSelectedPreset(preset.id);
    setApplying(true);
    try {
      await onApplyPreset(preset.updates);
    } catch {
      // keep local selection even if backend is offline
    } finally {
      setApplying(false);
    }
  };

  if (tutorialActive) {
    return (
      <div className="space-y-10">
        {/* Clean Editorial Tutorial Header */}
        <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-6">
            <p className="text-[14px] font-semibold text-[var(--tc-primary-ink)]">
              Step {step + 1} of 3
            </p>
            <h2 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-[var(--tc-ink)]">
              {step === 0
                ? "Steady mouse control, built for trembling hands."
                : step === 1
                  ? "Pick how much steadiness feels natural today."
                  : "You are ready to use ClearCursor in any app."}
            </h2>
            <p className="text-[16px] leading-relaxed text-[var(--tc-ink-muted)]">
              {step === 0
                ? "ClearCursor quietly filters involuntary hand shaking while keeping normal mouse movement smooth. It also stops accidental double-clicks and unintended file drags."
                : step === 1
                  ? "Tremors change throughout the day. Start with a preset below; you can switch levels anytime with one click or your keyboard shortcut."
                  : "ClearCursor stays quietly in your menu bar or system tray while you browse, email, and work. Visit the Clinician Report anytime to run a 15-second check-in or export a PDF for your doctor."}
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[var(--tc-border)] lg:col-span-6">
            <img
              src={
                step === 0
                  ? "/media/welcome-hero.webp"
                  : step === 1
                    ? "/media/control-handsfree.webp"
                    : "/media/clinician-report.webp"
              }
              alt={
                step === 0
                  ? "Hand resting comfortably on a wireless mouse next to a laptop in natural morning light"
                  : step === 1
                    ? "Person seated comfortably at a bright laptop workspace"
                    : "Patient and doctor reviewing a clear motor report together at a bright wooden desk"
              }
              className="aspect-[16/10] w-full object-cover"
            />
          </div>
        </section>

        {/* Interactive Step Content (Flat, zero nested cards) */}
        <section className="border-t border-[var(--tc-border)] pt-8">
          {step === 0 && <LiveSmoothingDemo />}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-[18px] font-semibold text-[var(--tc-ink)]">
                Choose Your Starting Comfort Level
              </h3>
              <div className="cc-sheet grid grid-cols-1 divide-y divide-[var(--tc-border)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
                {CLINICAL_PRESETS.map((preset) => {
                  const active = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={applying}
                      aria-pressed={active}
                      onClick={() => void handleChoosePreset(preset)}
                      className={`flex min-h-[120px] flex-col justify-between p-5 text-left transition-colors ${
                        active ? "bg-[var(--tc-mint)]" : "hover:bg-[var(--tc-surface-alt)]"
                      }`}
                    >
                      <div>
                        <span className="flex items-center justify-between gap-2 text-[15.5px] font-semibold text-[var(--tc-ink)]">
                          <span>{preset.label.split(" (")[0]}</span>
                          {active && (
                            <Check className="h-4 w-4 text-[var(--tc-primary)]" aria-hidden="true" />
                          )}
                        </span>
                        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--tc-ink-muted)]">
                          {preset.tagline}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-1.5">
                <h3 className="text-[16px] font-semibold text-[var(--tc-ink)]">
                  Pause Anytime
                </h3>
                <p className="text-[14.5px] text-[var(--tc-ink-muted)]">
                  Press <kbd className="font-mono font-semibold text-[var(--tc-ink)]">Cmd/Ctrl+Shift+S</kbd> to pause or resume stabilization in any app.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-[16px] font-semibold text-[var(--tc-ink)]">
                  Temporary Bypass
                </h3>
                <p className="text-[14.5px] text-[var(--tc-ink-muted)]">
                  Hold <kbd className="font-mono font-semibold text-[var(--tc-ink)]">Alt / Option</kbd> whenever you want raw pointer movement for drawing.
                </p>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-[16px] font-semibold text-[var(--tc-ink)]">
                  Private by Default
                </h3>
                <p className="text-[14.5px] text-[var(--tc-ink-muted)]">
                  All settings, check-ins, and clinician reports stay locally on your computer.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Tutorial Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--tc-border)] pt-6">
          <button
            type="button"
            onClick={onCompleteTutorial}
            className="min-h-12 rounded-xl px-4 text-[15px] font-medium text-[var(--tc-ink-muted)] hover:bg-[var(--tc-surface-alt)] hover:text-[var(--tc-ink)]"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="min-h-12 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-5 text-[15px] font-medium text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
              >
                Back
              </button>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--tc-primary-hover)]"
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onCompleteTutorial();
                  onGoToSummary();
                }}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-6 text-[15px] font-semibold text-white hover:bg-[var(--tc-primary-hover)]"
              >
                <span>Finish &amp; Open Summary</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* Returning User: Calm "Welcome back" Editorial Hub */
  return (
    <div className="space-y-12">
      {/* Editorial Hero */}
      <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-6">
          <h2 className="text-[28px] leading-snug font-semibold tracking-[-0.02em] text-[var(--tc-ink)]">
            {isReturningUser
              ? "Your cursor is steady and ready."
              : "Steadier clicking and calmer computing for everyday tasks."}
          </h2>
          <p className="text-[16px] leading-relaxed text-[var(--tc-ink-muted)]">
            {stabilizationActive
              ? "Stabilization is running in the background across your apps. Jump to your daily Summary, test your settings in the Sandbox, or log a 15-second motor check-in."
              : "Stabilization is currently paused. Turn it back on from the top right anytime, or walk through the interactive guide below."}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onGoToSummary}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)]"
            >
              <span>Open Summary</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onGoToPlayground}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-5 text-[15px] font-medium text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)]"
            >
              <Play className="h-4 w-4 text-[var(--tc-primary)]" aria-hidden="true" />
              <span>Try Sandbox Lab</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep(0);
                onReplayTutorial();
              }}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-[15px] font-medium text-[var(--tc-ink-muted)] transition-colors hover:bg-[var(--tc-surface-alt)] hover:text-[var(--tc-ink)]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Replay Tutorial</span>
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--tc-border)] lg:col-span-6">
          <img
            src="/media/welcome-hero.webp"
            alt="Hand resting steadily on a wireless mouse next to an open laptop in calm morning light"
            className="aspect-[16/10] w-full object-cover"
          />
        </div>
      </section>

      {/* Live Interactive Smoothing Demo */}
      <section className="border-t border-[var(--tc-border)] pt-9">
        <LiveSmoothingDemo />
      </section>

      {/* Visual Guide to Every Workspace Section (Open Editorial Layout, Zero Box-Soup) */}
      <section className="space-y-6 border-t border-[var(--tc-border)] pt-9">
        <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--tc-ink)]">
          Explore ClearCursor
        </h2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <button
            type="button"
            onClick={onGoToControlDeck}
            className="group space-y-3 text-left"
          >
            <div className="overflow-hidden rounded-2xl border border-[var(--tc-border)]">
              <img
                src="/media/control-handsfree.webp"
                alt="Person working comfortably at a laptop using hands-free and stabilized controls"
                className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <h3 className="text-[16.5px] font-semibold text-[var(--tc-ink)] group-hover:text-[var(--tc-primary)]">
              SteadyHand &amp; Gaze Control
            </h3>
            <p className="text-[14.5px] leading-relaxed text-[var(--tc-ink-muted)]">
              Switch comfort presets as medication shifts, or use webcam head pointing when your hands need rest.
            </p>
          </button>

          <button
            type="button"
            onClick={onGoToPlayground}
            className="group space-y-3 text-left"
          >
            <div className="overflow-hidden rounded-2xl border border-[var(--tc-border)]">
              <img
                src="/media/sandbox-practice.webp"
                alt="Minimalist mouse and keyboard on a clean desk for practicing stabilized clicks"
                className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <h3 className="text-[16.5px] font-semibold text-[var(--tc-ink)] group-hover:text-[var(--tc-primary)]">
              Practice Sandbox
            </h3>
            <p className="text-[14.5px] leading-relaxed text-[var(--tc-ink-muted)]">
              Test button clicking, checkboxes, and tremor filtering safely before turning on system-wide assistance.
            </p>
          </button>

          <button
            type="button"
            onClick={onGoToClinicianReport}
            className="group space-y-3 text-left"
          >
            <div className="overflow-hidden rounded-2xl border border-[var(--tc-border)]">
              <img
                src="/media/clinician-report.webp"
                alt="Patient and clinician reviewing a printed motor progress report together"
                className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <h3 className="text-[16.5px] font-semibold text-[var(--tc-ink)] group-hover:text-[var(--tc-primary)]">
              Clinician Report &amp; Check-Ins
            </h3>
            <p className="text-[14.5px] leading-relaxed text-[var(--tc-ink-muted)]">
              Combine 15-second guided check-ins, medication logs, and everyday trends into a clean PDF for appointments.
            </p>
          </button>
        </div>
      </section>
    </div>
  );
}
