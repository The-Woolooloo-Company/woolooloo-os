from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class TriggerType(str, Enum):
    EVENT = "event"
    SCHEDULE = "schedule"
    DEMAND = "demand"


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class AgentType(str, Enum):
    PRODUCT = "product"
    DEV = "dev"
    GROWTH = "growth"
    SALES = "sales"
    OPS = "ops"
    FOUNDER = "founder"


class AgentStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    ERROR = "error"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Role(str, Enum):
    FOUNDER = "founder"
    PRODUCT = "product"
    ENGINEER = "engineer"
    SALES = "sales"
    OPS = "ops"


class BaseEvent(BaseModel):
    source: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trigger: TriggerType


class LinearEventPayload(BaseModel):
    action: str
    data: dict
    webhook_id: Optional[str] = None
    created_at: Optional[str] = None


class TaskEvent(BaseEvent):
    trigger: Literal[TriggerType.EVENT] = TriggerType.EVENT
    payload: LinearEventPayload
    agent_type: AgentType


class HeartbeatEvent(BaseEvent):
    trigger: Literal[TriggerType.SCHEDULE] = TriggerType.SCHEDULE
    schedule_name: str
    agent_types: list[AgentType]


class DemandEvent(BaseEvent):
    trigger: Literal[TriggerType.DEMAND] = TriggerType.DEMAND
    command: str
    channel: str
    user: str
    agent_type: Optional[AgentType] = None


class AgentExecutionRequest(BaseModel):
    agent_type: AgentType
    trigger: TriggerType
    input: dict
    trigger_detail: Optional[str] = None


class AgentExecutionResponse(BaseModel):
    execution_id: str
    agent_type: AgentType
    status: ExecutionStatus
    output: Optional[dict] = None
    error: Optional[str] = None
    duration_ms: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)