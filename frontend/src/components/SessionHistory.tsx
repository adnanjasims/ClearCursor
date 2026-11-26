import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Clock,
  FileDown,
  FileSpreadsheet,
  Info,
  Keyboard,
  Pill,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createClinicalEvent,
  deleteClinicalEvent,
  deleteMotorCheckin,
  fetchSessions,
} from "../api/client";
import type { ClinicalEventType, HourlyProfilePoint, SessionsResponse } from "../types/telemetry";
import { MotorCheckinCard } from "./MotorCheckinCard";

function formatStabilityBand(score: number): string {
  if (score >= 85) {
    return "Optimal Steadiness (85-100)";
  }
  if (score >= 65) {
    return "Moderate Tremor Burden (65-84)";
  }
  return "Elevated Tremor Burden (<65)";
}

function formatFrequencyClinicalNote(hz: number | null): string {
  if (hz === null) {
    return "No sustained 4-12 Hz oscillation detected";
  }
  if (hz >= 4.0 && hz < 6.0) {
    return `${hz.toFixed(2)} Hz (4-6 Hz resting tremor band)`;
  }
  if (hz >= 6.0 && hz <= 12.0) {
    return `${hz.toFixed(2)} Hz (6-12 Hz action / postural band)`;
  }
  return `${hz.toFixed(2)} Hz (Outside 4-12 Hz primary band)`;
}

const DATE_WINDOWS = [
  { days: 7, label: "7 Days" },
  { days: 14, label: "14 Days" },
  { days: 30, label: "30 Days" },
  { days: 90, label: "90 Days" },
];

