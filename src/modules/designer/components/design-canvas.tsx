"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DESIGN_LIMITS } from "@/constants/limits";
import type { Scene, SceneElement } from "../designer.validator";
import type { FontSet } from "../render/fonts";
import { elementSvg, type RenderContext } from "../render/scene-svg";
import type { SceneIssue } from "../render/validate";
import type { SceneHistory } from "./use-scene-history";

type DragKind = "move" | "resize" | "rotate";
type Drag = { kind: DragKind; id: string; start: { x: number; y: number }; origin: SceneElement; pointerId: number };

const MIN_SIZE_MM = 3;
const SNAP_DEGREES = 15;
const SNAP_TOLERANCE = 4;

function centre(el: SceneElement) {
  return { x: el.xMm + el.widthMm / 2, y: el.yMm + el.heightMm / 2 };
}

function rotate(p: { x: number; y: number }, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  return { x: p.x * Math.cos(rad) - p.y * Math.sin(rad), y: p.x * Math.sin(rad) + p.y * Math.cos(rad) };
}

function transformFor(el: SceneElement) {
  return `translate(${el.xMm} ${el.yMm}) rotate(${el.rotation} ${el.widthMm / 2} ${el.heightMm / 2})`;
}

/** The gesture's next element state; the scene history then constrains it to the print area. */
function gesturePatch(drag: Drag, p: { x: number; y: number }): Partial<SceneElement> {
  const o = drag.origin;
  if (drag.kind === "move") {
    return { xMm: o.xMm + p.x - drag.start.x, yMm: o.yMm + p.y - drag.start.y };
  }
  const c = centre(o);
  if (drag.kind === "rotate") {
    let angle = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90;
    const snapped = Math.round(angle / SNAP_DEGREES) * SNAP_DEGREES;
    if (Math.abs(angle - snapped) < SNAP_TOLERANCE) angle = snapped;
    return { rotation: Math.round(((angle + 540) % 360) - 180) };
  }
  // Resize symmetrically about the centre, measured in the element's own (rotated) frame.
  const local = rotate({ x: p.x - c.x, y: p.y - c.y }, -o.rotation);
  let w = Math.max(MIN_SIZE_MM, Math.abs(local.x) * 2);
  let h = Math.max(MIN_SIZE_MM, Math.abs(local.y) * 2);
  if (o.type === "image") {
    const scale = Math.max(w / o.widthMm, h / o.heightMm);
    w = o.widthMm * scale;
    h = o.heightMm * scale;
  }
  const patch: Partial<SceneElement> = { widthMm: w, heightMm: h, xMm: c.x - w / 2, yMm: c.y - h / 2 };
  if (o.type === "text") {
    // Text grows and shrinks with its box so resizing feels direct; fitting still keeps it inside.
    const ratio = h / o.heightMm;
    const size = Math.min(DESIGN_LIMITS.maxFontSizePt, Math.max(DESIGN_LIMITS.minFontSizePt, Math.round(o.fontSizePt * ratio * 4) / 4));
    Object.assign(patch, { fontSizePt: size, fit: { ...o.fit, maxPt: Math.max(o.fit.minPt, size) } });
  }
  return patch;
}

