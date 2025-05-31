import { allPieces, point1, point2, point3, resetView, zoomToFit } from "./trackEditor.js"
import { showToast } from "./saveLoadLayouts.js"

function debugLog(msg) {
  const box = document.getElementById("debug");
  box.innerText = msg;
}

let babylonState = null;

function createScene(canvas, engine) {
  const scene = new BABYLON.Scene(engine);

  // Light
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.8;

  return scene;
};

function open3dView(canvas) {
  //console.log("opening 3d view");
  const engine = new BABYLON.Engine(canvas, true);
  const scene = createScene(canvas, engine);
  resetView();
  
  GLOBALS.speed = 0;
  GLOBALS.maxAbsSpeed = 1;
  GLOBALS.directionSign = 1;
  GLOBALS.lastDirectionSign = GLOBALS.directionSign; // Tracks previous direction (for detecting reversals)
  GLOBALS.THRESHOLD = 2;

  // Constants for wheel rotation
  const wheelDiameter = 3;  // Diameter of the wheel
  GLOBALS.wheelCircumference = Math.PI * wheelDiameter;  // Circumference = π * diameter


  //console.log(GLOBALS.speed);
  
  //Begin to display the track
  let trainEngine = convertPiecesToPath(allPieces, scene);

  //hide track editor and display simulationView
  let editorView = document.getElementById("editorView");
  let simulationView = document.getElementById("simulationView")
  editorView.classList.add('hidden');
  simulationView.classList.remove('hidden');

  setUpCameras(scene, trainEngine, canvas)


  //start named render loop
  const renderLoop = () => {
    scene.render();
    debugLog(`FPS: ${engine.getFps().toFixed(1)}`);
  };
  
  engine.runRenderLoop(renderLoop);
  
  requestAnimationFrame(() => {
    engine.resize();
  });


  const onResizeHandler = () => engine.resize();
  window.addEventListener("resize", onResizeHandler);

  // Save references
  babylonState = {
    canvas,
    engine,
    scene,
    renderLoop,
    onResizeHandler,
  };
}

let GLOBALS = {};

//End at: (40 * cos(45°), 40 * sin(45°)) ≈ (28.28, 28.28)


function setUpCameras(scene, trainEngine, canvas) {
  GLOBALS.followCamera = createFollowCamera(scene, trainEngine, canvas);
  GLOBALS.arcCamera = createArcRotateCamera(scene, canvas);

  scene.activeCamera = GLOBALS.arcCamera;
  GLOBALS.arcCamera.attachControl(canvas, true);
}

document.getElementById("switchCameras").addEventListener("pointerdown", toggleCameras);

function toggleCameras() {
  let canvas = document.getElementById("renderCanvas")
  let scene = babylonState.scene;
  
  const current = scene.activeCamera;

  current.detachControl(canvas);

  if (current === GLOBALS.followCamera) {
    scene.activeCamera = GLOBALS.arcCamera;
    GLOBALS.arcCamera.attachControl(canvas, true);
  } else {
    resetFollowCameraPosition(GLOBALS.followCamera)
    scene.activeCamera = GLOBALS.followCamera;
    GLOBALS.followCamera.attachControl(canvas, true);
  }
  
}

function resetFollowCameraPosition(followCamera) {
  const target = followCamera.lockedTarget;
  if (!target) return;

  const pos = target.getAbsolutePosition();
  const angle = followCamera.rotationOffset * Math.PI / 180;

  followCamera.position = new BABYLON.Vector3(
    pos.x - Math.cos(angle) * followCamera.radius,
    pos.y + followCamera.heightOffset,
    pos.z - Math.sin(angle) * followCamera.radius
  );

}

function createFollowCamera(scene, target, canvas) {
    const followCamera = new BABYLON.FollowCamera("FollowCam", new BABYLON.Vector3(0, 10, -20), scene);
    followCamera.lockedTarget = target;
    followCamera.radius = 80;
    followCamera.heightOffset = 30;
    followCamera.rotationOffset = 270;
    followCamera.cameraAcceleration = 0.05;
    followCamera.maxCameraSpeed = 20;
    followCamera.lowerHeightOffsetLimit = 1;
    followCamera.lowerRadiusLimit = 20;
    return followCamera;
}

function createArcRotateCamera(scene, canvas) {
    // alpha = horizontal angle, beta = vertical angle, radius = distance from target
    const alpha = Math.PI / 2;  // 90 degrees
    const beta = Math.PI / 4;   // 45 degrees


    const target = new BABYLON.Vector3(0, 0, 0);
    const radius = GLOBALS.layoutSize * 1.5; // Automatically fits layout
  
    const camera = new BABYLON.ArcRotateCamera("ArcCam", alpha, beta, radius, target.position, scene);

    // Optional: Limit zoom and rotation
    camera.lowerRadiusLimit = 2;
    camera.lowerBetaLimit = 0.01;
    camera.upperBetaLimit = (Math.PI / 2) - 0.02;

  
    

    // Attach camera controls
    camera.attachControl(canvas, true);

    // Make it the active camera
    scene.activeCamera = camera;

    return camera;
}






