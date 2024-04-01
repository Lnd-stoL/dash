
export default class ExternalPathPlanner {
  _PLANNING_SERVER_URL = 'http://127.0.0.1:9999/'

  plan(vehiclePose, vehicleStation, lanePath, startTime, staticObstacles, dynamicObstacles) {
    const state = {
      vehiclePose: vehiclePose,
      vehicleStation: vehicleStation,
      lanePath: lanePath,
      startTime: startTime,
      staticObstacles: staticObstacles,
      dynamicObstacles: dynamicObstacles,
    };

    /*
    if (!this._ping_server()) {
      return {
        planner_state: "unavailable"
      }
    }
    */

    var jsonToSend = JSON.stringify(state);
    const response = this._send_request(jsonToSend, 'plan');
    const path = JSON.parse(response)['states'];

    return {
      planner_state: "ok",
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
    //if (this._ping_server()) {
      var jsonToSend = JSON.stringify(status);
      this._send_request(jsonToSend, 'notify_case_status');
    //}
  }

  _send_request(jsonToSend, request_name) {
    var url = this._PLANNING_SERVER_URL + request_name;

    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, false); // the 'false' makes the request synchronous
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(jsonToSend);

    if (xhr.status === 200) {
      return xhr.responseText;
    } else {
      console.error('There was an error with the request');
    }
  }

  _ping_server() {
    var url = this._PLANNING_SERVER_URL + 'ping';

    try {
      var xhr = new XMLHttpRequest();
      xhr.timeout = 200;
      xhr.open('POST', url, false); // the 'false' makes the request synchronous
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send("{}");
    } catch (exception) {
      return false;
    }

    return xhr.status === 200;
  }
}
