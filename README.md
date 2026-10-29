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
- 베타 (조원용): `https://261029.netlify.app/?phase=beta`
- 본 테스트 (11/1): `https://261029.netlify.app/`
- 진행자 확인용 (집계 제외): `https://261029.netlify.app/?phase=test&group=A` 또는 `group=B`
- A/B는 링크를 연 순서대로 번갈아 배정되고, 한 사람당 한 번만 참여할 수 있다

## 사용한 데이터

- 출처: [공개 데이터 링크 또는 직접 만든 샘플]
- 개인정보·회사 내부 자료는 포함하지 않았습니다.

## 기록 파일

- AI 활용 기록: `records/AI_USAGE_LOG.md`
- 사용성 테스트 기록: `records/USABILITY_TEST_LOG.csv`
- 디자인 결정 기록: `records/DESIGN_DECISION_LOG.md`
- 회고: `records/RETROSPECTIVE_NOTES.md`