export function DesignCanvas({
  scene,
  fonts,
  assetUrls,
  values,
  selectedId,
  onSelect,
  history,
  issues,
}: {
  scene: Scene;
  fonts: FontSet;
  assetUrls: Record<string, string>;
  values?: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  history: SceneHistory;
  issues: SceneIssue[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [mmPerPx, setMmPerPx] = useState(0.3);

  const pad = Math.max(4, scene.bleedMm + 4);
  const view = { x: -pad, y: -pad, w: scene.widthMm + 2 * pad, h: scene.heightMm + 2 * pad };
  const b = scene.bleedMm;

  // Handle sizes are expressed in mm, so they're kept at a constant on-screen size.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => setMmPerPx(view.w / Math.max(1, svg.clientWidth)));
    observer.observe(svg);
    return () => observer.disconnect();
  }, [view.w]);

  const ctx: RenderContext = useMemo(
    () => ({ fonts, values, imageHref: (el) => assetUrls[el.assetPath] ?? null }),
    [fonts, values, assetUrls],
  );

  // Element markup is cached per element object (reset when fonts/values change), so a drag only
  // re-renders the element being moved.
  const cache = useMemo(() => (ctx ? new WeakMap<SceneElement, string>() : null), [ctx]);
  const markup = scene.elements
    .map((el) => {
      let svg = cache?.get(el);
      if (svg === undefined) {
        svg = elementSvg(el, ctx);
        cache?.set(el, svg);
      }
      return svg;
    })
    .join("");

  function toMm(e: { clientX: number; clientY: number }) {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function startDrag(kind: DragKind, el: SceneElement, e: ReactPointerEvent) {
    if (el.locked) return;
    e.stopPropagation();
    e.preventDefault();
    svgRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = { kind, id: el.id, start: toMm(e), origin: el, pointerId: e.pointerId };
    onSelect(el.id);
    history.beginGesture();
  }

  function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    history.updateElement(drag.id, gesturePatch(drag, toMm(e)));
  }

  function endDrag(e: ReactPointerEvent) {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = null;
    history.endGesture();
  }

  const selected = scene.elements.find((el) => el.id === selectedId) ?? null;
  const errorIds = new Set(issues.filter((i) => i.severity === "error").map((i) => i.elementId));
  const handle = 7 * mmPerPx;
  const stroke = 1.5 * mmPerPx;

  return (
    <svg
      ref={svgRef}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      className="block h-auto max-h-[68vh] w-full touch-none select-none"
      onPointerDown={() => onSelect(null)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="application"
      aria-label="Design canvas"
    >
      <defs>
        <pattern id="bleed-hatch" width={2} height={2} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={2} height={2} fill="rgba(194,42,42,0.08)" />
          <line x1={0} y1={0} x2={0} y2={2} stroke="rgba(194,42,42,0.25)" strokeWidth={0.4} />
        </pattern>
      </defs>

      <rect x={-b} y={-b} width={scene.widthMm + 2 * b} height={scene.heightMm + 2 * b} fill={scene.background} />
      <g dangerouslySetInnerHTML={{ __html: markup }} />

      {b > 0 && (
        <path
          d={`M${-b} ${-b}h${scene.widthMm + 2 * b}v${scene.heightMm + 2 * b}h${-(scene.widthMm + 2 * b)}z M0 0v${scene.heightMm}h${scene.widthMm}v${-scene.heightMm}z`}
          fill="url(#bleed-hatch)"
          fillRule="evenodd"
          pointerEvents="none"
        />
      )}
      <rect x={0} y={0} width={scene.widthMm} height={scene.heightMm} fill="none" stroke="#1a2030" strokeWidth={stroke} pointerEvents="none" />
      {scene.printAreas.map((a) => (
        <rect
          key={a.id}
          x={a.xMm}
          y={a.yMm}
          width={a.widthMm}
          height={a.heightMm}
          fill="none"
          stroke="#c8006a"
          strokeWidth={stroke}
          strokeDasharray={`${4 * mmPerPx} ${3 * mmPerPx}`}
          pointerEvents="none"
        />
      ))}

      {scene.elements.map((el) => (
        <g key={el.id} transform={transformFor(el)}>
          <rect
            width={el.widthMm}
            height={el.heightMm}
            fill="transparent"
            stroke={errorIds.has(el.id) ? "#c22a2a" : "none"}
            strokeWidth={stroke}
            strokeDasharray={`${3 * mmPerPx} ${2 * mmPerPx}`}
            className={el.locked ? "" : "cursor-move"}
            onPointerDown={(e) => startDrag("move", el, e)}
          />
        </g>
      ))}

      {selected && (
        <g transform={transformFor(selected)}>
          <rect width={selected.widthMm} height={selected.heightMm} fill="none" stroke="#c8006a" strokeWidth={stroke} pointerEvents="none" />
          <line
            x1={selected.widthMm / 2}
            y1={0}
            x2={selected.widthMm / 2}
            y2={-handle * 2.5}
            stroke="#c8006a"
            strokeWidth={stroke}
            pointerEvents="none"
          />
          <circle
            cx={selected.widthMm / 2}
            cy={-handle * 2.5}
            r={handle / 1.6}
            fill="#ffffff"
            stroke="#c8006a"
            strokeWidth={stroke}
            className="cursor-grab"
            onPointerDown={(e) => startDrag("rotate", selected, e)}
            aria-label="Rotate"
          />
          <rect
            x={selected.widthMm - handle / 2}
            y={selected.heightMm - handle / 2}
            width={handle}
            height={handle}
            fill="#c8006a"
            className="cursor-nwse-resize"
            onPointerDown={(e) => startDrag("resize", selected, e)}
            aria-label="Resize"
          />
        </g>
      )}
    </svg>
  );
}
