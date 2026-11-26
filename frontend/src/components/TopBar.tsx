import {
  Activity,
  Crosshair,
  History,
  Home,
  Moon,
  Pause,
  Play,
  SlidersHorizontal,
  Square,
  Sun,
  Target,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ConnectionState } from "../hooks/useTelemetry";
import { BrandLogo } from "./BrandLogo";

export type AppView = "home" | "deck" | "playground" | "sensitivity" | "history";
export type ThemeMode = "light" | "dark";

export const VIEW_TITLES: Record<AppView, string> = {
  home: "Summary",
  deck: "Control Deck",
  playground: "Sandbox Lab",
  sensitivity: "Tuning & Preferences",
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
  { id: "home", label: "Home", icon: Home },
  { id: "deck", label: "Control Deck", icon: Activity },
  { id: "playground", label: "Sandbox Lab", icon: Target },
  { id: "sensitivity", label: "Tuning", icon: SlidersHorizontal },
  { id: "history", label: "Clinician Report", icon: History },
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
      ? "Engine Connected"
      : connectionState === "reconnecting"
      ? "Reconnecting..."
      : connectionState === "connecting"
      ? "Connecting..."
      : "Engine Offline";

  return (
    <aside
      aria-label="Application navigation"
      className="flex w-full shrink-0 flex-col border-b border-[var(--tc-border)] bg-[var(--tc-sidebar)] text-[var(--tc-ink)] md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-b-0"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <BrandLogo className="h-9 w-9 shrink-0 rounded-xl shadow-xs" />
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-[var(--tc-ink)]">
            ClearCursor
          </h1>
          <p className="truncate text-xs text-[var(--tc-ink-muted)]">
            Assistive Desktop
          </p>
        </div>
      </div>

      {/* Primary Sidebar Navigation */}
      <nav
        aria-label="Primary sections"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-x-visible md:py-2"
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
              className={`inline-flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors md:w-full ${
                selected
                  ? "bg-[var(--tc-mint)] font-semibold text-[var(--tc-primary-ink)]"
                  : "text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  selected ? "text-[var(--tc-primary-ink)]" : "text-[var(--tc-ink-muted)]"
                }`}
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Native Utility Dock */}
      <div className="hidden flex-col gap-2.5 border-t border-[var(--tc-border)] p-3.5 md:flex">
        <button
          type="button"
          onClick={onStartCalibration}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--tc-border)] bg-[var(--tc-surface)] px-3.5 text-sm font-medium text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)]"
        >
          <Crosshair className="h-4 w-4 shrink-0 text-[var(--tc-primary-ink)]" aria-hidden="true" />
          <span>Guided Calibration</span>
        </button>

        {onChangeTheme && (
          <div
            role="group"
            aria-label="Appearance theme"
            className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--tc-surface-alt)] p-1"
          >
            <button
              type="button"
              aria-pressed={theme === "light"}
              onClick={() => onChangeTheme("light")}
              className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${
                theme === "light"
                  ? "bg-[var(--tc-surface)] text-[var(--tc-ink)] shadow-xs"
                  : "text-[var(--tc-ink-muted)] hover:text-[var(--tc-ink)]"
              }`}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Light</span>
            </button>
            <button
              type="button"
              aria-pressed={theme === "dark"}
              onClick={() => onChangeTheme("dark")}
              className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${
                theme === "dark"
                  ? "bg-[var(--tc-surface)] text-[var(--tc-ink)] shadow-xs"
                  : "text-[var(--tc-ink-muted)] hover:text-[var(--tc-ink)]"
              }`}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Dark</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onReconnect}
          title="Click to reconnect telemetry stream"
          aria-label={`WebSocket status: ${statusLabel}. Click to reconnect.`}
          className={`inline-flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-medium transition-colors ${
            isConnected
              ? "bg-[var(--tc-success-bg)] text-[var(--tc-success)]"
              : "bg-[var(--tc-alert-bg)] text-[var(--tc-alert)]"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-[var(--tc-success)]" : "bg-[var(--tc-alert)]"
              }`}
              aria-hidden="true"
            />
            <span>{statusLabel}</span>
          </span>
          {isConnected ? (
            <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
}

interface WorkspaceHeaderProps {
  activeView: AppView;
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
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-[var(--tc-border)] bg-[var(--tc-bg)]/95 px-6 py-3 backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <h2 className="truncate text-lg font-semibold tracking-tight text-[var(--tc-ink)]">
          {VIEW_TITLES[activeView]}
        </h2>
        {bypassLabel && (
          <span className="rounded-full bg-[var(--tc-warn-bg)] px-2.5 py-1 text-xs font-medium text-[var(--tc-warn)]">
            {bypassLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {gazeActive && (
          <button
            type="button"
            onClick={onStopGaze}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--tc-alert)] px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            stabilizationActive
              ? "border-[var(--tc-border)] bg-[var(--tc-surface)] text-[var(--tc-ink)] hover:bg-[var(--tc-surface-alt)]"
              : "border-transparent bg-[var(--tc-primary)] text-white hover:bg-[var(--tc-primary-hover)]"
          }`}
        >
          {stabilizationActive ? (
            <>
              <span className="h-2 w-2 rounded-full bg-[var(--tc-success)]" aria-hidden="true" />
              <span>Stabilizing</span>
              <Pause className="h-3.5 w-3.5 text-[var(--tc-ink-muted)]" aria-hidden="true" />
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>Paused</span>
            </>
          )}
        </button>

        {/* Compact theme toggle for narrow viewports where sidebar footer is hidden */}
        <button
          type="button"
          onClick={() => onChangeTheme(theme === "light" ? "dark" : "light")}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--tc-border)] bg-[var(--tc-surface)] text-[var(--tc-ink)] md:hidden"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sun className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
