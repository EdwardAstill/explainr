import React from "react";
import type { ReactNode } from "react";

export interface FormulaStep {
  /** Optional leading label, e.g. "1.", "step a". */
  label?: ReactNode;
  /** The expression. Plain text or JSX (sub/sup OK, code spans, MathML, etc.). */
  expr: ReactNode;
  /** Current value of the expression. Rendered in mono + accent. */
  value?: ReactNode;
}

export interface FormulaStepsProps {
  steps: readonly FormulaStep[];
  /** Optional title above the block. */
  title?: ReactNode;
}

export function FormulaSteps({ steps, title }: FormulaStepsProps): JSX.Element {
  return (
    <div className="viz-formula-steps">
      {title && <div className="viz-formula-steps-title">{title}</div>}
      {steps.map((s, i) => (
        <div key={i} className="viz-formula-step">
          {s.label !== undefined && (
            <span className="viz-formula-step-label">{s.label}</span>
          )}
          <span className="viz-formula-step-expr">{s.expr}</span>
          {s.value !== undefined && (
            <>
              <span className="viz-formula-step-eq">=</span>
              <span className="viz-formula-step-value">{s.value}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