document.getElementById('toEditor').addEventListener('click', openEditor);

function openEditor() {
  //hide track editor and display simulationView
  let editorView = document.getElementById("editorView");
  let simulationView = document.getElementById("simulationView")
  editorView.classList.remove('hidden');
  simulationView.classList.add('hidden');
  
  resetView();
  const svg = document.getElementById('editor');
  zoomToFit(GLOBALS.layoutBoundingBox, svg);
  
  debugLog("");
  
  //teardown babylon engine and global state
  if (babylonState) {
    const { canvas, engine, scene, renderLoop, onResizeHandler } = babylonState;

    engine.stopRenderLoop(renderLoop);
    scene.dispose();
    engine.dispose();
    window.removeEventListener("resize", onResizeHandler);
  
    babylonState = null;
    GLOBALS = {};
  }
  
}

document.getElementById('render').addEventListener('click', handleRenderButtonClick);

function handleRenderButtonClick() {
  console.log(allPieces.length);
  if (allPieces.length === 0) {
    showToast("Load or Create a Layout")
    return;
  }
  let canvas = document.getElementById("renderCanvas");
  open3dView(canvas)
}


function findMatchingEndpoint(point, thisPiece, allPieces) {
  let matchingEndpoint = null;
  let minDistance = Infinity;
  const matches = [];

  const worldPoint = getTransformedEndpoint(thisPiece, point);
  //console.log("worldPoint: ", worldPoint)

  allPieces.forEach(piece => {
    if (piece === thisPiece) return; //skip checking self
    const testPieceWorldEndpoints = piece.endpoints.map(pt => getTransformedEndpoint(piece, pt));
    //console.log("testPieceWorldEndpoints: ", testPieceWorldEndpoints)
    for (let i=0; i<testPieceWorldEndpoints.length; i++) {
      let otherPt = testPieceWorldEndpoints[i];
      const dist = Math.hypot(worldPoint.x - otherPt.x, worldPoint.y - otherPt.y);
      if (dist < GLOBALS.THRESHOLD) {
        matchingEndpoint = {
          piece: piece,
          endpointIndex: i
        };
        matches.push(matchingEndpoint);
      }
    }
  });
  if (matches.length > 1) {
    console.error("Multiple matches found for an endpoint:", matches);
    alert("Error: Each endpoint can only be joined to one other piece");
    throw new Error("Ambiguous endpoint: multiple matches found.");
    
  }
  return matches.length === 1 ? matches[0] : null;;
}


function getTransformedEndpoint(g, point) {
  const svg = document.getElementById('editor');
  //console.log(g, point);
  const svgPoint = svg.createSVGPoint();
  svgPoint.x = point.x;
  svgPoint.y = point.y;
  //console.log(g, document.body.contains(g), g.getCTM());
  const ctm = g.getCTM();
  //console.log(ctm);
  return svgPoint.matrixTransform(ctm);
}


function getKey(piece, index) {
  return `${piece.dataset.id}_${index}`;
}

function createGraph(pieces) {
    const piecesGraph = new Map(); //key: piece+endpoint, value: array of connected piece+endpoint


  //Helper function to add bidirectional edges
  function connect(a, b) {
    if (!piecesGraph.has(a)) {
      piecesGraph.set(a, []);
    }
    if (!piecesGraph.has(b)) {
      piecesGraph.set(b, []);
    } 
    piecesGraph.get(a).push(b);
    piecesGraph.get(b).push(a);
  }

  //Add internal connections to graph
  pieces.forEach(piece => {
    for (let [from, toList] of piece.connections.entries()) {
      //console.log(toList);
      toList.forEach(to => {
        if (parseInt(from) < parseInt(to)) {
          //console.log(from, to);
          const fromKey = getKey(piece, parseInt(from));
          const toKey = getKey(piece, parseInt(to));
          connect(fromKey, toKey);        
        }  
      });
    }
  });

  //Add external connections to graph  
  pieces.forEach(piece => {
    piece.endpoints.forEach((endpoint, i) => {
      const matchingEndpoint = findMatchingEndpoint(endpoint, piece, pieces);
      if (matchingEndpoint !== null) {
        const key1 = getKey(piece, i);
        const key2 = getKey(matchingEndpoint.piece, matchingEndpoint.endpointIndex);
        if (key1 < key2) {
          connect(key1, key2);          
        }
      }
    });
  });

  for (let [key, value] of piecesGraph.entries()) {
    //console.log("Key:", key, "→ Connected to:", value);
  }

  return piecesGraph;
}

//helper to extract pieceId and endpoint index from graph key or value
function parseKey(key) {
  const [pieceId, index] = key.split("_");
  return {pieceId, index: parseInt(index)};
}

//Helper to find a piece by its id
function getPieceById(id) {
  return allPieces.find(piece => piece.dataset.id === id);
}

function makeEdgeKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function makeReverseEdgeKey(a, b) {
  return a > b ? `${a}-${b}` : `${b}-${a}`;
}

