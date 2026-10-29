"""베타 테스트(10/29) A vs B v1 분석.

실행: python analysis/analyze_beta.py
입력: records/beta_20261029_participants.csv, records/beta_20261029_tasks.csv (git 제외 원본)
분석 순서: ① A vs B 차이 ② 차이가 큰/작은 곳 ③ B v1 약점 (records/DESIGN_DECISION_LOG.md 10/29 결정)
"""
import sys
from pathlib import Path

import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 30)
pd.set_option("display.unicode.east_asian_width", True)

ROOT = Path(__file__).resolve().parent.parent
P_CSV = ROOT / "records" / "beta_20261029_participants.csv"
T_CSV = ROOT / "records" / "beta_20261029_tasks.csv"

# 분석에서 뺄 행 (사용자 결정 10/29: 화면 전환 직후 0.3초 오선택)
INVALID_ROWS = ["P66WC-T1-meaning"]
# 유효로 두되 표시만 할 행 (미결: 전환 직후 0.2초 '모르겠어요')
FLAGGED_ROWS = ["PUQNR-T2-meaning", "PUQNR-T7-meaning"]

TASK_NAMES = {"T1": "오렌지", "T2": "덧신", "T3": "서명", "T4": "촛불", "T5": "옷", "T6": "강아지", "T7": "거울"}
# 의미 문제 정답 번호 (TEST_WEB_PROJECT.md 질문지)
CORRECT = {"T1": 1, "T2": 1, "T3": 2, "T5": 2, "T6": 2, "T7": 1}


def section(title):
    print(f"\n{'=' * 70}\n{title}\n{'=' * 70}")


def load():
    for f in (P_CSV, T_CSV):
        if not f.exists():
            sys.exit(f"[에러] 파일이 없습니다: {f}")
    p = pd.read_csv(P_CSV, encoding="utf-8-sig")
    t = pd.read_csv(T_CSV, encoding="utf-8-sig")

    p = p[(p["phase"] == "beta") & (p["completed"] == 1)]
    if p.empty:
        sys.exit("[에러] 완료한 베타 참가자가 없습니다.")
    t = t[t["participant_id"].isin(p["participant_id"]) & (t["phase"] == "beta")]

    counts = t.groupby("participant_id").size()
    if not (counts == 11).all():
        print("[주의] 과업이 11행이 아닌 참가자:", counts[counts != 11].to_dict())

    t = t[~t["row_id"].isin(INVALID_ROWS)].copy()
    t["task_name"] = t["task"].map(TASK_NAMES)
    return p, t


def summarize(df, by):
    """정답률 + 맞힌 과업 시간 중앙값 + 시간 초과·모르겠어요 횟수."""
    g = df.groupby(by)
    out = pd.DataFrame({
        "n": g.size(),
        "정답률%": (g["success"].mean() * 100).round(0),
        "맞힌시간_중앙값": df[df["success"] == 1].groupby(by)["task_sec"].median().round(1),
        "시간초과": g["fail_reason"].apply(lambda s: (s == "timeout").sum()),
        "모르겠어요": g["fail_reason"].apply(lambda s: (s == "gave_up").sum()),
    })
    return out


def gap_table(df, by):
    """A·B 나란히 + 차이(B−A)."""
    s = summarize(df, by + ["group"]).unstack("group")
    out = pd.DataFrame({
        "A_정답률%": s[("정답률%", "A")], "B_정답률%": s[("정답률%", "B")],
        "차이%p": s[("정답률%", "B")] - s[("정답률%", "A")],
        "A_시간": s[("맞힌시간_중앙값", "A")], "B_시간": s[("맞힌시간_중앙값", "B")],
        "시간차(B−A)": (s[("맞힌시간_중앙값", "B")] - s[("맞힌시간_중앙값", "A")]).round(1),
        "A_n": s[("n", "A")], "B_n": s[("n", "B")],
    })
    return out


