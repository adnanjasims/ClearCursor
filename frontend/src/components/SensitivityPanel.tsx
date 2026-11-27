import { Check, Monitor, Plus, RotateCcw, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDisplays } from "../api/client";
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

type TuningTab = "everyday" | "shortcuts" | "advanced";

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
      className="flex min-h-[68px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--tc-surface-alt)]/60"
    >
      <div className="min-w-0">
        <span className="block text-[15.5px] font-medium text-[var(--tc-ink)]">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[14px] text-[var(--tc-ink-muted)]">{description}</span>
        )}
      </div>
      <span
        className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-[var(--tc-switch-on)]" : "bg-[var(--tc-switch-off)]"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
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
  const [activeTab, setActiveTab] = useState<TuningTab>("everyday");
  const [draft, setDraft] = useState<SettingsPayload>(settings);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
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
    <div className="space-y-8">
      {/* Editorial Top Banner */}
      <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <h2 className="text-[20px] font-semibold text-[var(--tc-ink)]">
            Tailor ClearCursor to Your Desk &amp; Routine
          </h2>
          <p className="text-[15.5px] leading-relaxed text-[var(--tc-ink-muted)]">
            Keep everyday settings simple, configure apps where smoothing pauses automatically, or fine-tune filter constants when you need deeper control.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--tc-border)] lg:col-span-5">
          <img
            src="/media/tuning-desk.webp"
            alt="Close-up of minimalist keyboard keys and ergonomic wireless mouse in soft daylight"
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      </section>

      {/* Clean 3-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--tc-border)] pb-4">
        <div role="tablist" aria-label="Tuning categories" className="flex flex-wrap gap-2">
          {[
            { id: "everyday" as const, label: "Everyday" },
            { id: "shortcuts" as const, label: "Shortcuts & Apps" },
            { id: "advanced" as const, label: "Advanced Tuning" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-11 rounded-xl px-4 text-[15px] font-medium transition-colors ${
                  active
                    ? "bg-[var(--tc-primary)] text-white"
                    : "bg-[var(--tc-surface)] text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={resetDefaults}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-[14.5px] font-medium text-[var(--tc-ink-muted)] hover:bg-[var(--tc-surface-alt)] hover:text-[var(--tc-ink)]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* Tab 1: Everyday Protection & Behavior */}
      {activeTab === "everyday" && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="cc-section-label">Pointer &amp; Click Protection</h3>
            <div className="cc-sheet divide-y divide-[var(--tc-border)] overflow-hidden">
              <SettingSwitchRow
                label="Button Magnetism (Gravity Wells)"
                description="Gently helps the pointer settle onto small toolbar buttons."
                checked={draft.gravity_wells}
                onToggle={() => updateField("gravity_wells", !draft.gravity_wells)}
              />
              <SettingSwitchRow
                label="Click-Freeze & Anti-Drag"
                description="Holds the cursor steady during a click to prevent accidental file drags."
                checked={draft.anti_drag}
                onToggle={() => updateField("anti_drag", !draft.anti_drag)}
              />
              <SettingSwitchRow
                label="Scroll Jitter Guard"
                description="Smooths jerky scroll-wheel and trackpad reversals."
                checked={draft.scroll_smoothing}
                onToggle={() => updateField("scroll_smoothing", !draft.scroll_smoothing)}
              />
              <SettingSwitchRow
                label="Right-Click Twitch Guard"
                description="Ignores stray right-clicks triggered while pressing the left button."
                checked={draft.right_click_guard}
                onToggle={() => updateField("right_click_guard", !draft.right_click_guard)}
              />
              <SettingSwitchRow
                label="Adaptive Tremor Ramping"
                description="Automatically adjusts smoothing strength based on live tremor intensity."
                checked={draft.adaptive_smoothing}
                onToggle={() => updateField("adaptive_smoothing", !draft.adaptive_smoothing)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="cc-section-label">App Behavior &amp; Optional Biomarkers</h3>
            <div className="cc-sheet divide-y divide-[var(--tc-border)] overflow-hidden">
              <SettingSwitchRow
                label="Keep Running in Tray on Window Close"
                description="Closing the window keeps ClearCursor quietly active in your menu bar or tray."
                checked={draft.minimize_to_tray}
                onToggle={() => updateField("minimize_to_tray", !draft.minimize_to_tray)}
              />
              <SettingSwitchRow
                label="Resume Stabilization on Launch"
                description="Automatically turn on system-wide smoothing when you open ClearCursor."
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
                className="flex min-h-[68px] w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--tc-surface-alt)]/60"
              >
                <div>
                  <span className="block text-[15.5px] font-medium text-[var(--tc-ink)]">
                    Gaze Input Source
                  </span>
                  <span className="mt-0.5 block text-[14px] text-[var(--tc-ink-muted)]">
                    Choose between head pose pointing and eye iris tracking.
                  </span>
                </div>
                <span className="rounded-lg bg-[var(--tc-surface-alt)] px-3.5 py-1.5 font-mono text-[14px] font-semibold uppercase text-[var(--tc-ink)]">
                  {draft.gaze_source}
                </span>
              </button>
              <SettingSwitchRow
                label="Opt-In Keyboard Timing Telemetry"
                description="Records anonymous key hold and flight intervals only. Never logs which keys are pressed."
                checked={Boolean(draft.keyboard_cadence_telemetry)}
                onToggle={() =>
                  updateField("keyboard_cadence_telemetry", !draft.keyboard_cadence_telemetry)
                }
              />
            </div>
          </section>
        </div>
      )}

      {/* Tab 2: Shortcuts & Per-App Exclusions */}
      {activeTab === "shortcuts" && (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="cc-section-label">Keyboard Modifiers &amp; Hotkey</h3>
            <div className="cc-sheet divide-y divide-[var(--tc-border)]">
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <label htmlFor="bypass-key-select" className="block text-[15.5px] font-medium text-[var(--tc-ink)]">
                    Hold-to-Bypass Key
                  </label>
                  <p className="text-[14px] text-[var(--tc-ink-muted)]">
                    Hold this key to pause smoothing temporarily for freehand drawing.
                  </p>
                </div>
                <select
                  id="bypass-key-select"
                  value={draft.bypass_key}
                  onChange={(e) => updateField("bypass_key", e.target.value as BypassKeyOption)}
                  className="min-h-12 w-[240px] rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface-alt)] px-3.5 text-[15px] font-medium text-[var(--tc-ink)]"
                >
                  {BYPASS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <label htmlFor="precision-key-select" className="block text-[15.5px] font-medium text-[var(--tc-ink)]">
                    Precision Slow-Mode Key
                  </label>
                  <p className="text-[14px] text-[var(--tc-ink-muted)]">
                    Hold to slow the pointer to 35% speed for very small controls.
                  </p>
                </div>
                <select
                  id="precision-key-select"
                  value={draft.precision_key}
                  onChange={(e) => updateField("precision_key", e.target.value as PrecisionKeyOption)}
                  className="min-h-12 w-[240px] rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface-alt)] px-3.5 text-[15px] font-medium text-[var(--tc-ink)]"
                >
                  {PRECISION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <label htmlFor="global-shortcut-input" className="block text-[15.5px] font-medium text-[var(--tc-ink)]">
                    Global Toggle Hotkey
                  </label>
                  <p className="text-[14px] text-[var(--tc-ink-muted)]">
                    Emergency Stop All is always bound to Cmd/Ctrl+Alt+Esc.
                  </p>
                </div>
                <input
                  id="global-shortcut-input"
                  type="text"
                  value={draft.global_shortcut}
                  onChange={(e) => updateField("global_shortcut", e.target.value)}
                  className="min-h-12 w-[240px] rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface-alt)] px-3.5 font-mono text-[14.5px] font-medium text-[var(--tc-ink)]"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="cc-section-label">Excluded Applications</h3>
            <p className="text-[14.5px] text-[var(--tc-ink-muted)]">
              ClearCursor pauses cursor filtering automatically whenever one of these apps is in front.
            </p>

            <div className="flex flex-wrap gap-2">
              {draft.excluded_apps.map((app) => (
                <span
                  key={app}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--tc-mint)] px-3.5 text-[14.5px] font-medium text-[var(--tc-primary-ink)]"
                >
                  <span>{app}</span>
                  <button
                    type="button"
                    aria-label={`Remove excluded app ${app}`}
                    onClick={() => removeExcludedApp(app)}
                    className="rounded-md p-1 hover:bg-[var(--tc-surface)]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              ))}
              {draft.excluded_apps.length === 0 && (
                <span className="text-[14.5px] text-[var(--tc-ink-muted)]">
                  No excluded apps added yet.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
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
                className="min-h-12 min-w-[260px] flex-1 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-4 text-[15px] text-[var(--tc-ink)]"
              />
              <button
                type="button"
                onClick={() => addExcludedApp(newAppInput)}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-5 text-[15px] font-semibold text-white hover:bg-[var(--tc-primary-hover)]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add App</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[14px] text-[var(--tc-ink-muted)]">Quick add:</span>
              {SUGGESTED_EXCLUDED_APPS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addExcludedApp(name)}
                  className="min-h-11 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-3.5 text-[14px] font-medium text-[var(--tc-ink)] hover:bg-[var(--tc-mint)]"
                >
                  + {name}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Tab 3: Advanced Filter Constants (Flat Divided Rows — Zero Nested Boxes) */}
      {activeTab === "advanced" && (
        <div className="space-y-6">
          <div className="cc-sheet divide-y divide-[var(--tc-border)] px-6">
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
          </div>

          {displaySummary && displaySummary.displays.length > 0 && (
            <section className="space-y-2 border-t border-[var(--tc-border)] pt-6">
              <div className="flex items-center gap-2 text-[14.5px] font-semibold text-[var(--tc-ink)]">
                <Monitor className="h-4 w-4 text-[var(--tc-ink-muted)]" aria-hidden="true" />
                <span>
                  Connected Displays ({displaySummary.displays.length})
                </span>
              </div>
              <ul className="divide-y divide-[var(--tc-border)] text-[14px]">
                {displaySummary.displays.map((disp, idx) => (
                  <li key={disp.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                    <span className="font-medium text-[var(--tc-ink)]">
                      Display {idx + 1} {disp.is_primary ? "(Primary)" : "(External)"}
                    </span>
                    <span className="font-mono tabular-nums text-[var(--tc-ink-muted)]">
                      {disp.width}x{disp.height} | {disp.refresh_hz} Hz | {disp.scale_factor}x DPI
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Save Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--tc-border)] pt-5">
        <div role="status" aria-live="polite" className="text-[14.5px] font-medium">
          {savedNotice ? (
            <span className="inline-flex items-center gap-2 text-[var(--tc-success)]">
              <Check className="h-4 w-4" aria-hidden="true" />
              {savedNotice}
            </span>
          ) : (
            <span className="text-[var(--tc-ink-muted)]">
              Save to apply your changes across the desktop engine.
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)] disabled:opacity-50"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>{saving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>
    </div>
  );
}