function getEdgeKey(a, b) {
  return `${a}-${b}`;
}

//ugly mess here... this function adds world co-ordinate space points to all the pieces that are connected to the starting piece.
//it ALSO returns the bounding box for all those connected pieces.

function addWorldPointsToPieces(connectionsGraph, startKey) {
  //const allPaths = [];
  const visitedEdges = new Set();
  const layoutBoundingBox = {};
  layoutBoundingBox.maxX = -Infinity;
  layoutBoundingBox.minX = Infinity;
  layoutBoundingBox.maxY = -Infinity;
  layoutBoundingBox.minY = Infinity;
  

  function recurse(currentKey, path) {
    const neighbours = connectionsGraph.get(currentKey) || [];

    let hasUntraversedEdge = false;

    for (const neighbour of neighbours) {
      const edgeKey = makeEdgeKey(currentKey, neighbour);

      if (!visitedEdges.has(edgeKey)) {
        hasUntraversedEdge = true;
        visitedEdges.add(edgeKey);
        
        const startPoint = parseKey(currentKey);
        const endPoint = parseKey(neighbour);

        //console.log(startPoint, endPoint);

        const startPiece = getPieceById(startPoint.pieceId);
        const endPiece = getPieceById(endPoint.pieceId);

        if (startPiece === endPiece) {
          const elements = startPiece.querySelectorAll("line, path");
          let element = findMatchingElementFromEndpoints(elements, startPiece.endpoints, startPoint, endPoint)  

          const { segmentPoints, segmentBoundingBox } = getWorldPointsForSegment(startPiece, element);
          
          if (segmentBoundingBox.maxX > layoutBoundingBox.maxX) { layoutBoundingBox.maxX = segmentBoundingBox.maxX};
          if (segmentBoundingBox.minX < layoutBoundingBox.minX) { layoutBoundingBox.minX = segmentBoundingBox.minX};
          if (segmentBoundingBox.maxY > layoutBoundingBox.maxY) { layoutBoundingBox.maxY = segmentBoundingBox.maxY};
          if (segmentBoundingBox.minY < layoutBoundingBox.minY) { layoutBoundingBox.minY = segmentBoundingBox.minY};
          //console.log(layoutBoundingBox, segmentBoundingBox);
          
          if (!startPiece.worldPoints) {
            startPiece.worldPoints = new Map();
          }
          startPiece.worldPoints.set(edgeKey, segmentPoints);
          //console.log(edgeKey);
          //console.log(startPiece.worldPoints.get(edgeKey));
          //console.log(layoutBoundingBox);
          
          let reversedEdgeKey = makeReverseEdgeKey(currentKey, neighbour);
          let reversedSegmentPoints = [...segmentPoints].reverse();
          startPiece.worldPoints.set(reversedEdgeKey, reversedSegmentPoints)

          //console.log(reversedEdgeKey);
          //console.log(startPiece.worldPoints.get(reversedEdgeKey))
          
        }
        recurse(neighbour);
      }
    }
  }
  recurse(startKey);
  //console.log(allPieces);
  return layoutBoundingBox;
}


export function getWorldPointsForSegment(piece, element) {
  const segmentPoints = []
  const length = getElementLengthUnified(element);
  
  const segmentBoundingBox = {};
  segmentBoundingBox.maxX = -Infinity;
  segmentBoundingBox.minX = Infinity;
  segmentBoundingBox.maxY = -Infinity;
  segmentBoundingBox.minY = Infinity;
    
  for (let i=0; i<length; i++) {
    let point = getPointAtLengthUnified(element, i)
    let worldPoint = getTransformedEndpoint(piece, point)
    //console.log(layoutBoundingBox, worldPoint);
    if (worldPoint.x > segmentBoundingBox.maxX) { segmentBoundingBox.maxX = worldPoint.x};
    if (worldPoint.x < segmentBoundingBox.minX) { segmentBoundingBox.minX = worldPoint.x};
    if (worldPoint.y > segmentBoundingBox.maxY) { segmentBoundingBox.maxY = worldPoint.y};
    if (worldPoint.y < segmentBoundingBox.minY) { segmentBoundingBox.minY = worldPoint.y};
    //console.log(layoutBoundingBox);
    segmentPoints.push(worldPoint);
  }

   // Ensure start and end points are correctly placed
  const firstPoint = getTransformedEndpoint(piece, getPointAtLengthUnified(element, 0));
  const lastPoint = getTransformedEndpoint(piece, getPointAtLengthUnified(element, length));

  if (segmentPoints[0].x !== firstPoint.x || segmentPoints[0].y !== firstPoint.y) {
    segmentPoints.unshift(firstPoint); // Add start point at the beginning
  }

  if (segmentPoints[segmentPoints.length - 1].x !== lastPoint.x || segmentPoints[segmentPoints.length - 1].y !== lastPoint.y) {
    segmentPoints.push(lastPoint); // Add end point at the end
  }
  
  return {segmentPoints, segmentBoundingBox};
}



// Helper function to calculate the distance between two points
function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}



