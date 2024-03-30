
from shapely.geometry import LineString, Point

def get_index_of_closest_point(line: LineString, point: Point):
    closest_point_index = None
    min_distance = float('inf')

    for i, line_point in enumerate(line.coords):
        line_point = Point(line_point)
        distance = point.distance(line_point)
        if distance < min_distance:
            min_distance = distance
            closest_point_index = i

    return closest_point_index


def do_plan(state):
    vehicle_pose = state['vehiclePose']
    vehicle_pos = Point(vehicle_pose['pos']['x'], vehicle_pose['pos']['y'])

    all_centerlines = []
    for centerline in state['lanePath']['centerlines']:
        all_centerlines.extend(centerline)

    centerline = LineString([(p['x'], p['y']) for p in all_centerlines])

    closest_index = get_index_of_closest_point(centerline, vehicle_pos)

    return [{'pos': p, 'velocity': vehicle_pose['velocity'], 'acceleration': 0} for p in all_centerlines][max(closest_index-3, 0):max(closest_index-3, 0) + 50]
