import React from "react";

export type WidgetArrangement =
  | "visual-left"
  | "visual-right"
  | "visual-top"
  | "visual-bottom"
  | "stacked";

interface WidgetLayoutProps {
  arrangement?: WidgetArrangement;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional content to render in the top-right of the head (e.g., a meta line). */
  headMeta?: React.ReactNode;
  children: React.ReactNode;
}

interface SlotProps {
  children: React.ReactNode;
}

function VisualSlot({ children }: SlotProps): React.ReactElement {
  // Marker only — never rendered directly by WidgetLayoutImpl.
  // When used outside WidgetLayout, children render unwrapped.
  return <>{children}</> as React.ReactElement;
}

function ControlsSlot({ children }: SlotProps): React.ReactElement {
  return <>{children}</> as React.ReactElement;
}

function AsideSlot({ children }: SlotProps): React.ReactElement {
  return <>{children}</> as React.ReactElement;
}

(VisualSlot as { __figuraSlot?: string }).__figuraSlot = "visual";
(ControlsSlot as { __figuraSlot?: string }).__figuraSlot = "controls";
(AsideSlot as { __figuraSlot?: string }).__figuraSlot = "aside";

/** Extract named slots from children via the __figuraSlot marker. */
export function extractSlots(children: React.ReactNode): Record<string, React.ReactNode> {
  const slots: Record<string, React.ReactNode> = {};
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const t = child.type as { __figuraSlot?: string };
      if (t?.__figuraSlot) {
        slots[t.__figuraSlot] = child;
      }
    }
  });
  return slots;
}

function WidgetLayoutImpl(props: WidgetLayoutProps): React.JSX.Element {
  const arrangement = props.arrangement ?? "visual-left";
  const slots = extractSlots(props.children);

  return (
    <div className={`figura-widget figura-widget--${arrangement}`}>
      {(props.title || props.subtitle || props.headMeta) && (
        <div
          className="figura-widget__head"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <div>
            {props.title && <h2 className="figura-widget__title">{props.title}</h2>}
            {props.subtitle && (
              <div className="figura-widget__subtitle">{props.subtitle}</div>
            )}
          </div>
          {props.headMeta && <div>{props.headMeta}</div>}
        </div>
      )}
      <div className="figura-widget__body">
        {slots["visual"] && (
          <div className="figura-widget__visual">
            {slots["visual"]}
          </div>
        )}
        {(slots["controls"] || slots["aside"]) && (
          <div className="figura-widget__sidebar">
            {slots["controls"] && (
              <div className="figura-widget__controls">{slots["controls"]}</div>
            )}
            {slots["aside"] && (
              <div className="figura-widget__aside">
                <div className="figura-widget__aside-label">What to notice</div>
                {slots["aside"]}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const WidgetLayout = Object.assign(WidgetLayoutImpl, {
  Visual: VisualSlot,
  Controls: ControlsSlot,
  Aside: AsideSlot,
});
