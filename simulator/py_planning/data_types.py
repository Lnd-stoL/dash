from dataclasses import dataclass, field
from typing import List, Optional

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
class LanePath:
    centerlines: List[List[Position]]
    leftBoundaries: List[List[Position]]
    rightBoundaries: List[List[Position]]

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
class State:
    vehiclePose: VehiclePose
    vehicleStation: float
    lanePath: LanePath
    startTime: float
    dynamicObstacles: List[DynamicObstacle]
    staticObstacles: List[StaticObstacle]

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
