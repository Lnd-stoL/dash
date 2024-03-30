Math.clamp = (number, min, max) => Math.max(min, Math.min(number, max));

Math.wrapAngle = (angle) => {
  angle = angle % (Math.PI * 2);
  if (angle <= -Math.PI) return angle + Math.PI * 2;
  else if (angle > Math.PI) return angle - Math.PI * 2;
  else return angle;
}

THREE.Vector2.fromAngle = (angle) => new THREE.Vector2(Math.cos(angle), Math.sin(angle));

THREE.Curve.prototype.getCurvatureAt = function(u) {
  let t2 = this.getUtoTmapping(u);

  const delta = 0.0001;
  let t1 = t2 - delta;
  let t3 = t2 + delta;

  if (t1 < 0) {
    t1 = 0;
    t2 = delta;
    t3 = 2 * delta;
  }

  if (t3 > 1) {
    t3 = 1;
    t2 = 1 - delta;
    t1 = 1 - 2 * delta;
  }

  const p1 = this.getPoint(t1);
  const p2 = this.getPoint(t2);
  const p3 = this.getPoint(t3);

  return (Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p2.y - p1.y, p2.x - p1.x)) / p2.distanceTo(p1);
};


function getOBBVertices(cx, cy, width, height, angle) {
  const hw = width / 2; // half width
  const hh = height / 2; // half height
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    // Top-left
    { x: cx - hw * cos + hh * sin, y: cy - hw * sin - hh * cos },
    // Top-right
    { x: cx + hw * cos + hh * sin, y: cy + hw * sin - hh * cos },
    // Bottom-right
    { x: cx + hw * cos - hh * sin, y: cy + hw * sin + hh * cos },
    // Bottom-left
    { x: cx - hw * cos - hh * sin, y: cy - hw * sin + hh * cos }
  ];
}

function getOOBBAxes(vertices) {
  const axes = [];
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length]; // Next vertex
    const edge = { x: p1.x - p2.x, y: p1.y - p2.y }; // Get edge vector
    const normal = { x: -edge.y, y: edge.x }; // Get normal (perpendicular) vector
    const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
    axes.push({ x: normal.x / length, y: normal.y / length }); // Normalize vector
  }
  return axes;
}

function projectOnAxis(vertices, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const vertex of vertices) {
    let projection = vertex.x * axis.x + vertex.y * axis.y;
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }
  return { min, max };
}

function segmentsOverlaps(projection1, projection2) {
  return projection1.max >= projection2.min && projection2.max >= projection1.min;
}

function areRectanglesColliding(rect1, rect2) {
  const verticesA = getOBBVertices(rect1.x, rect1.y, rect1.width, rect1.height, rect1.angle);
  const verticesB = getOBBVertices(rect2.x, rect2.y, rect2.width, rect2.height, rect2.angle);

  const axesA = getOOBBAxes(verticesA);
  const axesB = getOOBBAxes(verticesB);
  const axes = axesA.concat(axesB);

  for (const axis of axes) {
    const projectionA = projectOnAxis(verticesA, axis);
    const projectionB = projectOnAxis(verticesB, axis);
    if (!segmentsOverlaps(projectionA, projectionB)) {
      return false; // Found a separating axis, no collision
    }
  }

  return true; // No separating axis found, rectangles intersect
}

function checkRectanglePolylineIntersection(rect, polylinePoints) {
  const rectanglePoints = getOBBVertices(rect.x, rect.y, rect.width, rect.height, rect.angle)

  // Transform rectangle points into array of lines
  const rectangleLines = [];
  for (let i = 0; i < rectanglePoints.length; i++) {
    rectangleLines.push([
      rectanglePoints[i],
      rectanglePoints[(i + 1) % rectanglePoints.length]
    ]);
  }

  // Check each polyline segment for intersection with each rectangle line
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const polylineSegment = [
      polylinePoints[i],
      polylinePoints[i + 1]
    ];

    for (const rectLine of rectangleLines) {
      if (intersectSegment(rectLine[0], rectLine[1], polylineSegment[0], polylineSegment[1])) {
        return true; // Found an intersection
      }
    }
  }

  // No intersections found
  return false;
}

// Helper function to detect intersection between two line segments
function intersectSegment(p0, p1, p2, p3) {
  let s1_x, s1_y, s2_x, s2_y;
  s1_x = p1.x - p0.x; s1_y = p1.y - p0.y;
  s2_x = p3.x - p2.x; s2_y = p3.y - p2.y;

  let s, t;
  s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / (-s2_x * s1_y + s1_x * s2_y);
  t = ( s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / (-s2_x * s1_y + s1_x * s2_y);

  // Collision detected
  if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      // Intersection point is p0 + t * s1
      return true;
  }

  return false; // No collision
}
