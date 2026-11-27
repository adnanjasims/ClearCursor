import { useCallback, useEffect, useState } from "react";
import {
  fetchSettings,
  fetchSystemPermissions,
  promptSystemPermissions,
  saveSettings,
  stopGazeEmergency,
  toggleEngine,
} from "./api/client";
import {
  resolveApiBaseUrl,
  resolveTauriBackendToken,
  syncTauriTrayState,
  updateTauriGlobalShortcut,
} from "./api/runtime";
import { AppointmentPlayground } from "./components/AppointmentPlayground";
import { CalibrationWizard } from "./components/CalibrationWizard";
import { ControlDeck } from "./components/ControlDeck";
import { GazeCursorOverlay } from "./components/GazeCursorOverlay";
import { HomeOverview } from "./components/HomeOverview";
import { SensitivityPanel } from "./components/SensitivityPanel";
import { SessionHistory } from "./components/SessionHistory";
import {
  type AppView,
  type ThemeMode,
  TopBar,
  WorkspaceHeader,
} from "./components/TopBar";
import { WelcomePage } from "./components/WelcomePage";
import { useTelemetry } from "./hooks/useTelemetry";
import type {
  CalibrateResponse,
  EngineToggleRequest,
  SettingsPayload,
  SettingsUpdate,
  SystemPermissionsResponse,
} from "./types/telemetry";

const THEME_STORAGE_KEY = "clearcursor-theme";
const TUTORIAL_STORAGE_KEY = "clearcursor-tutorial-completed";
const VALID_VIEWS: AppView[] = [
  "welcome",
  "home",
  "deck",
  "playground",
  "sensitivity",
  "history",
];

function loadInitialView(): AppView {
  try {
    const param = new URLSearchParams(window.location.search).get("view");
    if (param && VALID_VIEWS.includes(param as AppView)) {
      return param as AppView;
    }
  } catch {
    // ignore URL parsing errors
  }
  return "welcome";
}

function loadInitialTheme(): ThemeMode {
  try {
    const param = new URLSearchParams(window.location.search).get("theme");
    if (param === "light" || param === "dark") {
      return param;
    }
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // ignore storage restriction
  }
  return "light";
}

