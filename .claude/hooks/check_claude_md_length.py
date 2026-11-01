"""PostToolUse 훅: CLAUDE.md를 고친 뒤 줄 수가 기준(100줄)을 넘으면 경고한다.

- 사용자에게는 화면 경고(systemMessage), Claude에게는 맥락 메모(additionalContext)를 남긴다.
- 작업을 막지는 않는다. 어떤 오류가 나도 정상 종료한다.
"""
import json
import sys
from pathlib import Path

LIMIT = 100


def main() -> None:
    data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    tool_input = data.get("tool_input") or {}
    file_path = tool_input.get("file_path") or ""
    if Path(file_path).name != "CLAUDE.md":
        return

    path = Path(file_path)
    if not path.exists():
        return
    lines = len(path.read_text(encoding="utf-8").splitlines())
    if lines <= LIMIT:
        return

    msg = f"⚠ CLAUDE.md가 {lines}줄입니다 (기준 {LIMIT}줄 초과). 세부 규칙을 .claude/rules/나 별도 문서로 옮길지 검토하세요."
    out = {
        "systemMessage": msg,
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "additionalContext": msg + " 사용자에게 이 사실을 알리고 정리안을 제안할 것.",
        },
    }
    sys.stdout.buffer.write(json.dumps(out, ensure_ascii=False).encode("utf-8"))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
