import {
  Check,
  ChevronDown,
  ChevronUp,
  Keyboard,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDisplays } from "../api/client";
import { CLINICAL_PRESETS, type ClinicalPreset } from "../presets";
import type {
  BypassKeyOption,
  DisplaysResponse,
  PrecisionKeyOption,
  SettingsPayload,
  SettingsUpdate,
} from "../types/telemetry";
import { SteppedControl } from "./SteppedControl";

interface SensitivityPanelProps {
  settings: SettingsPayload;
  saving: boolean;
  onSave: (updates: SettingsUpdate) => Promise<void>;
}

const SUGGESTED_EXCLUDED_APPS = ["Figma", "Photoshop", "Illustrator", "Blender", "Procreate"];
const BYPASS_OPTIONS: { value: BypassKeyOption; label: string }[] = [
  { value: "alt", label: "Alt / Option" },
  { value: "fn", label: "Fn (macOS)" },
  { value: "shift", label: "Shift" },
  { value: "ctrl", label: "Ctrl" },
  { value: "none", label: "Disabled" },
];
const PRECISION_OPTIONS: { value: PrecisionKeyOption; label: string }[] = [
  { value: "none", label: "Disabled" },
  { value: "shift", label: "Shift (0.35x speed)" },
  { value: "ctrl", label: "Ctrl (0.35x speed)" },
  { value: "alt", label: "Alt / Option (0.35x speed)" },
];

function SettingSwitchRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[var(--tc-surface-alt)]/70"
    >
      <div className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--tc-ink)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--tc-ink-muted)]">{description}</span>
        )}
      </div>
      <span
        className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-[var(--tc-primary)]" : "bg-[var(--tc-border-strong)]"
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full bg-white shadow-xs transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{checked ? "ON" : "OFF"}</span>
      </span>
    </button>
  );
}

