from threading import Thread
from .planning_server import PlanningServer
import pprint


def _run_visualization_server():
    def server_thread():
        from http.server import HTTPServer, SimpleHTTPRequestHandler

        class Handler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory='./simulator', **kwargs)

            def log_message(self, format, *args):
                pass  # Override the log_message method to silence all logs

            def end_headers(self):
                self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
                self.send_header('Pragma', 'no-cache')
                self.send_header('Expires', '0')
                SimpleHTTPRequestHandler.end_headers(self)

        httpd = HTTPServer(("127.0.0.1", 8008), Handler)
        httpd.serve_forever()

    thread = Thread(target=server_thread)
    thread.start()


def init():
    _run_visualization_server()

    global _p_server
    _p_server = PlanningServer(('127.0.0.1', 9999))


def run_planner(planning_function, stop_on_fail=True):
    global _p_server
    _p_server.set_planner(planning_function)
    _p_server.set_stop_on_fail(stop_on_fail)

    case_status = _p_server.run()
    if case_status.completed:
        print("Congrats! Case completed successfully.")
    else:
        print("Case failed: " + case_status.fail_reason)

    print("running time: " + str(case_status.running_time) + "s")
    print("planning ticks: "  + str(case_status.planning_ticks))

    if not case_status.completed:
        raise Exception("Case failed")
