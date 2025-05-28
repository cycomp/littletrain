import { setScale } from "./trackEditor.js"
const svg = document.getElementById('editor');

export const pointers = new Map();


let pinch = {
  active: false,
  id1: null,
  id2: null,
  prevDistance: null,
  prevCenterSVG: null
};

svg.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  svg.setPointerCapture(e.pointerId);

  if (pointers.size === 2 && !pinch.active) {
    // Start pinch gesture
    const ids = Array.from(pointers.keys());
    pinch.id1 = ids[0];
    pinch.id2 = ids[1];
    pinch.active = true;

    const p1 = pointers.get(pinch.id1);
    const p2 = pointers.get(pinch.id2);
    const center = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };

    const pt = svg.createSVGPoint();
    pt.x = center.x;
    pt.y = center.y;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      pinch.prevCenterSVG = pt.matrixTransform(ctm.inverse());
    }

    pinch.prevDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }
});

svg.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;

  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pinch.active && pointers.has(pinch.id1) && pointers.has(pinch.id2)) {
    const p1 = pointers.get(pinch.id1);
    const p2 = pointers.get(pinch.id2);

    const newDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const delta = newDistance / pinch.prevDistance;

    // Dead zone to prevent flicker when distance change is tiny
    if (Math.abs(delta - 1) < 0.005) return;

    setScale(pinch.prevCenterSVG, delta);

    pinch.prevDistance = newDistance;
  }
});

svg.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId);
  svg.releasePointerCapture(e.pointerId);

  if (e.pointerId === pinch.id1 || e.pointerId === pinch.id2) {
    pinch = {
      active: false,
      id1: null,
      id2: null,
      prevDistance: null,
      prevCenterSVG: null
    };
  }
});

svg.addEventListener("pointercancel", (e) => {
  pointers.delete(e.pointerId);
  if (e.pointerId === pinch.id1 || e.pointerId === pinch.id2) {
    pinch = {
      active: false,
      id1: null,
      id2: null,
      prevDistance: null,
      prevCenterSVG: null
    };
  }
});
