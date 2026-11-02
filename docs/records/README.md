# DIVE 작업 기록 (공개본)

10/28~11/3 프로젝트 동안 그때그때 쌓은 기록을 거의 그대로 옮긴 공개본이에요. 날짜순으로 남아 있어서, 결정이 어떻게 바뀌었는지 따라가 볼 수 있어요.

## 먼저 볼 것

| 궁금한 것 | 파일 | 바로 볼 곳 |
| --- | --- | --- |
| 개선 전후 수치 | [본 테스트 분석](MAIN_ANALYSIS_20261102.md) | 1번 A vs B 전체, 5번 한계 · [그래프](main_20261102_chart.png) |
| 왜 이렇게 생겼는가 | [디자인 결정 기록](DESIGN_DECISION_LOG.md) | 1번 대안 비교 (자막 칸 vs 겹친 자막, 본 테스트의 목적과 작품) |
| AI를 어떻게 썼는가 | [AI 활용 기록](AI_USAGE_LOG.md) | 맨 아래 "발표용 한 줄 요약", 3번 AI 실수와 고친 방법 |
| 무엇을 맞바꿨고 무엇을 배웠는가 | [회고](RETROSPECTIVE_NOTES.md) | 맨 아래 "정리" |

## 파일 목록

- [AI_USAGE_LOG.md](AI_USAGE_LOG.md) — 프롬프트 변경, CLAUDE.md·스킬 활용, AI 실수와 고친 방법
- [DESIGN_DECISION_LOG.md](DESIGN_DECISION_LOG.md) — 대안 비교, 그 밖의 디자인 결정, 테스트 후 개선, 안정성 처리
- [RETROSPECTIVE_NOTES.md](RETROSPECTIVE_NOTES.md) — 아쉬운 점·포기한 것·배운 것
- [USABILITY_TEST_LOG.csv](USABILITY_TEST_LOG.csv) — 참가자가 직접 남긴 말과 테스트별 요약
- [BETA_ANALYSIS_20261029.md](BETA_ANALYSIS_20261029.md) — 베타 테스트(10/29, 〈아르놀피니 부부의 초상〉, A vs B v1)
- [MAIN_ANALYSIS_20261102.md](MAIN_ANALYSIS_20261102.md) — 본 테스트(11/2, 〈작업실의 금세공인〉, A vs B v2)

## 읽을 때 참고

- 참가자는 무작위 ID(`P` + 4글자)로만 적었어요. 이름·연락처는 받지 않았어요.
- 기록 안에 나오는 `test-web/`, `ref_image/`, `backups/`, `PROMPT_HISTORY.md`, `screens_board_*`, 응답 원본 CSV 같은 경로는 저장소에 올리지 않은 작업 파일이에요. 참가자 기록이나 작업용 자료가 섞여 있어서 공개하지 않았어요.
- 공개본에서 바꾼 것: 사용성 테스트 기록에서 내용이 비어 있는 서식 줄 6개를 뺐어요. 나머지는 원본 그대로예요.
