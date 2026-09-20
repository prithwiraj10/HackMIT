"""HTTP, WebSocket, and student-input routes for Freshman Flu telephony."""

import asyncio
import json
import logging
import re

from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.websockets import WebSocket

from call_state import CallState, calls, snapshot
from config import ENDPOINT_SECRET
from voice_agent.session import VoiceAgentSession

logger = logging.getLogger(__name__)
active_sessions: dict[str, VoiceAgentSession] = {}
pending_contexts: dict[str, dict] = {}
E164 = re.compile(r"^\+[1-9]\d{7,14}$")


def _authorized(request: Request) -> bool:
    if not ENDPOINT_SECRET:
        return True
    return request.headers.get("authorization") == f"Bearer {ENDPOINT_SECRET}"


async def make_call(request: Request) -> Response:
    if not _authorized(request):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Expected JSON."}, status_code=400)
    phone = body.get("to") if isinstance(body, dict) else None
    if not isinstance(phone, str) or not E164.fullmatch(phone):
        return JSONResponse({"error": "Use an E.164 phone number, e.g. +16175551212."}, status_code=400)
    context = body.get("context") if isinstance(body.get("context"), dict) else {}
    context = {
        "student_name": str(context.get("student_name", "")).strip()[:100],
        "purpose": str(context.get("purpose", "")).strip()[:500],
        "details": str(context.get("details", "")).strip()[:4000],
    }
    if not context["purpose"] or not context["details"]:
        return JSONResponse({"error": "Call purpose and context are required."}, status_code=400)
    try:
        from telephony.call_manager import place_call

        call_sid = await asyncio.to_thread(place_call, phone)
    except ValueError as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)
    except Exception as exc:
        logger.exception("Could not place call")
        return JSONResponse({"error": f"Twilio could not place this call: {exc}"}, status_code=502)
    context["call_sid"] = call_sid
    pending_contexts[call_sid] = context
    calls[call_sid] = CallState(call_sid=call_sid)
    return JSONResponse({"call_sid": call_sid, "status": "initiated"})


async def call_status(request: Request) -> Response:
    if not _authorized(request):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    state = snapshot(request.path_params["call_sid"])
    return JSONResponse(state or {"error": "Call not found"}, status_code=200 if state else 404)


async def inject_student_answer(request: Request) -> Response:
    if not _authorized(request):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    call_sid = request.path_params["call_sid"]
    session = active_sessions.get(call_sid)
    if not session:
        return JSONResponse({"error": "The call is not actively connected."}, status_code=409)
    try:
        answer = (await request.json()).get("answer", "")
    except Exception:
        answer = ""
    if not isinstance(answer, str) or not answer.strip():
        return JSONResponse({"error": "Type an answer first."}, status_code=400)
    await session.inject_student_answer(answer.strip()[:1200])
    state = calls.get(call_sid)
    if state:
        state.update("answer sent")
        state.transcript.append({"role": "student", "content": answer.strip()[:1200]})
    return JSONResponse({"ok": True})


async def twilio_websocket(websocket: WebSocket):
    await websocket.accept()
    call_sid = None
    session = None
    try:
        while True:
            event = json.loads(await websocket.receive_text())
            if event.get("event") == "start":
                call_sid = event["start"].get("callSid")
                stream_sid = event["start"].get("streamSid")
                break
        if not call_sid:
            await websocket.close()
            return
        context = pending_contexts.pop(call_sid, {"call_sid": call_sid})
        context["call_sid"] = call_sid
        session = VoiceAgentSession(websocket, call_sid, stream_sid, context)
        active_sessions[call_sid] = session
        if call_sid in calls:
            calls[call_sid].update("connected")
        await session.start()
        await session.run()
    except Exception:
        logger.exception("Telephony websocket failed for %s", call_sid)
    finally:
        if session:
            await session.cleanup()
        if call_sid:
            active_sessions.pop(call_sid, None)
            if call_sid in calls:
                calls[call_sid].update("ended")


async def amd_result(request: Request) -> Response:
    form = await request.form()
    session = active_sessions.get(form.get("CallSid", ""))
    if session:
        session.signal_amd_result(form.get("AnsweredBy", "unknown"))
    return Response(status_code=204)
