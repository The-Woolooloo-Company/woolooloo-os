from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class TriggerType(StrEnum):
    EVENT = "event"
    SCHEDULE = "schedule"
    DEMAND = "demand"


class ExecutionStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class AgentType(StrEnum):
    PRODUCT = "product"
    DEV = "dev"
    GROWTH = "growth"
    SALES = "sales"
    OPS = "ops"
    FOUNDER = "founder"


class AgentStatus(StrEnum):
    IDLE = "idle"
    RUNNING = "running"
    ERROR = "error"


class TaskStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Role(StrEnum):
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
    webhook_id: str | None = None
    created_at: str | None = None


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
    agent_type: AgentType | None = None


class AgentExecutionRequest(BaseModel):
    agent_type: AgentType
    trigger: TriggerType
    input: dict
    trigger_detail: str | None = None


class AgentExecutionResponse(BaseModel):
    execution_id: str
    agent_type: AgentType
    status: ExecutionStatus
    output: dict | None = None
    error: str | None = None
    duration_ms: int | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
