export type GazeSource = "head" | "eyes";
export type BypassKeyOption = "none" | "alt" | "shift" | "ctrl" | "fn";
export type PrecisionKeyOption = "none" | "alt" | "shift" | "ctrl";
export type ClinicalEventType = "medication" | "symptom" | "flare" | "fatigue" | "note";

export interface SettingsPayload {
  profile: string;
  assistance_enabled: boolean;
  gaze_control: boolean;
  steady_hand: boolean;
  smart_interface: boolean;
  predictive_speech: boolean;
  blink_select: boolean;
  reduce_complexity: boolean;
  tremor_strength: number;
  tremor_intensity: number;
  one_euro_min_cutoff: number;
  one_euro_beta: number;
  adaptive_smoothing: boolean;
  simulate_tremor: boolean;
  anti_drag: boolean;
  anti_drag_threshold_px: number;
  anti_drag_hold_ms: number;
  click_freeze_ms: number;
  click_debounce_ms: number;
  right_click_guard: boolean;
  scroll_smoothing: boolean;
  gravity_wells: boolean;
  gravity_strength: number;
  bypass_key: BypassKeyOption;
  precision_key: PrecisionKeyOption;
  excluded_apps: string[];
  global_shortcut: string;
  resume_stabilization_on_launch: boolean;
  minimize_to_tray: boolean;
  keyboard_cadence_telemetry?: boolean;
  system_mouse: boolean;
  gaze_source: GazeSource;
  gaze_dwell_ms: number;
  target_size_pct: number;
  font_size_pct: number;
  color_profile: string;
  letter_spacing_px: number;
  tint_color: string;
  tint_opacity: number;
  speech_rate: number;
  screen_width: number;
  screen_height: number;
}

export type SettingsUpdate = Partial<SettingsPayload>;

export interface GazeTelemetry {
  x: number | null;
  y: number | null;
  raw_feature: [number, number] | null;
  ear: number | null;
  face_detected: boolean;
  dwell_progress: number;
  blink: boolean;
  source: GazeSource;
  status: string;
  calibrated: boolean;
  target_id: string | null;
  running: boolean;
  lighting_quality?: "ok" | "low_light" | "backlit" | "overexposed";
  luma?: number | null;
}

export interface SystemPermissionsResponse {
  platform: string;
  accessibility_trusted: boolean;
  input_monitoring_trusted: boolean;
  needs_prompt: boolean;
  message: string | null;
  settings_opened?: boolean;
}

export interface DisplayDescriptor {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  scale_factor: number;
  refresh_hz: number;
  is_primary: boolean;
}

export interface DisplaysResponse {
  virtual_rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  displays: DisplayDescriptor[];
}

export interface SteadyHandTelemetry {
  raw_pos: [number, number];
  stable_pos: [number, number];
  strength: number;
  simulate_tremor: boolean;
  tremor_intensity: number;
  spastic_drags_prevented: number;
  slip_clicks_rescued: number;
  double_clicks_blocked?: number;
  scroll_jitters_filtered?: number;
  click_freeze_active: boolean;
  gravity_well_active: boolean;
  gravity_target_role: string | null;
  bypass_active?: boolean;
  precision_active?: boolean;
  excluded_app_active?: string | null;
  os_tap_mode: string;
  os_tap_error: string | null;
  system_mouse_enabled: boolean;
}

export interface SteadyHandSampleSnapshot {
  running: boolean;
  stabilization_active: boolean;
  strength: number;
  simulate_tremor: boolean;
  tremor_intensity: number;
  tremor_hz: number | null;
  tremor_index: number;
  resting_band_pct?: number;
  action_band_pct?: number;
  rms_amplitude_px?: number;
  rms_amplitude_mm?: number;
  tremor_severity?: "minimal" | "mild" | "moderate" | "elevated";
  medication_state_estimate: "ON" | "OFF" | null;
  stability_score: number;
  raw_pos: [number, number];
  stable_pos: [number, number];
  spastic_drags_prevented: number;
  slip_clicks_rescued: number;
  double_clicks_blocked?: number;
  scroll_jitters_filtered?: number;
}

export interface ActiveModes {
  profile: string;
  assistance_enabled: boolean;
  steady_hand: boolean;
  gaze_control: boolean;
  smart_interface: boolean;
  predictive_speech: boolean;
  simulate_tremor: boolean;
}

export interface TelemetryFrame {
  timestamp: number;
  session_id: string;
  tremor_hz: number | null;
  tremor_index: number;
  resting_band_pct?: number;
  action_band_pct?: number;
  rms_amplitude_px?: number;
  rms_amplitude_mm?: number;
  tremor_severity?: "minimal" | "mild" | "moderate" | "elevated";
  stabilization_active: boolean;
  stability_score: number;
  medication_state_estimate: "ON" | "OFF" | null;
  gaze: GazeTelemetry;
  steadyhand: SteadyHandTelemetry;
  active_modes: ActiveModes;
}

export interface EngineToggleRequest {
  assistance_enabled?: boolean;
  steady_hand?: boolean;
  gaze_control?: boolean;
  simulate_tremor?: boolean;
  system_mouse?: boolean;
  camera?: boolean;
  camera_index?: number;
}

export interface EngineToggleResponse {
  settings: SettingsPayload;
  camera_running: boolean;
  steadyhand_running: boolean;
}

