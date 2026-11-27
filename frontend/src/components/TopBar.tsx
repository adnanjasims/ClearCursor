import {
  Activity,
  Compass,
  Crosshair,
  FileBarChart2,
  Home,
  Moon,
  SlidersHorizontal,
  Square,
  Sun,
  Target,
} from "lucide-react";
import type { ConnectionState } from "../hooks/useTelemetry";
import { BrandLogo } from "./BrandLogo";

export type AppView = "welcome" | "home" | "deck" | "playground" | "sensitivity" | "history";
export type ThemeMode = "light" | "dark";

export const VIEW_TITLES: Record<AppView, string> = {
  welcome: "Welcome",
  home: "Summary",
  deck: "Control Deck",
  playground: "Sandbox Lab",
  sensitivity: "Tuning",
  history: "Clinician Report",
};

interface TopBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onStartCalibration: () => void;
  connectionState: ConnectionState;
  onReconnect: () => void;
  gazeActive?: boolean;
  onStopGaze?: () => void;
  theme?: ThemeMode;
  onChangeTheme?: (next: ThemeMode) => void;
}

const NAV_ITEMS: { id: AppView; label: string; icon: typeof Activity }[] = [
  { id: "welcome", label: "Welcome", icon: Compass },
  { id: "home", label: "Summary", icon: Home },
  { id: "deck", label: "Control Deck", icon: Activity },
  { id: "playground", label: "Sandbox Lab", icon: Target },
  { id: "sensitivity", label: "Tuning", icon: SlidersHorizontal },
  { id: "history", label: "Clinician Report", icon: FileBarChart2 },
];

export function TopBar({
  activeView,
  onNavigate,
  onStartCalibration,
  connectionState,
  onReconnect,
  theme = "light",
  onChangeTheme,
}: TopBarProps) {
  const isConnected = connectionState === "connected";
  const statusLabel =
    connectionState === "connected"
      ? "Connected"
      : connectionState === "reconnecting"
      ? "Reconnecting"
      : connectionState === "connecting"
      ? "Connecting"
      : "Offline";

  return (
    <aside
      aria-label="Application navigation"
      className="flex w-full shrink-0 flex-col border-b border-[var(--tc-border)] bg-[var(--tc-sidebar)] text-[var(--tc-ink)] select-none md:sticky md:top-0 md:h-screen md:w-[248px] md:border-r md:border-b-0"
    >
      {/* App Identity */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <BrandLogo className="h-8 w-8 shrink-0 rounded-lg" />
        <span className="truncate text-[16px] font-semibold tracking-[-0.015em] text-[var(--tc-ink)]">
          ClearCursor
        </span>
      </div>

      {/* Primary Sidebar List — generous 44px tremor-friendly targets */}
      <nav
        aria-label="Primary sections"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:gap-1 md:overflow-x-visible md:py-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const selected = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-[15px] transition-colors md:w-full ${
                selected
                  ? "bg-[var(--tc-sidebar-active)] font-semibold text-[var(--tc-ink)]"
                  : "font-medium text-[var(--tc-ink-muted)] hover:bg-[var(--tc-sidebar-hover)] hover:text-[var(--tc-ink)]"
              }`}
            >
              <Icon
                strokeWidth={selected ? 2 : 1.75}
                className={`h-[18px] w-[18px] shrink-0 ${
                  selected ? "text-[var(--tc-primary)]" : "text-[var(--tc-ink-muted)]"
                }`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="my-2.5 hidden border-t border-[var(--tc-border)] md:block" />

        <button
          type="button"
          onClick={onStartCalibration}
          className="hidden min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium text-[var(--tc-ink-muted)] transition-colors hover:bg-[var(--tc-sidebar-hover)] hover:text-[var(--tc-ink)] md:inline-flex"
        >
          <Crosshair strokeWidth={1.75} className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <span>Guided Calibration</span>
        </button>
      </nav>

      {/* Comfortable Native Footer */}
      <div className="hidden flex-col gap-2.5 border-t border-[var(--tc-border)] p-3.5 md:flex">
        {onChangeTheme && (
          <div
            role="group"
            aria-label="Appearance theme"
            className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--tc-sidebar-hover)] p-1"
          >
            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => onChangeTheme("light")}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-[14px] font-medium transition-colors ${
                theme === "light"
                  ? "bg-[var(--tc-surface)] text-[var(--tc-ink)] shadow-xs"
                  : "text-[var(--tc-ink-muted)] hover:text-[var(--tc-ink)]"
              }`}
            >
              <Sun className="h-4 w-4" aria-hidden="true" />
              <span>Light</span>
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => onChangeTheme("dark")}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-[14px] font-medium transition-colors ${
                theme === "dark"
                  ? "bg-[var(--tc-surface)] text-[var(--tc-ink)] shadow-xs"
                  : "text-[var(--tc-ink-muted)] hover:text-[var(--tc-ink)]"
              }`}
            >
              <Moon className="h-4 w-4" aria-hidden="true" />
              <span>Dark</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onReconnect}
          title="Click to reconnect telemetry stream"
          aria-label={`Engine status: ${statusLabel}. Click to reconnect.`}
          className="inline-flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-[14px] font-medium text-[var(--tc-ink-muted)] transition-colors hover:bg-[var(--tc-sidebar-hover)] hover:text-[var(--tc-ink)]"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isConnected ? "bg-[var(--tc-switch-on)]" : "bg-[var(--tc-alert)]"
            }`}
            aria-hidden="true"
          />
          <span>{statusLabel}</span>
        </button>
      </div>
    </aside>
  );
}

