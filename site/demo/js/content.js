/*
 * 테스트 콘텐츠 — 모든 작품 공통 (사전 질문, 사후 설문, 화면 문구)
 * 작품별 내용(이미지·해설·과업·정답 영역)은 js/artworks/<작품>.js에 있다.
 * 문구를 고칠 때는 이 파일만 고치면 된다.
 *
 * 작품 고르기: 주소에 ?art=<작품 키>  (없으면 CONFIG.DEFAULT_ART)
 *   예) ?preview=B&art=arnolfini
 */

// 작품 키 → 작품 파일(js/artworks/)의 내용. 새 작품은 여기와 index.html에 한 줄씩 추가
const ARTWORKS = {
  arnolfini: ARTWORK_ARNOLFINI,
  goldsmith: ARTWORK_GOLDSMITH,
};

const ART_KEY = new URLSearchParams(location.search).get('art') || CONFIG.DEFAULT_ART;
const ARTWORK = ARTWORKS[ART_KEY] || null; // null이면 잘못된 링크 (app.js boot에서 안내)

const CONTENT = {
  artKey: ART_KEY,
  ...(ARTWORK || {}),


  // ── 사전 질문 ─────────────────────────────────────────
  pre: [
    { key: 'saw_before', q: '위 그림을 전에 본 적 있나요?', options: [['yes', '있어요'], ['no', '없어요']] },
    { key: 'docent_exp', q: '미술관 오디오 도슨트를 써 본 적 있나요?', options: [['yes', '있어요'], ['no', '없어요']] },
    // 10/30 추가 (본 테스트): 베타 참여자의 재참여를 막지 않고, 분석할 때 새 참가자와 나눠 본다
    // (11/2) 괄호 부분은 note로 떼어 다음 줄에 작게 (화면 디자인만 바뀜, 저장 값은 그대로)
    { key: 'prev_test', q: '전에 이 테스트에 참여한 적 있나요?', note: '(다른 그림이었어도 포함)', options: [['yes', '있어요'], ['no', '없어요']] },
  ],

  // ── 사후 설문 ─────────────────────────────────────────
  survey: {
    q1: { q: '해설이 그림의 어느 부분 이야기인지 바로 알 수 있었다.', low: '전혀 아니다', high: '매우 그렇다' },
    q2: { q: '가장 찾기 어려웠던 것은?', options: ARTWORK ? ARTWORK.surveyQ2Options : [], none: '없었다' }, // 보기는 작품 파일에
    q3: { q: '어려웠던 이유는?', options: ['글과 그림을 번갈아 봐야 해서', '대상이 너무 작아서', '해설 내용이 기억나지 않아서', '화면 조작이 불편해서', '기타'], other: '기타' },
  },

  // ── 화면 문구 ─────────────────────────────────────────
  copy: {
    loading: '그림을 불러오고 있어요…',
    imageError: '그림을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
    badLink: '잘못된 링크예요. 받은 링크를 다시 확인해 주세요.',
    alreadyDone: '이미 참여하셨어요. 참여해 주셔서 감사합니다!',
    betaClosed: '베타 테스트는 끝났어요. 참여해 주셔서 감사합니다!',
    retry: '다시 시도',

    // (11/2) 테스트 첫 화면(표지): 판화 액자 안 제목 + 시작 안내. 기기에 맞는 조작 말로 안내
    testTitleLines: ['명화 해설', '화면 테스트'],
    testTitleHintTouch: '탭 하고 시작하기',
    testTitleHintMouse: '클릭 하고 시작하기',
    testTitleImageError: '배경 그림을 불러오지 못했어요. 탭하면 그대로 시작해요.',

    introTitle: '명화 해설 화면 테스트',
    // (11/2) 문단마다 줄 목록 — 사용자가 정한 자리에서 줄바꿈. 소요 시간 10분 → 6-7분
    introBody: [
      ['이 테스트는 여러분이 아니라 화면을 평가해요.', '못 찾거나 틀려도 괜찮아요.'],
      ['그림 해설을 본 뒤, 그림 속 부분을 찾고 질문에 답해요.', '약 6-7분 정도 걸려요.'],
    ],
    consent: [
      // (11/2 사용자 수정) **…** = 굵게, \n = 줄바꿈 자리
      '이름, 연락처는 받지 않고\n**테스트는 철저하게 익명으로 진행돼요.**', // 이전: '이름·연락처는 받지 않아요.'
      '정답 여부, 걸린 시간, 화면 조작 기록만 저장되고 화면 개선과 발표 자료에만 쓰여요.',
      '언제든 그만둘 수 있지만,\n**꼭 끝까지 마쳐주세요!** (제발)', // 이전: '언제든 창을 닫아 그만둘 수 있어요.'
    ],
    start: '동의하고 시작하기',

    preTitle: '시작 전에 세 가지만 알려주세요',
    preTitleLines: ['시작 전에', '세 가지만 알려주세요'], // (11/2) 42px 제목이 한 줄에 안 들어가 두 줄 — 끊는 자리 사용자 확인 필요
    next: '다음',

    scenarioTitle: '상황을 떠올려 주세요',
    scenarioBody: '지금 미술관에서 이 그림 앞에 서 있어요. 귀가 들리지 않아 오디오 도슨트를 쓸 수 없어서, 그림 옆 QR코드를 찍었어요.',
    // (11/2) 시작 안내처럼 문단·줄을 직접 나눔 (scenarioBody와 같은 문장)
    scenarioBodyLines: [
      ['지금 미술관에서 이 그림 앞에 서 있어요.'],
      ['귀가 들리지 않아 오디오 도슨트를 쓸 수 없어서,', '그림 옆 QR코드를 찍었어요.'],
    ],
    scenarioCta: '시작하기', // (11/2) '해설 보기' → 이전 화면처럼 '시작하기 >' 글자 버튼

    explainTitle: '작품 해설',
    explainDoneA: '다 읽었어요',
    scrollHint: '↓ 아래로 내려 해설을 끝까지 읽어 주세요',
    explainPrev: '이전',
    explainNext: '다음',
    explainDoneB: '해설 끝',
    explainStart: '들어가기',       // (11/2) B 디폴트 화면 버튼 — DIVE(Dive Inside): 그림 속으로 천천히 들어감. 장면 안 버튼은 계속 '다음'
    // (11/2) 시연 장면 1 돋보기 안내 — 기기에 맞는 문구, 돋보기를 한 번 쓰면 이번 방문 동안 숨김
    loupeHintTouch: '그림을 꾹 누르면 확대해서 볼 수 있어요',
    loupeHintMouse: '그림 위에 커서를 올리면 확대해서 볼 수 있어요',
    coverHint: '그림 속으로 들어가 볼까요?', // (11/2, 이전: '[다음]을 눌러 해설을 시작하세요') 버튼 바로 위라 버튼 이름을 반복하지 않음

    practiceTitle: '확대 연습',
    practiceBody: '문제를 풀 때 쓸 수 있어요. + / − 버튼으로 확대·축소하고, 확대한 상태에서 그림을 끌어 움직여 보세요. 이 단계는 기록하지 않아요.',
    practiceCta: '연습 끝',

    // (v2) 문제 시작 안내 — A·B 공통
    quizIntroTitle: '이제 문제를 풀어요',
    quizIntroCount: (n, f, m) => `문제는 모두 ${n}개예요 (찾기 ${f}개 · 질문 ${m}개)`,
    quizIntroRules: [
      '찾기: 그림에서 해당 부분을 탭해요.',
      '질문: 그림이 가려지고 보기 4개 중 하나를 골라요. 해설에서 본 내용을 떠올려 주세요.',
      '문제마다 1분이 주어지고, 모르면 [모르겠어요]를 눌러도 돼요.',
    ],
    quizIntroReady: '준비됐으면 버튼을 눌러 퀴즈를 시작하세요', // (11/2) 버튼 위 작은 안내 — 해설 디폴트 화면 안내 문구처럼
    quizIntroCta: '문제 시작',

    findLabel: '찾기',
    meaningLabel: '질문',
    giveUp: '모르겠어요',
    wrongTap: '여기가 아니에요',
    found: '찾았어요!',
    timeLeft: (s) => `${s}초 남았어요`,
    timeout: '시간이 다 되어 다음 문제로 넘어갈게요',
    zoomIn: '확대',
    zoomOut: '축소',

    surveyTitle: '마지막으로 세 가지만 답해 주세요',
    otherPlaceholder: '이유를 적어 주세요',
    submit: '제출하기',

    doneTitle: '참여해 주셔서 감사합니다!',
    doneTitleLines: ['참여해 주셔서', '감사합니다!'], // (11/2) 두 줄 제목 (사용자 결정)
    savingTitle: '⚠ 창을 닫지 말아 주세요',
    saving: '결과를 저장하고 있어요. 저장이 끝나면 여기에 "저장 완료"가 표시돼요.',
    savedTitle: '✓ 저장 완료',
    saved: '결과가 저장되었어요. 이제 창을 닫아도 돼요.',
    saveErrorTitle: '저장하지 못했어요',
    saveError: '인터넷 연결을 확인하고 [다시 보내기]를 눌러 주세요. 그래도 안 되면 결과 파일을 내려받아 진행자에게 전달해 주세요.',
    resend: '다시 보내기',
    download: '결과 파일 내려받기',
    localModeTitle: '결과 파일을 내려받아 주세요',
    localMode: '저장 주소가 설정되지 않아 결과가 이 브라우저에만 있어요. 결과 파일을 내려받아 진행자에게 전달해 주세요.',
    emptyTitle: '결과 없음',
    empty: '저장할 결과가 없어요.',
    scoreTitle: '나의 결과',
    scoreUnit: '문제 맞힘',
    scoreFind: '찾기',
    scoreMeaning: '질문',
    scoreTime: '걸린 시간',
    scoreNote: '다른 참가자를 위해 정답은 공개하지 않아요.', // (11/2) '찾기는 첫 번째 탭에 찾은 것만 맞힌 것으로 세요.' 뺌 (사용자 요청)
    leaveWarn: '테스트 중이에요. 나가면 처음부터 다시 해야 해요.',

    // (11/2) 시연 모드(?mode=demo) 끝 화면 — 테스트 흐름 없이 해설만 본 뒤 (소개 페이지 '시연하러 가기')
    demoEndTitle: '이제 그림을 다시 바라보세요',
    demoEndTitleLines: ['이제 그림을', '다시 바라보세요'],
    demoEndBody: '방금 본 디테일을 실제 그림 앞에서 하나씩 찾아보세요.',
    demoReplay: '처음부터 다시 보기',
    demoOtherArt: '다른 작품 보기',
  },
};