function findMatchingElementFromEndpoints(elements, endpoints, startPoint, endPoint) {

  const targetEndpoints = {}
  targetEndpoints.x1 = endpoints[startPoint.index].x;
  targetEndpoints.y1 = endpoints[startPoint.index].y;
  targetEndpoints.x2 = endpoints[endPoint.index].x;
  targetEndpoints.y2 = endpoints[endPoint.index].y;

  for (let i=0; i<elements.length; i++) {
    let element = elements[i];
    const tag = element.tagName.toLowerCase();
    if (tag === "line") {
      const x1 = parseFloat(element.getAttribute('x1'));
      const y1 = parseFloat(element.getAttribute('y1'));
      const x2 = parseFloat(element.getAttribute('x2'));
      const y2 = parseFloat(element.getAttribute('y2'));

      if (
        approxEqual(targetEndpoints.x1, x1) &&
        approxEqual(targetEndpoints.y1, y1) &&
        approxEqual(targetEndpoints.x2, x2) &&
        approxEqual(targetEndpoints.y2, y2)
      ) {
        return element;
      }

      if (
        approxEqual(targetEndpoints.x1, x2) &&
        approxEqual(targetEndpoints.y1, y2) &&
        approxEqual(targetEndpoints.x2, x1) &&
        approxEqual(targetEndpoints.y2, y1)
      ) {
        return element;
      }     
    } 
    
    if (tag === "path") {
      const length = element.getTotalLength();
      //console.log(length);
      const startPoint = element.getPointAtLength(0);
      const endPoint = element.getPointAtLength(length);
      //console.log(startPoint, endPoint);
      
      if (
        approxEqual(targetEndpoints.x1, startPoint.x) &&
        approxEqual(targetEndpoints.y1, startPoint.y) &&
        approxEqual(targetEndpoints.x2, endPoint.x) &&
        approxEqual(targetEndpoints.y2, endPoint.y)
      ) {
        element.flipped = false;
        return element;
      }

      if (
        approxEqual(targetEndpoints.x1, endPoint.x) &&
        approxEqual(targetEndpoints.y1, endPoint.y) &&
        approxEqual(targetEndpoints.x2, startPoint.x) &&
        approxEqual(targetEndpoints.y2, startPoint.y)
      ) {
        element.flipped = true;
        return element;
      }
    }
  }
}


function getPointAtLengthUnified(element, length) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'path') {
    return element.getPointAtLength(length);
  }

  if (tag === 'line') {
    const x1 = parseFloat(element.getAttribute('x1'));
    const y1 = parseFloat(element.getAttribute('y1'));
    const x2 = parseFloat(element.getAttribute('x2'));
    const y2 = parseFloat(element.getAttribute('y2'));
    const totalLength = Math.hypot(x2 - x1, y2 - y1);

    const ratio = Math.min(Math.max(length / totalLength, 0), 1); // clamp 0-1
    return {
      x: x1 + (x2 - x1) * ratio,
      y: y1 + (y2 - y1) * ratio
    };
  }

  throw new Error("Unsupported SVG element type for getPointAtLengthUnified");
}

function getElementLengthUnified(element) {
  const tag = element.tagName.toLowerCase();
  if (tag === 'path') {
    return element.getTotalLength(); // only works for <path> elements
  }

  if (tag === 'line') {
    const x1 = parseFloat(element.getAttribute('x1'));
    const y1 = parseFloat(element.getAttribute('y1'));
    const x2 = parseFloat(element.getAttribute('x2'));
    const y2 = parseFloat(element.getAttribute('y2'));
    return Math.hypot(x2 - x1, y2 - y1); // manual length for lines    
  }
  throw new Error("Unsupported SVG element type for getElementLengthUnified");
}

function approxEqual(a, b, tolerance = 0.1) {
  return Math.abs(a - b) < tolerance;
}