interface WorkspaceHeaderProps {
  activeView: AppView;
  titleOverride?: string;
  stabilizationActive: boolean;
  bypassLabel?: string | null;
  shortcutLabel: string;
  busy: boolean;
  gazeActive: boolean;
  onToggleStabilization: () => void;
  onStopGaze: () => void;
  theme: ThemeMode;
  onChangeTheme: (next: ThemeMode) => void;
}

export function WorkspaceHeader({
  activeView,
  titleOverride,
  stabilizationActive,
  bypassLabel,
  shortcutLabel,
  busy,
  gazeActive,
  onToggleStabilization,
  onStopGaze,
  theme,
  onChangeTheme,
}: WorkspaceHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-6">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-[30px] font-semibold tracking-[-0.025em] text-[var(--tc-ink)]">
          {titleOverride ?? VIEW_TITLES[activeView]}
        </h1>
        {bypassLabel && (
          <span className="rounded-lg bg-[var(--tc-warn-bg)] px-2.5 py-1 text-[13.5px] font-medium text-[var(--tc-warn)]">
            {bypassLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {gazeActive && (
          <button
            type="button"
            onClick={onStopGaze}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--tc-alert)] px-4 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span>Stop Gaze (Esc)</span>
          </button>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={onToggleStabilization}
          aria-pressed={stabilizationActive}
          title={`Toggle stabilization (${shortcutLabel})`}
          className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-[var(--tc-border)] bg-[var(--tc-surface)] px-4 text-[15px] font-medium text-[var(--tc-ink)] shadow-[var(--tc-shadow)] transition-colors hover:bg-[var(--tc-surface-alt)] disabled:opacity-50"
        >
          <span>{stabilizationActive ? "Stabilizing" : "Paused"}</span>
          <span
            className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${
              stabilizationActive ? "bg-[var(--tc-switch-on)]" : "bg-[var(--tc-switch-off)]"
            }`}
            aria-hidden="true"
          >
            <span
              className={`h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                stabilizationActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTheme(theme === "light" ? "dark" : "light")}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--tc-border)] bg-[var(--tc-surface)] text-[var(--tc-ink)] md:hidden"
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Sun className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
