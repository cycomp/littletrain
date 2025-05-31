import { isZooming } from "./handlePinch.js"


const svg = document.getElementById('editor');
const viewport = document.getElementById("viewport");


function debugLog(msg) {
  const box = document.getElementById("debug");
  box.innerText = msg;
}

let viewState = {
  scale: 1,
  x: 0,
  y: 0
};

export function resetView() {
  viewState.x = 0;
  viewState.y = 0;
  viewState.scale = 1;

  updateViewTransform(); // apply to the SVG
  drawGrid();            // redraw the grid to match
}


function updateViewTransform() {
  viewport.setAttribute(
    "transform",
    `translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`
  );
}

const minScale = 0.4;
const maxScale = 8;

export function setScale(cursor, scaleDelta) {
  const proposedScale = viewState.scale * scaleDelta;

  
  // Clamp the scale
  const clampedScale = Math.max(minScale, Math.min(maxScale, proposedScale));

  // If scale was clamped, recompute delta so zoom stays centered
  const actualScaleDelta = clampedScale / viewState.scale;

  // Adjust translation to keep zoom centered on cursor
  viewState.x = cursor.x - ((cursor.x - viewState.x) * actualScaleDelta);
  viewState.y = cursor.y - ((cursor.y - viewState.y) * actualScaleDelta);
  viewState.scale = clampedScale;
  
  updateViewTransform();
  drawGrid();
}

export function zoomToFit(bbox, svgElement) {
  console.log(bbox);
  const bboxWidth = bbox.maxX - bbox.minX;
  const bboxHeight = bbox.maxY - bbox.minY;

  const viewportWidth = svgElement.clientWidth;
  const viewportHeight = svgElement.clientHeight;

  // Add padding (10%)
  const padding = 0.1;
  const paddedWidth = bboxWidth * (1 + padding);
  const paddedHeight = bboxHeight * (1 + padding);

  // Compute the scale
  const scaleX = viewportWidth / paddedWidth;
  const scaleY = viewportHeight / paddedHeight;
  const scale = Math.min(scaleX, scaleY);

  // Clamp scale
  const clampedScale = Math.max(minScale, Math.min(maxScale, scale));

  // Center of bounding box in world coordinates
  const bboxCenterX = (bbox.minX + bbox.maxX) / 2;
  const bboxCenterY = (bbox.minY + bbox.maxY) / 2;

  // Center of viewport in screen coordinates
  const viewCenterX = viewportWidth / 2;
  const viewCenterY = viewportHeight / 2;

  // Compute view translation so bbox center maps to viewport center
  viewState.scale = clampedScale;
  viewState.x = viewCenterX - bboxCenterX * clampedScale;
  viewState.y = viewCenterY - bboxCenterY * clampedScale;

  updateViewTransform();
  drawGrid();
}



svg.addEventListener("wheel", (e) => {
  //debugLog("wheel");
  e.preventDefault();
  const zoomFactor = 1.1;
  const mouse = svg.createSVGPoint();
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  const cursor = mouse.matrixTransform(svg.getScreenCTM().inverse());

  const scaleDelta = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
  setScale(cursor, scaleDelta);
}, { passive: false });


let isPanning = false;
let panStart = { x: 0, y: 0 };


svg.addEventListener("pointerdown", (e) => {
  //debugLog("Zooming "+isZooming);
  if (e.target === svg && isZooming === false) {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    svg.setPointerCapture(e.pointerId);
  }
});

