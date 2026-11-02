/* 02 해결 (11/2): 실제 시연 화면 녹화를 화면에 보일 때만 재생하고, 목록의 지금 단계를 영상 시간에 맞춰 강조
   영상 타임라인(초, build: 녹화 스크립트) — 장면 1 0~2.0 / 확대·이동 2.0~4.2 / 머무름 4.2~9.2 / 축소 9.2~11.4
   움직임 줄이기: 재생하지 않고 볼록거울 장면 정지 그림 + 목록 모두 진하게 */
(() => {
  const box = document.getElementById('solve');
  const video = document.getElementById('solve-video');
  if (!box || !video) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { video.poster = 'img/solve_demo_end.webp'; video.removeAttribute('src'); video.preload = 'none'; return; }
  const items = [...box.querySelectorAll('.solve-list li')];
  // [시작, 끝) 초 → 단계
  const STEPS = [[0, 3.0, 0], [3.0, 6.0, 1], [6.0, 9.2, 2], [9.2, 11.4, 0]];
  let raf = 0;
  const sync = () => {
    const t = video.currentTime;
    const s = (STEPS.find(([a, b]) => t >= a && t < b) || STEPS[0])[2];
    items.forEach((li, i) => li.classList.toggle('is-now', i === s));
    raf = requestAnimationFrame(sync);
  };
  const play = () => { video.play().then(() => { box.classList.add('is-synced'); if (!raf) sync(); }).catch(() => {}); };
  const pause = () => { video.pause(); cancelAnimationFrame(raf); raf = 0; };
  if (!('IntersectionObserver' in window)) { play(); return; }
  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause()), { threshold: 0.35 }).observe(box);
})();