function displayTrack(layoutBoundingBox, scene) {
  //remove existing tracks when a new layout is loaded
  scene.meshes
    .filter(mesh => mesh.name.startsWith("segment-"))
    .forEach(mesh => mesh.dispose());

  scene.meshes
    .filter(mesh => mesh.name.startsWith("pointToggle"))
    .forEach(mesh => mesh.dispose());

  scene.meshes
    .filter(mesh => mesh.name.startsWith("clickBox"))
    .forEach(mesh => mesh.dispose());


  // Remove old ground if it exists
  const oldGround = scene.getMeshByName("ground");
  if (oldGround) {
    oldGround.dispose();
  }

  const width = layoutBoundingBox.maxX - layoutBoundingBox.minX;
  const height = layoutBoundingBox.maxY - layoutBoundingBox.minY;

  // Create new ground
  const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
  groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 0.2); // medium green 

  const ground = BABYLON.MeshBuilder.CreateGround("ground", {
    width: width + 20,
    height: height + 20,
  }, scene);
  ground.position.y = -0.01;
  ground.material = groundMaterial;

  const midpoints = {};
  midpoints.x = (layoutBoundingBox.maxX + layoutBoundingBox.minX)/2;
  midpoints.y = (layoutBoundingBox.maxY + layoutBoundingBox.minY)/2;

  for (const piece of allPieces) {
    //console.log(piece.worldPoints);
    if (piece.worldPoints instanceof Map) {
      for (const [edgeKey, segmentPoints] of piece.worldPoints.entries()) {
        const adjustedPoints = segmentPoints.map(p => new BABYLON.Vector3(p.x - midpoints.x, 0, p.y - midpoints.y));
        piece.worldPoints.set(edgeKey, adjustedPoints);
      }      
    } else {
      showToast("Track pieces must all be connected");
      throw new Error(`Missing worldPoints on piece ${piece.dataset.id}`);
    }
  }
  
  for (const piece of allPieces) {
    if (!piece.worldPoints) continue;

    let lines = null;
    //check if it is a non-turnout piece
    if (piece.endpoints.length === 2) {
      //only need the first entry of the worldpoints map because the second entry is a reverse of the first
      //the second entry is needed for reversing trains but not for drawing the track
      const [edgeKey, segmentPoints] = piece.worldPoints.entries().next().value;
      const positions = segmentPoints;
      const lines = BABYLON.MeshBuilder.CreateLines(`segment-${edgeKey}`, { points: positions }, scene);
      lines.color = new BABYLON.Color3(0,0,0); 
    }


    if (piece.endpoints.length === 3) {
      console.log(piece.worldPoints);
      GLOBALS.pointEdges = {};
      
      let [edgeKey, segmentPoints] = getNthEntry(piece.worldPoints, 0);
      let positions = segmentPoints;
      let lines = BABYLON.MeshBuilder.CreateLines(`segment-${edgeKey}`, { points: positions }, scene);
      let [a,b] = getEndpointsFromEdgeKey(edgeKey);
      let nonZeroEndpoint = getNonZeroEndpoint([a,b]);
      if (nonZeroEndpoint === 1) {
        lines.color = new BABYLON.Color3(0,0,0);
        GLOBALS.pointEdges.toEndpoint1 = lines;
      } else {
        //this is the initially inactive endpoint
        lines.color = new BABYLON.Color3(1,0,0);
        GLOBALS.pointEdges.toEndpoint2 = lines;
        
      }
      
      [edgeKey, segmentPoints] = getNthEntry(piece.worldPoints, 2);
      positions = segmentPoints;
      lines = BABYLON.MeshBuilder.CreateLines(`segment-${edgeKey}`, { points: positions }, scene);
      [a,b] = getEndpointsFromEdgeKey(edgeKey);
      nonZeroEndpoint = getNonZeroEndpoint([a,b]);
      if (nonZeroEndpoint === 1) {
        lines.color = new BABYLON.Color3(0,0,0);
        GLOBALS.pointEdges.toEndpoint1 = lines;
      } else {
        lines.color = new BABYLON.Color3(1,0,0);
        GLOBALS.pointEdges.toEndpoint2 = lines;
      }
      
      const points = getAllSegmentPoints(piece);
      makeClickableBoundingBox(piece, points, scene)
    }
  }
  //scene.debugLayer.show();

  // After setting up the scene and camera
  GLOBALS.layoutSize = Math.max(width, height);

}

function getNonZeroEndpoint(endpoints) {
  if (!endpoints.includes(0)) {
    throw new Error("Expected one endpoint to be 0");
  }

  if (endpoints.includes(1)) return 1;
  if (endpoints.includes(2)) return 2;

  throw new Error("Expected other endpoint to be 1 or 2");
}

function getEndpointsFromEdgeKey(edgeKey) {
  const match = edgeKey.match(/_([0-9]+)-.*_([0-9]+)/);
  if (!match) {
    throw new Error(`Invalid edge key format: ${edgeKey}`);
  }

  return [parseInt(match[1], 10), parseInt(match[2], 10)];
}


function getNthEntry(map, n) {
  const iterator = map.entries();
  let result = iterator.next();
  let index = 0;

  while (!result.done) {
    if (index === n) {
      return result.value; // [key, value]
    }
    result = iterator.next();
    index++;
  }

  return undefined; // Not found
}



function getAllSegmentPoints(piece) {
  const allPoints = [];

  for (const segmentPoints of piece.worldPoints.values()) {
    allPoints.push(...segmentPoints);
  }

  return allPoints;
}

function computeBoundingBox(segmentPoints) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

  for (const p of segmentPoints) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  return { minX, maxX, minZ, maxZ };
}

function makeClickableBoundingBox(piece, segmentPoints, scene) {
  const { minX, maxX, minZ, maxZ } = computeBoundingBox(segmentPoints);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = maxX - minX;
  const depth = maxZ - minZ;

  const box = BABYLON.MeshBuilder.CreateBox(`clickBox-${piece.dataset.id}`, {
    width: width,
    depth: depth,
    height: 0.5 // thin clickable surface
  }, scene);

  box.position = new BABYLON.Vector3(centerX, 0.05, centerZ); // slightly above ground
  box.pieceId = piece.dataset.id;
  box.actionManager = new BABYLON.ActionManager(scene);
  box.actionManager.registerAction(
    new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function(evt) {
      const pickedHandle = evt.meshUnderPointer;
      console.log("previous active endpoint", piece.activeEndpoint);
      if (piece.activeEndpoint === point2) { 
        piece.activeEndpoint = point3 
      } else if (piece.activeEndpoint === point3) {
        piece.activeEndpoint = point2
      };
      console.log("new active endpoint", piece.activeEndpoint);
      highlightActiveEndpoint(piece, scene);
    })
  );
  box.visibility = 0; // invisible

  box.metadata = { piece }; // store link back to piece

  return box;
}