svg.addEventListener("pointermove", (e) => {
  //debugLog("Zooming "+isZooming);
  if (isPanning && isZooming === false) {
    // Convert previous screen position to SVG coordinates
    const startPoint = svg.createSVGPoint();
    startPoint.x = panStart.x;
    startPoint.y = panStart.y;
    const startSVG = startPoint.matrixTransform(svg.getScreenCTM().inverse());
    
    // Convert current screen position to SVG coordinates
    const currentPoint = svg.createSVGPoint();
    currentPoint.x = e.clientX;
    currentPoint.y = e.clientY;
    const currentSVG = currentPoint.matrixTransform(svg.getScreenCTM().inverse());
    
    // Subtract in SVG space
    const dx = currentSVG.x - startSVG.x;
    const dy = currentSVG.y - startSVG.y;
    
    // Apply delta to view state
    viewState.x += dx;
    viewState.y += dy;
    
    panStart = { x: e.clientX, y: e.clientY };
    updateViewTransform();
    drawGrid();

  } else {
    isPanning = false;
  }
});

svg.addEventListener("pointerup", (e) => {
  //debugLog("Zooming "+isZooming);
  if (isPanning) {
    isPanning = false;
    svg.releasePointerCapture(e.pointerId);
  }
});

export function setPieceIdCounter(newValue) {
  pieceIdCounter = newValue;
}

function resizeSVG() {
  svg.setAttribute('width', window.innerWidth);
  svg.setAttribute('height', window.innerHeight);
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  drawGrid();
  //const bin = document.getElementById('bin');
  //let x = window.innerWidth - 50;
  //let y = window.innerHeight - 50;
  //bin.setAttribute('transform', `translate(${x}, ${y})`);
}

window.addEventListener('resize', resizeSVG);
window.addEventListener('DOMContentLoaded', resizeSVG);


const trackPieces = {
  straight: [
    { type: "straight20", svg: `<line x1="0" y1="24" x2="20" y2="24" stroke="black" stroke-width="4"/>` },
    { type: "straight40", svg: `<line x1="0" y1="24" x2="40" y2="24" stroke="black" stroke-width="4"/>` },
    { type: "straight60", svg: `<line x1="0" y1="24" x2="60" y2="24" stroke="black" stroke-width="4"/>` },
    { type: "straight80", svg: `<line x1="0" y1="24" x2="80" y2="24" stroke="black" stroke-width="4"/>` }
  ],
  curved90: [
    { type: "rad40curve90", svg: `<path d="M0 0 A 40 40 0 0 1 40 40" stroke="black" stroke-width="4" fill="none"/>` },  
    { type: "rad60curve90", svg: `<path d="M0 0 A 60 60 0 0 1 60 60" stroke="black" stroke-width="4" fill="none"/>` },
    { type: "rad80curve90", svg: `<path d="M0 0 A 80 80 0 0 1 80 80" stroke="black" stroke-width="4" fill="none"/>` } 
  ],
  curved45: [
    { type: "rad40curve45", svg: `<path d="M0 0 A 40 40 0 0 1 28.28 11.72" stroke="black" stroke-width="4" fill="none" />` },
    { type: "rad60curve45", svg: `<path d="M0 0 A 60 60 0 0 1 42.43 17.57" stroke="black" stroke-width="4" fill="none" />` },
    { type: "rad80curve45", svg: `<path d="M0 0 A 80 80 0 0 1 56.57 23.43" stroke="black" stroke-width="4" fill="none" />` }, 
  ],
  points: [
    { type: "lhPoints", svg: `
      <line x1="0" y1="24" x2="20" y2="24" stroke="black" stroke-width="4"/>
      <path d="M0 24 A 40 40 0 0 0 20 14" stroke="black" stroke-width="4" fill="none" />
    ` },
    { type: "smallCurveL", svg: `<path d="M0 24 A 40 40 0 0 0 20 14" stroke="black" stroke-width="4" fill="none" />` },
    { type: "rhPoints", svg: `
      <line x1="0" y1="24" x2="20" y2="24" stroke="black" stroke-width="4"/>
      <path d="M0 24 A 40 40 0 0 1 20 34" stroke="black" stroke-width="4" fill="none" />
    ` },
    { type: "smallCurveR", svg: `<path d="M0 24 A 40 40 0 0 1 20 34" stroke="black" stroke-width="4" fill="none" />` } 
  ],
};

document.getElementById("rotate").addEventListener("click", rotateActivePiece);