export interface CalibrateRequest {
  mode: "dots" | "head";
  source: GazeSource;
  profile_name: string;
  features?: [number, number][];
  targets?: [number, number][];
  poses?: Record<string, [number, number]>;
  open_ears?: number[];
}

export interface CalibrateResponse {
  profile_id: number;
  source: string;
  error_px: number;
  calibrated: boolean;
}

export interface SessionSummary {
  session_id: string;
  started_at: number;
  ended_at: number;
  sample_count: number;
  avg_stability_score: number;
  avg_tremor_index: number;
  avg_resting_band_pct?: number;
  avg_action_band_pct?: number;
  avg_rms_amplitude_px?: number;
  avg_rms_amplitude_mm?: number;
  avg_tremor_hz: number | null;
  had_stabilization: boolean;
  click_rescues?: number;
  drags_prevented?: number;
  bounces_blocked?: number;
  simulated_only?: boolean;
}

export interface DailyTrendPoint {
  date: string;
  sample_count: number;
  session_count: number;
  avg_stability_score: number;
  avg_tremor_index: number;
  avg_resting_band_pct?: number;
  avg_action_band_pct?: number;
  avg_rms_amplitude_px?: number;
  avg_rms_amplitude_mm?: number;
  avg_tremor_hz: number | null;
}

export interface HourlyProfilePoint {
  hour: number;
  label: string;
  sample_count: number;
  active_minutes?: number;
  has_data?: boolean;
  avg_stability_score: number | null;
  avg_tremor_index: number | null;
  avg_resting_band_pct: number | null;
  avg_action_band_pct: number | null;
  avg_rms_amplitude_mm: number | null;
}

export interface CoverageSummary {
  telemetry_scope: string;
  scope_description: string;
  window_days: number;
  active_days: number;
  active_hours_of_day: number;
  total_active_minutes: number;
  checkin_count: number;
  keyboard_cadence_windows: number;
}

export type MotorCheckinContext =
  | "routine"
  | "baseline"
  | "pre_medication"
  | "post_medication"
  | "flare";

export interface MotorCheckinRecord {
  id: number;
  session_id: string;
  timestamp: number;
  context_tag: MotorCheckinContext | string;
  duration_sec: number;
  overall_score: number;
  hold_stability_score: number;
  hold_rms_px: number;
  hold_rms_mm: number;
  hold_dominant_hz: number | null;
  hold_resting_band_pct: number;
  hold_action_band_pct: number;
  hold_tremor_index: number;
  tap_count: number;
  tap_accuracy_pct: number | null;
  tap_mean_error_px: number | null;
  tap_mean_reaction_ms: number | null;
  notes: string;
}

export interface MotorCheckinCreateRequest {
  hold_samples: { x: number; y: number; t: number }[];
  target_x: number;
  target_y: number;
  taps: {
    target_x: number;
    target_y: number;
    click_x: number;
    click_y: number;
    reaction_ms?: number | null;
  }[];
  tap_hit_radius_px?: number;
  context_tag?: MotorCheckinContext;
  notes?: string;
}

export interface KeyboardCadenceSummary {
  window_count: number;
  total_keystrokes: number;
  avg_hold_ms: number;
  avg_flight_ms: number;
  avg_cadence_kpm: number;
  avg_regularity_score: number;
}

export interface KeyboardCadenceWindow {
  id: number;
  session_id: string;
  timestamp: number;
  sample_count: number;
  mean_hold_ms: number;
  std_hold_ms: number;
  mean_flight_ms: number;
  std_flight_ms: number;
  typing_cadence_kpm: number;
  rhythm_regularity_score: number;
}

export interface FunctionalSummary {
  total_samples: number;
  total_sessions: number;
  total_click_rescues: number;
  total_drags_prevented: number;
  total_bounces_blocked: number;
  avg_rms_amplitude_mm: number;
  avg_resting_band_pct: number;
  avg_action_band_pct: number;
}

export interface ClinicalEventRecord {
  id: number;
  timestamp: number;
  event_type: ClinicalEventType;
  label: string;
  dosage: string;
  severity: number | null;
  notes: string;
}

export interface ClinicalEventCreateRequest {
  event_type: ClinicalEventType;
  label: string;
  timestamp?: number;
  dosage?: string;
  severity?: number | null;
  notes?: string;
}

export interface CalibrationProfileSummary {
  id: number;
  name: string;
  source: string;
  error_px: number;
  is_active: boolean;
  created_at: number;
}

export interface SessionsResponse {
  active_session_id: string;
  sessions: SessionSummary[];
  daily_trends: DailyTrendPoint[];
  hourly_profile?: HourlyProfilePoint[];
  hourly_grid?: HourlyProfilePoint[];
  coverage_summary?: CoverageSummary;
  functional_summary?: FunctionalSummary;
  clinical_events?: ClinicalEventRecord[];
  motor_checkins?: MotorCheckinRecord[];
  keyboard_cadence_summary?: KeyboardCadenceSummary;
  keyboard_cadence_windows?: KeyboardCadenceWindow[];
  simulated_sample_count?: number;
  calibration_profiles: CalibrationProfileSummary[];
}

export interface HealthResponse {
  status: string;
  app?: string;
  edition?: string;
  session_id: string;
  steadyhand_running: boolean;
  gaze_running: boolean;
  calibrated: boolean;
}