function highlightActiveEndpoint(piece, scene) {
  console.log(piece.activeEndpoint);
  //console.log(piece.endpoints[piece.activeEndpoint])

  //make the edge with the active endpoint black
  let line1 = GLOBALS.pointEdges.toEndpoint1;
  let line2 = GLOBALS.pointEdges.toEndpoint2;

  //console.log(line1, line2);
  console.log("activeEndpoint value and type:", piece.activeEndpoint, typeof piece.activeEndpoint);

  if (piece.activeEndpoint === "1") {
    line1.color = new BABYLON.Color3(0, 0, 0); // change to red
    line2.color = new BABYLON.Color3(1, 0, 0); // change to black
    console.log("change to endpoint 1");
  } else {
    line1.color = new BABYLON.Color3(1, 0, 0); // change to black
    line2.color = new BABYLON.Color3(0, 0, 0); // change to red
    console.log("change to endpoint 2");
  }
}




function findNextEndpoint(previousEndpointKey, currentEndpointKey, connectionsGraph) {
  if (GLOBALS.lastDirectionSign !== GLOBALS.directionSign) {
    let temp = currentEndpointKey;
    currentEndpointKey = previousEndpointKey;
    previousEndpointKey = temp;
  }
  
  const connectedKeys = connectionsGraph.get(currentEndpointKey) || [];
  
  //Exclude the endpoint we just came from
  const forwardOptions = connectedKeys.filter(k => k !== previousEndpointKey);

  if (forwardOptions.length === 0) return null; //Dead end

  const currentPieceId = parseKey(currentEndpointKey).pieceId;
  const currentIndex = parseKey(currentEndpointKey).index;
  const currentPiece = getPieceById(currentPieceId);
  
  const previousPieceId =  parseKey(previousEndpointKey).pieceId;
  

  //Special handling for turnouts
  if (isTurnout(currentPiece)) {
    console.log(currentPieceId)
    const center = 0;

    let isSamePiece = false;
    if (previousPieceId === currentPieceId) {
      isSamePiece = true;
    }

    console.log(previousPieceId, currentPieceId, isSamePiece);
    
    // Case 1: Coming from within same piece, must go to a different piece
    if (isSamePiece) {
      // Don't go from one branch to another via center
      return forwardOptions.find(k => parseKey(k).pieceId !== currentPieceId) || null;
    }

    console.log(currentIndex);

    // Case 2: Coming from another piece into this one
    if (currentIndex === center) {
      // Coming into center: use the piece's active endpoint
      return forwardOptions.find(k => parseKey(k).index === parseInt(currentPiece.activeEndpoint)) || null;
    } else {
      // Coming into a branch: must go to center
      return forwardOptions.find(k => parseKey(k).index === center) || null;
    }
  }
  
  //Non-turnouts should only have one way to go
  if (forwardOptions.length === 1) return forwardOptions[0]; //Only one way to go

  //Fallback for something has gone wrong
  return null
}

function isTurnout(piece) {
  if (piece.endpoints.length === 3) {
    return true;
  } else {
    return false;
  }
}

function getSegmentForTraversal(piece, fromIndex, toIndex) {
  //make endpoint key
  //then make directional edge key
  let fromKey = getKey(piece, fromIndex);
  let toKey = getKey(piece, toIndex);
  let edgeKey;
  if (GLOBALS.directionSign > 0) {
      edgeKey = getEdgeKey(fromKey, toKey);
  } else {
      edgeKey = getEdgeKey(toKey, fromKey);
  }

  let segment = piece.worldPoints.get(edgeKey);
  
  if (!segment) return null; // fail-safe

  return segment;
}

document.addEventListener('keydown', (event) => {
  if (event.key === '+' || event.key === '=') { // "+" shares the "=" key on many layouts
    adjustSpeed(0.1)
  } else if (event.key === '-' || event.key === '_') {
    adjustSpeed(-0.1)
  }
});

document.getElementById("increaseSpeed").addEventListener("pointerdown", () => {
  adjustSpeed(0.1);  
});

document.getElementById("decreaseSpeed").addEventListener("pointerdown", () => {
  adjustSpeed(-0.1);  
});


function adjustSpeed(change) {
  GLOBALS.speed = Math.round(Math.max(-GLOBALS.maxAbsSpeed, Math.min(GLOBALS.speed + change, GLOBALS.maxAbsSpeed)) * 10) / 10;
  GLOBALS.directionSign = Math.sign(GLOBALS.speed);
  console.log(GLOBALS.speed);
  updateSpeedDisplay();
}