function rotateActivePiece() {
  console.log("rotate active piece")
  console.log(activePiece);
  if (activePiece) {
    rotatePiece(activePiece, 45);    
  }
}

document.getElementById("bin").addEventListener("click", deleteActivePiece);

function deleteActivePiece() {
  console.log(allPieces, activePiece);
  if (activePiece) {
    allPieces = allPieces.filter(p => p !== activePiece);
    viewport.removeChild(activePiece);
    activePiece = undefined;
  }
  console.log(allPieces);
}


const trackButton = document.getElementById("track");
const trackTypeMenu = document.getElementById("track-type-menu");
const pieceMenu = document.getElementById('track-piece-menu');
//console.log(trackButton);

// Toggle the type menu when clicking the track button
trackButton.addEventListener('pointerdown', (e) => {
  e.stopPropagation();
  const isHidden = trackTypeMenu.classList.toggle("show");
  pieceMenu.classList.remove("show"); // always hide piece menu on main toggle
});

// When a track type is clicked (e.g., straight, curved90, etc.)
trackTypeMenu.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest("button[data-type]");
  if (!btn) return;

  const type = btn.dataset.type;
  if (!type) return;

  pieceMenu.innerHTML = '';

  console.log("Clicked type:", type);
  console.log("Track pieces for type:", trackPieces[type]);

  trackPieces[type].forEach((icon) => {
    const trackBtn = document.createElement('button');
    trackBtn.className = "track-icon-button track-icon";
    trackBtn.setAttribute("data-type", icon.type);
    trackBtn.innerHTML = `<svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg">${icon.svg}</svg>`;
    trackBtn.addEventListener("pointerdown", () => {
      console.log("Selected track type:", icon.type);
      trackTypeMenu.classList.remove("show");
      pieceMenu.classList.remove("show");
    });
    pieceMenu.appendChild(trackBtn);
  });
  
  const rect = e.target.getBoundingClientRect();
  pieceMenu.style.top = `${rect.top - 10}px`;         // Align top
  pieceMenu.style.left = `${rect.right + 10}px`; // Position right of the button
  pieceMenu.classList.add("show");
});




// Close menus on outside click
document.addEventListener("pointerdown", (e) => {
  if (
    !trackTypeMenu.contains(e.target) &&
    !trackButton.contains(e.target) &&
    !pieceMenu.contains(e.target)
  ) {
    trackTypeMenu.classList.remove("show");
    pieceMenu.classList.remove("show");
  }
});

// Close menus on ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    trackTypeMenu.classList.remove("show");
    pieceMenu.classList.remove("show");
  }
});



let dragTarget = null;
let offset = {x:0, y:0};
const gridSize = 20;
const snapDistance = 10;  // Distance to snap pieces to each other

function drawGrid() {
  const gridGroup = svg.querySelector('.grid');
  if (!gridGroup) return;

  gridGroup.innerHTML = ''; // Clear old grid lines

  const transform = viewport.getCTM();
  if (!transform) return;

  const inverseTransform = transform.inverse();

  const svgRect = svg.getBoundingClientRect();

  // Four corners of the viewport in screen coordinates
  const topLeft = svg.createSVGPoint();
  const bottomRight = svg.createSVGPoint();
  topLeft.x = 0;
  topLeft.y = 0;
  bottomRight.x = svgRect.width;
  bottomRight.y = svgRect.height;

  // Convert screen points to SVG space
  const svgTopLeft = topLeft.matrixTransform(inverseTransform);
  const svgBottomRight = bottomRight.matrixTransform(inverseTransform);

  // Get min/max extents
  const minX = Math.floor(svgTopLeft.x / gridSize) * gridSize;
  const minY = Math.floor(svgTopLeft.y / gridSize) * gridSize;
  const maxX = Math.ceil(svgBottomRight.x / gridSize) * gridSize;
  const maxY = Math.ceil(svgBottomRight.y / gridSize) * gridSize;

  // Draw vertical lines
  for (let x = minX; x <= maxX; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', minY);
    line.setAttribute('x2', x);
    line.setAttribute('y2', maxY);
    line.setAttribute('stroke', '#eee');
    line.setAttribute('stroke-width', 1);
    line.setAttribute("pointer-events", "none");
    gridGroup.appendChild(line);
  }

  // Draw horizontal lines
  for (let y = minY; y <= maxY; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', minX);
    line.setAttribute('y1', y);
    line.setAttribute('x2', maxX);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#eee');
    line.setAttribute('stroke-width', 1);
    line.setAttribute("pointer-events", "none");
    gridGroup.appendChild(line);
  }
}



  
// Array to store the details of all the track pieces
export let allPieces = [];

