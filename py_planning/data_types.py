from dataclasses import dataclass, field
from typing import List, Optional
import itertools

@dataclass
class Position:
    x: float
    y: float

@dataclass
class Size:
    w: float
    h: float

@dataclass
class VehiclePose:
    pos: Position
    rot: float
    velocity: float
    curv: float

@dataclass
class MultipleLanePath:
    centerlines: List[List[Position]]
    leftBoundaries: List[List[Position]]
    rightBoundaries: List[List[Position]]

@dataclass
class LanePath:
    centerline: List[Position]
    left_boundaries: List[Position]
    right_boundaries: List[Position]

@dataclass
class StaticObstacle:
    p: List[float]  # координаты препятствия в виде кортежа (x, y)
    r: float        # угол поворота (вращение)
    w: float        # ширина препятствия
    h: float        # высота препятствия

@dataclass
class DynamicObstacle:
    type: str
    startPos: Position
    velocity: Position
    size: Size
    parallel: bool

@dataclass
class _RawState:
    vehiclePose: VehiclePose
    vehicleStation: float
    lanePath: MultipleLanePath
    startTime: float
    dynamicObstacles: List[DynamicObstacle]
    staticObstacles: List[StaticObstacle]

@dataclass
class State:
    vehicle_pose: VehiclePose  # current AV position and velocity
    vehicle_station: float     # current 'station' that is the distance travelled along the centerline
    lane_path: MultipleLanePath
    start_time: float
    dynamic_obstacles: List[DynamicObstacle]
    static_obstacles: List[StaticObstacle]

@dataclass
class PlannedState:
    pos: Position
    velocity: float
    acceleration: float = 0
    rot: Optional[float] = field(default=None)
    curv: Optional[float] = field(default=None)

@dataclass
class PlannedPath:
    states: List[PlannedState]


def _merge_multiple_lane_paths(multiple_lane_paths: MultipleLanePath) -> LanePath:
    return LanePath(
        centerline=list(p for p in itertools.chain(*multiple_lane_paths.centerlines)),
        left_boundaries=list(p for p in itertools.chain(*multiple_lane_paths.leftBoundaries)),
        right_boundaries=list(p for p in itertools.chain(*multiple_lane_paths.rightBoundaries))
    )

def beatify_state(raw_state: _RawState) -> State:
    return State(
        start_time=raw_state.startTime,
        vehicle_pose=raw_state.vehiclePose,
        vehicle_station=raw_state.staticObstacles,
        dynamic_obstacles=raw_state.dynamicObstacles,
        static_obstacles=raw_state.staticObstacles,
        lane_path=_merge_multiple_lane_paths(raw_state.lanePath)
    )