function updateSpeedDisplay() {
  let speedOutput = document.getElementById("speedOutput");
  speedOutput.innerText = GLOBALS.speed*10;
}

function startTrain(startKey, connectionsGraph, scene) {
  const engineLength = 20;
  const engine = BABYLON.MeshBuilder.CreateBox("engine", { width: engineLength, height: 6, depth: 4 }, scene);

  let engineElevation = 4.5;
  engine.position.y = engineElevation;

  const engineBodyMaterial = new BABYLON.StandardMaterial("engineBodyMaterial", scene);
  engineBodyMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0); // red

  engine.material = engineBodyMaterial;

  // Funnel (smokestack)
  const funnel = BABYLON.MeshBuilder.CreateCylinder("funnel", {
    diameterTop: 2,
    diameterBottom: 2,
    height: 3,
    tessellation: 12
  }, scene);
  funnel.parent = engine;
  funnel.position.y = 4.5;
  funnel.position.z = 0;
  funnel.position.x = 7;

  const funnelBodyMaterial = new BABYLON.StandardMaterial("funnelBodyMaterial", scene);
  funnelBodyMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // black

  funnel.material = funnelBodyMaterial;

  // Load the spoke texture
  const spokeTexture = new BABYLON.Texture("wheel_outline.png", scene);
  spokeTexture.hasAlpha = true;

  // Create a material for the wheels
  const wheelMaterial = new BABYLON.StandardMaterial("wheelMat", scene);
  wheelMaterial.diffuseTexture = spokeTexture;
  wheelMaterial.useAlphaFromDiffuseTexture = true;  // Tell the material to use the alpha channel from the diffuse texture
  //wheelMaterial.backFaceCulling = false; // Optional: show both sides of the texture if necessary


  
  const wheelMeshes = [];
  const wheelOffsets = [
    [-7, -2.5], [7, -2.5], // left-side wheels (x, z)
    [-7, 2.5], [7, 2.5]    // right-side wheels
  ];

  for (const [x, z] of wheelOffsets) {
    const wheel = BABYLON.MeshBuilder.CreateCylinder("wheel", {
      diameter: 3,
      height: 1,
      tessellation: 16
    }, scene);
    wheel.material = wheelMaterial;
    wheel.rotation.x = Math.PI / 2;
    wheel.parent = engine;
    wheel.position.set(x, -3, z);
    wheelMeshes.push(wheel);
  }

  let lastWheelRotation = 0;


  let currentEndpointKey = startKey;
  let connectedKeys = connectionsGraph.get(currentEndpointKey) || [];
  if (connectedKeys.length === 0) return; // nothing to connect to

  let previousEndpointKey = currentEndpointKey;
  currentEndpointKey = connectedKeys[0]; // pick the first connected endpoint

  let currentPieceId = parseKey(currentEndpointKey).pieceId;
  let currentPiece = getPieceById(currentPieceId);
  
  let toIndex = parseKey(currentEndpointKey).index;
  let fromIndex = parseKey(previousEndpointKey).index;

  //console.log(currentPiece.dataset.id, fromIndex, toIndex);
  //debugger;
  
  
  let segment = getSegmentForTraversal(currentPiece, fromIndex, toIndex);

  //let segment = currentPiece.worldPoints.get(previousEndpointKey + "-" +currentEndpointKey);
  if (!segment) {
    console.error("No path for current endpoint:", currentEndpointKey);
    return;
  }

  //console.log(segment)

  let pointIndex = 0;
  let travelProgress = 0;
  let initialDirection = GLOBALS.directionSign;
  
  placeEngineAtStart(engine, segment[0], segment[1], initialDirection, engineElevation);
  
  let nextPoint = null;
  
  const engineHistory = [];
  const maxHistory = 1000; // adjust if needed

  let previousDirectionSign = Math.sign(GLOBALS.speed); // Track the previous direction
  
  scene.onBeforeRenderObservable.add(() => {
    //const GLOBALS.directionSign = Math.sign(GLOBALS.speed); // +1 for forward, -1 for backward
    if (GLOBALS.directionSign === 0) {
      return; // No movement if speed is zero
    }
  
    if (!segment || 
        (GLOBALS.directionSign > 0 && pointIndex >= segment.length - 1) || 
        (GLOBALS.directionSign < 0 && pointIndex <= 0)) {
      
      const nextEndpointKey = findNextEndpoint(previousEndpointKey, currentEndpointKey, connectionsGraph);
      if (!nextEndpointKey) {
        //console.log("Dead End");
        if (GLOBALS.speed !== 0) {
          GLOBALS.speed = 0;
          updateSpeedDisplay()
        }
        return;
      } 
      //console.log(previousEndpointKey, currentEndpointKey, nextEndpointKey);
  
      const nextPieceId = parseKey(nextEndpointKey).pieceId;
      currentPieceId = parseKey(currentEndpointKey).pieceId;
  
      if (nextPieceId !== currentPieceId) {
        if (GLOBALS.lastDirectionSign !== GLOBALS.directionSign) {
          GLOBALS.lastDirectionSign = GLOBALS.directionSign;
        } else {
          previousEndpointKey = currentEndpointKey;
        }
        currentEndpointKey = nextEndpointKey;
        return;
      }
  
      previousEndpointKey = currentEndpointKey;
      currentEndpointKey = nextEndpointKey;
      currentPieceId = parseKey(currentEndpointKey).pieceId;
      currentPiece = getPieceById(currentPieceId);
  
      const toIndex = parseKey(currentEndpointKey).index;
      const fromIndex = parseKey(previousEndpointKey).index;
  
      segment = getSegmentForTraversal(currentPiece, fromIndex, toIndex);
      if (!segment) return;
  
      pointIndex = GLOBALS.directionSign >= 0 ? 0 : segment.length - 2;
      travelProgress = 0;
    }
  
  
    if (GLOBALS.directionSign !== previousDirectionSign && previousDirectionSign !== 0) {
      // We're about to move in the opposite direction along the same segment
      const fromPoint = segment[pointIndex];
      const toPoint = segment[pointIndex + previousDirectionSign];
      console.log(segment, pointIndex, previousDirectionSign);
      if (toPoint === undefined) {
        travelProgress = 0;
        previousDirectionSign = GLOBALS.directionSign;
        return;
      }
      const segmentLength = toPoint.subtract(fromPoint).length();
  
      travelProgress = segmentLength - travelProgress;
  
      // Adjust index so the forward/backward step happens from the same segment
      pointIndex += previousDirectionSign; // move to the same pair of points but from the other side
    }
    previousDirectionSign = GLOBALS.directionSign;
  
    let previousProgress = travelProgress;
    travelProgress += Math.abs(GLOBALS.speed);
    let deltaDistance = travelProgress - previousProgress;
  
    
  
    // Advance through segment points in the appropriate direction
    while (
      (GLOBALS.directionSign > 0 && pointIndex < segment.length - 1) ||
      (GLOBALS.directionSign < 0 && pointIndex > 0)
    ) {
      const currentPoint = segment[pointIndex];
      nextPoint = segment[pointIndex + GLOBALS.directionSign];
      //console.log(nextPoint);
      const moveVector = nextPoint.subtract(currentPoint);
      const segmentLength = moveVector.length();
  
      
  
      
      if (travelProgress < segmentLength) {
        const position = BABYLON.Vector3.Lerp(
          currentPoint,
          nextPoint,
          travelProgress / segmentLength
        );
  
  
        engine.position = new BABYLON.Vector3(position.x, engineElevation, position.z);
        let forwardVector;
        if (GLOBALS.directionSign > 0) {
          forwardVector = nextPoint.subtract(currentPoint);
        } else {
          forwardVector = currentPoint.subtract(nextPoint);
        }
        engine.rotation.y = Math.atan2(-forwardVector.z, forwardVector.x);
  
        // Update wheel rotation
        updateWheelRotation(wheelMeshes, deltaDistance);
        
        break;
      }
  
      travelProgress -= segmentLength;
      pointIndex += GLOBALS.directionSign;
    }
  });

  return engine;
}


