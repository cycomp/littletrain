import { setScale } from "./trackEditor.js";

function debugLog(msg) {
  const box = document.getElementById("debug");
  box.innerText = msg;
}

const svg = document.getElementById("editor");

export let isZooming = false;
let pinchPrevCenter = null;
let pinchPrevDistance = null;

svg.addEventListener("touchstart", (e) => {
  debugLog("touchstart");
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
  debugLog("touchend");
  if (e.touches.length < 2) {
    isZooming = false;
    pinchPrevCenter = null;
    pinchPrevDistance = null;
  }
}, { passive: false });

svg.addEventListener("touchcancel", () => {
  debugLog("touchcancel");
  isZooming = false;
  pinchPrevCenter = null;
  pinchPrevDistance = null;
});

svg.addEventListener("pointercancel", () => {
  isZooming = false;
})
