import { getElementLengthUnified, savePointEdgesMesh, highlightActiveEndpoint } from "./main.js";

export function createTrackPiece(piece, scene) {
  let lines = null;
  //Non-turnout piece (straight or curved) only need entry 0 in the worldpoints map
  if (piece.endpoints.length === 2) {
    const [edgeKey, segmentPoints] = piece.worldPoints.entries().next().value;
    const positions = segmentPoints;
    let {mergedRails, mergedSleepers} = createRailTrack(positions, scene);
  }

  //Turnout piece (need to use entries 0 and 2 from the worldpoints map)
  if (piece.endpoints.length === 3) {
    let pieceId = piece.dataset.id;
    createPointComponent(0, piece, pieceId, scene);
    createPointComponent(2, piece, pieceId, scene);
    highlightActiveEndpoint(piece, scene);
  }
}

function createRailTrack(points, scene) {
  const railSeparation = 4.71; // distance between rails
  const railHeight = 0.5;
  const railWidth = 0.3;

  const sleeperSpacing = 2.3;  // distance between sleepers  
  const sleeperWidth = 0.83;
  const sleeperLength = 8.5;
  const sleeperThickness = 0.42;

  // Utility to get perpendicular vector (XZ plane)
  function getPerpendicular(a, b) {
    const dir = b.subtract(a).normalize();
    return new BABYLON.Vector3(-dir.z, 0, dir.x);
  }

  // Create rail shape (simple rectangle)
  const railShape = [
    new BABYLON.Vector3(-railWidth / 2, sleeperThickness, 0),
    new BABYLON.Vector3(railWidth / 2, sleeperThickness, 0),
    new BABYLON.Vector3(railWidth / 2, sleeperThickness + railHeight, 0),
    new BABYLON.Vector3(-railWidth / 2, sleeperThickness + railHeight, 0),
    new BABYLON.Vector3(-railWidth / 2, sleeperThickness, 0),
  ];


  // Offset left and right rail paths
  const leftRailPath = [];
  const rightRailPath = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const perp = getPerpendicular(p1, p2).scale(railSeparation / 2);
    leftRailPath.push(p1.add(perp));
    rightRailPath.push(p1.subtract(perp));
    if (i === points.length - 2) {
      // Add final point
      leftRailPath.push(p2.add(perp));
      rightRailPath.push(p2.subtract(perp));
    }
  }

  // Create left rail
  const leftRail = BABYLON.MeshBuilder.ExtrudeShape("leftRail", {
    shape: railShape,
    path: leftRailPath,
    cap: BABYLON.Mesh.CAP_ALL,
  }, scene);
  leftRail.material = new BABYLON.StandardMaterial("leftRailMat", scene);
  leftRail.material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);

  // Create right rail
  const rightRail = BABYLON.MeshBuilder.ExtrudeShape("rightRail", {
    shape: railShape,
    path: rightRailPath,
    cap: BABYLON.Mesh.CAP_ALL,
  }, scene);
  rightRail.material = leftRail.material;

  // Create sleeper template
  const sleeper = BABYLON.MeshBuilder.CreateBox("sleeper", {
    width: sleeperLength,
    height: sleeperThickness,
    depth: sleeperWidth,
  }, scene);
  sleeper.material = new BABYLON.StandardMaterial("sleeperMat", scene);
  sleeper.material.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
  sleeper.setEnabled(false); // use only as template

  let sleeperMeshes = placeSleepers(points, sleeper, sleeperSpacing, sleeperThickness);
  const mergedRails = BABYLON.Mesh.MergeMeshes([leftRail, rightRail], true, true);
  const mergedSleepers = BABYLON.Mesh.MergeMeshes(sleeperMeshes, true, true);
  
  return {mergedRails, mergedSleepers};
}

function placeSleepers(points, sleeper, desiredSpacing, sleeperThickness) {
  let sleeperIndex = 0;

  // 1. Compute total path length and segment list
  let totalLength = 0;
  const segments = [];

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const length = BABYLON.Vector3.Distance(start, end);
    segments.push({ start, end, length });
    totalLength += length;
  }

  // 2. Choose number of sleepers that makes spacing close to desired
  const bestNumSleepers = Math.round(totalLength / desiredSpacing);
  const actualSpacing = totalLength / bestNumSleepers;

  // 3. Place sleepers at 0.5 * spacing, 1.5 * spacing, ..., (N - 0.5) * spacing
  const sleeperMeshes = [];
  
  for (let i = 0; i < bestNumSleepers; i++) {
    const d = (i + 0.5) * actualSpacing;

    let accumulated = 0;
    for (const segment of segments) {
      if (accumulated + segment.length >= d) {
        const localD = d - accumulated;
        const t = localD / segment.length;
        const pos = BABYLON.Vector3.Lerp(segment.start, segment.end, t);
        const dir = segment.end.subtract(segment.start).normalize();
        const angle = Math.atan2(dir.x, dir.z);

        const sleeperInstance = sleeper.clone(`sleeper-${sleeperIndex++}`);
        sleeperInstance.position = pos.add(new BABYLON.Vector3(0, sleeperThickness / 2, 0));
        sleeperInstance.rotation = new BABYLON.Vector3(0, angle, 0);
        sleeperInstance.setEnabled(true);
        sleeperMeshes.push(sleeperInstance);
        break;
      }
      accumulated += segment.length;
    }
  }
  return sleeperMeshes;
}




function createPointComponent(elementNumber, piece, pieceId, scene) {
  let [edgeKey, segmentPoints] = getNthEntry(piece.worldPoints, elementNumber);
  let positions = segmentPoints;
  //let lines = BABYLON.MeshBuilder.CreateLines(`segment-${edgeKey}`, { points: positions }, scene);
  let {mergedRails, mergedSleepers} = createRailTrack(positions, scene);
  let [a,b] = getEndpointsFromEdgeKey(edgeKey);
  let nonZeroEndpoint = getNonZeroEndpoint([a,b]);
  if (nonZeroEndpoint === 1) {
    //lines.color = new BABYLON.Color3(0,0,0);
    let key = "toEndpoint1";
    //let value = lines;
    savePointEdgesMesh(pieceId, key, {mergedRails, mergedSleepers})
  } else {
    //this is the initially inactive endpoint
    //lines.color = new BABYLON.Color3(1,0,0);
    let key = "toEndpoint2";
    //let value = lines;
    savePointEdgesMesh(pieceId, key, {mergedRails, mergedSleepers})
    
  }
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