function getTransformedEndpoint(g, point) {
  const svgPoint = svg.createSVGPoint();
  svgPoint.x = point.x;
  svgPoint.y = point.y;

  // Get global (screen-space) position of the point
  const localCTM = g.getCTM();
  const global = svgPoint.matrixTransform(localCTM);

  // Convert to world coordinates in viewport space
  const world = global.matrixTransform(viewport.getScreenCTM().inverse());
  return world;
}

// Function to find the closest endpoint
function getClosestEndpoint(targetPiece) {
  //console.log(targetPiece.endpoints);
  let closest = null;
  let minDistance = Infinity;

  const targetPieceWorldEndpoints = targetPiece.endpoints.map(pt => getTransformedEndpoint(targetPiece, pt));

  allPieces.forEach(piece => {
    if (piece === targetPiece) return; //skip checking self
    const testPieceWorldEndpoints = piece.endpoints.map(pt => getTransformedEndpoint(piece, pt));

    testPieceWorldEndpoints.forEach(otherPt => {
      targetPieceWorldEndpoints.forEach((dragPt, dragIndex) => {
        const dist = Math.hypot(dragPt.x - otherPt.x, dragPt.y - otherPt.y);
        if (dist < minDistance && dist < snapDistance) {
          minDistance = dist;
          closest = {
            staticPiece: piece,
            staticPoint: otherPt,
            dragIndex: dragIndex,
            snapTo: dragPt,
            target: otherPt
          };
        }
      });
    });
  });
  
  return closest;
}


document.addEventListener('keydown', (e) => {
  if (!activePiece) return;

  if (e.key === 'ArrowLeft') {
    rotatePiece(activePiece, -45)
  }
  if (e.key === 'ArrowRight') {
    rotatePiece(activePiece, 45)
  }

  if (e.key === 'Delete' || e.key === "Backspace") {
    deleteActivePiece();
  }
});

