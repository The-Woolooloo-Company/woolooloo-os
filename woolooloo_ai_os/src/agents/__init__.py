import importlib
from ..models import AgentType
from typing import Dict, Any

_AGENT_MODULE_MAP: Dict[AgentType, str] = {
    AgentType.PRODUCT: ".product",
    AgentType.DEV: ".dev",
    AgentType.GROWTH: ".growth",
    AgentType.SALES: ".sales",
    AgentType.OPS: ".ops",
    AgentType.FOUNDER: ".founder",
}

_AGENT_CLASS_MAP: Dict[AgentType, str] = {
    AgentType.PRODUCT: "ProductAgent",
    AgentType.DEV: "DevAgent",
    AgentType.GROWTH: "GrowthAgent",
    AgentType.SALES: "SalesAgent",
    AgentType.OPS: "OpsAgent",
    AgentType.FOUNDER: "FounderAgent",
}

_cached_agents: Dict[AgentType, Any] = {}


def _load_agent_class(agent_type: AgentType):
    module_name = _AGENT_MODULE_MAP.get(agent_type, "")
    class_name = _AGENT_CLASS_MAP.get(agent_type, "")
    if not module_name or not class_name:
        raise ValueError(f"Unknown agent type: {agent_type}")

    mod = importlib.import_module(module_name, package=__package__)
    return getattr(mod, class_name)


def get_agent(agent_type: AgentType):
    if agent_type not in _cached_agents:
        cls = _load_agent_class(agent_type)
        _cached_agents[agent_type] = cls()
    return _cached_agents[agent_type]


def get_all_agents():
    result = []
    for at in AgentType:
        try:
            result.append(get_agent(at))
        except Exception as e:
            print(f"Warning: Could not load agent {at}: {e}")
            continue
    return result


__all__ = [
    "get_agent",
    "get_all_agents",
    "AgentType",
]