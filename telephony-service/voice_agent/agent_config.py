"""Freshman Flu's per-call Deepgram Voice Agent configuration."""

from deepgram.agent.v1 import (
    AgentV1Settings,
    AgentV1SettingsAgent,
    AgentV1SettingsAgentListen,
    AgentV1SettingsAgentListenProvider_V2,
    AgentV1SettingsAudio,
    AgentV1SettingsAudioInput,
    AgentV1SettingsAudioOutput,
)
from deepgram.types.speak_settings_v1 import SpeakSettingsV1
from deepgram.types.speak_settings_v1provider import SpeakSettingsV1Provider_Deepgram
from deepgram.types.think_settings_v1 import ThinkSettingsV1
from deepgram.types.think_settings_v1functions_item import ThinkSettingsV1FunctionsItem
from deepgram.types.think_settings_v1provider import ThinkSettingsV1Provider_OpenAi

from config import LLM_MODEL, VOICE_MODEL


def _prompt(context: dict) -> str:
    student = context.get("student_name") or "the student"
    purpose = context.get("purpose") or "a health-related request"
    details = context.get("details") or "No additional details were supplied."
    return f"""You are Freshman Flu's automated voice proxy, speaking on behalf of {student}.

CALL PURPOSE: {purpose}
STUDENT-PROVIDED CONTEXT: {details}

You are on a live phone call. Start by saying you are an AI voice assistant speaking with the student's permission, then state the purpose plainly. Speak naturally and briefly, one or two sentences at a time. Never claim to be a clinician, make a diagnosis, give medical instructions, invent the student's identity, insurance, dates, availability, or consent.

Your job is to communicate the supplied context, ask the requested questions, and relay the other person's answer. If someone asks for a fact not in the context or needs a decision only {student} can make, say: "One moment while I check with the student." Then call ask_student with one concise question. When an answer is injected later, treat it as the student's answer and continue the call.

If the other person wants to end the call, end politely. Do not pressure anyone. Do not collect payment information, medical records, or other sensitive information. Do not use markdown, emojis, or filler.
"""


def get_agent_config(context: dict) -> AgentV1Settings:
    """Return Twilio-compatible mulaw / 8kHz Voice Agent settings."""
    call_sid = context.get("call_sid", "")
    return AgentV1Settings(
        type="Settings",
        audio=AgentV1SettingsAudio(
            input=AgentV1SettingsAudioInput(encoding="mulaw", sample_rate=8000),
            output=AgentV1SettingsAudioOutput(
                encoding="mulaw", sample_rate=8000, container="none"
            ),
        ),
        agent=AgentV1SettingsAgent(
            listen=AgentV1SettingsAgentListen(
                provider=AgentV1SettingsAgentListenProvider_V2(
                    version="v2", type="deepgram", model="flux-general-en"
                )
            ),
            think=ThinkSettingsV1(
                provider=ThinkSettingsV1Provider_OpenAi(
                    type="open_ai", model=LLM_MODEL
                ),
                prompt=_prompt(context),
                functions=[
                    ThinkSettingsV1FunctionsItem(
                        name="ask_student",
                        description="Ask the student a single concise question when a missing fact or decision is required to continue the call.",
                        parameters={
                            "type": "object",
                            "properties": {
                                "question": {"type": "string"},
                                "call_sid": {"type": "string", "default": call_sid},
                            },
                            "required": ["question"],
                        },
                    ),
                    ThinkSettingsV1FunctionsItem(
                        name="end_call",
                        description="End the call after a brief, polite goodbye.",
                        parameters={
                            "type": "object",
                            "properties": {"reason": {"type": "string"}},
                            "required": ["reason"],
                        },
                    ),
                ],
            ),
            speak=SpeakSettingsV1(
                provider=SpeakSettingsV1Provider_Deepgram(
                    type="deepgram", model=VOICE_MODEL
                )
            ),
            greeting="Hello, this is an AI voice assistant speaking with the student's permission. How can I help today?",
        ),
    )