function rotatePiece(piece, rotation) {
  console.log(piece, rotation);
  
  // Store rotation if not already there
  if (activePiece.rotation === undefined) activePiece.rotation = 0;

  
  piece.rotation += rotation;
  
  // Snap rotation to 0-360
  piece.rotation = (piece.rotation + 360) % 360;
  
  updateTransform(piece);
  
}

  
export function updateTransform(target) {
  //console.log(target);
  //const transform = target.getAttribute('transform');
  //const match = transform.match(/translate\(([^)]+)\)/);
  //if (!match) return;

  const x = target.x || 0;
  const y = target.y || 0;
  const rotation = target.rotation || 0;

  target.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotation})`);
  //console.log(target);
}

let activePiece;

document.addEventListener('pointerdown', (e) => {
  const icon = e.target.closest('.track-icon');
  const piece = e.target.closest('.track-piece');
  //console.log(e.target);

  if (icon) {
    const type = icon.dataset.type;
    let newPiece = createPiece(type, e.clientX, e.clientY);
    dragTarget = newPiece;
    //viewport.appendChild(dragTarget); // <--- make sure it's added to the SVG!
    if (activePiece) {
      changePieceColour(activePiece, "black");
    }
    activePiece = newPiece;
    changePieceColour(newPiece, "red");
  }
  else if (piece) {
    dragTarget = piece;
    console.log(piece);
    if (activePiece) {
      changePieceColour(activePiece, "black");
    }
    activePiece = piece;
    changePieceColour(piece, "red");
  } else {
    //deselect active piece if the rotation or delete buttons hasn't been clicked on
    //console.log(e.target.classList);
    if (!e.target.classList.contains("pieceEffector")) {
      if (activePiece) {
        changePieceColour(activePiece, "black");
        activePiece = undefined;
      }
    }
    
  }

  if(dragTarget) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorpt = pt.matrixTransform(viewport.getScreenCTM().inverse());
    offset.x = cursorpt.x - getTranslate(dragTarget).x;
    offset.y = cursorpt.y - getTranslate(dragTarget).y;
  }
});


function getTranslate(piece) {
  const transform = piece.getAttribute('transform');
  if (!transform) {
    onsole.error("piece does not have a translation");
    return { x: 0, y: 0 };
  } 
  const match = /translate\(([^,]+),([^)]+)\)/.exec(transform);
  return {x: parseFloat(match[1]), y: parseFloat(match[2])};
}

function changePieceColour(piece, colourString) {
  const descendants = piece.querySelectorAll('*');
  
  descendants.forEach(el => {
    el.setAttribute('stroke', colourString);
  });
}

document.addEventListener('pointermove', (e) => {
  if(dragTarget) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorpt = pt.matrixTransform(viewport.getScreenCTM().inverse());
    //dragTarget.setAttribute('transform', `translate(${cursorpt.x}, ${cursorpt.y})`);
    
    //Store current position
    dragTarget.x = cursorpt.x - offset.x;
    dragTarget.y = cursorpt.y - offset.y;
    updateTransform(dragTarget);
  }
});

document.addEventListener('pointerup', (e) => {
  if (dragTarget) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorpt = pt.matrixTransform(viewport.getScreenCTM().inverse());

    
    const snappedX = Math.round((cursorpt.x - offset.x) / gridSize) * gridSize;
    const snappedY = Math.round((cursorpt.y - offset.y) / gridSize) * gridSize;

    
    // Get closest endpoint to snap to
    const snap = getClosestEndpoint(dragTarget);

    if (snap) {
      //console.log(snap)
      const dragPt = dragTarget.endpoints[snap.dragIndex];
      
      const dx = snap.target.x - snap.snapTo.x;
      const dy = snap.target.y - snap.snapTo.y;

      dragTarget.x = (dragTarget.x || 0) + dx;
      dragTarget.y = (dragTarget.y || 0) + dy;
  
    } else {
      dragTarget.x = snappedX;
      dragTarget.y = snappedY;
    }
    
    updateTransform(dragTarget);
    dragTarget = null;
  }
});


export let pieceIdCounter = 0;
export const point1 = "0";
export const point2 = "1";
export const point3 = "2";


function getLayoutBoundingBox(pieces) {

}

export function createPiece(type, x, y) {
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const cursorpt = pt.matrixTransform(viewport.getScreenCTM().inverse());

  const g = document.createElementNS("http://www.w3.org/2000/svg", 'g');
  g.classList.add('track-piece');
  g.setAttribute('transform', `translate(${cursorpt.x},${cursorpt.y})`);

  let endpoints = [];
  let connections = new Map();
  let activeEndpoint = null;


  switch(type) {
    case 'straight20':
      g.innerHTML = `<line x1="0" y1="0" x2="20" y2="0" stroke="black" stroke-width="6"/>`;
      endpoints = [{x: 0, y: 0}, {x: 20, y: 0}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'straight40':
      g.innerHTML = `<line x1="0" y1="0" x2="40" y2="0" stroke="black" stroke-width="6"/>`;
      endpoints = [{x: 0, y: 0}, {x: 40, y: 0}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'straight60':
      g.innerHTML = `<line x1="0" y1="0" x2="60" y2="0" stroke="black" stroke-width="6"/>`;
      endpoints = [{x: 0, y: 0}, {x: 60, y: 0}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'straight80':
      g.innerHTML = `<line x1="0" y1="0" x2="80" y2="0" stroke="black" stroke-width="6"/>`;
      endpoints = [{x: 0, y: 0}, {x: 80, y: 0}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'rad40curve90':
      g.innerHTML = `<path d="M 0 0 A 40 40 0 0 1 40 40" stroke="black" stroke-width="6" fill="none"/>`;
      endpoints = [{x: 0, y: 0}, {x: 40, y: 40}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'rad40curve45':
      g.innerHTML = `<path d="M0 0 A 40 40 0 0 1 28.28 11.72" stroke="black" stroke-width="6" fill="none" />`;
      endpoints = [{x: 0, y: 0}, {x: 28.28, y: 11.72}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'rad60curve90':
      g.innerHTML = `<path d="M 0 0 A 60 60 0 0 1 60 60" stroke="black" stroke-width="6" fill="none"/>`;
      endpoints = [{x: 0, y: 0}, {x: 60, y: 60}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'rad60curve45':
      g.innerHTML = `<path d="M0 0 A 60 60 0 0 1 42.43 17.57" stroke="black" stroke-width="6" fill="none" />`;
      endpoints = [{x: 0, y: 0}, {x: 42.43, y: 17.57}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'rad80curve90':
      g.innerHTML = `<path d="M 0 0 A 80 80 0 0 1 80 80" stroke="black" stroke-width="6" fill="none"/>`;
      endpoints = [{x: 0, y: 0}, {x: 80, y: 80}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'rad80curve45':
      g.innerHTML = `<path d="M0 0 A 80 80 0 0 1 56.57 23.43" stroke="black" stroke-width="6" fill="none" />`;
      endpoints = [{x: 0, y: 0}, {x: 56.57, y: 23.43}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'lhPoints':
      g.innerHTML = ` <line x1="0" y1="0" x2="20" y2="0" stroke="black" stroke-width="6"/>
                      <path d="M0 0 A 40 40 0 0 0 20 -10" stroke="black" stroke-width="6" fill="none" />`;
      endpoints = [{x: 0, y: 0}, {x: 20, y: 0}, {x:20, y:-10}];
      connections.set(point1, [point2, point3]);
      connections.set(point2, [point1]);
      connections.set(point3, [point1]);
      activeEndpoint = point2;
      break; 
    case 'rhPoints':
      g.innerHTML = ` <line x1="0" y1="0" x2="20" y2="0" stroke="black" stroke-width="6"/>
                      <path d="M0 0 A 40 40 0 0 1 20 10" stroke="black" stroke-width="6" fill="none" />`;
      endpoints = [{x: 0, y: 0}, {x: 20, y: 0}, {x:20, y:10}];
      connections.set(point1, [point2, point3]);
      connections.set(point2, [point1]);
      connections.set(point3, [point1]);
      activeEndpoint = point2;
      break;
    case 'smallCurveR':
      g.innerHTML = `<path d="M0 0 A 40 40 0 0 1 20 10" stroke="black" stroke-width="6" fill="none" />`;
      endpoints = [{x: 0, y: 0}, {x: 20, y: 10}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    case 'smallCurveL':
      g.innerHTML = `<path d="M0 0 A 40 40 0 0 0 20 -10" stroke="black" stroke-width="6" fill="none" />`;
      endpoints = [{x: 0, y: 0}, {x: 20, y: -10}];
      connections.set(point1, [point2]);
      connections.set(point2, [point1]);
      break;
    
    
    
  }
  
  g.dataset.type = type;
  g.dataset.id = `piece-${pieceIdCounter++}`; // Assign unique ID
  
  g.endpoints = endpoints;
  g.connections = connections;
  g.activeEndpoint = activeEndpoint;

  //console.log(g.connections);
  
  viewport.appendChild(g);
  allPieces.push(g);
  
  return g;
}

