import "@ui-sdk/web/hover-card";
import { createRovingFocus, definePrimitive, spatialMove } from "@ui-sdk/core";
import { createParts } from "@ui-sdk/web";
import "./flow.css";

const flow = definePrimitive({
  name: "docs-flow",
  state: () => ({ focused: null as string | null }),
  api: (context) => ({
    roving: createRovingFocus(context, { slot: "node", key: "focused", move: spatialMove() }),
  }),
  slots: (slot) => ({
    root: slot({}),
    node: slot<{ value: string }>({
      props: { value: "string" },
      attrs: (state, part) => ({ tabindex: part.api.roving.tabIndex(state, part) }),
      on: { keydown: (event, { el, api }) => el && api.roving.keydown(event, el) },
      bind: (el, part) => part.api.roving.bind(el, part),
    }),
  }),
});

createParts(flow, {
  root: "docs-flow",
  node: { tag: "docs-flow-node", target: (el) => el.querySelector("a") },
});
