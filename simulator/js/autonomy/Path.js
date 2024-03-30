import Car from "../physics/Car.js"

// input pose: { pos: Vector2 [, rot: radians] }
// pose: { pos: Vector2, frontPos: Vector2, fakePos: Vector2, rot: radians }
export default class Path {
  constructor(poses, startRotation = 0, goalRotation = 0) {
    this.poses = poses;

    for (let i = 0; i < poses.length; i++) {
      const pose = poses[i];

      if (pose.rot === undefined || pose.rot == null) {
        let rot;

        if (i == 0) {
          rot = startRotation;
        } else if (i == poses.length - 1) {
          rot = goalRotation;
        } else {
          const prev = poses[i - 1].pos;
          const next = poses[i + 1].pos;
          rot = Math.atan2(next.y - prev.y, next.x - prev.x);
        }

        pose.rot = rot;
      }

      if (pose.curv === undefined || pose.curv == null) {
        if (i > 0 && i < poses.length - 1) {
          const prev = poses[i - 1].pos;
          const cur = poses[i].pos;
          const next = poses[i + 1].pos;

          const dir1 = { x: cur.x - prev.x, y: cur.y - prev.y };
          const dir2 = { x: next.x - cur.x, y: next.y - cur.y };

          const angle1 = Math.atan2(dir1.y, dir1.x);
          const angle2 = Math.atan2(dir2.y, dir2.x);

          // Calculate the angular difference in a way that properly handles the wrap-around from -π to π
          let deltaAngle = angle2 - angle1;
          // Normalize the angle difference to be within the range [-π, π]
          deltaAngle = (deltaAngle + Math.PI) % (2 * Math.PI) - Math.PI;

          // Assuming uniform segment lengths, the curvature (inverse radius of curvature) can be
          // approximated as the change in angle. For non-uniform segment lengths, include arc length in calculation
          const curvature = Math.abs(deltaAngle); // Using absolute value of angle difference

          pose.curv = curvature;
        } else {
          // Assign zero curvature for start and end points or handle as needed
          pose.curv = 0;
        }
      }

      pose.frontPos = Car.getFrontAxlePosition(pose.pos, pose.rot);
      pose.fakePos = Car.getFakeAxlePosition(pose.pos, pose.rot);
    }
  }
}
