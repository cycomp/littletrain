import { setScale } from "./trackEditor.js"
  
const pointers = new Map();
const svg = document.getElementById('editor');

svg.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  svg.setPointerCapture(e.pointerId);
});

svg.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId);
  svg.releasePointerCapture(e.pointerId);
});

svg.addEventListener("pointercancel", (e) => {
  pointers.delete(e.pointerId);
});

svg.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;

  const pointer = pointers.get(e.pointerId);
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointers.set(e.pointerId, pointer);

  if (pointers.size === 2) {
    const [aId, a] = Array.from(pointers.entries())[0];
    const [bId, b] = Array.from(pointers.entries())[1];

    if (!a.prev || !b.prev) {
      a.prev = { x: a.x, y: a.y };
      b.prev = { x: b.x, y: b.y };
      pointers.set(aId, a);
      pointers.set(bId, b);
      return;
    }

    const prevDist = Math.hypot(a.prev.x - b.prev.x, a.prev.y - b.prev.y);
    const currDist = Math.hypot(a.x - b.x, a.y - b.y);

    if (prevDist < 10 || currDist < 10) return;

    const rawScaleDelta = currDist / prevDist;
    const scaleDelta = Math.max(0.9, Math.min(1.1, rawScaleDelta)); // smoother zoom

    const centerX = (a.x + b.x) / 2;
    const centerY = (a.y + b.y) / 2;

    const cursor = svg.createSVGPoint();
    cursor.x = centerX;
    cursor.y = centerY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = cursor.matrixTransform(ctm.inverse());

    setScale(svgPt, scaleDelta);

    a.prev = { x: a.x, y: a.y };
    b.prev = { x: b.x, y: b.y };
    pointers.set(aId, a);
    pointers.set(bId, b);
  }
});
