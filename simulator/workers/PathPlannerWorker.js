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
    self.postMessage({ error: "initialization_failed" });
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

    let should_retry = true;
    while (should_retry) {
      let planner_result;
      try {
        planner_result = pathPlanner.plan(vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles);
        should_retry = planner_result.planner_state == "unavailable";
      } catch (error) {
        if (error.name != "TimeoutError" && error.name != "NetworkError") {
          console.log('Planning request error: ');
          console.log(error);
          self.postMessage({ error: error.toString() });
          should_retry = false;
          break;
        }
      }

      if (should_retry) {
        self.postMessage({ error: "planner_unavailable" });
      } else {
        const {
          path,
          fromVehicleSegment,
          fromVehicleParams,
          latticeStartStation,
          dynamicObstacleGrid
        } = planner_result;

        self.postMessage({
          path,
          fromVehicleSegment,
          fromVehicleParams,
          vehiclePose,
          vehicleStation,
          latticeStartStation,
          config,
          dynamicObstacleGrid });
      }
    }
  };
}

if (typeof(window) === 'undefined') {
  init();
} else {
  window.dash_initPathPlannerWorker = init;
}
