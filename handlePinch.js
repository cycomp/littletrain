import { setScale } from "./trackEditor.js";

const svg = document.getElementById("editor");

let isZooming = false;
let pinchPrevCenter = null;
let pinchPrevDistance = null;

svg.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    isZooming = true;
  }
}, { passive: false });

svg.addEventListener("touchmove", (e) => {
  if (isZooming && e.touches.length === 2) {
    e.preventDefault();

    const a = e.touches[0];
    const b = e.touches[1];

    const centerClient = {
      x: (a.clientX + b.clientX) / 2,
      y: (a.clientY + b.clientY) / 2,
    };

    const cursor = svg.createSVGPoint();
    cursor.x = centerClient.x;
    cursor.y = centerClient.y;
    const centerSVG = cursor.matrixTransform(svg.getScreenCTM().inverse());

    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    if (pinchPrevCenter && pinchPrevDistance > 0 && Number.isFinite(pinchPrevDistance)) {
      const scaleDelta = distance / pinchPrevDistance;
      if (Number.isFinite(scaleDelta) && scaleDelta !== 1) {
        setScale(pinchPrevCenter, scaleDelta);
      }
    }

    pinchPrevCenter = centerSVG;
    pinchPrevDistance = distance;
  }
}, { passive: false });

svg.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) {
    isZooming = false;
    pinchPrevCenter = null;
    pinchPrevDistance = null;
  }
}, { passive: false });

svg.addEventListener("touchcancel", () => {
  isZooming = false;
  pinchPrevCenter = null;
  pinchPrevDistance = null;
});
