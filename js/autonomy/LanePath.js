const pointsPerSegment = 20;
const halfLaneWidth = 3.7 / 2;

const centerlineGeometry = new THREE.Geometry();
const leftBoundaryGeometry = new THREE.Geometry();
const rightBoundaryGeometry = new THREE.Geometry();

export default class {
  constructor() {
    if (pointsPerSegment < 3) throw new Error('There must be at least 2 points per LanePath segment.');

    this.anchors = [];
    this.centerlines = [];
    this.sampleLengths = [];
    this.arcLengths = [];
    this.rotations = [];
    this.leftBoundaries = [];
    this.rightBoundaries = [];
  }

  get centerline() {
    return [].concat(...this.centerlines);
  }

  // TODO: this probably isn't needed (along with this.rotations)
  get centerlineRotations() {
    return [].concat(...this.rotations);
  }

  get centerlineLengths() {
    return [].concat(...this.arclengths);
  }

  get leftBoundary() {
    return [].concat(...this.leftBoundaries);
  }

  get rightBoundary() {
    return [].concat(...this.rightBoundaries);
  }

  sampleStations(startStation, num, interval) {
    const samples = [];
    let anchorIndex = 0;
    let sampleIndex = 0;
    let totalLength = 0;
    let nextStation = startStation;
    let [p0, p1, p2, p3] = this.anchorsForSplineIndex(anchorIndex);

    while (totalLength + this.arcLengths[anchorIndex] < nextStation) {
      totalLength += this.arcLengths[anchorIndex];

      if (++anchorIndex >= this.arcLengths.length)
        throw new Error(`Exhausted lane path before reaching ${num} centerline samples at ${interval}m intervals.`);
    }

    for (let i = 0; i < num; i++) {
      let length = this.sampleLengths[anchorIndex][sampleIndex];
      while (totalLength + length < nextStation) {
        totalLength += length;

        if (++sampleIndex >= this.sampleLengths[anchorIndex].length) {
          sampleIndex = 0;

          if (++anchorIndex >= this.sampleLengths.length)
            throw new Error(`Exhausted lane path before reaching ${num} centerline samples at ${interval}m intervals.`);

          [p0, p1, p2, p3] = this.anchorsForSplineIndex(anchorIndex);
        }

        length = this.sampleLengths[anchorIndex][sampleIndex];
      }

      const weight = (sampleIndex + (nextStation - totalLength) / length) / this.sampleLengths[anchorIndex].length;
      const pos = catmullRomVec(weight, p0, p1, p2, p3);
      const tangent = tangentAt(weight, p0, p1, p2, p3);
      const rot = Math.atan2(tangent.y, tangent.x);
      const curv = curvatureAt(weight, p0, p1, p2, p3);

      samples.push({ pos, rot, curv });
      nextStation += interval;
    }

    return samples;
  }

  stationLatitudeFromPosition(position, aroundAnchorIndex = null) {
    const [anchorIndex, sampleIndex, sampleStation, prevSampleStation] = this._findClosestSample(position, aroundAnchorIndex);

    let prevPoint;
    let nextPoint;
    let prevStation;
    let nextStation;

    if (anchorIndex == 0 && sampleIndex == 0) {
      prevPoint = this.centerlines[anchorIndex][sampleIndex];
      nextPoint = this.centerlines[anchorIndex][sampleIndex + 1];
      prevStation = 0;
      nextStation = this.sampleLengths[anchorIndex][sampleIndex];
    } else if (anchorIndex == this.centerlines.length - 1 && sampleIndex == this.centerlines[anchorIndex].length - 1) {
      prevPoint = this.centerlines[anchorIndex][sampleIndex - 1];
      nextPoint = this.centerlines[anchorIndex][sampleIndex];
      prevStation = prevSampleStation;
      nextStation = sampleStation;
    } else {
      prevPoint = sampleIndex == 0 ? this.centerlines[anchorIndex - 1][this.centerlines[anchorIndex - 1].length - 1] : this.centerlines[anchorIndex][sampleIndex - 1];
      nextPoint = sampleIndex == this.centerlines[anchorIndex].length - 1 ? this.centerlines[anchorIndex + 1][0] : this.centerlines[anchorIndex][sampleIndex + 1];

      if (position.distanceToSquared(prevPoint) < position.distanceToSquared(nextPoint)) {
        prevPoint = prevPoint;
        nextPoint = this.centerlines[anchorIndex][sampleIndex];
        prevStation = prevSampleStation;
        nextStation = sampleStation;
      } else {
        prevPoint = this.centerlines[anchorIndex][sampleIndex];
        nextPoint = nextPoint;
        prevStation = sampleStation;
        nextStation = sampleStation + this.sampleLengths[anchorIndex][sampleIndex];
      }
    }

    const distSqr = prevPoint.distanceToSquared(nextPoint);
    const progress = Math.clamp(position.clone().sub(prevPoint).dot(nextPoint.clone().sub(prevPoint)) / distSqr, 0, 1);
    const projectedPosition = nextPoint.clone().sub(prevPoint).multiplyScalar(progress).add(prevPoint);

    const station = prevStation + (nextStation - prevStation) * progress;
    const latitude = Math.sign((nextPoint.x - prevPoint.x) * (position.y - prevPoint.y) - (nextPoint.y - prevPoint.y) * (position.x - prevPoint.x)) * position.distanceTo(projectedPosition);

    return [station, latitude, anchorIndex];
  }

