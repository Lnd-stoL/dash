import THREE from "script-loader!../vendor/three.js";
import Utils from "script-loader!../js/Utils.js";
import PathPlanner from "../js/autonomy/path-planning/PathPlanner.js";
import ExternalPathPlanner from "../js/autonomy/path-planning/ExternalPlanner.js";
import LanePath from "../js/autonomy/LanePath.js";
import StaticObstacle from "../js/autonomy/StaticObstacle.js";
import DynamicObstacle from "../js/autonomy/DynamicObstacle.js";

function init() {
  let pathPlanner;
  try {
    // pathPlanner = new PathPlanner();
    pathPlanner = new ExternalPathPlanner()
  } catch (e) {
    console.log('Error initializing path planner:');
    console.log(e);
    self.postMessage({ error: true });
    return;
  }

  self.onmessage = function(event) {
    if (event.data.type === 'notify_case_status') {
      pathPlanner.notify_scenario_status(event.data.status);
      return;
    }
    if (event.data.type != 'plan') {
      console.log("unkonwn posted message type: " + event);
      return;
    }

    const { config, vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles, reset } = event.data;

    LanePath.hydrate(lanePath);
    staticObstacles.forEach(o => StaticObstacle.hydrate(o));
    dynamicObstacles.forEach(o => DynamicObstacle.hydrate(o));

    if (reset) pathPlanner.reset();

    pathPlanner.config = config;

    try {
      const { path, fromVehicleSegment, fromVehicleParams, latticeStartStation, dynamicObstacleGrid } =
          pathPlanner.plan(vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles);

      self.postMessage({ path, fromVehicleSegment, fromVehicleParams, vehiclePose, vehicleStation, latticeStartStation, config, dynamicObstacleGrid });
    } catch (error) {
      console.log('PathPlannerWorker error');
      console.log(error);
    }
  };
}

if (typeof(window) === 'undefined') {
  init();
} else {
  window.dash_initPathPlannerWorker = init;
}
