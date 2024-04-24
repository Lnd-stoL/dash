from dataclasses import dataclass, field
from typing import List, Optional
import itertools

@dataclass
class Position:
    x: float
    y: float

@dataclass
class PositionSL:
    s: float
    l: float

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
class _RawDynamicObstacle:
    type: str
    startPos: Position
    velocity: Position
    size: Size
    parallel: bool

@dataclass
class DynamicObstacle:
    type: str
    start_pos: PositionSL
    velocity: PositionSL
    size: Size
    parallel: bool

@dataclass
class _RawState:
    vehiclePose: VehiclePose
    vehicleStation: float
    lanePath: MultipleLanePath
    startTime: float
    dynamicObstacles: List[_RawDynamicObstacle]
    staticObstacles: List[StaticObstacle]
    speedLimit: float
    plannerId: str

@dataclass
class State:
    vehicle_pose: VehiclePose  # current AV position and velocity
    vehicle_station: float     # current 'station' that is the distance travelled along the centerline
    lane_path: MultipleLanePath
    start_time: float
    dynamic_obstacles: List[DynamicObstacle]
    static_obstacles: List[StaticObstacle]
    speed_limit: float

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

@dataclass
class CaseStatus:
    status: Optional[str] = field(default="not_started")
    completed: Optional[bool] = field(default=False)
    fail_reason: Optional[str] = field(default="")
    running_time: Optional[float] = field(default=0)
    planning_ticks: Optional[int] = field(default=0)


def _merge_multiple_lane_paths(multiple_lane_paths: MultipleLanePath) -> LanePath:
    return LanePath(
        centerline=list(p for p in itertools.chain(*multiple_lane_paths.centerlines)),
        left_boundaries=list(p for p in itertools.chain(*multiple_lane_paths.leftBoundaries)),
        right_boundaries=list(p for p in itertools.chain(*multiple_lane_paths.rightBoundaries))
    )

def beatify_state(raw_state: _RawState) -> State:
    dynamic_obstacles = [
        DynamicObstacle(
            type=d.type,
            start_pos=PositionSL(s=d.startPos.x, l=d.startPos.y),
            velocity=PositionSL(s=d.velocity.x, l=d.velocity.y),
            size=d.size,
            parallel=d.parallel
        )
        for d in raw_state.dynamicObstacles
    ]
    return State(
        start_time=raw_state.startTime,
        vehicle_pose=raw_state.vehiclePose,
        vehicle_station=raw_state.staticObstacles,
        dynamic_obstacles=dynamic_obstacles,
        static_obstacles=raw_state.staticObstacles,
        lane_path=_merge_multiple_lane_paths(raw_state.lanePath),
        speed_limit=raw_state.speedLimit,
    )

# this is essential for correct json serialization
def postprocess_planned_path(planned_path: PlannedPath) -> PlannedPath:
    for i in range(len(planned_path.states)):
        planned_path.states[i].acceleration = float(planned_path.states[i].acceleration)
        planned_path.states[i].velocity = float(planned_path.states[i].velocity)
        planned_path.states[i].pos.x = float(planned_path.states[i].pos.x)
        planned_path.states[i].pos.y = float(planned_path.states[i].pos.y)
    return planned_path
