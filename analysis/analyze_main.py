"""본 테스트(11/2) A vs B v2 분석 — 〈작업실의 금세공인〉. analyze_beta.py와 같은 지표 정의.

실행: python analysis/analyze_main.py
입력: records/main_20261102_participants.csv, records/main_20261102_tasks.csv (git 제외 원본, 시트에서 phase=main만)
출력: 콘솔 표 + records/main_20261102_chart.png (발표용 그래프)
"""
import sys
from pathlib import Path

import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")
pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 30)
pd.set_option("display.unicode.east_asian_width", True)

ROOT = Path(__file__).resolve().parent.parent
P_CSV = ROOT / "records" / "main_20261102_participants.csv"
T_CSV = ROOT / "records" / "main_20261102_tasks.csv"

INVALID_ROWS = []   # 분석에서 뺄 행 (없음)
FLAGGED_ROWS = []

TASK_NAMES = {"T1": "저울", "T2": "수정 용기", "T3": "매", "T4": "서명", "T5": "앉은 사람", "T6": "진열품", "T7": "거울"}
# 의미 문제 정답 번호 (test-web/js/artworks/goldsmith.js answer)
CORRECT = {"T1": 1, "T2": 2, "T3": 1, "T5": 2, "T6": 1, "T7": 1}


def section(title):
    print(f"\n{'=' * 70}\n{title}\n{'=' * 70}")


def load():
    for f in (P_CSV, T_CSV):
        if not f.exists():
            sys.exit(f"[에러] 파일이 없습니다: {f}")
    p = pd.read_csv(P_CSV, encoding="utf-8-sig")
    t = pd.read_csv(T_CSV, encoding="utf-8-sig")

    p = p[(p["phase"] == "main") & (p["completed"] == 1)]
    if p.empty:
        sys.exit("[에러] 완료한 본 테스트 참가자가 없습니다.")
    t = t[t["participant_id"].isin(p["participant_id"]) & (t["phase"] == "main")]

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


def funnel():
    """접속 → 시작(사전 질문 답함) → 완료. 완료하지 않은 사람도 포함한 원본 기준"""
    a = pd.read_csv(P_CSV, encoding="utf-8-sig")
    a = a[a["phase"] == "main"]
    return pd.DataFrame({
        "접속": a.groupby("group").size(),
        "사전질문_답함": a[a["saw_before"].notna()].groupby("group").size(),
        "완료": a[a["completed"] == 1].groupby("group").size(),
    }).assign(완료율=lambda d: (d["완료"] / d["접속"] * 100).round(0))


def chart(t, p, out):
    """발표용: 정답률·맞힌 시간·찾기 오답 탭·설문 q1 (A vs B)"""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    for name in ("Pretendard", "Malgun Gothic", "AppleGothic"):
        if any(f.name == name for f in font_manager.fontManager.ttflist):
            plt.rcParams["font.family"] = name
            break
    plt.rcParams["axes.unicode_minus"] = False
    A, B = "#9AA6C0", "#073582"  # A = 회색 남색, B = Regal Navy (소개 페이지 색)
    f = t[t["type"] == "find"]; m = t[t["type"] == "meaning"]
    rate = lambda d, g: d[d["group"] == g]["success"].mean() * 100
    tmed = lambda d, g: d[(d["group"] == g) & (d["success"] == 1)]["task_sec"].median()
    wrong = lambda g: f[f["group"] == g].groupby("participant_id")["wrong_taps"].sum().mean()
    panels = [
        ("정답률 (%)", ["찾기", "의미", "전체"], [rate(f, "A"), rate(m, "A"), rate(t, "A")], [rate(f, "B"), rate(m, "B"), rate(t, "B")], "{:.0f}"),
        ("맞힌 문제 시간 중앙값 (초)", ["찾기", "의미"], [tmed(f, "A"), tmed(m, "A")], [tmed(f, "B"), tmed(m, "B")], "{:.1f}"),
        ("찾기 오답 탭 (1인 평균)", [""], [wrong("A")], [wrong("B")], "{:.1f}"),
        ("설문: 바로 알 수 있었다 (1~5)", [""], [p[p["group"] == "A"]["q1"].mean()], [p[p["group"] == "B"]["q1"].mean()], "{:.1f}"),
    ]
    fig, axes = plt.subplots(1, 4, figsize=(16, 4.6), gridspec_kw={"width_ratios": [3, 2, 1.2, 1.2]})
    nA, nB = (p["group"] == "A").sum(), (p["group"] == "B").sum()
    for ax, (title, labels, va, vb, fmt) in zip(axes, panels):
        x = range(len(labels)); w = 0.38
        ba = ax.bar([i - w / 2 for i in x], va, w, color=A, label=f"A 글 설명 (n={nA})")
        bb = ax.bar([i + w / 2 for i in x], vb, w, color=B, label=f"B 확대·강조 (n={nB})")
        for bars in (ba, bb):
            for r in bars:
                ax.text(r.get_x() + r.get_width() / 2, r.get_height(), fmt.format(r.get_height()), ha="center", va="bottom", fontsize=11)
        ax.set_xticks(list(x)); ax.set_xticklabels(labels, fontsize=11)
        ax.set_title(title, fontsize=11, loc="left", wrap=True)
        for k in ("top", "right"): ax.spines[k].set_visible(False)
        ax.margins(y=0.15)
    h, l = axes[0].get_legend_handles_labels()
    fig.legend(h, l, frameon=False, fontsize=11, loc="upper right", ncol=2)
    fig.suptitle("본 테스트 (11/2) A vs B v2 — 〈작업실의 금세공인〉, 완료자만", fontsize=13, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(out, dpi=160)
    print("그래프:", out)


def main():
    p, t = load()

    section("0-1. 참여 흐름 (완료하지 않은 사람 포함)")
    print(funnel().to_string())

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


def repeat_split(p, t):
    """베타·리허설 참여 경험(prev_test)이 있는 사람과 없는 사람을 나눠 같은 표"""
    section("7. 재참여 여부별 (prev_test = 이전 테스트 참여)")
    per = t.groupby("participant_id")["success"].mean().mul(100).rename("정답률%")
    q = p.set_index("participant_id")[["group", "prev_test"]].join(per)
    print(q.groupby(["prev_test", "group"])["정답률%"].agg(["count", "median", "mean"]).round(1).to_string())
    t2 = t.merge(p[["participant_id", "prev_test"]], on="participant_id")
    print("\n첫 참여(prev_test=no)만 — 문제 유형별:")
    print(summarize(t2[t2["prev_test"] == "no"], ["group", "type"]).to_string())


if __name__ == "__main__":
    main()
    _p, _t = load()
    repeat_split(_p, _t)
    chart(_t, _p, ROOT / "records" / "main_20261102_chart.png")
