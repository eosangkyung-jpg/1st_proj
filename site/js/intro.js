/* DIVE 오프닝 (11/2, 사용자 설계) — 들어올 때마다 재생, 누르거나 키를 누르면 건너뜀
   ① "들리지 않아도, / 그림 속까지." ASCII 스크램블 (첫 글자부터 차례로 제 글자)
   → 빠른 디졸브 아웃·인
   ② "DIVE INSIDE, / VISUALLY EXPLAINED." 타이핑 → 1초 멈춤 → 백스페이스로 모두 지움
   ③ "DIVE" 빠른 타이핑 → 3초 멈춤
   → 오프닝이 디졸브로 사라지며 첫 화면 */
(() => {
  // 시간 값 (ms) — 여기만 고치면 됨
  const T = {
    scrambleTick: 22,     // ① 무작위 글자가 바뀌는 간격 (11/2 55 → 22ms, 사용자: 더 빠르게)
    scrambleStart: 350,   // ① 첫 글자가 제 글자로 맞춰지기까지 (11/2 800 → 다시 350ms, 사용자)
    scrambleStep: 95,     // ① 글자마다 맞춰지는 간격
    scrambleHold: 900,    // ① 다 맞춰진 뒤 머무름
    swap: 250,            // 장면 사이 디졸브 아웃·인 (style.css .intro-stage transition과 같게)
    type: 60,             // ② 한 글자 입력
    commaPause: 450,      // ② "DIVE INSIDE," 쉼표 뒤 잠깐 멈춤 (11/2 사용자)
    typePause: 1000,      // ② 다 입력된 뒤 멈춤 (사용자: 1초)
    erase: 28,            // ② 한 글자 지움
    afterErase: 250,      // ② 다 지운 뒤 ③ 시작 전
    typeFast: 90,         // ③ DIVE 한 글자 (글자가 4개라 빠르게 보임)
    finalPause: 3000,     // ③ 다 뜬 뒤 멈춤 (사용자: 3초)
    outro: 600,           // 마지막 디졸브 (style.css .intro transition과 같게)
  };
  const KO = ['들리지 않아도,', '그림 속까지.'];
  const EN = 'DIVE INSIDE,\nVISUALLY EXPLAINED.';
  const DIVE = 'DIVE';
  // ③ DIVE 글자 사이 자간 (11/2 사용자): 기본 -8%(CSS), I–V·V–E 사이만 -3%. 키 = 앞 글자 순번
  const DIVE_KERN = { 1: '-0.03em', 2: '-0.03em' };
  // 출력 가능한 ASCII 전체(공백 제외 94자) — 11/2 사용자: 더 많은 글자가 돌아가게
  const ASCII = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)).join('');

  const intro = document.getElementById('intro');
  const stage = document.getElementById('intro-stage');
  const root = document.documentElement;
  if (!intro) { root.classList.remove('intro-on'); return; }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let finished = false;
  const timers = new Set();
  const every = (fn, ms) => { const id = setInterval(fn, ms); timers.add(id); return id; };

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearInterval);
    intro.classList.add('is-out');
    root.classList.remove('intro-on');
    root.dataset.introDone = '1';
    document.dispatchEvent(new Event('dive:introdone')); // 첫 화면 잠수함 다이빙 시작 신호 (site.js)
    setTimeout(() => intro.remove(), T.outro + 50);
  }

  // 움직임 줄이기 설정: 오프닝 없이 바로 페이지 (CSS에서도 숨김)
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { intro.remove(); root.classList.remove('intro-on'); return; }

  intro.addEventListener('click', finish);
  addEventListener('keydown', function onKey() { removeEventListener('keydown', onKey); finish(); });

  const rnd = () => ASCII[Math.floor(Math.random() * ASCII.length)];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ① 스크램블
  async function sceneScramble() {
    const box = el('div', 'intro-ko');
    const chars = [];
    KO.forEach((line) => {
      const ln = el('span', 'ln');
      [...line].forEach((c) => {
        if (c === ' ') { ln.append(' '); return; }
        const ch = el('span', 'ch');
        ch.append(el('span', 'fin', c));
        const r = el('span', 'rnd', rnd());
        ch.append(r);
        ln.append(ch);
        chars.push({ ch, r });
      });
      box.append(ln);
    });
    stage.replaceChildren(box);
    const tick = every(() => chars.forEach((c) => { if (!c.ch.classList.contains('is-done')) c.r.textContent = rnd(); }), T.scrambleTick);
    await wait(T.scrambleStart);
    for (const c of chars) {
      if (finished) return;
      c.ch.classList.add('is-done');
      await wait(T.scrambleStep);
    }
    clearInterval(tick);
    await wait(T.scrambleHold);
  }

  // ②③ 타이핑 (커서 _)
  // 글자마다 자간을 다르게 줄 때(kern)는 글자를 span으로 나눠 그림
  function paint(node, str, kern) {
    if (!kern) { node.textContent = str; return; }
    node.replaceChildren(...[...str].map((c, i) => {
      const s = el('span', null, c);
      if (kern[i]) s.style.letterSpacing = kern[i];
      return s;
    }));
  }
  function typingBox(full, big, kern) {
    const box = el('div', `intro-en${big ? ' is-big' : ''}`);
    const ghost = el('span', 'ghost');
    paint(ghost, `${full}_`, kern);
    box.append(ghost); // 자리 잡기 (커서 폭 포함)
    const live = el('span', 'live');
    const text = el('span', 'txt');
    const cursor = el('span', 'cursor', '_');
    live.append(text, cursor);
    box.append(live);
    stage.replaceChildren(box);
    return { text, cursor, kern };
  }
  async function type(target, full, ms) {
    target.cursor.classList.remove('is-blink');
    for (let i = 1; i <= full.length; i++) {
      if (finished) return;
      paint(target.text, full.slice(0, i), target.kern);
      const c = full[i - 1];
      await wait(c === ',' ? T.commaPause : c === '\n' ? ms * 3 : ms);
    }
    target.cursor.classList.add('is-blink');
  }
  async function erase(target, ms) {
    target.cursor.classList.remove('is-blink');
    let s = target.text.textContent;
    while (s.length) {
      if (finished) return;
      s = s.slice(0, -1);
      target.text.textContent = s;
      await wait(ms);
    }
  }

  async function run() {
    // 글꼴이 늦게 오면 글자 폭이 바뀌므로 잠깐 기다림 (최대 1.2초)
    if (document.fonts && document.fonts.load) {
      await Promise.race([Promise.all([document.fonts.load('400 40px Marcellus'), document.fonts.load('700 40px Cafe24ProSlim')]), wait(1200)]).catch(() => {});
    }
    if (finished) return;
    await sceneScramble();
    if (finished) return;

    stage.classList.add('is-hidden');            // 빠르게 디졸브 아웃
    await wait(T.swap);
    const en = typingBox(EN, false);
    stage.classList.remove('is-hidden');         // 빠르게 디졸브 인
    await wait(T.swap);
    await type(en, EN, T.type);
    if (finished) return;
    await wait(T.typePause);
    await erase(en, T.erase);
    if (finished) return;
    await wait(T.afterErase);

    const dive = typingBox(DIVE, true, DIVE_KERN);
    await type(dive, DIVE, T.typeFast);
    if (finished) return;
    await wait(T.finalPause);
    finish();
  }
  run();
})();