export function SensitivityPanel({
  settings,
  saving,
  onSave,
}: SensitivityPanelProps) {
  const [draft, setDraft] = useState<SettingsPayload>(settings);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [displaySummary, setDisplaySummary] = useState<DisplaysResponse | null>(null);
  const [newAppInput, setNewAppInput] = useState<string>("");

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    let active = true;
    void fetchDisplays()
      .then((res) => {
        if (active) {
          setDisplaySummary(res);
        }
      })
      .catch(() => {
        // Ignore offline display lookup
      });
    return () => {
      active = false;
    };
  }, []);

  const updateField = <K extends keyof SettingsPayload>(
    key: K,
    value: SettingsPayload[K]
  ) => {
    setSavedNotice(null);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyPreset = async (preset: ClinicalPreset) => {
    setSavedNotice(null);
    const merged = { ...draft, ...preset.updates };
    setDraft(merged);
    await onSave(preset.updates);
    setSavedNotice(`Applied "${preset.label}" and persisted settings.`);
  };

  const addExcludedApp = (appName: string) => {
    const trimmed = appName.trim();
    if (!trimmed) {
      return;
    }
    const exists = draft.excluded_apps.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      updateField("excluded_apps", [...draft.excluded_apps, trimmed]);
    }
    setNewAppInput("");
  };

  const removeExcludedApp = (appName: string) => {
    updateField(
      "excluded_apps",
      draft.excluded_apps.filter((item) => item !== appName)
    );
  };

  const handleSave = async () => {
    await onSave({
      profile: draft.profile,
      tremor_strength: draft.tremor_strength,
      one_euro_min_cutoff: draft.one_euro_min_cutoff,
      one_euro_beta: draft.one_euro_beta,
      adaptive_smoothing: draft.adaptive_smoothing,
      anti_drag: draft.anti_drag,
      anti_drag_threshold_px: draft.anti_drag_threshold_px,
      anti_drag_hold_ms: draft.anti_drag_hold_ms,
      click_freeze_ms: draft.click_freeze_ms,
      click_debounce_ms: draft.click_debounce_ms,
      right_click_guard: draft.right_click_guard,
      scroll_smoothing: draft.scroll_smoothing,
      gravity_wells: draft.gravity_wells,
      gravity_strength: draft.gravity_strength,
      bypass_key: draft.bypass_key,
      precision_key: draft.precision_key,
      excluded_apps: draft.excluded_apps,
      gaze_dwell_ms: draft.gaze_dwell_ms,
      blink_select: draft.blink_select,
      gaze_source: draft.gaze_source,
      global_shortcut: draft.global_shortcut,
      resume_stabilization_on_launch: draft.resume_stabilization_on_launch,
      minimize_to_tray: draft.minimize_to_tray,
      keyboard_cadence_telemetry: Boolean(draft.keyboard_cadence_telemetry),
    });
    setSavedNotice("Settings saved to SQLite and applied to active engine workers.");
  };

  const resetDefaults = () => {
    setSavedNotice(null);
    setDraft((prev) => ({
      ...prev,
      profile: "moderate",
      tremor_strength: 100,
      one_euro_min_cutoff: 0.6,
      one_euro_beta: 0.004,
      adaptive_smoothing: true,
      anti_drag: true,
      anti_drag_threshold_px: 8,
      anti_drag_hold_ms: 180,
      click_freeze_ms: 180,
      click_debounce_ms: 70,
      right_click_guard: true,
      scroll_smoothing: true,
      gravity_wells: true,
      gravity_strength: 35,
      bypass_key: "alt",
      precision_key: "none",
      excluded_apps: [],
      gaze_dwell_ms: 1100,
      global_shortcut: "CommandOrControl+Shift+S",
      resume_stabilization_on_launch: false,
      minimize_to_tray: true,
      keyboard_cadence_telemetry: false,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--tc-ink)]">
            Comfort Presets &amp; Everyday Tuning
          </h2>
          <p className="mt-0.5 text-sm text-[var(--tc-ink-muted)]">
            Pick a preset matching how your hands feel right now, configure shortcuts and excluded apps, or adjust filter constants.
          </p>
        </div>

        <button
          type="button"
          onClick={resetDefaults}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-4 text-sm font-medium text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* One-Tap Medication State Presets */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {CLINICAL_PRESETS.map((preset) => {
          const selected = draft.profile === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={saving}
              aria-pressed={selected}
              onClick={() => void handleApplyPreset(preset)}
              className={`min-h-[88px] rounded-2xl border p-4 text-left transition-colors ${
                selected
                  ? "border-[var(--tc-primary)] bg-[var(--tc-mint)]"
                  : "border-[var(--tc-border)] bg-[var(--tc-surface)] shadow-[var(--tc-shadow)] hover:bg-[var(--tc-surface-alt)]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--tc-ink)]">{preset.label}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    selected
                      ? "bg-[var(--tc-primary)] text-white"
                      : "bg-[var(--tc-surface-alt)] text-[var(--tc-ink-muted)]"
                  }`}
                >
                  {selected ? "Active" : "Apply"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--tc-ink-muted)]">
                {preset.clinicalNote}
              </p>
            </button>
          );
        })}
      </div>

      {/* Grouped Native Settings Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="cc-card overflow-hidden">
          <div className="border-b border-[var(--tc-border)] px-5 py-3.5">
            <h3 className="text-sm font-semibold text-[var(--tc-ink)]">
              Pointer &amp; Click Protection
            </h3>
          </div>
          <div className="divide-y divide-[var(--tc-border)]">
            <SettingSwitchRow
              label="Button Magnetism (Gravity Wells)"
              description="Gently pulls slowed pointers toward native Accessibility buttons."
              checked={draft.gravity_wells}
              onToggle={() => updateField("gravity_wells", !draft.gravity_wells)}
            />
            <SettingSwitchRow
              label="Click-Freeze & Anti-Drag"
              description="Anchors cursor briefly on mouse-down to stop accidental drags."
              checked={draft.anti_drag}
              onToggle={() => updateField("anti_drag", !draft.anti_drag)}
            />
            <SettingSwitchRow
              label="Scroll Jitter Guard"
              description="Dampens bidirectional micro-reversals on scroll wheels and trackpads."
              checked={draft.scroll_smoothing}
              onToggle={() => updateField("scroll_smoothing", !draft.scroll_smoothing)}
            />
            <SettingSwitchRow
              label="Right-Click Twitch Guard"
              description="Prevents involuntary secondary-button taps during left-click presses."
              checked={draft.right_click_guard}
              onToggle={() => updateField("right_click_guard", !draft.right_click_guard)}
            />
            <SettingSwitchRow
              label="Smooth Adaptive Ramping"
              description="Gradually scales filter intensity with measured tremor amplitude."
              checked={draft.adaptive_smoothing}
              onToggle={() => updateField("adaptive_smoothing", !draft.adaptive_smoothing)}
            />
          </div>
        </section>

        <section className="cc-card overflow-hidden">
          <div className="border-b border-[var(--tc-border)] px-5 py-3.5">
            <h3 className="text-sm font-semibold text-[var(--tc-ink)]">
              Desktop Behavior, Gaze &amp; Optional Telemetry
            </h3>
          </div>
          <div className="divide-y divide-[var(--tc-border)]">
            <SettingSwitchRow
              label="Keep Running in Tray on Window Close"
              description="Closing the window hides to menu bar or tray so stabilization stays active."
              checked={draft.minimize_to_tray}
              onToggle={() => updateField("minimize_to_tray", !draft.minimize_to_tray)}
            />
            <SettingSwitchRow
              label="Resume OS Smoothing on Launch"
              description="Automatically re-arm system cursor interception when ClearCursor starts."
              checked={draft.resume_stabilization_on_launch}
              onToggle={() =>
                updateField(
                  "resume_stabilization_on_launch",
                  !draft.resume_stabilization_on_launch
                )
              }
            />
            <button
              type="button"
              onClick={() =>
                updateField("gaze_source", draft.gaze_source === "head" ? "eyes" : "head")
              }
              className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[var(--tc-surface-alt)]/70"
            >
              <div>
                <span className="block text-sm font-semibold text-[var(--tc-ink)]">
                  Gaze Input Source
                </span>
                <span className="mt-0.5 block text-xs text-[var(--tc-ink-muted)]">
                  Switch between head pose pointing and iris tracking.
                </span>
              </div>
              <span className="rounded-lg bg-[var(--tc-surface-alt)] px-3 py-1 font-mono text-xs font-semibold uppercase text-[var(--tc-ink)]">
                {draft.gaze_source}
              </span>
            </button>
            <SettingSwitchRow
              label="Opt-In Keyboard Timing Telemetry"
              description="Measures anonymous key hold and flight intervals for bradykinesia reports. Never logs or inspects which keys are pressed."
              checked={Boolean(draft.keyboard_cadence_telemetry)}
              onToggle={() =>
                updateField("keyboard_cadence_telemetry", !draft.keyboard_cadence_telemetry)
              }
            />
          </div>
        </section>
      </div>

      {/* Hotkeys & Modifiers */}
      <section className="cc-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-[var(--tc-primary-ink)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--tc-ink)]">
            Modifiers &amp; Global Hotkeys
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="bypass-key-select"
              className="block text-xs font-semibold text-[var(--tc-ink)]"
            >
              Hold-to-Bypass Key
            </label>
            <p className="mt-0.5 text-xs text-[var(--tc-ink-muted)]">
              Temporarily pauses smoothing while held for freehand work.
            </p>
            <select
              id="bypass-key-select"
              value={draft.bypass_key}
              onChange={(e) => updateField("bypass_key", e.target.value as BypassKeyOption)}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3 text-sm font-medium text-[var(--tc-ink)]"
            >
              {BYPASS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="precision-key-select"
              className="block text-xs font-semibold text-[var(--tc-ink)]"
            >
              Precision Slow-Mode Key
            </label>
            <p className="mt-0.5 text-xs text-[var(--tc-ink-muted)]">
              Scales pointer speed to 35% while held for tiny targets.
            </p>
            <select
              id="precision-key-select"
              value={draft.precision_key}
              onChange={(e) => updateField("precision_key", e.target.value as PrecisionKeyOption)}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3 text-sm font-medium text-[var(--tc-ink)]"
            >
              {PRECISION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="global-shortcut-input"
              className="block text-xs font-semibold text-[var(--tc-ink)]"
            >
              Global Toggle Hotkey
            </label>
            <p className="mt-0.5 text-xs text-[var(--tc-ink-muted)]">
              Emergency Stop All is always bound to Cmd/Ctrl+Alt+Esc.
            </p>
            <input
              id="global-shortcut-input"
              type="text"
              value={draft.global_shortcut}
              onChange={(e) => updateField("global_shortcut", e.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3 font-mono text-sm font-medium text-[var(--tc-ink)]"
            />
          </div>
        </div>
      </section>

      {/* Per-App Exclusions */}
      <section className="cc-card p-5">
        <h3 className="text-sm font-semibold text-[var(--tc-ink)]">
          Per-App Auto-Exclusions
        </h3>
        <p className="mt-0.5 text-xs text-[var(--tc-ink-muted)]">
          ClearCursor automatically bypasses cursor interception whenever one of these creative or gaming apps is focused.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {draft.excluded_apps.map((app) => (
            <span
              key={app}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tc-mint)] px-3 py-1 text-xs font-semibold text-[var(--tc-primary-ink)]"
            >
              <span>{app}</span>
              <button
                type="button"
                aria-label={`Remove excluded app ${app}`}
                onClick={() => removeExcludedApp(app)}
                className="rounded-full p-0.5 hover:bg-[var(--tc-surface)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          {draft.excluded_apps.length === 0 && (
            <span className="text-xs text-[var(--tc-ink-muted)]">
              No excluded apps configured yet.
            </span>
          )}
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
          <input
            type="text"
            value={newAppInput}
            onChange={(e) => setNewAppInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addExcludedApp(newAppInput);
              }
            }}
            placeholder="App name or bundle ID (e.g. Figma, Photoshop)"
            className="min-h-11 min-w-[240px] flex-1 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3.5 text-sm text-[var(--tc-ink)]"
          />
          <button
            type="button"
            onClick={() => addExcludedApp(newAppInput)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--tc-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--tc-primary-hover)]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add App</span>
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--tc-ink-muted)]">Quick add:</span>
          {SUGGESTED_EXCLUDED_APPS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addExcludedApp(name)}
              className="rounded-lg border border-[var(--tc-border)] bg-[var(--tc-surface-alt)] px-2.5 py-1 text-xs font-medium text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-mint)]"
            >
              + {name}
            </button>
          ))}
        </div>
      </section>

      {/* Expandable Advanced Tuning */}
      <section className="space-y-4">
        <button
          type="button"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((prev) => !prev)}
          className="cc-card flex min-h-14 w-full items-center justify-between gap-4 px-5 text-left text-sm font-semibold text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)]"
        >
          <span>Advanced Tuning (One Euro, Click-Freeze, Bounce Guard, Gravity Wells &amp; Dwell)</span>
          {advancedOpen ? (
            <ChevronUp className="h-5 w-5 shrink-0 text-[var(--tc-ink-muted)]" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-5 w-5 shrink-0 text-[var(--tc-ink-muted)]" aria-hidden="true" />
          )}
        </button>

        {advancedOpen && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SteppedControl
              id="tremor-strength"
              label="Stabilization Strength"
              description="Overall One Euro dampening blend applied to pointer movement."
              value={draft.tremor_strength}
              min={0}
              max={200}
              step={5}
              unit="%"
              onChange={(v) => updateField("tremor_strength", v)}
            />

            <SteppedControl
              id="click-freeze-ms"
              label="Click-Freeze Duration"
              description="Locks coordinates briefly on MouseDown to stop slip-drags while clicking."
              value={draft.click_freeze_ms}
              min={0}
              max={400}
              step={20}
              unit="ms"
              onChange={(v) => updateField("click_freeze_ms", v)}
            />

            <SteppedControl
              id="click-debounce-ms"
              label="Double-Click Bounce Guard"
              description="Blocks involuntary repeat clicks faster than this interval after release."
              value={draft.click_debounce_ms}
              min={0}
              max={250}
              step={10}
              unit="ms"
              onChange={(v) => updateField("click_debounce_ms", v)}
            />

            <SteppedControl
              id="gravity-strength"
              label="Gravity Well Magnetism"
              description="Gentle pull toward nearby buttons when slowing down to click."
              value={draft.gravity_strength}
              min={0}
              max={80}
              step={5}
              unit="%"
              onChange={(v) => updateField("gravity_strength", v)}
            />

            <SteppedControl
              id="min-cutoff"
              label="One Euro Min Cutoff"
              description="Lower cutoff increases stillness against 4-12 Hz trembling."
              value={draft.one_euro_min_cutoff}
              min={0.05}
              max={2.0}
              step={0.05}
              decimals={2}
              unit="Hz"
              onChange={(v) => updateField("one_euro_min_cutoff", v)}
            />

            <SteppedControl
              id="one-euro-beta"
              label="One Euro Speed Coefficient (Beta)"
              description="Higher beta reduces lag during intentional wide pointer sweeps."
              value={draft.one_euro_beta}
              min={0.0}
              max={0.05}
              step={0.001}
              decimals={3}
              onChange={(v) => updateField("one_euro_beta", v)}
            />

            <SteppedControl
              id="dwell-ms"
              label="Gaze Dwell Click Timing"
              description="Duration eyes or head pointer hold on a control before clicking."
              value={draft.gaze_dwell_ms}
              min={600}
              max={2000}
              step={100}
              unit="ms"
              onChange={(v) => updateField("gaze_dwell_ms", v)}
            />

            <SteppedControl
              id="antidrag-px"
              label="Anti-Drag Slip Threshold"
              description="Pixel excursion threshold before jitter counts as a drag attempt."
              value={draft.anti_drag_threshold_px}
              min={2}
              max={40}
              step={1}
              unit="px"
              onChange={(v) => updateField("anti_drag_threshold_px", v)}
            />

            <SteppedControl
              id="antidrag-hold"
              label="Intentional Hold Latch Time"
              description="Coherent sweep duration required before starting an intentional drag."
              value={draft.anti_drag_hold_ms}
              min={100}
              max={1500}
              step={40}
              unit="ms"
              onChange={(v) => updateField("anti_drag_hold_ms", v)}
            />

            {displaySummary && displaySummary.displays.length > 0 && (
              <div className="cc-card p-5 lg:col-span-2">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--tc-primary-ink)]">
                  <Monitor className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Active Displays ({displaySummary.displays.length}) | Virtual Bounds{" "}
                    {displaySummary.virtual_rect.width}x{displaySummary.virtual_rect.height}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {displaySummary.displays.map((disp, idx) => (
                    <div
                      key={disp.id}
                      className="rounded-xl bg-[var(--tc-surface-alt)] px-4 py-3 text-xs"
                    >
                      <p className="font-semibold text-[var(--tc-ink)]">
                        Display {idx + 1} {disp.is_primary ? "(Primary)" : "(External)"}
                      </p>
                      <p className="mt-0.5 font-mono tabular-nums text-[var(--tc-ink-muted)]">
                        {disp.width}x{disp.height} at ({disp.left}, {disp.top}) | {disp.refresh_hz} Hz |{" "}
                        {disp.scale_factor}x DPI
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Sticky Save Action Bar */}
      <div className="cc-card sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div role="status" aria-live="polite" className="text-sm font-medium text-[var(--tc-primary-ink)]">
          {savedNotice ? (
            <span className="inline-flex items-center gap-2 text-[var(--tc-success)]">
              <Check className="h-4 w-4" aria-hidden="true" />
              {savedNotice}
            </span>
          ) : (
            <span className="text-[var(--tc-ink-muted)]">
              One-tap presets save immediately. Manual adjustments apply when you save.
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)] disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>{saving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>
    </div>
  );
}
