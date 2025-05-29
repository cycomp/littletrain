import { setScale } from "./trackEditor.js"
const svg = document.getElementById('editor');


let isZooming = false;
let startTouches = null;
let startMidpoint = null;
let startDistance = null;

function getMidpoint(t1, t2) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  };
}


function getDistance(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}


svg.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    isZooming = true;
    startTouches = [e.touches[0], e.touches[1]];
    startMidpoint = getMidpoint(...startTouches);
    startDistance = getDistance(...startTouches);
  }
}, { passive: false });

svg.addEventListener("touchmove", (e) => {
  if (isZooming && e.touches.length === 2) {
    e.preventDefault();

    const currentTouches = [e.touches[0], e.touches[1]];
    const currentMidpoint = getMidpoint(...currentTouches);
    const currentDistance = getDistance(...currentTouches);

    if (startDistance > 0) {
      const scaleDelta = currentDistance / startDistance;
      setScale(startMidpoint, scaleDelta);
    }
  }
}, { passive: false });

svg.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) {
    isZooming = false;
    startTouches = null;
    startDistance = null;
    startMidpoint = null;
  }
}, { passive: false });
