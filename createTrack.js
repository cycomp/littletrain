export function createRailTrack(points, scene) {
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

  // Build segments with lengths
  const segments = [];
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const length = BABYLON.Vector3.Distance(start, end);
    segments.push({ start, end, length });
    totalLength += length;
  }

  // Place sleepers at regular intervals along full path
  let distanceAlong = 0;
  let sleeperIndex = 0;

  while (distanceAlong <= totalLength) {
    let d = distanceAlong;
    let accumulated = 0;

    for (let i = 0; i < segments.length; i++) {
      const { start, end, length } = segments[i];
      if (accumulated + length >= d) {
        const t = (d - accumulated) / length;
        const position = BABYLON.Vector3.Lerp(start, end, t);
        const dir = end.subtract(start).normalize();
        const angle = Math.atan2(dir.x, dir.z);

        const sleeperInstance = sleeper.createInstance(`sleeper-${sleeperIndex++}`);
        sleeperInstance.position = position.add(new BABYLON.Vector3(0, sleeperThickness / 2, 0));
        sleeperInstance.rotation = new BABYLON.Vector3(0, angle, 0);
        break;
      }
      accumulated += length;
    }

    distanceAlong += sleeperSpacing;
  }
}
