# DIVE (다이브) — Dive Inside, Visually Explained

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

### 서비스 소개 페이지 + 시연 (`site/`, 11/2)

- 제출용 결과물. 소개 페이지(`site/index.html`) 안에서 B v2 해설을 직접 눌러 볼 수 있다 (`site/demo/`)
- 로컬에서 보기
  ```bash
  cd site
  python -m http.server 8002
  # 브라우저: http://localhost:8002/
  ```
- 시연만 열기: `demo/?mode=demo` (작품: `&art=goldsmith` 또는 `&art=arnolfini`) / 발표 모드(화면을 창 높이에 꽉 차게): `demo/?mode=present`
- 원본(`test-web/`, `ref_image/footer_loop/`, `records/` 캡처)을 고친 뒤 다시 복사: `python site/build_site.py` — 시연 복사본은 시트 주소를 비워 기록을 보내지 않는다
- 배포 주소: https://dive.eosangkyung.workers.dev/ (Cloudflare 프로젝트 `dive`, 테스트 웹 `261102`와 다른 프로젝트)
- 배포: `site/`에서 만들기 스크립트만 뺀 `deploy_site/`를 만들어 Cloudflare 대시보드 → Workers & Pages → `dive`에 끌어다 놓는다
  ```bash
  rm -rf deploy_site && cp -r site deploy_site && rm deploy_site/build_site.py
  ```

### 사용성 테스트 웹

테스트 웹은 저장소에 포함하지 않고, 별도 배포 주소로 공유한다.

- 배포 주소 (11/2부터): https://261102.eosangkyung.workers.dev/ (Cloudflare Workers) — Netlify 무료 크레딧을 다 써서 옮김
- 본 테스트 (11/2): `https://261102.eosangkyung.workers.dev/` — 11/2 17:20 기록까지로 마감. 이후 기본 주소는 "본 테스트는 끝났어요" 안내만 보임 (진행자 확인용·미리보기·시연 주소는 그대로)
- 진행자 확인용 (집계 제외): `https://261102.eosangkyung.workers.dev/?phase=test&group=A` 또는 `group=B`
- 이전 배포 주소: https://261029.netlify.app/ (Netlify, 이전 버전이 남아 있음 — 참가자에게 보내지 않는다. 열면 같은 시트에 `phase=main` 기록이 섞인다)
- 베타 (수강생용): `https://261029.netlify.app/?phase=beta` — 10/29 종료
- A/B는 링크를 연 순서대로 번갈아 배정되고, 한 사람당 한 번만 참여할 수 있다
- 주의: 주소 뒤에 아무것도 붙이지 않고 열면 **본 테스트 링크**로 동작한다 (시트의 배정 순번이 넘어가고, 시작하면 `phase=main` 기록이 남는다). 화면 확인은 아래 미리보기로 한다
- 해설 화면 미리보기 (시작 안내·사전 질문·퀴즈 없이 해설만 반복, 시트로 아무것도 보내지 않음): `?preview=B` 또는 `?preview=A` — 로컬과 11/2 배포 주소에 있음 (이전 Netlify 사이트에는 없음)
  ```bash
  cd test-web && python serve_nocache.py . 8000
  # 브라우저: http://localhost:8000/?preview=B
  ```
  - `python -m http.server`로 켜도 되지만, 브라우저가 옛 `style.css`를 저장해 두고 써서 고친 값이 안 보일 수 있다(11/2 실제로 겪음). `serve_nocache.py`는 "저장하지 마" 신호를 보내 새로고침만 하면 바로 반영된다
- 상황 화면 등장 움직임 비교 (작업용, 배포하지 않음): `http://localhost:8000/compare-scenario.html`
- 완료 화면만 미리보기 (예시 결과, 시트로 보내지 않음): `http://localhost:8000/?preview=done`
- 디자인 조정 패널 (작업용, 배포하지 않음): `http://localhost:8000/tuner.html` — 실제 시연 화면 옆에서 슬라이더로 디자인 값(디폴트 화면 그라데이션·제목 위치·이동 시간, 강조 어둡기 등)과 디폴트 화면 중심점을 바꿔 보고, [바뀐 값 복사]로 고칠 내용을 정리한다. 실제 파일은 바뀌지 않는다
- 작품 고르기: 주소에 `art=작품 키`를 붙인다 (예: `?preview=B&art=arnolfini`). 없으면 `js/config.js`의 `DEFAULT_ART` 작품이 열린다. 작품별 내용은 `test-web/js/artworks/`에 있다
- 재배포 (11/2부터 Cloudflare, 이전 Netlify Drop):
  1. `test-web/`에서 사이트 파일만 `deploy/`로 복사한다 (설계 문서·Apps Script는 공개되지 않게 뺀다)
     ```bash
     rm -rf deploy && mkdir -p deploy/css deploy/js/artworks deploy/assets
     cp test-web/index.html deploy/ && cp test-web/css/style.css deploy/css/
     cp test-web/js/*.js deploy/js/ && cp test-web/js/artworks/*.js deploy/js/artworks/
     cp test-web/assets/*.jpg test-web/assets/*.webp deploy/assets/
     ```
  2. Cloudflare 대시보드 → **Workers & Pages** → `261102` → 새 버전 올리기에서 `deploy/` 폴더를 끌어다 놓는다 (새로 만들면 주소가 바뀌므로 주의)
  - (이전) app.netlify.com → 사이트 `261029` → **Deploys** 탭 아래 영역에 `deploy/` 폴더를 끌어다 놓기 — 무료 크레딧 소진으로 11/2 중단

### 테스트 결과 분석 (pandas)

- 필요한 것: Python 3, pandas
  ```bash
  pip install pandas
  ```
- 본 테스트(11/2, A vs B v2) 분석 — 입력 `records/main_20261102_*.csv`, 그래프 `records/main_20261102_chart.png`도 만든다 (matplotlib 필요: `pip install matplotlib`)
  ```bash
  python analysis/analyze_main.py
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