export function SessionHistory() {
  const [days, setDays] = useState<number>(14);
  const [includeSimulated, setIncludeSimulated] = useState<boolean>(false);
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Clinical Event Diary state
  const [eventType, setEventType] = useState<ClinicalEventType>("medication");
  const [eventLabel, setEventLabel] = useState<string>("");
  const [eventDosage, setEventDosage] = useState<string>("");
  const [eventSeverity, setEventSeverity] = useState<string>("");
  const [eventNotes, setEventNotes] = useState<string>("");
  const [savingEvent, setSavingEvent] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSessions(days, 50, includeSimulated);
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load SQLite session history."
      );
    } finally {
      setLoading(false);
    }
  }, [days, includeSimulated]);

  useEffect(() => {
    void load();
  }, [load]);

  const trends = data?.daily_trends ?? [];
  const sessions = data?.sessions ?? [];
  const hourly = data?.hourly_profile ?? [];
  const events = data?.clinical_events ?? [];
  const checkins = data?.motor_checkins ?? [];
  const cadenceSummary = data?.keyboard_cadence_summary;
  const coverage = data?.coverage_summary;
  const calibrations = data?.calibration_profiles ?? [];
  const functional = data?.functional_summary;
  const simulatedCount = data?.simulated_sample_count ?? 0;

  // Build full 24-hour diurnal grid so inactive hours stay explicitly empty rather than interpolated
  const diurnalGrid: HourlyProfilePoint[] =
    data?.hourly_grid && data.hourly_grid.length === 24
      ? data.hourly_grid
      : Array.from({ length: 24 }, (_, hour) => {
          const match = hourly.find((h) => h.hour === hour);
          if (match) {
            return { ...match, has_data: true };
          }
          return {
            hour,
            label: `${String(hour).padStart(2, "0")}:00`,
            sample_count: 0,
            active_minutes: 0,
            has_data: false,
            avg_stability_score: null,
            avg_tremor_index: null,
            avg_resting_band_pct: null,
            avg_action_band_pct: null,
            avg_rms_amplitude_mm: null,
          };
        });

  const totalSamples = sessions.reduce((acc, s) => acc + s.sample_count, 0);
  const meanStability =
    sessions.length > 0
      ? sessions.reduce((acc, s) => acc + s.avg_stability_score, 0) / sessions.length
      : 0;
  const meanTremorIdx =
    sessions.length > 0
      ? sessions.reduce((acc, s) => acc + s.avg_tremor_index, 0) / sessions.length
      : 0;
  const meanRestingPct = functional?.avg_resting_band_pct ?? 0;
  const meanActionPct = functional?.avg_action_band_pct ?? 0;
  const meanRmsMm = functional?.avg_rms_amplitude_mm ?? 0;
  const hzSessions = sessions.filter((s) => s.avg_tremor_hz !== null);
  const meanHz =
    hzSessions.length > 0
      ? hzSessions.reduce((acc, s) => acc + (s.avg_tremor_hz ?? 0), 0) / hzSessions.length
      : null;

  const handleQuickEvent = async (
    type: ClinicalEventType,
    label: string,
    severity?: number
  ) => {
    setSavingEvent(true);
    try {
      await createClinicalEvent({
        event_type: type,
        label,
        severity: severity ?? null,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save diary entry.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventLabel.trim()) {
      return;
    }
    setSavingEvent(true);
    try {
      await createClinicalEvent({
        event_type: eventType,
        label: eventLabel.trim(),
        dosage: eventDosage.trim(),
        severity: eventSeverity ? Number(eventSeverity) : null,
        notes: eventNotes.trim(),
      });
      setEventLabel("");
      setEventDosage("");
      setEventSeverity("");
      setEventNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save diary entry.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      await deleteClinicalEvent(eventId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete diary entry.");
    }
  };

  const handleDeleteCheckin = async (checkinId: number) => {
    try {
      await deleteMotorCheckin(checkinId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete motor check-in.");
    }
  };

  const exportClinicianPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
    const nowLabel = new Date().toLocaleString();

    const getNextY = (fallback: number, minSpaceNeeded = 96): number => {
      const current = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
      if (current + minSpaceNeeded > 740) {
        doc.addPage();
        return 48;
      }
      return current + 24;
    };

    doc.setFontSize(18);
    doc.setTextColor(15, 45, 89);
    doc.text("ClearCursor Clinician Motor Telemetry Report", 40, 46);

    doc.setFontSize(10);
    doc.setTextColor(66, 82, 110);
    doc.text(
      `Generated: ${nowLabel}   |   Window: Last ${days} Days   |   Source: ${includeSimulated ? "Includes Simulated Demos" : "Real Usage Only"}`,
      40,
      64
    );
    doc.setFontSize(8.5);
    doc.text(
      "Assistive Wellness Telemetry Disclaimer: Metrics reflect cursor displacement spectra and click-protection counts to support clinical discussion; not a standalone medical diagnostic device.",
      40,
      78,
      { maxWidth: 532 }
    );

    // Executive Summary Table
    autoTable(doc, {
      startY: 96,
      head: [["Clinical Summary Metric", "Observed Value", "Interpretation"]],
      body: [
        [
          "Recorded Motor Sessions",
          `${sessions.length} sessions (${totalSamples} FFT windows)`,
          "Each window summarizes 2.5-4s of active pointer displacement spectral density.",
        ],
        [
          "Overall Mean Stability Score",
          `${meanStability.toFixed(1)} / 100`,
          formatStabilityBand(meanStability),
        ],
        [
          "Mean RMS Tremor Amplitude",
          `${meanRmsMm.toFixed(2)} mm`,
          "4-12 Hz bandpassed RMS displacement calibrated by active display DPI.",
        ],
        [
          "Multi-Band Tremor Power (4-12 Hz)",
          `${meanTremorIdx.toFixed(1)}% total (4-6 Hz: ${meanRestingPct.toFixed(1)}% | 6-12 Hz: ${meanActionPct.toFixed(1)}%)`,
          "Separates lower-frequency resting band (4-6 Hz) from action/essential tremor band (6-12 Hz).",
        ],
        [
          "Mean Dominant Tremor Frequency",
          meanHz !== null ? `${meanHz.toFixed(2)} Hz` : "None detected",
          formatFrequencyClinicalNote(meanHz),
        ],
        [
          "Everyday Functional Protections",
          `${functional?.total_click_rescues ?? 0} slip-clicks rescued, ${functional?.total_drags_prevented ?? 0} drags blocked, ${functional?.total_bounces_blocked ?? 0} bounces prevented`,
          "Objective counts of involuntary tremor actions intercepted before hitting OS controls.",
        ],
      ],
      headStyles: { fillColor: [15, 45, 89], textColor: [255, 255, 255] },
      styles: { fontSize: 8.5, cellPadding: 5 },
    });

    // Embedded Vector Charts (when running with full jsPDF canvas vector primitives)
    const rawDoc = doc as unknown as {
      rect?: (x: number, y: number, w: number, h: number, style?: string) => void;
      line?: (x1: number, y1: number, x2: number, y2: number) => void;
      setDrawColor?: (r: number, g: number, b: number) => void;
      setFillColor?: (r: number, g: number, b: number) => void;
      setLineWidth?: (w: number) => void;
    };
    const hasVectorApi =
      typeof rawDoc.rect === "function" &&
      typeof rawDoc.line === "function" &&
      typeof rawDoc.setDrawColor === "function" &&
      typeof rawDoc.setFillColor === "function";

    let cursorY = getNextY(290, 150);
    if (hasVectorApi && (trends.length > 0 || hourly.length > 0)) {
      doc.setFontSize(12);
      doc.setTextColor(15, 45, 89);
      doc.text("Visual Longitudinal & Diurnal Telemetry Charts", 40, cursorY);

      const chartTop = cursorY + 10;
      const chartH = 92;
      const leftChartX = 40;
      const chartW = 250;
      const rightChartX = 322;

      // Left Chart: Daily Stability Score (0-100)
      rawDoc.setDrawColor!(203, 213, 225);
      rawDoc.setFillColor!(248, 250, 252);
      rawDoc.rect!(leftChartX, chartTop, chartW, chartH, "FD");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 45, 89);
      doc.text("Daily Stability Score (0-100)", leftChartX + 8, chartTop + 13);

      if (trends.length >= 1) {
        const plotX = leftChartX + 14;
        const plotY = chartTop + 22;
        const plotW = chartW - 28;
        const plotH = chartH - 34;
        rawDoc.setDrawColor!(29, 78, 216);
        rawDoc.setLineWidth?.(1.6);
        const pts = trends.map((t, idx) => {
          const px = trends.length === 1 ? plotX + plotW / 2 : plotX + (idx / (trends.length - 1)) * plotW;
          const py = plotY + plotH - (Math.max(0, Math.min(100, t.avg_stability_score)) / 100) * plotH;
          return [px, py] as const;
        });
        for (let i = 1; i < pts.length; i += 1) {
          rawDoc.line!(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
        }
        rawDoc.setFillColor!(29, 78, 216);
        for (const [px, py] of pts) {
          rawDoc.rect!(px - 2, py - 2, 4, 4, "F");
        }
      }

      // Right Chart: Time-of-Day Diurnal Tremor Index (%)
      rawDoc.setDrawColor!(203, 213, 225);
      rawDoc.setFillColor!(248, 250, 252);
      rawDoc.rect!(rightChartX, chartTop, chartW, chartH, "FD");
      doc.setFontSize(8.5);
      doc.setTextColor(159, 18, 57);
      doc.text("Time-of-Day 4-12 Hz Tremor Power (%)", rightChartX + 8, chartTop + 13);

      if (hourly.length >= 1) {
        const plotX = rightChartX + 12;
        const plotY = chartTop + 22;
        const plotW = chartW - 24;
        const plotH = chartH - 34;
        const barW = Math.max(4, Math.min(14, plotW / 24 - 1));
        rawDoc.setFillColor!(159, 18, 57);
        for (const h of hourly) {
          const bx = plotX + (h.hour / 23) * (plotW - barW);
          const bh = (Math.max(0, Math.min(100, h.avg_tremor_index ?? 0)) / 100) * plotH;
          rawDoc.rect!(bx, plotY + plotH - bh, barW, bh, "F");
        }
      }
      cursorY = chartTop + chartH + 24;
    }

    // How to Read This Data Guide
    if (cursorY + 130 > 740) {
      doc.addPage();
      cursorY = 48;
    }
    doc.setFontSize(13);
    doc.setTextColor(15, 45, 89);
    doc.text("How to Read This Clinical Motor Report", 40, cursorY);

    autoTable(doc, {
      startY: cursorY + 8,
      head: [["Column / Term", "Clinical Meaning & Reference Range"]],
      body: [
        [
          "Cursor Stability Score (0-100)",
          "Composite index combining 4-12 Hz tremor burden, RMS displacement, and suppression ratio. 85-100 indicates steady control; <65 flags elevated tremor activity.",
        ],
        [
          "4-6 Hz Resting vs 6-12 Hz Action (%)",
          "Share of 0.5-15 Hz pointer spectral energy in the classic resting tremor band (4-6 Hz) vs. postural/kinetic essential tremor band (6-12 Hz).",
        ],
        [
          "RMS Tremor Amplitude (mm)",
          "Root-mean-square 4-12 Hz oscillatory displacement converted to physical millimeters using display DPI.",
        ],
        [
          "Medication & Symptom Diary",
          "Patient-entered timestamps for medication doses, tremor flares, and fatigue, aligned to evaluate ON/OFF timing patterns.",
        ],
      ],
      headStyles: { fillColor: [1, 48, 90], textColor: [255, 255, 255] },
      styles: { fontSize: 8.5, cellPadding: 5 },
    });

    // Medication & Symptom Event Diary Table
    if (events.length > 0) {
      const afterGuideY = getNextY(420, 120);
      doc.setFontSize(13);
      doc.setTextColor(15, 45, 89);
      doc.text("Medication & Symptom Event Diary", 40, afterGuideY);
      autoTable(doc, {
        startY: afterGuideY + 8,
        head: [["Timestamp (Local)", "Type", "Label", "Dosage", "Severity", "Notes"]],
        body: events.map((ev) => [
          new Date(ev.timestamp * 1000).toLocaleString(),
          ev.event_type,
          ev.label,
          ev.dosage || "-",
          ev.severity !== null ? `${ev.severity}/5` : "-",
          ev.notes || "-",
        ]),
        headStyles: { fillColor: [15, 45, 89], textColor: [255, 255, 255] },
        styles: { fontSize: 8, cellPadding: 4 },
      });
    }

    // Daily Trends Table
    const afterDiaryY = getNextY(480, 120);
    doc.setFontSize(13);
    doc.setTextColor(1, 74, 53);
    doc.text("Daily Longitudinal Stability & Multi-Band Tremor Trends", 40, afterDiaryY);

    autoTable(doc, {
      startY: afterDiaryY + 8,
      head: [[
        "Date",
        "Sessions",
        "Windows",
        "Stability (/100)",
        "4-6 Hz / 6-12 Hz",
        "RMS (mm)",
        "Peak Freq",
      ]],
      body:
        trends.length > 0
          ? trends.map((t) => [
              t.date,
              String(t.session_count),
              String(t.sample_count),
              t.avg_stability_score.toFixed(1),
              `${(t.avg_resting_band_pct ?? 0).toFixed(0)}% / ${(t.avg_action_band_pct ?? 0).toFixed(0)}%`,
              `${(t.avg_rms_amplitude_mm ?? 0).toFixed(2)} mm`,
              t.avg_tremor_hz !== null ? `${t.avg_tremor_hz.toFixed(2)} Hz` : "None",
            ])
          : [["No daily trends recorded yet", "-", "-", "-", "-", "-", "-"]],
      headStyles: { fillColor: [1, 74, 53], textColor: [255, 255, 255] },
      styles: { fontSize: 8.5, cellPadding: 5 },
    });

    // Session-by-Session Motor Log
    const afterDailyY = getNextY(560, 120);
    doc.setFontSize(13);
    doc.setTextColor(1, 74, 53);
    doc.text("Session-by-Session Motor Telemetry Log", 40, afterDailyY);

    autoTable(doc, {
      startY: afterDailyY + 8,
      head: [[
        "Completed (Local Time)",
        "Windows",
        "Stability (/100)",
        "4-12 Hz Power",
        "RMS (mm)",
        "Peak Freq",
        "Mode",
      ]],
      body:
        sessions.length > 0
          ? sessions.map((s) => [
              new Date(s.ended_at * 1000).toLocaleString(),
              String(s.sample_count),
              s.avg_stability_score.toFixed(1),
              `${s.avg_tremor_index.toFixed(1)}%`,
              `${(s.avg_rms_amplitude_mm ?? 0).toFixed(2)} mm`,
              s.avg_tremor_hz !== null ? `${s.avg_tremor_hz.toFixed(2)} Hz` : "None",
              s.had_stabilization ? "Stabilized" : "Baseline",
            ])
          : [["No completed sessions stored yet", "-", "-", "-", "-", "-", "-"]],
      headStyles: { fillColor: [1, 74, 53], textColor: [255, 255, 255] },
      styles: { fontSize: 8.5, cellPadding: 5 },
    });

    if (calibrations.length > 0) {
      const afterSessY = getNextY(660, 110);
      doc.setFontSize(13);
      doc.setTextColor(1, 74, 53);
      doc.text("Stored Gaze Calibration Profiles", 40, afterSessY);
      autoTable(doc, {
        startY: afterSessY + 8,
        head: [["Profile Name", "Tracking Source", "Mean Fit Error (px)", "Status", "Created At"]],
        body: calibrations.map((c) => [
          c.name,
          c.source.toUpperCase(),
          `${c.error_px.toFixed(1)} px`,
          c.is_active ? "Active Profile" : "Archived",
          new Date(c.created_at * 1000).toLocaleString(),
        ]),
        headStyles: { fillColor: [1, 74, 53], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5, cellPadding: 5 },
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`clearcursor-clinician-motor-report-${stamp}.pdf`);
  };

  const exportClinicianCsv = () => {
    const header = [
      "Record Type",
      "Date / Timestamp",
      "Session or Event ID",
      "Sample Windows / Dosage / Error",
      "Stability Score (0-100)",
      "4-12 Hz Tremor Power (%)",
      "4-6 Hz Resting (%)",
      "6-12 Hz Action (%)",
      "RMS Amplitude (mm)",
      "Dominant Frequency (Hz)",
      "Mode / Category",
      "Clinical Note",
    ];
    const rows: string[][] = [
      ...trends.map((t) => [
        "Daily Trend",
        t.date,
        `${t.session_count} sessions`,
        `${t.sample_count} windows`,
        t.avg_stability_score.toFixed(1),
        t.avg_tremor_index.toFixed(1),
        (t.avg_resting_band_pct ?? 0).toFixed(1),
        (t.avg_action_band_pct ?? 0).toFixed(1),
        (t.avg_rms_amplitude_mm ?? 0).toFixed(2),
        t.avg_tremor_hz !== null ? t.avg_tremor_hz.toFixed(2) : "None",
        "Aggregated",
        formatStabilityBand(t.avg_stability_score),
      ]),
      ...sessions.map((s) => [
        "Session Summary",
        new Date(s.ended_at * 1000).toISOString(),
        s.session_id,
        `${s.sample_count} windows`,
        s.avg_stability_score.toFixed(1),
        s.avg_tremor_index.toFixed(1),
        (s.avg_resting_band_pct ?? 0).toFixed(1),
        (s.avg_action_band_pct ?? 0).toFixed(1),
        (s.avg_rms_amplitude_mm ?? 0).toFixed(2),
        s.avg_tremor_hz !== null ? s.avg_tremor_hz.toFixed(2) : "None",
        s.had_stabilization ? "SteadyHand Stabilized" : "Unassisted Baseline",
        formatFrequencyClinicalNote(s.avg_tremor_hz),
      ]),
      ...events.map((ev) => [
        "Clinical Event",
        new Date(ev.timestamp * 1000).toISOString(),
        String(ev.id),
        ev.dosage || (ev.severity ? `Severity ${ev.severity}/5` : ""),
        "",
        "",
        "",
        "",
        "",
        "",
        ev.event_type,
        `${ev.label}${ev.notes ? ` - ${ev.notes}` : ""}`,
      ]),
      ...calibrations.map((c) => [
        "Gaze Calibration",
        new Date(c.created_at * 1000).toISOString(),
        c.name,
        `${c.error_px.toFixed(1)} px`,
        "",
        "",
        "",
        "",
        "",
        "",
        c.source.toUpperCase(),
        c.is_active ? "Active Calibration Profile" : "Saved Calibration Profile",
      ]),
    ];

    const csvEscape = (cell: string) => {
      const str = String(cell);
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clearcursor-clinician-data-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeHoursCount =
    coverage?.active_hours_of_day ?? diurnalGrid.filter((h) => h.has_data).length;
  const activeMinutesCount =
    coverage?.total_active_minutes ??
    diurnalGrid.reduce((acc, h) => acc + (h.active_minutes ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Exports */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--tc-ink)]">
            Clinician Motor Report &amp; Medication Diary
          </h2>
          <p className="mt-0.5 text-sm text-[var(--tc-ink-muted)]">
            Functional computer-use motor telemetry, standardized 15-second check-ins, diurnal coverage, and PDF/CSV exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={exportClinicianPdf}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--tc-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--tc-primary-hover)]"
          >
            <FileDown className="h-4 w-4" aria-hidden="true" />
            <span>Export Clinician Report (PDF)</span>
          </button>

          <button
            type="button"
            onClick={exportClinicianCsv}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-surface)] px-4 text-sm font-semibold text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)]"
          >
            <FileSpreadsheet className="h-4 w-4 text-[var(--tc-primary-ink)]" aria-hidden="true" />
            <span>Export CSV Data</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--tc-border)] bg-[var(--tc-surface)] px-3.5 text-sm font-medium text-[var(--tc-ink)] transition-colors hover:bg-[var(--tc-surface-alt)] disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Date Window Selector & Simulation Filter */}
      <div className="cc-card flex flex-wrap items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-2 text-xs font-semibold text-[var(--tc-ink-muted)]">
            Report Window:
          </span>
          {DATE_WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              aria-pressed={days === w.days}
              onClick={() => setDays(w.days)}
              className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors ${
                days === w.days
                  ? "bg-[var(--tc-primary)] text-white"
                  : "bg-[var(--tc-surface-alt)] text-[var(--tc-ink)] hover:bg-[var(--tc-mint)]"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--tc-ink)]">
          <input
            type="checkbox"
            checked={includeSimulated}
            onChange={(e) => setIncludeSimulated(e.target.checked)}
            className="h-4 w-4 accent-[var(--tc-primary)]"
          />
          <span>
            Include Demo/Simulated Data
            {!includeSimulated && simulatedCount > 0
              ? ` (${simulatedCount} demo windows excluded)`
              : ""}
          </span>
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[var(--tc-alert-bg)] px-5 py-4 text-sm font-medium text-[var(--tc-alert)]"
        >
          {error}
        </div>
      )}

      {/* Honest Coverage & Scope Summary (Point 1) */}
      <section aria-labelledby="coverage-heading" className="cc-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tc-primary-ink)]" aria-hidden="true" />
            <div>
              <h3 id="coverage-heading" className="text-sm font-semibold text-[var(--tc-ink)]">
                Functional Computer-Use Telemetry Coverage
              </h3>
              <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-[var(--tc-ink-muted)]">
                {coverage?.scope_description ??
                  "Passive functional motor telemetry captured during active pointer use, complemented by standardized 15-second motor check-ins and medication logs. Empty hours mark periods away from the computer rather than zero tremor."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs tabular-nums">
            <span className="rounded-lg bg-[var(--tc-surface-alt)] px-3 py-1.5 font-semibold text-[var(--tc-ink)]">
              {coverage?.active_days ?? trends.length} / {days} active days
            </span>
            <span className="rounded-lg bg-[var(--tc-surface-alt)] px-3 py-1.5 font-semibold text-[var(--tc-ink)]">
              {activeMinutesCount} active min ({activeHoursCount}/24 hrs covered)
            </span>
            <span className="rounded-lg bg-[var(--tc-mint)] px-3 py-1.5 font-semibold text-[var(--tc-primary-ink)]">
              {checkins.length} guided check-ins
            </span>
          </div>
        </div>
      </section>

      {/* Functional Protection Summary Strip */}
      <div className="cc-card grid grid-cols-2 divide-y divide-[var(--tc-border)] md:grid-cols-4 md:divide-x md:divide-y-0">
        <div className="p-5">
          <p className="text-xs font-medium text-[var(--tc-ink-muted)]">Mean RMS Amplitude</p>
          <p className="mt-1.5 text-2xl font-semibold text-[var(--tc-ink)] tabular-nums">
            {meanRmsMm.toFixed(2)} mm
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[var(--tc-ink-muted)]">Slip-Clicks Rescued</p>
          <p className="mt-1.5 text-2xl font-semibold text-[var(--tc-primary-ink)] tabular-nums">
            {functional?.total_click_rescues ?? 0}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[var(--tc-ink-muted)]">Accidental Drags Blocked</p>
          <p className="mt-1.5 text-2xl font-semibold text-[var(--tc-primary-ink)] tabular-nums">
            {functional?.total_drags_prevented ?? 0}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-[var(--tc-ink-muted)]">
            Double-Click Bounces Stopped
          </p>
          <p className="mt-1.5 text-2xl font-semibold text-[var(--tc-primary-ink)] tabular-nums">
            {functional?.total_bounces_blocked ?? 0}
          </p>
        </div>
      </div>

      {/* 15-Second Guided Motor Check-In (Point 2) */}
      <MotorCheckinCard onCompleted={load} />

      {checkins.length > 0 && (
        <section className="cc-card p-5">
          <h3 className="text-base font-semibold text-[var(--tc-ink)]">
            Standardized 15-Second Check-In History
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--tc-border)] text-[var(--tc-ink-muted)]">
                  <th className="py-2.5 pr-3 font-semibold">Time</th>
                  <th className="py-2.5 pr-3 font-semibold">Context</th>
                  <th className="py-2.5 pr-3 font-semibold">Overall</th>
                  <th className="py-2.5 pr-3 font-semibold">Hold RMS / Freq</th>
                  <th className="py-2.5 pr-3 font-semibold">Tap Accuracy</th>
                  <th className="py-2.5 pr-3 font-semibold">Notes</th>
                  <th className="py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tc-border)]">
                {checkins.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {new Date(c.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-3 capitalize">{c.context_tag.replace("_", " ")}</td>
                    <td className="py-2.5 pr-3 font-semibold text-[var(--tc-primary-ink)] tabular-nums">
                      {c.overall_score.toFixed(1)}/100
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {c.hold_rms_mm.toFixed(2)} mm
                      {c.hold_dominant_hz !== null ? ` (${c.hold_dominant_hz.toFixed(1)} Hz)` : ""}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {c.tap_accuracy_pct !== null ? `${c.tap_accuracy_pct.toFixed(0)}%` : "-"}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--tc-ink-muted)]">{c.notes || "-"}</td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        aria-label={`Delete check-in ${c.id}`}
                        onClick={() => void handleDeleteCheckin(c.id)}
                        className="rounded-lg p-1.5 text-[var(--tc-alert)] hover:bg-[var(--tc-alert-bg)]"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Opt-In Keyboard Timing Summary (Point 4) */}
      {cadenceSummary && cadenceSummary.window_count > 0 && (
        <section aria-labelledby="cadence-heading" className="cc-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Keyboard className="h-4 w-4 text-[var(--tc-primary-ink)]" aria-hidden="true" />
              <h3 id="cadence-heading" className="text-base font-semibold text-[var(--tc-ink)]">
                Keyboard Timing Biomarkers (Opt-In)
              </h3>
            </div>
            <span className="rounded-full bg-[var(--tc-surface-alt)] px-3 py-1 text-xs font-medium text-[var(--tc-ink-muted)]">
              Timing-only statistics; zero keystrokes or text recorded
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[var(--tc-surface-alt)] px-4 py-3">
              <p className="text-xs text-[var(--tc-ink-muted)]">Mean Key Hold (Dwell)</p>
              <p className="mt-1 text-xl font-semibold text-[var(--tc-ink)] tabular-nums">
                {cadenceSummary.avg_hold_ms.toFixed(1)} ms
              </p>
            </div>
            <div className="rounded-xl bg-[var(--tc-surface-alt)] px-4 py-3">
              <p className="text-xs text-[var(--tc-ink-muted)]">Mean Inter-Key Flight</p>
              <p className="mt-1 text-xl font-semibold text-[var(--tc-ink)] tabular-nums">
                {cadenceSummary.avg_flight_ms.toFixed(1)} ms
              </p>
            </div>
            <div className="rounded-xl bg-[var(--tc-surface-alt)] px-4 py-3">
              <p className="text-xs text-[var(--tc-ink-muted)]">Rhythm Regularity</p>
              <p className="mt-1 text-xl font-semibold text-[var(--tc-primary-ink)] tabular-nums">
                {cadenceSummary.avg_regularity_score.toFixed(1)} / 100
              </p>
            </div>
            <div className="rounded-xl bg-[var(--tc-surface-alt)] px-4 py-3">
              <p className="text-xs text-[var(--tc-ink-muted)]">Measured Keystrokes</p>
              <p className="mt-1 text-xl font-semibold text-[var(--tc-ink)] tabular-nums">
                {cadenceSummary.total_keystrokes} ({cadenceSummary.window_count} windows)
              </p>
            </div>
          </div>
        </section>
      )}

      {/* How to Read the Clinical Data */}
      <section aria-labelledby="how-to-read-heading" className="cc-card p-5">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 shrink-0 text-[var(--tc-primary-ink)]" aria-hidden="true" />
          <h3 id="how-to-read-heading" className="text-base font-semibold text-[var(--tc-ink)]">
            How to Read This Clinical Motor Data
          </h3>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--tc-ink-muted)]">
          Non-Diagnostic Assistive Telemetry: Metrics summarize real-world mouse displacement spectra and standardized check-ins to support discussions with your physician or occupational therapist; ClearCursor is not a diagnostic medical device.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-[var(--tc-ink)] md:grid-cols-2">
          <div className="rounded-xl bg-[var(--tc-surface-alt)] p-4">
            <dt className="font-semibold text-[var(--tc-primary-ink)]">
              Cursor Stability Score (0 to 100)
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-[var(--tc-ink)]">
              Measures overall steadiness. <strong>85-100</strong> means smooth control,{" "}
              <strong>65-84</strong> shows mild/moderate shaking being dampened, and{" "}
              <strong>below 65</strong> flags heavy tremor activity.
            </dd>
          </div>
          <div className="rounded-xl bg-[var(--tc-surface-alt)] p-4">
            <dt className="font-semibold text-[var(--tc-primary-ink)]">
              4-6 Hz Resting vs 6-12 Hz Action Bands
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-[var(--tc-ink)]">
              Separates lower-frequency resting tremor energy (<strong>4-6 Hz</strong>) from
              kinetic/postural essential tremor energy (<strong>6-12 Hz</strong>) alongside
              physical RMS amplitude in millimeters.
            </dd>
          </div>
        </dl>
      </section>

      {/* Medication & Symptom Event Diary */}
      <section aria-labelledby="diary-heading" className="cc-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-[var(--tc-primary-ink)]" aria-hidden="true" />
            <h3 id="diary-heading" className="text-base font-semibold text-[var(--tc-ink)]">
              Medication &amp; Symptom Diary
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingEvent}
              onClick={() => void handleQuickEvent("medication", "Medication Dose Taken")}
              className="min-h-10 rounded-xl bg-[var(--tc-mint)] px-3.5 text-xs font-semibold text-[var(--tc-primary-ink)] transition-colors hover:opacity-90"
            >
              + Medication Taken
            </button>
            <button
              type="button"
              disabled={savingEvent}
              onClick={() => void handleQuickEvent("flare", "Tremor Flare", 4)}
              className="min-h-10 rounded-xl bg-[var(--tc-alert-bg)] px-3.5 text-xs font-semibold text-[var(--tc-alert)] transition-colors hover:opacity-90"
            >
              + Tremor Flare
            </button>
            <button
              type="button"
              disabled={savingEvent}
              onClick={() => void handleQuickEvent("fatigue", "Hand Fatigue", 3)}
              className="min-h-10 rounded-xl bg-[var(--tc-surface-alt)] px-3.5 text-xs font-semibold text-[var(--tc-ink)] transition-colors hover:opacity-90"
            >
              + Fatigue
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => void handleSubmitEvent(e)}
          className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-12"
        >
          <select
            aria-label="Event type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as ClinicalEventType)}
            className="min-h-11 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3 text-sm font-medium text-[var(--tc-ink)] md:col-span-2"
          >
            <option value="medication">Medication</option>
            <option value="flare">Tremor Flare</option>
            <option value="symptom">Symptom</option>
            <option value="fatigue">Fatigue</option>
            <option value="note">Clinical Note</option>
          </select>
          <input
            type="text"
            value={eventLabel}
            onChange={(e) => setEventLabel(e.target.value)}
            placeholder="Label (e.g. Carbidopa-Levodopa)"
            className="min-h-11 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3 text-sm text-[var(--tc-ink)] md:col-span-3"
          />
          <input
            type="text"
            value={eventDosage}
            onChange={(e) => setEventDosage(e.target.value)}
            placeholder="Dosage (optional)"
            className="min-h-11 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3 text-sm text-[var(--tc-ink)] md:col-span-2"
          />
          <select
            aria-label="Severity"
            value={eventSeverity}
            onChange={(e) => setEventSeverity(e.target.value)}
            className="min-h-11 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3 text-sm text-[var(--tc-ink)] md:col-span-2"
          >
            <option value="">Severity (opt.)</option>
            <option value="1">1 - Very Mild</option>
            <option value="2">2 - Mild</option>
            <option value="3">3 - Moderate</option>
            <option value="4">4 - Marked</option>
            <option value="5">5 - Severe</option>
          </select>
          <input
            type="text"
            value={eventNotes}
            onChange={(e) => setEventNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="min-h-11 rounded-xl border border-[var(--tc-border-strong)] bg-[var(--tc-bg)] px-3 text-sm text-[var(--tc-ink)] md:col-span-2"
          />
          <button
            type="submit"
            disabled={savingEvent || !eventLabel.trim()}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--tc-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--tc-primary-hover)] disabled:opacity-50 md:col-span-1"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Log</span>
          </button>
        </form>

        {events.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--tc-border)] text-[var(--tc-ink-muted)]">
                  <th className="py-2 pr-3 font-semibold">Time</th>
                  <th className="py-2 pr-3 font-semibold">Type</th>
                  <th className="py-2 pr-3 font-semibold">Label</th>
                  <th className="py-2 pr-3 font-semibold">Dosage / Severity</th>
                  <th className="py-2 pr-3 font-semibold">Notes</th>
                  <th className="py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tc-border)]">
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {new Date(ev.timestamp * 1000).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-3 font-medium capitalize">{ev.event_type}</td>
                    <td className="py-2.5 pr-3 font-semibold text-[var(--tc-ink)]">{ev.label}</td>
                    <td className="py-2.5 pr-3">
                      {ev.dosage || (ev.severity ? `${ev.severity}/5` : "-")}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--tc-ink-muted)]">{ev.notes || "-"}</td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        aria-label={`Delete event ${ev.label}`}
                        onClick={() => void handleDeleteEvent(ev.id)}
                        className="rounded-lg p-1.5 text-[var(--tc-alert)] hover:bg-[var(--tc-alert-bg)]"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recharts Daily Stability, Multi-Band & Honest 24h Diurnal Coverage Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section aria-labelledby="daily-trend-heading" className="cc-card p-5">
          <h3 id="daily-trend-heading" className="mb-3 text-sm font-semibold text-[var(--tc-ink)]">
            Daily Stability Score (0-100)
          </h3>

          {trends.length === 0 ? (
            <p className="rounded-xl bg-[var(--tc-surface-alt)] p-5 text-xs text-[var(--tc-ink-muted)]">
              No daily stability trends recorded in this window yet.
            </p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="tcDailyStabilityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--tc-primary)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--tc-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--tc-chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--tc-chart-axis)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--tc-chart-axis)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ReferenceLine
                    y={85}
                    stroke="var(--tc-primary)"
                    strokeDasharray="5 4"
                    strokeOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--tc-surface)",
                      border: "1px solid var(--tc-border-strong)",
                      borderRadius: "10px",
                      color: "var(--tc-ink)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avg_stability_score"
                    name="Stability Score"
                    stroke="var(--tc-primary)"
                    strokeWidth={2.5}
                    fill="url(#tcDailyStabilityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section aria-labelledby="tremor-trend-heading" className="cc-card p-5">
          <h3 id="tremor-trend-heading" className="mb-3 text-sm font-semibold text-[var(--tc-ink)]">
            Resting (4-6 Hz) vs Action (6-12 Hz)
          </h3>

          {trends.length === 0 ? (
            <p className="rounded-xl bg-[var(--tc-surface-alt)] p-5 text-xs text-[var(--tc-ink-muted)]">
              Spectral bands populate automatically during everyday pointer movement.
            </p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={trends}>
                  <CartesianGrid stroke="var(--tc-chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--tc-chart-axis)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--tc-chart-axis)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--tc-surface)",
                      border: "1px solid var(--tc-border-strong)",
                      borderRadius: "10px",
                      color: "var(--tc-ink)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="avg_resting_band_pct"
                    name="4-6 Hz Resting (%)"
                    fill="var(--tc-primary)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="avg_action_band_pct"
                    name="6-12 Hz Action (%)"
                    fill="var(--tc-alert)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section aria-labelledby="diurnal-heading" className="cc-card p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 id="diurnal-heading" className="text-sm font-semibold text-[var(--tc-ink)]">
              Time-of-Day Diurnal Pattern (0-23h)
            </h3>
            <span className="text-xs text-[var(--tc-ink-muted)] tabular-nums">
              {activeHoursCount}/24 hrs
            </span>
          </div>

          {activeHoursCount === 0 ? (
            <p className="rounded-xl bg-[var(--tc-surface-alt)] p-5 text-xs text-[var(--tc-ink-muted)]">
              Hourly tremor distribution appears once sessions are recorded across the day. Unrecorded hours stay blank.
            </p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={diurnalGrid}>
                  <CartesianGrid stroke="var(--tc-chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--tc-chart-axis)"
                    fontSize={10}
                    interval={3}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--tc-chart-axis)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val, _name, item) => {
                      const pt = item?.payload as HourlyProfilePoint | undefined;
                      if (!pt?.has_data || val === null || val === undefined) {
                        return ["No computer activity recorded", "Coverage"];
                      }
                      const mins = pt.active_minutes ?? 0;
                      return [
                        `${Number(val).toFixed(1)}% (${mins} active min, ${pt.sample_count} windows)`,
                        "4-12 Hz Tremor",
                      ];
                    }}
                    contentStyle={{
                      backgroundColor: "var(--tc-surface)",
                      border: "1px solid var(--tc-border-strong)",
                      borderRadius: "10px",
                      color: "var(--tc-ink)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="avg_tremor_index"
                    name="4-12 Hz Tremor (%)"
                    fill="var(--tc-primary)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Descriptive Sessions & Calibrations Tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="cc-card p-5">
          <h3 className="text-base font-semibold text-[var(--tc-ink)]">
            Recorded Motor Telemetry Sessions
          </h3>
          {sessions.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--tc-ink-muted)]">
              No completed real-world sessions stored yet in this window.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--tc-border)] text-[var(--tc-ink-muted)]">
                    <th className="py-2.5 pr-3 font-semibold">Completed</th>
                    <th className="py-2.5 pr-3 font-semibold">Stability</th>
                    <th className="py-2.5 pr-3 font-semibold">4-12 Hz / RMS</th>
                    <th className="py-2.5 pr-3 font-semibold">Peak Freq</th>
                    <th className="py-2.5 font-semibold">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tc-border)]">
                  {sessions.map((s) => (
                    <tr key={s.session_id}>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {new Date(s.ended_at * 1000).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-[var(--tc-primary-ink)] tabular-nums">
                        {s.avg_stability_score.toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {s.avg_tremor_index.toFixed(1)}% ({(s.avg_rms_amplitude_mm ?? 0).toFixed(2)}{" "}
                        mm)
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {s.avg_tremor_hz !== null ? `${s.avg_tremor_hz.toFixed(2)} Hz` : "None"}
                      </td>
                      <td className="py-2.5 tabular-nums">
                        {s.had_stabilization ? "Stabilized" : "Baseline"} ({s.sample_count})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="cc-card p-5">
          <h3 className="text-base font-semibold text-[var(--tc-ink)]">
            Saved Gaze Calibration Accuracy Records
          </h3>
          {calibrations.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--tc-ink-muted)]">
              No gaze calibration profiles saved yet.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[var(--tc-border)] text-[var(--tc-ink-muted)]">
                    <th className="py-2.5 pr-3 font-semibold">Profile Name</th>
                    <th className="py-2.5 pr-3 font-semibold">Tracking Input</th>
                    <th className="py-2.5 pr-3 font-semibold">Mean Fit Error</th>
                    <th className="py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tc-border)]">
                  {calibrations.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-3 font-medium text-[var(--tc-ink)]">{c.name}</td>
                      <td className="py-2.5 pr-3 uppercase">{c.source}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{c.error_px.toFixed(1)} px</td>
                      <td className="py-2.5 font-medium">
                        {c.is_active ? "Active" : "Archived"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
