/* DIVE 소개 페이지 (11/2) — 시연 작품 고르기, 메뉴 표시, 푸터 루프 */
(() => {
  const $ = (id) => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── 위 메뉴: 첫 화면(바다)을 지나 크림 영역 위에 오면 글자를 네이비로 ──
  const top = document.getElementById('top');
  const hero = document.getElementById('about');
  let lastY = scrollY;
  const setTone = () => {
    const past = hero.getBoundingClientRect().bottom <= top.offsetHeight / 2; // 첫 화면 아래 끝을 지났나
    top.classList.toggle('is-light', past);
    // (11/2 사용자) 아래로 스크롤하는 순간 숨김(첫 화면 위에서도), 위로 스크롤하면 다시 보임, 맨 위에서는 항상 보임
    const y = scrollY, dy = y - lastY;
    if (y <= 0) top.classList.remove('is-hidden');
    else if (dy > 2) top.classList.add('is-hidden');
    else if (dy < -2) top.classList.remove('is-hidden');
    if (Math.abs(dy) > 2) lastY = y;
  };
  top.addEventListener('focusin', () => top.classList.remove('is-hidden')); // 키보드로 메뉴에 오면 보이게
  setTone();
  addEventListener('scroll', setTone, { passive: true });
  addEventListener('resize', setTone);

  // ── 시연: 작품 고르기 ─────────────────────────────────────
  const ART_NAMES = { goldsmith: '작업실의 금세공인', arnolfini: '아르놀피니 부부의 초상' };
  document.querySelectorAll('.chip[data-art]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const art = chip.dataset.art;
      document.querySelectorAll('.chip[data-art]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      $('demo-open').href = `demo/?mode=demo&art=${art}`;
      const frame = $('demo-frame');
      frame.title = `DIVE 시연 — ${ART_NAMES[art]}`;
      frame.src = `demo/?mode=demo&sim=bar&art=${art}`; // (11/2) sim=bar: 휴대폰 틀 안에서도 위치 지도를 상태 표시줄 자리 아래로
      // (11/3) 작품을 바꾸면 그 작품의 판화 디폴트 화면부터
      $('demo-poster-img').src = `img/poster_${art}.webp`;
      $('demo-poster').setAttribute('aria-label', `그림 속으로 들어가기 — ${ART_NAMES[art]}`);
      $('demo-poster').hidden = false;
      // 이동 반복을 처음(왼쪽 끝)부터 다시 시작 — 같은 작품을 다시 눌러도
      const img = $('demo-poster-img');
      img.style.animation = 'none';
      void img.offsetWidth; // 애니메이션을 끊었다가 다시 붙이게 함
      img.style.animation = '';
    });
  });

  // ── 시연: 판화 디폴트 화면 (11/3) ─────────────────────────
  // 판화를 누르면 → 판화만 숨겨 시연 디폴트 화면(작품명·[들어가기])이 나옴 (11/3 사용자 요청, 이전: 바로 장면 1로).
  // 판화는 작품을 바꿀 때만 다시 나옴 (시연 안에서 [이전]으로 디폴트 화면에 돌아와도 판화는 다시 덮지 않음)
  const poster = $('demo-poster');
  poster.addEventListener('click', () => {
    poster.hidden = true;
    $('demo-frame').focus();
  });

  // ── 시연: [전체 화면으로 열기]는 새 탭으로 (11/3, 사용자 결정 — 새 창 대신) ──
  // PC: 새 탭에 발표 모드(?mode=present, 402×874 화면을 탭 높이에 꽉 차게, 바깥 크림). 브라우저가 F11 전체 화면이면 그대로 전체 화면으로 보임
  // 휴대폰(좁은 화면): a의 href 그대로 새 탭(?mode=demo, 화면에 맞춤)
  $('demo-open').addEventListener('click', (e) => {
    if (matchMedia('(max-width: 899px)').matches) return;
    e.preventDefault();
    window.open(e.currentTarget.href.replace('mode=demo', 'mode=present'), '_blank', 'noopener');
  });

  // ── 시연: 402×874 화면을 틀 높이에 맞춰 통째로 줄임 (11/3) ──
  const deviceFrame = document.querySelector('.device-frame');
  if (deviceFrame) {
    const fitDemo = () => {
      const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--phone-h')) || 874;
      if (deviceFrame.clientHeight) deviceFrame.style.setProperty('--demo-scale', String(deviceFrame.clientHeight / h));
    };
    fitDemo();
    if ('ResizeObserver' in window) new ResizeObserver(fitDemo).observe(deviceFrame);
    else addEventListener('resize', fitDemo);
  }

  // ── 메뉴: 지금 보는 곳 표시 ───────────────────────────────
  // 메뉴 2개 = 서비스 소개(첫 화면~02) / 시연하러 가기(시연 + 이렇게 써요) — 화면 가운데에 걸친 섹션의 메뉴를 표시
  // (11/3) help&support 메뉴 삭제, 이렇게 써요(#how)는 시연하러 가기에 이어지는 순서
  const links = [...document.querySelectorAll('.menu a')];
  const groupOf = (el) => (el.id === 'demo' || el.id === 'how' ? 1 : 0);
  if ('IntersectionObserver' in window) {
    const io2 = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const g = groupOf(e.target);
        links.forEach((a, i) => (i === g ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section').forEach((s) => io2.observe(s));
  }

  // ── 첫 화면 루프 (ref_image/footer_loop/index.html 시안을 그대로 옮김, 11/2 푸터 → 첫 화면) ──
  const C = window.SCENE;
  if (!C) { $('scene-error').hidden = false; return; }
  const svgNS = 'http://www.w3.org/2000/svg';
  const NOSE = C.nose, MOTOR = C.motor, PIVOT = C.pivot, STOPS = C.stops;
  const si = $('subImg');
  si.setAttribute('x', C.sub.x); si.setAttribute('y', C.sub.y); si.setAttribute('width', C.sub.w); si.setAttribute('height', C.sub.h);

  // 좁은 화면: 장면(2.33:1)을 4:3으로 자르면서 잠수함~액자가 함께 남게 보는 범위를 옮김 (PC는 전체 + 화면 높이에 맞춰 양옆 잘림)
  const svg = $('scene-svg');
  const fitView = () => {
    // 휴대폰(4:3): 잠수함~액자 / PC: 그림 전체 + 위쪽에 같은 바다색 130 (제목·메뉴 자리, 11/2 260 → 130 사용자)
    const vb = innerWidth < 900 ? '700 0 1095 821' : '0 -130 1915 951';
    svg.setAttribute('viewBox', vb);
    const front = $('scene-front'); if (front) front.setAttribute('viewBox', vb); // 해초 앞 레이어도 같은 범위
  };
  fitView();
  addEventListener('resize', fitView);

  // 이미지가 안 오면 에러 문구
  ['footer/bg.webp', 'footer/paint.webp', 'footer/sub.webp'].forEach((f) => {
    const im = new Image();
    im.onerror = () => { $('scene-error').hidden = false; };
    im.src = f;
  });

  const MOVE = 2.0, DWELL = 2.0, SEG = MOVE + DWELL; // 거울 → 손 → 강아지 × 4초 = 12초
  // (11/2 사용자) 등장: 오프닝이 끝나면 잠수함이 화면 위 바깥에서 다이빙 → 되튀며 자리 → 불빛 켜짐 → 위 루프
  const DIVE = {
    dur: 1.7,            // 다이빙 (빠르게 들어와 물 저항처럼 점점 느려짐)
    from: [-90, -760],   // 출발 위치 = 제자리에서 이만큼 위(살짝 왼쪽) — 장면 위 바깥. 거의 수직으로 떨어져 DIVE 글자 쪽을 지나지 않게
    tilt: 55,            // 출발 때 앞머리를 숙인 각도(°) → 도착하며 0
    settle: 0.8,         // 살짝 더 내려갔다 되튀는 시간
    sink: 22,            // 더 내려가는 깊이
    lightDelay: 0.25,    // 멈춘 뒤 불빛까지
    flicker: 0.5,        // 불빛 깜빡이며 켜지는 시간
  };
  const LIGHT_AT = DIVE.dur + DIVE.settle + DIVE.lightDelay; // 불빛이 켜지기 시작하는 시각
  const LOOP_AT = LIGHT_AT;                                  // 루프 시계 0 = 거울을 비추며 시작
  const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const SPOT_R = 112;
  const bez = (x1, y1, x2, y2) => {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => { let t = x; for (let i = 0; i < 6; i++) { const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= (sx(t) - x) / d; } return sy(Math.min(1, Math.max(0, t))); };
  };
  const ease = bez(0.65, 0, 0.35, 1);
  const spotAt = (t) => {
    const i = Math.floor(t / SEG) % STOPS.length, local = t % SEG, a = STOPS[i].p, b = STOPS[(i + 1) % STOPS.length].p;
    const k = local < DWELL ? 0 : ease((local - DWELL) / MOVE);
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  const rotPt = ([x, y], [px, py], deg, [tx, ty]) => {
    const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [px + (x - px) * c - (y - py) * s + tx, py + (x - px) * s + (y - py) * c + ty];
  };
  const baseAim = Math.atan2(STOPS[0].p[1] - NOSE[1], STOPS[0].p[0] - NOSE[0]) * 180 / Math.PI;
  const cream = getComputedStyle(document.documentElement).getPropertyValue('--c-sea-cream').trim();

  const bubbles = []; let nextBurst = 0.6;
  const spawn = (t, from) => {
    const n = 2 + (Math.random() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) bubbles.push({ born: t + i * 0.22, x: from[0] - 4 + Math.random() * 6, y: from[1], r: 1.4 + Math.random() * 1.8, life: 3.6 + Math.random() * 2, rise: 150 + Math.random() * 90, wob: 2 + Math.random() * 4, ph: Math.random() * 6, el: null });
  };
  // (11/2 사용자 "더 많이, 다양하게") 다이빙 물방울: 고리(크기·굵기 여러 가지) + 작은 알갱이 + 가끔 큰 방울
  let nextTrail = 0, burstDone = false, settleDone = false;
  const lerp = (a, b, k) => a + (b - a) * k;
  const bubble = (t, x, y, opt = {}) => {
    const roll = Math.random();
    const kind = opt.kind || (roll < 0.55 ? 'ring' : roll < 0.85 ? 'dot' : 'big');
    const r = kind === 'dot' ? 0.6 + Math.random() * 1.2 : kind === 'big' ? 3.5 + Math.random() * 4 : 1.2 + Math.random() * 3;
    const sc = opt.scale || 1;
    bubbles.push({
      born: t + (opt.delay || 0) * Math.random(), x, y, r: r * sc, kind,
      sw: 0.7 + Math.random() * 1.1,                                  // 고리 굵기
      life: (kind === 'big' ? 2.6 : 1.4) + Math.random() * 1.8,
      rise: ((kind === 'big' ? 90 : 110) + Math.random() * 170) * (opt.rise || 1), // 큰 방울은 천천히
      vx: -30 + Math.random() * 44,                                   // 옆으로 흘러가는 양 (대체로 뒤쪽)
      wob: 1.5 + Math.random() * 6, ph: Math.random() * 6, el: null,
    });
  };
  // 지나간 길: 프로펠러~선체 앞쪽 사이 아무 데서나, 진하게
  const spawnTrail = (t, motor, nose) => {
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const k = Math.random() < 0.6 ? Math.random() * 0.35 : Math.random(); // 프로펠러 쪽에 더 많이
      bubble(t, lerp(motor[0], nose[0], k) - 14 + Math.random() * 28, lerp(motor[1], nose[1], k) - 12 + Math.random() * 24);
    }
  };
  // 한꺼번에 터지는 물방울 (뛰어든 순간 · 멈춰 되튈 때)
  const spawnBurst = (t, cx, cy, n, spread) => {
    for (let i = 0; i < n; i++) bubble(t, cx - spread + Math.random() * spread * 2, cy - spread * 0.6 + Math.random() * spread * 1.2, { delay: 0.25 });
  };
  // (11/2 사용자) 주변에서도 불규칙하게 뽀글뽀글: DIVE 글자 모서리 · 액자 모서리 · 해초 끝 (좌표 = 바다 그림 1915×821 기준)
  // (11/2 사용자) 액자는 3곳만: 위 조개 장식, 왼쪽 위 모서리, 오른쪽 장식 (이전 7곳)
  // (11/2 사용자) 올라가며 액자를 가리는 곳(오른쪽 옆면 장식)은 뺌 → 위 조개 장식·왼쪽 위 모서리만 (바깥 바다로 올라감)
  const FRAME_PTS = [[1547, 22], [1300, 147]];
  // (11/2 사용자) 왼쪽 해초는 가장 큰 잎 끝 하나만 남김 (이전 8곳)
  // (11/2 사용자) 액자 앞·안쪽 해초(왼쪽 아래 1173, 아래 1493·1573)는 물방울이 액자를 가려 뺌
  const WEED_PTS = [[207, 224], [1873, 376], [1887, 500]];
  // DIVE 글자(페이지 글자)의 화면 위치 → 바다 장면 좌표. 글자가 장면 위에 겹쳐 있을 때(PC)만
  const logo = document.querySelector('.hero-logo');
  const toScene = (cx, cy) => {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(m.inverse());
  };
  const letterPt = (idx, fx, fy) => () => {
    if (!logo || innerWidth < 900) return null;
    const sp = logo.children[idx];
    if (!sp) return null;
    const r = sp.getBoundingClientRect();
    const q = toScene(r.left + r.width * fx, r.top + r.height * fy);
    return q ? [q.x, q.y] : null;
  };
  const emitters = [
    { at: letterPt(0, 0.04, 0.62), gap: [0.5, 1.5], n: [2, 4] },  // D 왼쪽 모서리
    { at: letterPt(1, 0.9, 0.3), gap: [0.6, 1.8], n: [2, 4] },    // I 오른쪽 모서리
    // (11/2 사용자) E 아래 오른쪽 모서리 물방울 삭제
    ...FRAME_PTS.map((p) => ({ at: () => p, gap: [0.9, 3.0], n: [2, 4] })),
    ...WEED_PTS.map((p) => ({ at: () => p, gap: [1.2, 4.0], n: [2, 4] })),
  ];
  const rand = (a, b) => a + Math.random() * (b - a);
  emitters.forEach((e) => { e.next = rand(0.3, e.gap[1]); }); // 처음부터 다 같이 나오지 않게
  const emitAmbient = (t) => {
    for (const e of emitters) {
      if (t < e.next) continue;
      e.next = t + rand(e.gap[0], e.gap[1]);
      const p = e.at();
      if (!p) continue;
      const n = Math.round(rand(e.n[0], e.n[1]));
      for (let i = 0; i < n; i++) bubble(t, p[0] - 4 + Math.random() * 8, p[1] - 3 + Math.random() * 6, { delay: 0.6, scale: 1.25, rise: 0.9, kind: Math.random() < 0.3 ? 'dot' : Math.random() < 0.15 ? 'big' : 'ring' });
    }
  };
  const drawBubbles = (t) => {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i], age = t - b.born;
      if (age < 0) continue;
      if (age > b.life) { if (b.el) b.el.remove(); bubbles.splice(i, 1); continue; }
      if (!b.el) {
        b.el = document.createElementNS(svgNS, 'circle');
        if (b.kind === 'dot') { b.el.setAttribute('fill', cream); b.el.setAttribute('stroke', 'none'); }
        else { b.el.setAttribute('fill', 'none'); b.el.setAttribute('stroke', cream); b.el.setAttribute('stroke-width', (b.sw ?? 1.1).toFixed(2)); }
        $('bubbles').appendChild(b.el);
      }
      const k = age / b.life;
      b.el.setAttribute('cx', (b.x + k * (b.vx ?? -24) + Math.sin(age * 2.6 + b.ph) * b.wob).toFixed(1));
      b.el.setAttribute('cy', (b.y - k * b.rise).toFixed(1));
      b.el.setAttribute('r', (b.r * (1 + k * 0.6)).toFixed(2));
      b.el.setAttribute('opacity', (Math.min(1, age * 3) * (1 - k) * 0.9).toFixed(2));
    }
  };

  // 등장 단계별 잠수함 위치·기울기 보정과 불빛 세기(0~1)
  function entrance(t) {
    if (t < DIVE.dur) {
      const e = easeOut(t / DIVE.dur);
      return { ox: DIVE.from[0] * (1 - e), oy: DIVE.from[1] * (1 - e), tilt: DIVE.tilt * (1 - e), light: 0, diving: true };
    }
    const q = (t - DIVE.dur) / DIVE.settle;
    const oy = q < 1 ? DIVE.sink * Math.sin(Math.PI * q) * (1 - 0.35 * q) : 0;
    let light = 0;
    const lq = (t - LIGHT_AT) / DIVE.flicker;
    if (lq >= 1) light = 1;
    else if (lq > 0) light = [0.85, 0.15, 0.95, 0.35, 1][Math.floor(lq * 5)]; // 두어 번 깜빡이고 켜짐
    return { ox: 0, oy, tilt: 0, light, diving: false };
  }

  // (11/2 사용자) 잠수함 자리를 화면에서 40px 왼쪽으로 (PC). 장면이 화면 폭에 맞춰 커지고 작아지므로 px → 장면 좌표로 바꿔 계산
  const SUB_SHIFT_PX = [-60, 20]; // [가로, 세로] px — (11/2 사용자) 왼쪽 40 → 왼쪽 60·아래 20
  let shiftCache = { w: 0, x: 0, y: 0 };
  const shiftUpdate = () => {
    if (shiftCache.w === innerWidth) return;
    const m = innerWidth < 900 ? null : svg.getScreenCTM();
    shiftCache = { w: innerWidth, x: m ? SUB_SHIFT_PX[0] / m.a : 0, y: m ? SUB_SHIFT_PX[1] / m.d : 0 };
  };
  const subShift = () => { shiftUpdate(); return shiftCache.x; };
  const subShiftY = () => { shiftUpdate(); return shiftCache.y; };
  function frame(t) {
    const en = entrance(t);
    const lt = Math.max(0, t - LOOP_AT);  // 루프 시계 (불빛이 켜진 뒤부터)
    const spot = spotAt(lt);
    // 위아래 ±5(7초)·좌우 ±3(11초)로 떠 있음 + 등장 보정
    const dx = Math.sin(t * 2 * Math.PI / 11) * 3 + en.ox + subShift();
    const dy = Math.sin(t * 2 * Math.PI / 7) * 5 + en.oy + subShiftY();
    const aim = Math.atan2(spot[1] - NOSE[1], spot[0] - NOSE[0]) * 180 / Math.PI;
    // 불빛 쪽으로 살짝 고개(불빛이 켜진 만큼) + 기울기 흔들림 + 다이빙 때 앞머리 숙임
    const rot = (aim - baseAim) * 0.25 * en.light + Math.sin(t * 2 * Math.PI / 7 + 1.2) * 1.2 + en.tilt;
    $('sub').setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) rotate(${rot.toFixed(2)} ${PIVOT[0]} ${PIVOT[1]})`);
    const nose = rotPt(NOSE, PIVOT, rot, [dx, dy]);
    const ang = Math.atan2(spot[1] - nose[1], spot[0] - nose[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
    const r = SPOT_R * (1 + Math.sin(t * 1.3) * 0.04);
    const pts = [[nose[0] + nx * 3, nose[1] + ny * 3], [spot[0] + nx * r * 0.9, spot[1] + ny * r * 0.9], [spot[0] - nx * r * 0.9, spot[1] - ny * r * 0.9], [nose[0] - nx * 3, nose[1] - ny * 3]];
    $('beam').setAttribute('points', pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' '));
    const g = $('beamGrad'); g.setAttribute('x1', nose[0]); g.setAttribute('y1', nose[1]); g.setAttribute('x2', spot[0]); g.setAttribute('y2', spot[1]);
    $('beam').setAttribute('opacity', ((0.92 + Math.sin(t * 5.1) * 0.04 + Math.sin(t * 13.7) * 0.03) * en.light).toFixed(3));
    const mc = $('spotMaskCircle'); mc.setAttribute('cx', spot[0]); mc.setAttribute('cy', spot[1]); mc.setAttribute('r', r.toFixed(1));
    mc.setAttribute('opacity', en.light.toFixed(3));                 // 불빛이 꺼져 있으면 액자 속 그림도 안 보임
    $('pool').setAttribute('cx', spot[0]); $('pool').setAttribute('cy', spot[1]);
    $('pool').setAttribute('opacity', en.light.toFixed(3));
    if (!reduce) {
      const motor = rotPt(MOTOR, PIVOT, rot, [dx, dy]);
      if (!burstDone && t > 0.22) { burstDone = true; spawnBurst(t, (motor[0] + nose[0]) / 2, (motor[1] + nose[1]) / 2, 26, 46); } // 뛰어든 순간 (34 → 26개)
      if (!settleDone && t > DIVE.dur) { settleDone = true; spawnBurst(t, motor[0], motor[1], 10, 18); } // (14 → 10개)                         // 멈추며 되튈 때
      if (en.diving && t < DIVE.dur * 0.95) {                         // 다이빙: 지나간 길을 따라 물방울 줄기
        if (t > nextTrail) { spawnTrail(t, motor, nose); nextTrail = t + 0.037; } // (11/2 사용자) 25% 줄임 (0.028 → 0.037초)
      } else if (t > nextBurst) { spawn(t, motor); nextBurst = t + 1.4 + Math.random() * 1.6; }
      emitAmbient(t);
      drawBubbles(t);
    }
  }

  // 움직임 줄이기: 등장 없이 제자리에서 거울을 비춘 정지 화면, [멈춤] 숨김
  if (reduce) { frame(LOOP_AT + DIVE.flicker); return; }
  // (11/2 사용자) [멈춤] 버튼·기능 삭제
  let start = null, visible = false, started = false, last = 0, raf = 0;
  nextBurst = LOOP_AT + 0.6;
  const tick = (now) => { if (start === null) start = now - last * 1000; last = (now - start) / 1000; frame(last); raf = requestAnimationFrame(tick); };
  const run = () => { if (started && visible && !raf) { start = null; raf = requestAnimationFrame(tick); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) run(); else stop(); }).observe($('scene'));
  frame(0); // 잠수함은 화면 위 바깥, 불빛 꺼짐
  // 오프닝이 끝나면(건너뛰기 포함) 다이빙 시작. 오프닝이 없으면 바로
  const begin = () => { if (started) return; started = true; run(); };
  if (document.documentElement.dataset.introDone || !document.getElementById('intro')) begin();
  else document.addEventListener('dive:introdone', begin, { once: true });
})();