def main():
    p, t = load()

    section("0. 데이터")
    print("완료 참가자:", p.groupby("group").size().to_dict(), "/ 과업 행:", len(t))
    print("제외한 행:", INVALID_ROWS, "/ 표시만 한 행(유효):", FLAGGED_ROWS)
    print("\n입력 방식:", p.groupby(["group", "input_type"]).size().to_dict())
    print("그림을 본 적 있음:", p.groupby(["group", "saw_before"]).size().to_dict())
    print("도슨트 경험:", p.groupby(["group", "docent_exp"]).size().to_dict())

    section("1. A vs B 전체 (문제 유형별)")
    t["유형"] = t["task_kind"].map({"location": "위치", "general": "일반"}) + "-" + t["type"].map({"find": "찾기", "meaning": "의미"})
    print(gap_table(t, ["유형"]).to_string())
    print("\n전체:")
    print(summarize(t, ["group"]).to_string())

    # 참가자 1명 단위: 맞힌 개수 (그룹 간 비교를 사람 단위로)
    per = t.groupby(["participant_id", "group"]).agg(맞힌수=("success", "sum"), 문항수=("success", "size")).reset_index()
    per["정답률%"] = (per["맞힌수"] / per["문항수"] * 100).round(0)
    print("\n참가자별 정답률 (그룹별 중앙값·최소·최대):")
    print(per.groupby("group")["정답률%"].describe()[["count", "50%", "min", "max", "mean"]].round(1).to_string())

    section("2. 과업별 A vs B (차이가 큰/작은 곳)")
    gt = gap_table(t, ["task", "task_name", "type"])
    print(gt.to_string())

    section("3. 찾기 문제: 헤맨 정도 (오답 탭·확대 사용·끝내 찾음)")
    f = t[t["type"] == "find"]
    fg = f.groupby(["task", "task_name", "group"]).agg(
        오답탭_평균=("wrong_taps", "mean"), 확대_평균=("zoom_used", "mean"),
        끝내찾음_비율=("found", "mean"), 시간_중앙값_전체=("task_sec", "median"),
    ).round(2)
    print(fg.unstack("group").to_string())

    section("4. 의미 문제: 고른 보기 분포 (정답 번호 표시)")
    m = t[t["type"] == "meaning"].copy()
    m["answer"] = m["answer"].fillna(0).astype(int)  # 0 = 답 없음(모르겠어요·시간 초과)
    for task, sub in m.groupby("task"):
        dist = sub.groupby(["group", "answer"]).size().unstack(fill_value=0)
        print(f"\n[{task} {TASK_NAMES[task]}] 정답 = {CORRECT[task]}번 (0 = 답 없음)")
        print(dist.to_string())

    section("5. 사후 설문")
    print("q1 '어느 부분 이야기인지 바로 알 수 있었다' (1~5):")
    print(p.groupby("group")["q1"].describe()[["count", "mean", "50%", "min", "max"]].round(2).to_string())
    print("\nq1 점수 분포:")
    print(p.groupby(["group", "q1"]).size().unstack(fill_value=0).to_string())
    print("\nq2 가장 찾기 어려웠던 것:")
    print(p.groupby(["q2", "group"]).size().unstack(fill_value=0).to_string())
    print("\nq3 어려웠던 이유:")
    print(p.groupby(["q3", "group"]).size().unstack(fill_value=0).to_string())
    print("\nq3 기타 (원문):")
    for _, r in p[p["q3_other"].notna()].iterrows():
        print(f"  - {r['participant_id']}({r['group']}): {r['q3_other']}")

    section("6. 행동 신호")
    print("해설을 본 시간(explain_sec):")
    print(p.groupby("group")["explain_sec"].describe()[["count", "50%", "min", "max"]].round(1).to_string())
    print("\n과업 중 다른 창으로 나간 횟수(left_tab) 합계:", t.groupby("group")["left_tab"].sum().to_dict())
    p2 = p.merge(per[["participant_id", "정답률%"]], on="participant_id")
    print("\n입력 방식별 참가자 정답률 중앙값:")
    print(p2.groupby(["group", "input_type"])["정답률%"].agg(["count", "median"]).to_string())
    print("\n해설 시간이 짧은 순 (상위 5명):")
    print(p2.sort_values("explain_sec")[["participant_id", "group", "explain_sec", "정답률%"]].head(5).to_string(index=False))


if __name__ == "__main__":
    main()
