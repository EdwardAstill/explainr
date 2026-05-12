/**
 * Viz styles. Injected once by the unified web shell.
 *
 * Strategy:
 *   - `.viz-root` element holds the active theme's CSS variables
 *     (--bg, --text, --accent, --border, --card-bg, --input-bg,
 *     --text-muted, --font-body, --font-mono, etc. — set by the
 *     theme dropdown via inline style).
 *   - This stylesheet adds viz-specific tokens (--viz-grid,
 *     --viz-axis, --viz-trace, --viz-positive, --viz-negative,
 *     --viz-warn) defaulted from existing theme tokens so that
 *     every theme works out of the box.
 *   - Themes that want viz-aware colors can override these with
 *     more specific selectors (e.g. `[data-theme="cyberpunk"]
 *     .viz-root { --viz-trace: #00ffe0; }`).
 *   - All viz primitives consume only CSS variables — no
 *     hard-coded hexes.
 */
export const vizStyles = `
.viz-root {
  --viz-grid: var(--border);
  --viz-axis: var(--text-muted);
  --viz-trace: var(--accent);
  --viz-trace-2: var(--accent-2, var(--accent));
  --viz-positive: #10b981;
  --viz-negative: #ef4444;
  --viz-warn: #f59e0b;
  --viz-info: #3b82f6;
  --viz-violet: #8b5cf6;
  --viz-pink: #ec4899;

  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body, ui-sans-serif, system-ui, sans-serif);
  font-size: 11px;
  min-height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.viz-root svg text {
  font-size: 11px;
}

.viz-root-embedded {
  min-height: 100%;
  background: transparent;
}

.viz-app {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.viz-app aside.viz-sidebar {
  width: 240px;
  min-width: 240px;
  height: 100vh;
  background: var(--sidebar-bg, var(--bg));
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 18px 0 0;
  overflow-y: auto;
}

.viz-sidebar-header {
  padding: 0 18px 14px;
  border-bottom: 1px solid var(--border);
}

.viz-sidebar-header h1 {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
}

.viz-sidebar-header p {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  opacity: 0.75;
}

.viz-sidebar-section {
  padding: 14px 18px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: var(--font-mono, ui-monospace, monospace);
}

.viz-sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 18px;
  cursor: pointer;
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono, ui-monospace, monospace);
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  transition: background 0.1s, color 0.1s;
}

.viz-sidebar-item:hover {
  background: var(--border);
  color: var(--text);
}

.viz-sidebar-item.active {
  background: var(--active-bg, var(--border));
  color: var(--text);
}

.viz-sidebar-item .viz-emoji {
  font-size: 11px;
  width: 18px;
  text-align: center;
}

.viz-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  background: var(--bg);
}

.viz-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  font-size: 11px;
}

/* ── Shell ── */
.viz-shell {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius, 0);
  padding: 22px;
  max-width: 1200px;
  margin: 0 auto;
  color: var(--text);
  font-size: 11px;
}

.viz-shell-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 4px;
}

.viz-shell-head h2 {
  font-size: 11px;
  font-weight: 600;
  margin: 0;
  color: var(--text);
  font-family: var(--font-display, inherit);
}

.viz-shell-meta {
  display: flex;
  gap: 12px;
  align-items: baseline;
  flex-wrap: wrap;
}

.viz-sub {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0 0 14px;
}

/* ── Section Label (and aside label, same treatment) ── */
.viz-section-label,
.figura-widget__aside-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  font-family: var(--font-mono, ui-monospace, monospace);
}

/* ── Stage (frame around SVG) ── */
.viz-stage {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius, 0);
  padding: 8px;
  overflow: hidden;
  max-width: 100%;
}

/* ── Panel ── */
.viz-panel {
  flex: 1;
  min-width: 240px;
}

/* ── Buttons ── */
.viz-btn {
  font-size: 11px;
  padding: 6px 12px;
  border-radius: var(--radius, 0);
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border: 1px solid var(--border);
  background: var(--input-bg);
  color: var(--text);
  transition: background 0.1s, color 0.1s, border-color 0.1s, filter 0.1s;
}

/* hover: non-primary darkens border; primary darkens background */
.viz-btn:hover { border-color: var(--text-muted); }
.viz-btn:active { filter: brightness(0.92); }

.viz-btn-primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  padding: 6px 12px;
}

.viz-btn-primary:hover { border-color: var(--accent); filter: brightness(0.92); }

.viz-btn-tag {
  font-size: 11px;
  padding: 3px 8px;
  font-weight: 500;
  background: transparent;
  color: var(--text-muted);
}

.viz-btn-tag:hover {
  background: var(--input-bg);
  color: var(--text);
}

.viz-btn-ghost {
  background: transparent;
}

.viz-btn-active {
  background: var(--active-bg, var(--border));
  color: var(--text);
  border-color: var(--text-muted);
}

/* ── Focus (keyboard accessibility) ── */
.viz-btn:focus-visible,
.viz-tab:focus-visible {
  outline: 1px solid var(--text-muted);
  outline-offset: 1px;
}

/* ── Slider ── */
.viz-slider-row {
  margin-bottom: 10px;
  width: 100%;
  max-width: 320px;
}

.viz-slider-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 4px;
  color: var(--text-muted);
}

.viz-slider-value {
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--text);
}

.viz-slider-unit {
  color: var(--text-muted);
  margin-left: 4px;
  font-weight: normal;
}

.viz-slider-row input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  background: var(--border);
  border: none;
  outline: none;
  margin: 8px 0;
  cursor: pointer;
}

.viz-slider-row input[type="range"]::-webkit-slider-runnable-track {
  height: 4px;
  background: var(--border);
  border: none;
  border-radius: 0;
}

.viz-slider-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: var(--text);
  border: none;
  border-radius: 0;
  margin-top: -4px;
  box-shadow: none;
  cursor: grab;
}

.viz-slider-row input[type="range"]:active::-webkit-slider-thumb {
  cursor: grabbing;
}

.viz-slider-row input[type="range"]::-moz-range-track {
  height: 4px;
  background: var(--border);
  border: none;
  border-radius: 0;
}

.viz-slider-row input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: var(--text);
  border: none;
  border-radius: 0;
  box-shadow: none;
  cursor: grab;
}

.viz-slider-row input[type="range"]:focus {
  outline: 1px solid var(--text-muted);
  outline-offset: 2px;
}

/* ── Tabs ── */
.viz-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.viz-tab {
  font-size: 11px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius, 0);
  background: var(--input-bg);
  color: var(--text-muted);
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: background 0.1s, color 0.1s;
}

.viz-tab:hover {
  color: var(--text);
}

.viz-tab.active {
  background: var(--active-bg, var(--border));
  color: var(--text);
  border-color: var(--text-muted);
}

/* ── Stat ── */
.viz-stat {
  display: inline-flex;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
  align-items: baseline;
}

.viz-stat-value {
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--text);
  font-weight: 600;
}

/* ── LegendDot ── */
.viz-legend-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-muted);
}

.viz-legend-dot .viz-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: var(--radius, 0);
}

/* ── Notice ── */
.viz-notice {
  margin-top: 16px;
  padding: 12px 14px;
  background: var(--input-bg);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius, 0);
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.55;
}

.viz-notice strong { color: var(--text); }

/* ── FormulaSteps ── */
.viz-formula-steps {
  background: var(--input-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius, 0);
  padding: 10px 14px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--text);
}

.viz-formula-steps-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.viz-formula-step {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.viz-formula-step-label {
  color: var(--text-muted);
  font-weight: 600;
  min-width: 1.5em;
}

.viz-formula-step-expr {
  color: var(--text);
}

.viz-formula-step-eq {
  color: var(--text-muted);
}

.viz-formula-step-value {
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

/* ── Layout helpers ── */
.viz-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.viz-stat-row {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid var(--text-muted);
  background: var(--bg);
  cursor: pointer;
  vertical-align: middle;
  position: relative;
}

input[type="checkbox"]:checked {
  background: var(--text);
  border-color: var(--text);
}

input[type="checkbox"]:checked::after {
  content: "";
  position: absolute;
  left: 3px;
  top: 0px;
  width: 4px;
  height: 8px;
  border: solid var(--bg);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

/* ── WidgetLayout ── */
.figura-widget {
  display: flex;
  flex-direction: column;
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--text);
}

.figura-widget__head {
  padding: 0 0 14px 0;
  border-bottom: 1px solid var(--border);
}

.figura-widget__title {
  font-size: 11px;
  font-weight: 600;
  margin: 0;
}

.figura-widget__subtitle {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  line-height: 1.5;
}

.figura-widget__body {
  display: grid;
  gap: 0;
  padding-top: 14px;
}

.figura-widget__visual {
  background: var(--bg);
  border: 1px solid var(--border);
}

.figura-widget__sidebar {
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border: 1px solid var(--border);
}

.figura-widget__controls {
  padding: 14px;
  flex: 1;
  font-size: 11px;
  line-height: 1.5;
}

.figura-widget__aside {
  border-top: 1px solid var(--border);
  padding: 12px 14px;
  font-size: 11px;
  line-height: 1.55;
  color: var(--text);
}

.figura-widget__aside ul,
.figura-widget__aside ol {
  margin-top: 0;
  margin-bottom: 0;
}

.figura-widget__aside li + li {
  margin-top: 3px;
}

.figura-widget__aside code,
.figura-widget__controls code {
  font-size: inherit;
}

/* Arrangement variants */
.figura-widget--visual-left .figura-widget__body {
  grid-template-columns: 1fr 1fr;
}
.figura-widget--visual-left .figura-widget__visual { grid-column: 1; grid-row: 1; }
.figura-widget--visual-left .figura-widget__sidebar { grid-column: 2; grid-row: 1; border-left: 0; }

.figura-widget--visual-right .figura-widget__body {
  grid-template-columns: 1fr 1fr;
}
.figura-widget--visual-right .figura-widget__visual  { grid-column: 2; grid-row: 1; }
.figura-widget--visual-right .figura-widget__sidebar { grid-column: 1; grid-row: 1; }

.figura-widget--visual-top .figura-widget__body {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
}
.figura-widget--visual-top .figura-widget__visual  { grid-column: 1 / -1; grid-row: 1; }
.figura-widget--visual-top .figura-widget__sidebar { grid-column: 1 / -1; grid-row: 2; }

.figura-widget--visual-bottom .figura-widget__body {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
}
.figura-widget--visual-bottom .figura-widget__sidebar { grid-column: 1 / -1; grid-row: 1; }
.figura-widget--visual-bottom .figura-widget__visual  { grid-column: 1 / -1; grid-row: 2; }

.figura-widget--stacked .figura-widget__body {
  grid-template-columns: 1fr;
}
.figura-widget--stacked .figura-widget__visual  { grid-row: 1; }
.figura-widget--stacked .figura-widget__sidebar { grid-row: 2; }

/* Mobile fallback: 2-column arrangements collapse to stacked under 720px */
@media (max-width: 720px) {
  .figura-widget--visual-left .figura-widget__body,
  .figura-widget--visual-right .figura-widget__body,
  .figura-widget--visual-top .figura-widget__body,
  .figura-widget--visual-bottom .figura-widget__body {
    grid-template-columns: 1fr;
  }
  .figura-widget--visual-left .figura-widget__visual,
  .figura-widget--visual-right .figura-widget__visual,
  .figura-widget--visual-left .figura-widget__sidebar,
  .figura-widget--visual-right .figura-widget__sidebar { grid-column: 1; }
}

`;
