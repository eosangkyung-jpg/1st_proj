"""UserPromptSubmit 훅: 사용자가 보낸 프롬프트 원문을 records/PROMPT_HISTORY.md에 자동으로 쌓는다.

- 화면에 아무것도 출력하지 않는다(출력하면 Claude의 대화 맥락에 들어가기 때문).
- 어떤 오류가 나도 작업을 막지 않도록 항상 정상 종료한다.
- API 키처럼 보이는 문자열은 가린다.
"""
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

SECRET_PATTERNS = [
    r"sk-[A-Za-z0-9_\-]{10,}",          # OpenAI 등 API 키
    r"ghp_[A-Za-z0-9]{20,}",            # GitHub 토큰
    r"AKIA[0-9A-Z]{16}",                # AWS 키
]


def mask(text: str) -> str:
    for pattern in SECRET_PATTERNS:
        text = re.sub(pattern, "[가린 값]", text)
    return text


def main() -> None:
    data = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    prompt = (data.get("prompt") or "").strip()
    if not prompt:
        return

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or str(Path(__file__).resolve().parents[2])
    log_path = Path(project_dir) / "records" / "PROMPT_HISTORY.md"
    log_path.parent.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    entry = f"\n### {now:%Y-%m-%d %H:%M}\n\n```text\n{mask(prompt)}\n```\n"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(entry)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
