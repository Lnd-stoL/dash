import json
import jsonpickle
import traceback

from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
from dacite import from_dict

from .data_types import State


class JSONRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, do_plan, on_case_status, *args, **kwargs):
        self.do_plan = do_plan
        self.on_case_status = on_case_status
        super().__init__(*args, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        # Parse query data & params to find out what was passed
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/plan':
            self.plan_request()
        elif parsed_path.path == '/notify_case_status':
            self.notify_case_status_request()
        else:
            self.send_response(404)

    def plan_request(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        try:
            state = json.loads(post_data)
        except json.JSONDecodeError:
            response = {'status': 'error', 'message': 'Invalid JSON'}

        try:
            response = self.do_plan(from_dict(data_class=State, data=state))
        except Exception:
            print('Exception while planning: ', traceback.format_exc())
            response = {'status': 'error', 'message': traceback.format_exc()}

        # Send the "200 OK" response
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        # Send the response
        self.wfile.write(jsonpickle.dumps(response).encode('utf-8'))

    def notify_case_status_request(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        response = ""
        status = {}
        try:
            status = json.loads(post_data)
        except json.JSONDecodeError:
            response = {'status': 'error', 'message': 'Invalid JSON'}

        self.on_case_status(status)

        # Send the "200 OK" response
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        # Send the response
        self.wfile.write(jsonpickle.dumps(response).encode('utf-8'))

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        BaseHTTPRequestHandler.end_headers(self)

    def log_message(self, format, *args):
        pass  # Override the log_message method to silence all logs


class PlanningServer(HTTPServer):
    def __init__(self, server_address):
        super().__init__(server_address, JSONRequestHandler)
        self.handles_planning_requests = True
        self.case_completed = False
        self.fail_reason = ''

    def finish_request(self, request, client_address):
        self.RequestHandlerClass(self.do_plan, self.on_case_status, request, client_address, self)

    def set_planner(self, do_plan):
        self.do_plan = do_plan

    def on_case_status(self, status):
        status_string = status["status"]
        self.handles_planning_requests = False
        if status_string == 'reset':
            self.self.fail_reason = ''
        if status_string == 'completed':
            self.self.fail_reason  = ''
            self.case_completed = True
        if status_string == 'failed':
            self.case_completed = False
            self.fail_reason = status["reason"]

    def run(self):
        self.handles_planning_requests = True
        while self.handles_planning_requests:
            self.handle_request()
        return self.case_completed
