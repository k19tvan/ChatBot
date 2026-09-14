import logging
from typing import Annotated, Any, Optional, Sequence, TypedDict

from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

try:
    from .config import (
        API_KEY,
        BASE_URL,
        DEFAULT_MODEL,
        MAX_RESPONSE_TOKENS,
        MAX_SESSION_TOKENS,
    )
except (ImportError, ValueError):
    from config import (
        API_KEY,
        BASE_URL,
        DEFAULT_MODEL,
        MAX_RESPONSE_TOKENS,
        MAX_SESSION_TOKENS,
    )

logger = logging.getLogger("chatbot_backend.graph")


def estimate_tokens(text: str) -> int:
    """
    Fast, robust token estimator.
    In Vietnamese, English, and code, ~2.5 to 3 characters roughly equal 1 token.
    """
    if not text:
        return 0
    return max(1, len(text) // 3)


def estimate_message_tokens(msg: BaseMessage) -> int:
    content = msg.content if isinstance(msg.content, str) else str(msg.content)
    return estimate_tokens(content) + 4  # 4 tokens formatting overhead per message


def trim_messages_to_budget(
    messages: Sequence[BaseMessage],
    max_input_tokens: int,
) -> Sequence[BaseMessage]:
    """
    Sliding window trimming: keeps the newest messages that fit within max_input_tokens.
    System prompt (if any at index 0) is always preserved.
    The latest user query is guaranteed to be kept.
    """
    if not messages:
        return []

    msg_list = list(messages)
    system_msg = None
    if isinstance(msg_list[0], SystemMessage):
        system_msg = msg_list[0]
        msg_list = msg_list[1:]

    system_tokens = estimate_message_tokens(system_msg) if system_msg else 0
    available = max_input_tokens - system_tokens
    if available <= 0:
        available = max_input_tokens // 2

    kept: list[BaseMessage] = []
    current_tokens = 0

    # Iterate from newest to oldest
    for msg in reversed(msg_list):
        cost = estimate_message_tokens(msg)
        if current_tokens + cost <= available or not kept:
            kept.append(msg)
            current_tokens += cost
        else:
            # Exceeded session token budget, drop older messages
            break

    kept.reverse()

    if system_msg:
        return [system_msg] + kept
    return kept


class ChatState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    model: str
    temperature: float
    max_tokens: Optional[int]
    system_prompt: Optional[str]


def build_chat_graph() -> Any:
    """Builds and compiles the LangGraph state graph for chat completions."""

    async def call_model_node(state: ChatState):
        model_name = state.get("model") or DEFAULT_MODEL
        temperature = float(state.get("temperature", 0.7))

        # 1. Determine response token limit (allow full 2048 tokens)
        req_max_tokens = state.get("max_tokens")
        configured_max = MAX_RESPONSE_TOKENS or 2048
        if req_max_tokens and req_max_tokens > 0:
            response_tokens = max(req_max_tokens, configured_max)
        else:
            response_tokens = configured_max

        # 2. Calculate budget for input context in this session
        if MAX_SESSION_TOKENS and MAX_SESSION_TOKENS > 0:
            max_input_tokens = MAX_SESSION_TOKENS
        else:
            max_input_tokens = 4096

        kwargs = {
            "model": model_name,
            "base_url": BASE_URL,
            "api_key": API_KEY,
            "temperature": temperature,
            "streaming": True,
            "max_retries": 1,
            "timeout": 120.0,
            "max_tokens": response_tokens,
        }

        llm = ChatOpenAI(**kwargs)

        # 3. Assemble session messages
        input_messages = list(state.get("messages", []))
        sys_prompt = state.get("system_prompt")
        if sys_prompt and sys_prompt.strip():
            if not input_messages or not isinstance(input_messages[0], SystemMessage):
                input_messages = [SystemMessage(content=sys_prompt.strip())] + input_messages

        logger.info(
            f"Invoking LLM for session with {len(input_messages)} messages (max response tokens: {response_tokens})."
        )
        response = await llm.ainvoke(input_messages)
        return {"messages": [response]}

    workflow = StateGraph(ChatState)
    workflow.add_node("call_model", call_model_node)
    workflow.add_edge(START, "call_model")
    workflow.add_edge("call_model", END)
    return workflow.compile()
