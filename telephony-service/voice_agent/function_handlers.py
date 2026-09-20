"""Handlers for the small set of student-call tools."""

from call_state import calls


async def dispatch_function(name: str, args: dict) -> dict:
    if name == "ask_student":
        call_sid = args.get("call_sid", "")
        question = str(args.get("question", "Please provide more information."))[:500]
        state = calls.get(call_sid)
        if state:
            state.update("needs your input", question)
            state.transcript.append({"role": "agent", "content": question})
        return {
            "status": "student_notified",
            "instruction": "Wait for the student answer to be injected.",
        }
    if name == "end_call":
        return {"status": "call_ended", "reason": args.get("reason", "complete")}
    return {"error": f"Unknown function: {name}"}
