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

  const thisPointer = pointers.get(e.pointerId);
  thisPointer.x = e.clientX;
  thisPointer.y = e.clientY;

  // Update the map explicitly
  pointers.set(e.pointerId, thisPointer);

  if (pointers.size === 2) {
    const entries = Array.from(pointers.entries());
    const [aId, a] = entries[0];
    const [bId, b] = entries[1];

    if (!a.prev || !b.prev) {
      a.prev = { x: a.x, y: a.y };
      b.prev = { x: b.x, y: b.y };
      pointers.set(aId, a);
      pointers.set(bId, b);
      return;
    }

    const prevDist = Math.hypot(a.prev.x - b.prev.x, a.prev.y - b.prev.y);
    const currDist = Math.hypot(a.x - b.x, a.y - b.y);
    const scaleDelta = currDist / prevDist;

    const centerX = (a.x + b.x) / 2;
    const centerY = (a.y + b.y) / 2;

    const cursor = svg.createSVGPoint();
    cursor.x = centerX;
    cursor.y = centerY;
    const svgPt = cursor.matrixTransform(svg.getScreenCTM().inverse());
    setScale(svgPt, scaleDelta);

    a.prev = { x: a.x, y: a.y };
    b.prev = { x: b.x, y: b.y };
    pointers.set(aId, a);
    pointers.set(bId, b);
  }
});