// Function to update wheel rotations
function updateWheelRotation(wheelMeshes, travelDistance) {
  //console.log(travelDistance);
  // Calculate how much the wheel should rotate based on the travel distance
  let rotationAmount = travelDistance / GLOBALS.wheelCircumference * 2 * Math.PI;  // Full 360 degrees for one revolution
  if (GLOBALS.directionSign > 0) {
    rotationAmount = -rotationAmount;
  }
  // Apply the calculated rotation to each wheel in local space
  for (const wheel of wheelMeshes) {
    wheel.rotate(BABYLON.Axis.Y, rotationAmount, BABYLON.Space.LOCAL);
  }
}

function placeEngineAtStart(engine, thisPoint, nextPoint, initialDirection, engineElevation) {
  if (initialDirection > 0) {
    const moveVector = nextPoint.subtract(thisPoint);
    engine.position = new BABYLON.Vector3(thisPoint.x, engineElevation, thisPoint.z);
    engine.rotation.y = Math.atan2(-moveVector.z, moveVector.x);
  } else {
    const moveVector = thisPoint.subtract(nextPoint);
    engine.position = new BABYLON.Vector3(thisPoint.x, engineElevation, thisPoint.z);
    engine.rotation.y = Math.atan2(-moveVector.z, moveVector.x);
  }
  
}


function convertPiecesToPath(pieces, scene) {
  //console.log(pieces);
  
  let connectionsGraph = createGraph(pieces);

  //Start traversal from first key in the graph
  const startKey = [...connectionsGraph.keys()][0];

  GLOBALS.layoutBoundingBox = addWorldPointsToPieces(connectionsGraph, startKey);
  console.log(GLOBALS.layoutBoundingBox);


  displayTrack(GLOBALS.layoutBoundingBox, scene);
  let trainEngine = startTrain(startKey, connectionsGraph, scene);

  return trainEngine;
}

  
