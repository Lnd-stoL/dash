import { v4 as uuidv4 } from 'uuid';

export default class ExternalPathPlanner {
  _PLANNING_SERVER_URL = 'http://127.0.0.1:9999/'

  constructor() {
    this.uuid = uuidv4();
  }

  plan(vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles, speedLimit) {
    const state = {
      vehiclePose: vehiclePose,
      vehicleStation: vehicleStation,
      lanePath: lanePath,
      startTime: startTime,
      staticObstacles: staticObstacles,
      dynamicObstacles: dynamicObstacles,
      speedLimit: speedLimit,
      plannerId: this.uuid,
    };

    var jsonToSend = JSON.stringify(state);
    const response = this._send_request(jsonToSend, 'plan');
    const path = JSON.parse(response.responseText)['states'];

    return {
      planner_state: (response.status === 200 ? "ok" : "unavailable"),
      path: path,
      fromVehicleSegment: [],
      fromVehicleParams: { type:'null' },
      latticeStartStation: null,
      dynamicObstacleGrid: null
    };
  }

  reset() {
    //this.notify_scenario_status({status: "restart"});
  }

  notify_scenario_status(status) {
    var jsonToSend = JSON.stringify(status);
    this._send_request(jsonToSend, 'notify_case_status');
  }

  _send_request(jsonToSend, request_name) {
    var url = this._PLANNING_SERVER_URL + request_name;

    var xhr = new XMLHttpRequest();
    xhr.timeout = 5000;
    xhr.open('POST', url, false); // the 'false' makes the request synchronous
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(jsonToSend);

    return xhr;
  }
}