function loadTutorialCompleted(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get("tutorial");
    if (param === "1") return false;
    if (param === "0") return true;
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

const DEFAULT_SETTINGS: SettingsPayload = {
  profile: "moderate",
  assistance_enabled: true,
  gaze_control: false,
  steady_hand: true,
  smart_interface: true,
  predictive_speech: false,
  blink_select: true,
  reduce_complexity: true,
  tremor_strength: 100,
  tremor_intensity: 55,
  one_euro_min_cutoff: 0.6,
  one_euro_beta: 0.004,
  adaptive_smoothing: true,
  simulate_tremor: false,
  anti_drag: true,
  anti_drag_threshold_px: 8.0,
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
  global_shortcut: "CommandOrControl+Shift+S",
  resume_stabilization_on_launch: false,
  minimize_to_tray: true,
  keyboard_cadence_telemetry: false,
  system_mouse: false,
  gaze_source: "head",
  gaze_dwell_ms: 1100,
  target_size_pct: 140,
  font_size_pct: 110,
  color_profile: "standard",
  letter_spacing_px: 0,
  tint_color: "warm",
  tint_opacity: 10,
  speech_rate: 160,
  screen_width: 1440,
  screen_height: 900,
};

export function App() {
  const [activeView, setActiveView] = useState<AppView>(loadInitialView);
  const [theme, setTheme] = useState<ThemeMode>(loadInitialTheme);
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean>(loadTutorialCompleted);
  const [replayingTutorial, setReplayingTutorial] = useState<boolean>(false);
  const [settings, setSettings] = useState<SettingsPayload>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [calibrating, setCalibrating] = useState<boolean>(false);
  const [permissions, setPermissions] = useState<SystemPermissionsResponse | null>(null);
  const [promptingPerm, setPromptingPerm] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const {
    frame,
    smoothedScore,
    smoothedTremorIndex,
    history,
    connectionState,
    errorMessage,
    reconnect,
  } = useTelemetry();

  const refreshPermissions = useCallback(async () => {
    try {
      const perms = await fetchSystemPermissions();
      setPermissions(perms);
    } catch {
      // Ignore if backend is offline; existing connection alert covers it.
    }
  }, []);

  const loadInitialSettings = useCallback(async () => {
    setLoadingSettings(true);
    setApiError(null);
    try {
      const loaded = await fetchSettings();
      setSettings(loaded);
      void refreshPermissions();
      void updateTauriGlobalShortcut(loaded.global_shortcut);
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Unable to load initial backend settings."
      );
    } finally {
      setLoadingSettings(false);
    }
  }, [refreshPermissions]);

  useEffect(() => {
    void loadInitialSettings();
  }, [loadInitialSettings]);

  useEffect(() => {
    if (!frame) {
      return;
    }
    const nextSteady = frame.active_modes.steady_hand;
    const nextGaze = frame.active_modes.gaze_control;
    const nextSim = frame.active_modes.simulate_tremor;
    const nextSys = frame.steadyhand.system_mouse_enabled;
    const nextAssist = frame.stabilization_active || nextGaze;

    setSettings((prev) => {
      if (
        prev.steady_hand === nextSteady &&
        prev.gaze_control === nextGaze &&
        prev.simulate_tremor === nextSim &&
        prev.system_mouse === nextSys &&
        prev.assistance_enabled === nextAssist &&
        prev.profile === frame.active_modes.profile
      ) {
        return prev;
      }
      return {
        ...prev,
        profile: frame.active_modes.profile,
        steady_hand: nextSteady,
        gaze_control: nextGaze,
        simulate_tremor: nextSim,
        system_mouse: nextSys,
        assistance_enabled: nextAssist,
      };
    });
  }, [frame]);

  useEffect(() => {
    const active = Boolean(settings.assistance_enabled && settings.steady_hand);
    const statusText = frame?.steadyhand.excluded_app_active
      ? `Status: Bypassed (${frame.steadyhand.excluded_app_active})`
      : frame?.steadyhand.bypass_active
        ? "Status: Bypass Key Held"
        : active
          ? `Status: Active (${settings.profile})`
          : "Status: Stabilization Paused";
    void syncTauriTrayState(active, statusText, settings.minimize_to_tray);
  }, [
    frame?.steadyhand.bypass_active,
    frame?.steadyhand.excluded_app_active,
    settings.assistance_enabled,
    settings.minimize_to_tray,
    settings.profile,
    settings.steady_hand,
  ]);

  const handleToggle = async (payload: EngineToggleRequest) => {
    setBusy(true);
    setApiError(null);
    try {
      const response = await toggleEngine(payload);
      setSettings(response.settings);
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Failed to toggle engine mode."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleEmergencyStopGaze = useCallback(async () => {
    setBusy(true);
    setApiError(null);
    try {
      const response = await stopGazeEmergency();
      setSettings(response.settings);
    } catch {
      // ignore offline errors on emergency stop
    } finally {
      setBusy(false);
    }
  }, []);

  const anyGazeActive = Boolean(settings.gaze_control || frame?.gaze.running);
  const stabilizationActive = Boolean(settings.assistance_enabled && settings.steady_hand);

  useEffect(() => {
    if (!anyGazeActive || calibrating) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void handleEmergencyStopGaze();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyGazeActive, calibrating, handleEmergencyStopGaze]);

  useEffect(() => {
    if (!anyGazeActive) {
      return;
    }
    const onPageHide = () => {
      void Promise.all([resolveApiBaseUrl(), resolveTauriBackendToken()]).then(
        ([base, token]) => {
          void fetch(`${base}/api/gaze/stop`, {
            method: "POST",
            keepalive: true,
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "X-ClearCursor-Token": token } : {}),
            },
            body: "{}",
          }).catch(() => undefined);
        }
      );
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [anyGazeActive]);

  const handleSaveSettings = async (updates: SettingsUpdate) => {
    setBusy(true);
    setApiError(null);
    try {
      const updated = await saveSettings(updates);
      setSettings(updated);
      if (updates.global_shortcut) {
        void updateTauriGlobalShortcut(updated.global_shortcut);
      }
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Failed to save settings."
      );
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteTutorial = () => {
    setTutorialCompleted(true);
    setReplayingTutorial(false);
    try {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    } catch {
      // ignore storage errors
    }
  };

  const handleCalibrationComplete = (_result: CalibrateResponse) => {
    void loadInitialSettings();
  };

  const handleStartStabilizing = async () => {
    if (!settings.steady_hand || !settings.assistance_enabled) {
      await handleToggle({ steady_hand: true, assistance_enabled: true });
    }
    setActiveView("deck");
  };

  const handlePermissionAction = async (openSettings: boolean) => {
    setPromptingPerm(true);
    try {
      const target =
        permissions && !permissions.accessibility_trusted
          ? "accessibility"
          : "input_monitoring";
      const updated = await promptSystemPermissions(target, openSettings);
      setPermissions(updated);
    } catch {
      // keep existing state
    } finally {
      setPromptingPerm(false);
    }
  };

  const bypassLabel = frame?.steadyhand.excluded_app_active
    ? `Bypassed in ${frame.steadyhand.excluded_app_active}`
    : frame?.steadyhand.bypass_active
      ? "Bypass Key Held"
      : frame?.steadyhand.precision_active
        ? "Precision Slow-Mode"
        : null;

  const lightingQuality = frame?.gaze.running ? frame.gaze.lighting_quality : "ok";
  const lightingMessage =
    lightingQuality === "low_light"
      ? "Low webcam lighting detected. Facing a soft lamp will further steady gaze tracking."
      : lightingQuality === "backlit"
      ? "Bright light behind you. Dimming a bright window behind you helps landmark stability."
      : lightingQuality === "overexposed"
      ? "Strong glare on your face detected. Tilting away from direct sunlight helps eye tracking."
      : null;

  const tutorialActive = !tutorialCompleted || replayingTutorial;
  const welcomeTitle = tutorialActive
    ? "Welcome to ClearCursor"
    : "Welcome back";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--tc-bg)] text-[var(--tc-ink)] md:flex-row">
      <TopBar
        activeView={activeView}
        onNavigate={setActiveView}
        onStartCalibration={() => setCalibrating(true)}
        connectionState={connectionState}
        onReconnect={reconnect}
        gazeActive={anyGazeActive}
        onStopGaze={() => void handleEmergencyStopGaze()}
        theme={theme}
        onChangeTheme={setTheme}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1060px] px-6 py-8 sm:px-10">
          <WorkspaceHeader
            activeView={activeView}
            titleOverride={activeView === "welcome" ? welcomeTitle : undefined}
            stabilizationActive={stabilizationActive}
            bypassLabel={bypassLabel}
            shortcutLabel={settings.global_shortcut}
            busy={busy}
            gazeActive={anyGazeActive}
            onToggleStabilization={() =>
              void handleToggle({
                steady_hand: !stabilizationActive,
                assistance_enabled: true,
              })
            }
            onStopGaze={() => void handleEmergencyStopGaze()}
            theme={theme}
            onChangeTheme={setTheme}
          />

          {permissions?.needs_prompt && (
            <div
              role="status"
              className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--tc-warn)]/30 bg-[var(--tc-warn-bg)] px-5 py-4 text-[var(--tc-warn)]"
            >
              <div className="space-y-1">
                <p className="text-[15.5px] font-semibold">System Pointer Permission Needed</p>
                <p className="text-[14px] text-[var(--tc-ink)]">
                  {permissions.message ??
                    "Grant Accessibility & Input Monitoring access for system-wide smoothing and button Magnetism."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={promptingPerm}
                  onClick={() => void handlePermissionAction(false)}
                  className="min-h-11 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-4 text-[14px] font-semibold text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)] disabled:opacity-50"
                >
                  Prompt Permission
                </button>
                <button
                  type="button"
                  disabled={promptingPerm}
                  onClick={() => void handlePermissionAction(true)}
                  className="min-h-11 rounded-xl bg-[var(--tc-primary)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--tc-primary-hover)] disabled:opacity-50"
                >
                  Open System Settings
                </button>
              </div>
            </div>
          )}

          {lightingMessage && (
            <div
              role="status"
              className="cc-sheet mb-6 px-5 py-3.5 text-[14.5px] text-[var(--tc-ink)]"
            >
              <span className="font-semibold text-[var(--tc-primary-ink)]">
                Camera Lighting:{" "}
              </span>
              {lightingMessage}
            </div>
          )}

          {(apiError || errorMessage) && (
            <div
              role="alert"
              className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--tc-alert)]/30 bg-[var(--tc-alert-bg)] px-5 py-4 text-[var(--tc-alert)]"
            >
              <p className="text-[14.5px] font-medium">{apiError ?? errorMessage}</p>
              <button
                type="button"
                onClick={() => {
                  setApiError(null);
                  reconnect();
                  void loadInitialSettings();
                }}
                className="min-h-11 rounded-xl bg-[var(--tc-alert)] px-4 text-[14px] font-semibold text-white hover:opacity-90"
              >
                Retry Connection
              </button>
            </div>
          )}

          {loadingSettings ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading workspace">
              <div className="cc-sheet h-40 animate-pulse p-6">
                <div className="h-5 w-48 rounded bg-[var(--tc-surface-alt)]" />
                <div className="mt-3 h-4 w-80 max-w-full rounded bg-[var(--tc-surface-alt)]" />
                <p className="mt-6 text-[14.5px] text-[var(--tc-ink-muted)]">
                  Connecting to ClearCursor backend...
                </p>
              </div>
            </div>
          ) : activeView === "welcome" ? (
            <WelcomePage
              isReturningUser={tutorialCompleted}
              tutorialActive={tutorialActive}
              stabilizationActive={stabilizationActive}
              activeProfile={settings.profile}
              onCompleteTutorial={handleCompleteTutorial}
              onReplayTutorial={() => setReplayingTutorial(true)}
              onApplyPreset={handleSaveSettings}
              onGoToSummary={() => setActiveView("home")}
              onGoToControlDeck={() => setActiveView("deck")}
              onGoToPlayground={() => setActiveView("playground")}
              onGoToClinicianReport={() => setActiveView("history")}
            />
          ) : activeView === "home" ? (
            <HomeOverview
              stabilizationActive={stabilizationActive}
              onStartStabilizing={() => void handleStartStabilizing()}
              onOpenPlayground={() => setActiveView("playground")}
              onOpenControlDeck={() => setActiveView("deck")}
              onOpenClinicianReport={() => setActiveView("history")}
              onApplyPreset={handleSaveSettings}
              activeProfile={settings.profile}
              frame={frame}
              stabilityScore={frame ? smoothedScore : null}
              busy={busy}
            />
          ) : activeView === "deck" ? (
            <ControlDeck
              settings={settings}
              frame={frame}
              smoothedScore={smoothedScore}
              smoothedTremorIndex={smoothedTremorIndex}
              history={history}
              connectionState={connectionState}
              toggling={busy}
              onToggle={handleToggle}
              onApplyPreset={handleSaveSettings}
              onStartCalibration={() => setCalibrating(true)}
            />
          ) : activeView === "playground" ? (
            <AppointmentPlayground
              settings={settings}
              toggling={busy}
              onToggle={handleToggle}
            />
          ) : activeView === "sensitivity" ? (
            <SensitivityPanel
              settings={settings}
              saving={busy}
              onSave={handleSaveSettings}
            />
          ) : (
            <SessionHistory />
          )}
        </div>
      </main>

      {calibrating && (
        <CalibrationWizard
          initialSource={settings.gaze_source}
          initialMode={settings.gaze_source === "head" ? "head_poses" : "5pt"}
          screenWidth={settings.screen_width}
          screenHeight={settings.screen_height}
          frame={frame}
          onClose={() => setCalibrating(false)}
          onCompleted={handleCalibrationComplete}
        />
      )}

      {!calibrating && <GazeCursorOverlay frame={frame} settings={settings} />}
    </div>
  );
}

export default App;
