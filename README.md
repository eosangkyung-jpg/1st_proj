# [서비스 이름]

> [한 문장 문제 정의: 누가, 어떤 상황에서, 왜 불편한가]

## 무엇을 하는 서비스인가

- [핵심 흐름 한 줄 설명]
- 배포 주소: [ ]

## 실행 방법

> 다른 사람이 이 순서만 보고 실행할 수 있어야 합니다. 명령어가 생길 때마다 추가하세요.

1. 저장소 받기
   ```bash
   git clone [저장소 주소]
   cd [폴더 이름]
   ```
2. [설치 명령어]
3. [실행 명령어]

### 사용성 테스트 웹

테스트 웹은 저장소에 포함하지 않고, 별도 배포 주소로 공유한다.

- 배포 주소: https://261029.netlify.app/ (Netlify)
- 베타 (수강생용): `https://261029.netlify.app/?phase=beta` — 10/29 종료. 수정본 배포 후에는 열면 종료 안내만 보인다
- 본 테스트 (11/1): `https://261029.netlify.app/`
- 진행자 확인용 (집계 제외): `https://261029.netlify.app/?phase=test&group=A` 또는 `group=B`
- A/B는 링크를 연 순서대로 번갈아 배정되고, 한 사람당 한 번만 참여할 수 있다
- 주의: 주소 뒤에 아무것도 붙이지 않고 열면 **본 테스트 링크**로 동작한다 (시트의 배정 순번이 넘어가고, 시작하면 `phase=main` 기록이 남는다). 화면 확인은 아래 미리보기로 한다
- 해설 화면 미리보기 (시작 안내·사전 질문·퀴즈 없이 해설만 반복, 시트로 아무것도 보내지 않음): `?preview=B` 또는 `?preview=A` — 로컬 v2에만 있음 (배포 사이트 v1에는 없음)
  ```bash
  cd test-web && python -m http.server 8000
  # 브라우저: http://localhost:8000/?preview=B
  ```
- 재배포 (Netlify Drop):
  1. `test-web/`에서 사이트 파일만 `deploy/`로 복사한다 (설계 문서·Apps Script는 공개되지 않게 뺀다)
     ```bash
     rm -rf deploy && mkdir -p deploy/css deploy/js deploy/assets
     cp test-web/index.html deploy/ && cp test-web/css/style.css deploy/css/
     cp test-web/js/*.js deploy/js/ && cp test-web/assets/arnolfini.jpg deploy/assets/
     ```
  2. app.netlify.com → 사이트 `261029` → **Deploys** 탭 아래 영역에 `deploy/` 폴더를 끌어다 놓는다 (netlify.com/drop에 올리면 주소가 다른 새 사이트가 생기므로 주의)

### 테스트 결과 분석 (pandas)

- 필요한 것: Python 3, pandas
  ```bash
  pip install pandas
  ```
- 베타 테스트(10/29, A vs B v1) 분석
  ```bash
  python analysis/analyze_beta.py
  ```
  - 입력: `records/beta_20261029_participants.csv`, `records/beta_20261029_tasks.csv` (Google 시트 `participants`·`tasks` 탭을 CSV로 내려받은 원본)
  - 원본 CSV는 참가자 기록이라 저장소에 포함하지 않는다. 파일이 없으면 "[에러] 파일이 없습니다"를 보여 주고 멈춘다
  - 출력: 화면에 표로 표시 (A vs B 정답률·시간, 과업별 차이, 오답 보기, 사후 설문, 해설 본 시간)

## 사용한 데이터

- 출처: [공개 데이터 링크 또는 직접 만든 샘플]
- 개인정보·회사 내부 자료는 포함하지 않았습니다.

## 기록 파일

- AI 활용 기록: `records/AI_USAGE_LOG.md`
- 사용성 테스트 기록: `records/USABILITY_TEST_LOG.csv`
- 디자인 결정 기록: `records/DESIGN_DECISION_LOG.md`
- 회고: `records/RETROSPECTIVE_NOTES.md`