  _findClosestSample(position, aroundAnchorIndex = null) {
    let closest = Number.POSITIVE_INFINITY;
    let bestAnchorIndex;
    let bestSampleIndex;
    let bestStation;
    let bestPrevStation;

    let currStation = 0;
    let prevStation = 0;

    let startAnchorIndex = 0;
    let endAnchorIndex = this.centerlines.length - 1;

    if (aroundAnchorIndex !== null) {
      startAnchorIndex = Math.max(0, aroundAnchorIndex - 1);
      endAnchorIndex = Math.min(this.centerlines.length - 1, aroundAnchorIndex + 1);
    }

    if (startAnchorIndex > 0) {
      for (let anchorIndex = 0; anchorIndex < startAnchorIndex; anchorIndex++) {
        currStation += this.arcLengths[anchorIndex];
      }

      prevStation = currStation - this.sampleLengths[startAnchorIndex - 1][this.sampleLengths[startAnchorIndex - 1].length - 1];
    }

    for (let anchorIndex = startAnchorIndex; anchorIndex <= endAnchorIndex; anchorIndex++) {
      const centerline = this.centerlines[anchorIndex];
      for (let sampleIndex = 0; sampleIndex < centerline.length; sampleIndex++) {
        const distSq = position.distanceToSquared(centerline[sampleIndex]);
        if (distSq < closest) {
          closest = distSq;
          bestAnchorIndex = anchorIndex;
          bestSampleIndex = sampleIndex;
          bestStation = currStation;
          bestPrevStation = prevStation;
        }

        prevStation = currStation;
        currStation += this.sampleLengths[anchorIndex][sampleIndex];
      }
    }

    return [bestAnchorIndex, bestSampleIndex, bestStation, bestPrevStation];
  }

  addAnchor(position) {
    const index = this.anchors.push(position) - 1;

    for (let i = index - 2; i < index; i++)
      this.resample(i);
  }

  updateAnchor(index, position) {
    this.anchors[index] = position;

    for (let i = index - 2; i <= index + 1; i++)
      this.resample(i);
  }

  resample(index) {
    if (index < 0 || index > this.anchors.length - 2) return;

    const [p0, p1, p2, p3] = this.anchorsForSplineIndex(index);
    const points = [];
    const lengths = [];
    const pointRotations = [];
    const leftBoundary = [];
    const rightBoundary = [];
    let prevPoint = null;

    const numPoints = index == this.anchors.length - 2 ? pointsPerSegment + 1 : pointsPerSegment;

    for (let i = 0; i < numPoints; i++) {
      const t = i / pointsPerSegment;
      const point = catmullRomVec(t, p0, p1, p2, p3);
      points.push(point);

      if (prevPoint != null)
        lengths.push(prevPoint.distanceTo(point));
      prevPoint = point;

      const tangent = tangentAt(t, p0, p1, p2, p3);
      pointRotations.push(Math.atan2(tangent.y, tangent.x));

      const normal = new THREE.Vector2(-tangent.y, tangent.x);

      leftBoundary.push(normal.clone().multiplyScalar(-halfLaneWidth).add(point));
      rightBoundary.push(normal.clone().multiplyScalar(halfLaneWidth).add(point));
    }

    lengths.push(prevPoint.distanceTo(p2));

    this.centerlines[index] = points;
    this.sampleLengths[index] = lengths;
    this.rotations[index] = pointRotations;
    this.leftBoundaries[index] = leftBoundary;
    this.rightBoundaries[index] = rightBoundary;
    this.arcLengths[index] = lengths.reduce((sum, l) => sum + l);
  }

  anchorsForSplineIndex(index) {
    let p;
    if (index == 0)
      p = [this.anchors[0]].concat(this.anchors.slice(0, 3));
    else
      p = this.anchors.slice(index - 1, index + 3);

    if (p[3] === undefined)
      p[3] = p[2];

    return p;
  }
}

function catmullRom(t, p0, p1, p2, p3) {
  const v0 = (p2 - p0) * 0.5;
  const v1 = (p3 - p1) * 0.5;
  const t2 = t * t;
  const t3 = t * t2;
  return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
}

function catmullRomVec(t, p0, p1, p2, p3) {
  return new THREE.Vector2(catmullRom(t, p0.x, p1.x, p2.x, p3.x), catmullRom(t, p0.y, p1.y, p2.y, p3.y));
}

function tangentAt(t, p0, p1, p2, p3) {
  const delta = 0.0001;
  let t1 = t - delta;
  let t2 = t + delta;

  if (t1 < 0) t1 = 0;
  if (t2 > 1) t2 = 1;

  const prev = catmullRomVec(t1, p0, p1, p2, p3);
  const next = catmullRomVec(t2, p0, p1, p2, p3);

  return next.sub(prev).normalize();
}

function curvatureAt(t2, p0, p1, p2, p3) {
  const delta = 0.0001;

  // If we're estimating curvature at one of the endpoints of the spline,
  // slightly shift it inwards to avoid infinite curvature.
  if (t2 == 0) t2 = delta;
  if (t2 == 1) t2 = 1 - delta;

  let t1 = t2 - delta;
  let t3 = t2 + delta;

  if (t1 < 0) t1 = 0;
  if (t3 > 1) t3 = 1;

  const pt1 = catmullRomVec(t1, p0, p1, p2, p3);
  const pt2 = catmullRomVec(t2, p0, p1, p2, p3);
  const pt3 = catmullRomVec(t3, p0, p1, p2, p3);

  return (Math.atan2(pt3.y - pt2.y, pt3.x - pt2.x) - Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x)) / pt2.distanceTo(pt1);
}
