"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { Scene, SceneElement } from "../designer.validator";
import { constrainToArea } from "../render/geometry";

const MAX_HISTORY = 60;

type State = { scene: Scene; past: Scene[]; future: Scene[]; gestureStart: Scene | null };

type Action =
  | { type: "apply"; update: (scene: Scene) => Scene }
  | { type: "begin" }
  | { type: "end" }
  | { type: "undo" }
  | { type: "redo" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "apply": {
      const next = action.update(state.scene);
      if (next === state.scene) return state;
      // Inside a gesture, intermediate frames aren't recorded; the gesture becomes one undo step at "end".
      if (state.gestureStart) return { ...state, scene: next };
      return { scene: next, past: [...state.past.slice(-MAX_HISTORY + 1), state.scene], future: [], gestureStart: null };
    }
    case "begin":
      return { ...state, gestureStart: state.scene };
    case "end": {
      const start = state.gestureStart;
      if (!start || start === state.scene) return { ...state, gestureStart: null };
      return { ...state, past: [...state.past.slice(-MAX_HISTORY + 1), start], future: [], gestureStart: null };
    }
    case "undo": {
      if (state.past.length === 0) return state;
      return { scene: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.scene, ...state.future], gestureStart: null };
    }
    case "redo": {
      if (state.future.length === 0) return state;
      return { scene: state.future[0], past: [...state.past, state.scene], future: state.future.slice(1), gestureStart: null };
    }
  }
}

/** Applies the print-area lock to an element after any change (PRD §06). */
function constrained(scene: Scene, el: SceneElement): SceneElement {
  const area = scene.printAreas.find((a) => a.id === el.printAreaId) ?? scene.printAreas[0];
  return constrainToArea({ ...el, printAreaId: area.id }, area, { keepAspect: el.type === "image" });
}

/** Scene state with undo/redo; every element change passes through the print-area constraint. */
export function useSceneHistory(initial: Scene) {
  const [state, dispatch] = useReducer(reducer, { scene: initial, past: [], future: [], gestureStart: null });

  const apply = useCallback((update: (scene: Scene) => Scene) => dispatch({ type: "apply", update }), []);

  const actions = useMemo(
    () => ({
      apply,
      updateElement: (id: string, patch: Partial<SceneElement>) =>
        apply((s) => ({
          ...s,
          elements: s.elements.map((el) => (el.id === id ? constrained(s, { ...el, ...patch } as SceneElement) : el)),
        })),
      addElement: (el: SceneElement) => apply((s) => ({ ...s, elements: [...s.elements, constrained(s, el)] })),
      removeElement: (id: string) => apply((s) => ({ ...s, elements: s.elements.filter((el) => el.id !== id) })),
      moveLayer: (id: string, direction: 1 | -1) =>
        apply((s) => {
          const i = s.elements.findIndex((el) => el.id === id);
          const j = i + direction;
          if (i < 0 || j < 0 || j >= s.elements.length) return s;
          const elements = [...s.elements];
          [elements[i], elements[j]] = [elements[j], elements[i]];
          return { ...s, elements };
        }),
      replace: (next: Scene) => apply(() => next),
      beginGesture: () => dispatch({ type: "begin" }),
      endGesture: () => dispatch({ type: "end" }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
    }),
    [apply],
  );

  return { scene: state.scene, canUndo: state.past.length > 0, canRedo: state.future.length > 0, ...actions };
}

export type SceneHistory = ReturnType<typeof useSceneHistory>;
