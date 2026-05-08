// Convert wheel gestures over wide tables into horizontal table movement.

type WheelDeltaArgs = {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
  deltaX: number;
  deltaY: number;
};

export function getTableWheelDelta(args: WheelDeltaArgs): number {
  const maxScrollLeft = Math.max(0, args.scrollWidth - args.clientWidth);
  if (maxScrollLeft === 0) return 0;

  const rawDelta = Math.abs(args.deltaX) > Math.abs(args.deltaY) ? args.deltaX : args.deltaY;
  if (rawDelta === 0) return 0;

  if (rawDelta < 0 && args.scrollLeft <= 0) return 0;
  if (rawDelta > 0 && args.scrollLeft >= maxScrollLeft) return 0;

  return Math.max(-args.scrollLeft, Math.min(rawDelta, maxScrollLeft - args.scrollLeft));
}

function initTableWheelScroll(root?: ParentNode): void {
  const scope = root ?? (typeof document !== "undefined" ? document : null);
  if (!scope) return;

  scope.querySelectorAll<HTMLElement>(".rr-table-wrap").forEach((wrap) => {
    if (wrap.dataset.rrWheelScroll === "true") return;
    wrap.dataset.rrWheelScroll = "true";

    wrap.addEventListener("wheel", (event) => {
      const delta = getTableWheelDelta({
        scrollLeft: wrap.scrollLeft,
        clientWidth: wrap.clientWidth,
        scrollWidth: wrap.scrollWidth,
        deltaX: event.deltaX,
        deltaY: event.deltaY,
      });
      if (delta === 0) return;

      event.preventDefault();
      wrap.scrollLeft += delta;
    }, { passive: false });
  });
}

if (typeof document !== "undefined") {
  initTableWheelScroll();
  document.addEventListener("readrun:remount", () => initTableWheelScroll());
}
