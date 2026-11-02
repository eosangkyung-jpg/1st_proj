/*
 * 설정
 * SHEET_URL: Google Apps Script 웹 앱 주소 (apps-script/SETUP.md 참고)
 *   비워 두면 "로컬 모드" — 결과가 브라우저에만 남고, 완료 화면에서 CSV로 내려받는다.
 */
const CONFIG = {
  SHEET_URL: '',
  TIME_LIMIT_SEC: 60,      // 문제당 제한 시간
  SHOW_TIMER_SEC: 10,      // 남은 시간을 표시하기 시작하는 시점
  ZOOM_STEPS: [1, 1.5, 2, 2.5, 3],
  DRAG_THRESHOLD_PX: 5,    // 이만큼 움직이면 끌기 (탭으로 세지 않음)
  INPUT_GUARD_MS: 400,     // 화면이 바뀐 뒤 이 시간 동안 탭·클릭을 받지 않음 (앞 화면에서 이어진 탭 방지)
  EXPLAIN_MAX_SCALE: 4,    // B 해설 애니메이션 최대 확대
  EXPLAIN_MIN_TARGET: 0.2, // (v2) B 해설: 강조 대상이 화면 폭·높이의 이 비율보다 작게 보이면 대상 쪽으로 더 확대
  CAPTION_LIGHT_THRESHOLD: 0.5, // (v2) 작품 평균 명도(0~1)가 이보다 높으면 밝은 작품 → 검은 자막
  DEFAULT_ART: 'goldsmith',     // 주소에 ?art= 가 없을 때 작품. 11/2 본 테스트용으로 금세공인으로 바꿈 (아르놀피니는 ?art=arnolfini)
};
