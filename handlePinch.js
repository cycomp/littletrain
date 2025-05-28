import { setScale } from "./trackEditor.js"

export const pointers = new Map();
let pinchPrevCenter = null;
let pinchPrevDistance = null;
const svg = document.getElementById('editor');

svg.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  svg.setPointerCapture(e.pointerId);
});


svg.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId);
  svg.releasePointerCapture(e.pointerId);

  if (pointers.size < 2) {
    pinchPrevCenter = null;
    pinchPrevDistance = null;
  }
});


svg.addEventListener("pointercancel", (e) => {
  pointers.delete(e.pointerId);

  if (pointers.size < 2) {
    pinchPrevCenter = null;
    pinchPrevDistance = null;
  }
});

svg.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;

  const pointer = pointers.get(e.pointerId);
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointers.set(e.pointerId, pointer);

  if (pointers.size === 2) {
    const [p1, p2] = Array.from(pointers.values());

    const currCenter = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
    const currDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);

    if (pinchPrevCenter && pinchPrevDistance) {
      const scaleDelta = currDistance / pinchPrevDistance;

      const svgPt = svg.createSVGPoint();
      svgPt.x = currCenter.x;
      svgPt.y = currCenter.y;

      const ctm = svg.getScreenCTM();
      if (!ctm) return;

      const svgCoord = svgPt.matrixTransform(ctm.inverse());
      setScale(svgCoord, scaleDelta);
    }

    pinchPrevCenter = currCenter;
    pinchPrevDistance = currDistance;
  }
});



