/*
 * 명화 해설 화면 테스트 — 화면 흐름, 측정, 저장
 * 흐름: 시작·동의 → 사전 질문 → 상황 설정 → 해설(A/B) → 확대 연습 → 과업 → 사후 설문 → 완료
 * 측정 규칙은 TEST_WEB_PROJECT.md 9번을 따른다.
 */
(() => {
  'use strict';

  const C = CONTENT.copy;
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);
  const DONE_KEY = (phase) => `qrtest_done_${phase}`;
  const QUEUE_KEY = 'qrtest_queue';

  const P_COLS = ['participant_id', 'phase', 'group', 'assign_method', 'date', 'started_at', 'input_type', 'device_width',
    'saw_before', 'docent_exp', 'explain_sec', 'q1', 'q2', 'q3', 'q3_other', 'completed',
    'prev_test', 'artwork']; // 10/30 추가: 이전 테스트 참여, 작품 키 (Code.gs와 같게 맨 뒤에)
  const T_COLS = ['row_id', 'participant_id', 'phase', 'group', 'task', 'type', 'task_kind', 'success', 'found', 'task_sec',
    'wrong_taps', 'zoom_used', 'press_ms', 'left_tab', 'answer', 'fail_reason', 'answer_changes'];

  const state = {
    participant: null,
    rows: [],
    inTest: false,
    leftTab: 0,
    imageTone: 'dark', // (v2) 작품 평균 명도: dark(어두움 → 흰 자막) / light(밝음 → 검은 자막)
    preview: false,    // ?preview=A|B — 해설 화면만 반복해서 보는 확인용 (배정·저장 없음)
  };

  // ── 작은 도우미 ─────────────────────────────────────
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const round1 = (n) => Math.round(n * 10) / 10;
  const now = () => performance.now();
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  // 한국 시간 ISO 문자열 (예: 2026-10-30T17:39:18.470+09:00) — 10/30부터. 베타 기록은 UTC(…Z)
  const kstIso = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace('Z', '+09:00');
  const randomId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = 'P';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };
  const storage = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 저장 불가 환경은 무시 */ }
    },
  };
  const inRegion = (x, y, [x1, y1, x2, y2]) => x >= x1 && x <= x2 && y >= y1 && y <= y2;

  // 화면 전환 직후 입력 막기: 앞 화면에서 누르기 시작한 탭이나 연속 탭이 새 화면 버튼·그림에 눌리지 않게 한다
  const guard = { until: 0, downAt: 0 };
  app.addEventListener('pointerdown', (e) => {
    guard.downAt = now();
    if (guard.downAt < guard.until) e.stopPropagation();
  }, true);
  app.addEventListener('click', (e) => {
    // detail이 0이면 키보드로 누른 클릭 — 누르기 시작한 시점이 없으므로 현재 시각으로 판단
    const blocked = e.detail > 0 ? guard.downAt < guard.until : now() < guard.until;
    if (blocked) { e.stopPropagation(); e.preventDefault(); }
  }, true);

  function render(html) {
    app.innerHTML = html;
    app.scrollTop = 0;
    guard.until = now() + CONFIG.INPUT_GUARD_MS;
  }

  function toast(container, text, kind, ms = 900) {
    const el = document.createElement('div');
    el.className = `toast ${kind || ''}`;
    el.textContent = text;
    container.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ── 저장 (Google 스프레드시트 / 로컬) ──────────────────
  const Net = {
    queue: storage.get(QUEUE_KEY, []),
    pending: null,
    sent: 0, // 이번 방문에서 보낸 건수 (완료 화면 진행률 표시용)

    enqueue(item) {
      this.queue.push(item);
      storage.set(QUEUE_KEY, this.queue);
      this.flush();
    },

    async send(item) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        // Content-Type을 지정하지 않으면 text/plain으로 보내져 사전 요청(CORS preflight) 없이 전송된다
        const res = await fetch(CONFIG.SHEET_URL, { method: 'POST', body: JSON.stringify(item), signal: ctrl.signal });
        const json = await res.json();
        return json.ok === true;
      } catch {
        return false;
      } finally {
        clearTimeout(timer);
      }
    },

    // 대기열을 순서대로 보낸다. 모두 보냈으면 true. 보내는 중에 다시 부르면 같은 작업을 기다린다
    flush() {
      if (!CONFIG.SHEET_URL) return Promise.resolve(false);
      if (!this.pending) {
        this.pending = (async () => {
          while (this.queue.length) {
            const ok = await this.send(this.queue[0]);
            if (!ok) break;
            this.queue.shift();
            this.sent++;
            storage.set(QUEUE_KEY, this.queue);
            if (this.onProgress) this.onProgress();
          }
        })().finally(() => { this.pending = null; });
      }
      return this.pending.then(() => this.queue.length === 0);
    },
  };

  function saveParticipant() {
    Net.enqueue({ type: 'participant', row: { ...state.participant } });
  }

  function saveTaskRow(row) {
    state.rows.push(row);
    Net.enqueue({ type: 'task', row });
  }

  async function assignGroup(pid, phase) {
    if (CONFIG.SHEET_URL) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const url = `${CONFIG.SHEET_URL}?action=assign&phase=${phase}&pid=${pid}`;
        const json = await (await fetch(url, { signal: ctrl.signal })).json();
        if (json.group === 'A' || json.group === 'B') return { group: json.group, method: 'server' };
      } catch { /* 실패하면 아래 무작위 배정 */ } finally {
        clearTimeout(timer);
      }
    }
    return { group: Math.random() < 0.5 ? 'A' : 'B', method: 'random' };
  }

  function toCsv(cols, rows) {
    const cell = (v) => {
      const s = v === undefined || v === null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n');
  }

  function downloadCsv(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ── 그림 보기 (확대·이동·탭) ───────────────────────────
  // full: (v2) B 해설 전용 — 그림 영역이 화면 전체. 1배는 폭(또는 높이)에 맞춰 위쪽에 붙이고, 남는 아래는 검은 공간
  function createViewer({ interactive = false, onTap = null, minimap = false, full = false, loupe = false, keepFrame = false } = {}) {
    const el = document.createElement('div');
    el.className = 'viewer' + (interactive ? ' interactive' : '') + (full ? ' full' : '');
    el.innerHTML = `
      <div class="viewer-layer">
        <img src="${CONTENT.image.src}" alt="${esc(CONTENT.image.title)} — ${esc(CONTENT.image.artist)}" draggable="false">
        ${full && CONTENT.image.frame ? `<img class="viewer-frame" src="${CONTENT.image.frame.src}" alt="" aria-hidden="true" draggable="false">` : ''}
        <div class="viewer-fade"></div>
        <div class="hl-wrap"></div>
      </div>
      ${minimap ? '<div class="minimap" aria-hidden="true"><div class="minimap-frame"><div class="minimap-view"></div></div></div>' : ''}
      ${loupe ? `<div class="loupe" aria-hidden="true" style="background-image:url('${CONTENT.image.src}')"></div>` : ''}`;
    const layer = el.querySelector('.viewer-layer');
    // (11/2) 액자: 액자 이미지의 그림 자리(paint)가 그림 레이어(0~1)와 겹치게 놓는다. outerBox = 액자 바깥 끝을 그림 기준 좌표로
    const F = full ? CONTENT.image.frame : null;
    // 액자 이미지의 그림 자리(paint, 액자 이미지 기준 0~1)가 그림 레이어(0~1)와 겹치는 위치
    const placeFrame = ([a, b, c, d]) => ({ left: `${(-a / (c - a)) * 100}%`, top: `${(-b / (d - b)) * 100}%`, width: `${100 / (c - a)}%`, height: `${100 / (d - b)}%` });
    let outerBox = null;
    if (F) {
      const [px1, py1, px2, py2] = F.paint;
      const pw = px2 - px1, ph = py2 - py1;
      Object.assign(el.querySelector('.viewer-frame').style, placeFrame(F.paint));
      outerBox = [(F.outer[0] - px1) / pw, (F.outer[1] - py1) / ph, (F.outer[2] - px1) / pw, (F.outer[3] - py1) / ph];
    }
    // (11/2) keepFrame: 장면 2 이후에도 액자를 유지 — 움직일 수 있는 범위·주변 어둡게·아래 끝 흐림을 액자 바깥 끝 기준으로
    const keep = !!(keepFrame && outerBox);
    const B = keep ? outerBox : [0, 0, 1, 1]; // 화면이 넘지 않는 경계 (그림 기준 좌표)
    if (keep) {
      el.classList.add('keep-frame');
      // (11/2) 확대 장면용 고해상도 액자: 장면 1용 액자 위에 겹쳐 두고, 확대될 때만 서서히 나타남 (아래 액자가 불투명이라 그림 가장자리가 비치지 않음)
      if (F.hiSrc) {
        const hi = el.querySelector('.viewer-frame').cloneNode();
        hi.src = F.hiSrc;
        hi.classList.add('viewer-frame-hi');
        Object.assign(hi.style, placeFrame(F.hiPaint || F.paint)); // 고해상도 이미지의 그림 자리가 아주 조금 다르면 hiPaint
        el.querySelector('.viewer-frame').after(hi);
      }
      el.querySelector('.viewer-fade').style.bottom = `${-(B[3] - 1) * 100}%`;
    }
    const hlWrap = el.querySelector('.hl-wrap');
    // (v2) 위치 지도: 작품 전체(바깥 사각형) 중 지금 보이는 범위(안쪽 사각형)
    const mapView = el.querySelector('.minimap-view');
    const steps = CONFIG.ZOOM_STEPS;
    const v = { s: 1, tx: 0, ty: 0, zoomIdx: 0, zoomUsed: 0, locked: false, stageH: null };

    // w·h = 그림 영역, iw·ih = 1배일 때 그림 크기 (full이 아니면 둘이 같다)
    const size = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!full) return { w, h, iw: w, ih: h };
      const iw = Math.min(w, h * CONTENT.image.ratio);
      return { w, h, iw, ih: iw / CONTENT.image.ratio };
    };

    // stageH: 대상이 보여야 하는 높이 (full에서는 자막 위쪽까지). 그림 아래 끝은 여기까지 올라올 수 있다
    function clamp() {
      const { w, h, iw, ih } = size();
      const stageH = v.stageH ?? h;
      if (v.cover) return; // 디폴트 화면은 cover()가 위치를 정함
      if (v.framed) return; // 액자 장면은 focus()가 위치를 정함
      // (11/2) 1배(작품 전체 장면)는 자막 위 공간의 세로 가운데 — 긴 화면에서 그림 아래만 비지 않게 (이전: 위쪽에 붙임)
      if (full && v.s === 1) { v.tx = (w - iw) / 2; v.ty = Math.max(0, (stageH - ih) / 2); return; }
      const L = B[0] * iw * v.s, R = B[2] * iw * v.s, T = B[1] * ih * v.s, Bo = B[3] * ih * v.s; // 경계 (액자 유지면 액자 바깥 끝)
      v.tx = R - L >= w ? Math.min(-L, Math.max(w - R, v.tx)) : (w - L - R) / 2;
      v.ty = Math.min(Math.max(-T, stageH - Bo), Math.max(Math.min(-T, stageH - Bo), v.ty));
    }

    function apply(animate) {
      layer.classList.toggle('animate', !!animate);
      layer.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${v.s})`;
      layer.style.setProperty('--s', v.s);
      el.classList.toggle('zoomed', v.s > 1);
      if (mapView) {
        // 그림 중 화면에 보이는 범위 (0~1)
        const { w, h, iw, ih } = size();
        const x0 = Math.max(0, -v.tx / (iw * v.s));
        const x1 = Math.min(1, (w - v.tx) / (iw * v.s));
        const y0 = Math.max(0, -v.ty / (ih * v.s));
        const y1 = Math.min(1, (h - v.ty) / (ih * v.s));
        mapView.classList.toggle('animate', !!animate);
        Object.assign(mapView.style, {
          left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%`,
        });
      }
    }

    function zoomTo(idx) {
      const { w, h } = size();
      const cx = (w / 2 - v.tx) / v.s;
      const cy = (h / 2 - v.ty) / v.s;
      v.zoomIdx = Math.max(0, Math.min(steps.length - 1, idx));
      v.s = steps[v.zoomIdx];
      v.tx = w / 2 - cx * v.s;
      v.ty = h / 2 - cy * v.s;
      clamp();
      apply(false);
      updateZoomUi();
    }

    // B 해설: 영역으로 확대·이동
    // (v2) 강조 대상(targets)이 작게 보이면 대상 쪽으로 더 확대한다 (대상이 화면 안에 들어오는 한도 안에서)
    // stageH: (full) 자막 위쪽까지의 높이 — 대상을 이 범위의 가운데에 둬 자막에 가리지 않게 한다
    function focus(region, targets, stageH, maxScale) {
      const MAX = maxScale ?? CONFIG.EXPLAIN_MAX_SCALE; // (11/2) 장면별 최대 확대 (작품 파일 step.maxScale)
      fitLayer();
      el.classList.remove('cover');
      v.cover = false;
      // (11/2) 그림 전체를 보여 주는 장면(장면 1 등)에서는 위치 지도를 숨김 — 알려 줄 위치가 없음. 확대되는 장면에서 서서히 나타남
      const whole = region[0] <= 0 && region[1] <= 0 && region[2] >= 1 && region[3] >= 1;
      el.classList.toggle('is-whole', whole);
      stopPan(); // 디폴트 화면 이동 중이었다면 지금 위치에서 장면으로 이어서 움직임
      const { w, h, iw, ih } = size();
      v.stageH = stageH ?? null;
      const sh = stageH ?? h;
      // (11/2) 그림 전체 장면 + 액자가 있는 작품: 액자까지 자막 위 공간 가운데에 들어오게 줄인다. 다음 장면으로 확대되면 액자는 서서히 사라짐
      v.framed = !!(whole && outerBox);
      el.classList.toggle('framed', v.framed);
      if (!v.framed) el.classList.remove('loupe-on');
      if (v.framed) {
        const [ox1, oy1, ox2, oy2] = outerBox;
        const fill = parseFloat(getComputedStyle(el).getPropertyValue('--frame-fill')) || 0.92; // (11/2) 0.92 → 0.98, 그림이 작아 보여서
        v.s = Math.min((fill * w) / (iw * (ox2 - ox1)), (fill * sh) / (ih * (oy2 - oy1)));
        v.tx = w / 2 - ((ox1 + ox2) / 2) * iw * v.s;
        v.ty = sh / 2 - ((oy1 + oy2) / 2) * ih * v.s;
        v.frameBottom = v.ty + oy2 * ih * v.s; // 액자 아래 끝 (뷰어 위쪽 기준 px) — 돋보기 안내를 바로 밑에 둠
        apply(true);
        return v.s;
      }
      const fx = w / iw;
      const fy = sh / ih;
      const [x1, y1, x2, y2] = region;
      let s = Math.max(1, Math.min(MAX, (0.85 * fx) / (x2 - x1), (0.85 * fy) / (y2 - y1)));
      let cx = (x1 + x2) / 2;
      let cy = (y1 + y2) / 2;
      if (targets && targets.length) {
        const tx1 = Math.min(...targets.map((r) => r[0]));
        const ty1 = Math.min(...targets.map((r) => r[1]));
        const tx2 = Math.max(...targets.map((r) => r[2]));
        const ty2 = Math.max(...targets.map((r) => r[3]));
        const need = CONFIG.EXPLAIN_MIN_TARGET / Math.max((tx2 - tx1) / fx, (ty2 - ty1) / fy);
        const fit = Math.min(MAX, (0.85 * fx) / (tx2 - tx1), (0.85 * fy) / (ty2 - ty1));
        const s2 = Math.min(need, fit);
        if (s2 > s) {
          s = s2;
          cx = (tx1 + tx2) / 2;
          cy = (ty1 + ty2) / 2;
        }
      }
      // (10/31) 그림 아래 끝 흐림은 강조 대상 아래 끝까지는 올라오지 않게 한다 (예: 9번 서명)
      const bottom = targets && targets.length ? Math.max(...targets.map((r) => r[3])) : 1;
      // (11/2) 흐림 최대 높이(--viewer-fade) 이하로 묶음 — 장면 사이에 이 값이 서서히 바뀌므로(@property), 큰 값(예: 1384px)이면 앞부분에서 몰려 바뀜
      const fadeMax = parseFloat(getComputedStyle(el).getPropertyValue('--viewer-fade')) || 0;
      layer.style.setProperty('--fade-cap', `${Math.min(fadeMax, Math.max(0, (B[3] - bottom) * ih * s - 4))}px`);
      v.s = s;
      v.tx = w / 2 - cx * iw * s;
      v.ty = sh / 2 - cy * ih * s;
      clamp();
      apply(true);
      return s;
    }

    // (10/31) B 해설 강조: 크림 테두리 대신 대상 주변을 어둡게 한다 (타원으로 감싸기, 가장자리 흐림).
    // 대상이 여럿이어도 구멍이 서로를 덮지 않게 SVG 마스크 한 장에 그린다. spot = 장면별 { dim, rim }
    let spotN = 0;
    function setSpot(regions, spot = {}) {
      const css = getComputedStyle(el);
      let W = layer.offsetWidth;
      let H = layer.offsetHeight;
      const blur = parseFloat(css.getPropertyValue('--spot-feather')) / v.s;
      const dim = spot.dim ?? parseFloat(css.getPropertyValue('--spot-dim'));
      const rim = spot.rim ?? 0;
      const id = `spot-${++spotN}`;
      // 기본: 강조 상자의 네 모서리를 지나는 타원 (반지름 = 변의 절반 × √2)
      // spot.fit === 'inner': 강조 상자에 딱 맞는 타원 (반지름 = 변의 절반) — 대상이 화면을 거의 채워 √2배 타원이 주변을 덮는 장면용 (11/2)
      const k = spot.fit === 'inner' ? 0.5 : Math.SQRT1_2;
      // 어둡게 하는 막의 범위 = 경계 B (액자 유지면 액자까지 함께 어둡게)
      const ox = B[0] * W, oy = B[1] * H;
      const ells = regions.map(([x1, y1, x2, y2]) =>
        `cx="${((x1 + x2) / 2) * W - ox}" cy="${((y1 + y2) / 2) * H - oy}" rx="${(x2 - x1) * W * k}" ry="${(y2 - y1) * H * k}"`);
      const svgStyle = keep ? ` style="left:${B[0] * 100}%;top:${B[1] * 100}%;width:${(B[2] - B[0]) * 100}%;height:${(B[3] - B[1]) * 100}%"` : '';
      W = (B[2] - B[0]) * W; H = (B[3] - B[1]) * H;
      hlWrap.innerHTML = `
        <svg class="spot"${svgStyle} viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="${id}-b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blur}"/></filter>
            <mask id="${id}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
              <rect width="${W}" height="${H}" fill="white"/>
              ${ells.map((e) => `<ellipse ${e} fill="black" filter="url(#${id}-b)"/>`).join('')}
            </mask>
          </defs>
          <rect class="spot-dim" width="${W}" height="${H}" mask="url(#${id}-m)" style="fill-opacity:${dim}"/>
          ${rim ? ells.map((e) => `<ellipse ${e} class="spot-rim" filter="url(#${id}-b)" style="stroke-opacity:${rim};stroke-width:${parseFloat(css.getPropertyValue('--spot-rim-width')) / v.s}"/>`).join('') : ''}
        </svg>`;
      const svg = hlWrap.firstElementChild;
      requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('show')));
    }

    function setHighlights(regions, cls = 'show', spot) {
      hlWrap.innerHTML = '';
      if (full && regions && cls === 'show') { setSpot(regions, spot); return; }
      (regions || []).forEach(([x1, y1, x2, y2]) => {
        const b = document.createElement('div');
        b.className = 'hl';
        Object.assign(b.style, {
          left: `${x1 * 100}%`, top: `${y1 * 100}%`, width: `${(x2 - x1) * 100}%`, height: `${(y2 - y1) * 100}%`,
        });
        hlWrap.appendChild(b);
        // (10/31) 모서리는 짧은 변에 맞춰 줄인다 — 확대 전 크기 기준이라 배율이 바뀌어도 모양이 같다
        b.style.setProperty('--hl-short', `${Math.min(b.offsetWidth, b.offsetHeight)}px`);
        requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add(cls)));
      });
    }

    let zoomUi = null;
    function updateZoomUi() {
      if (!zoomUi) return;
      zoomUi.querySelector('[data-z="out"]').disabled = v.zoomIdx === 0;
      zoomUi.querySelector('[data-z="in"]').disabled = v.zoomIdx === steps.length - 1;
      zoomUi.querySelector('.zoom-level').textContent = `${v.s}×`;
    }

    if (interactive) {
      zoomUi = document.createElement('div');
      zoomUi.className = CONTENT.zoomSide === 'left' ? 'zoom-controls left' : 'zoom-controls';
      zoomUi.innerHTML = `
        <button type="button" class="zoom-btn" data-z="in" aria-label="${C.zoomIn}">+</button>
        <button type="button" class="zoom-btn" data-z="out" aria-label="${C.zoomOut}">−</button>
        <div class="zoom-level" aria-hidden="true"></div>`;
      el.appendChild(zoomUi);
      zoomUi.addEventListener('pointerdown', (e) => e.stopPropagation());
      zoomUi.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-z]');
        if (!btn || v.locked) return;
        v.zoomUsed++;
        zoomTo(v.zoomIdx + (btn.dataset.z === 'in' ? 1 : -1));
      });
      updateZoomUi();

      // 끌기와 탭 구분: 일정 거리 이상 움직이면 끌기 (탭으로 세지 않음)
      // 손가락이 2개 이상 닿으면(두 손가락 확대 시도 등) 그 동작은 탭으로 세지 않는다
      let press = null;
      const pointers = new Set();
      el.addEventListener('pointerdown', (e) => {
        pointers.add(e.pointerId);
        if (pointers.size > 1) {
          if (press) press.multi = true;
          return;
        }
        if (v.locked || e.button > 0) return;
        el.setPointerCapture(e.pointerId);
        press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now(), tx: v.tx, ty: v.ty, drag: false, multi: false };
      });
      const release = (e) => pointers.delete(e.pointerId);
      el.addEventListener('pointermove', (e) => {
        if (!press || e.pointerId !== press.id) return;
        const dx = e.clientX - press.x;
        const dy = e.clientY - press.y;
        if (!press.drag && Math.hypot(dx, dy) >= CONFIG.DRAG_THRESHOLD_PX) {
          press.drag = true;
          el.classList.add('dragging');
        }
        if (press.drag && v.s > 1) {
          v.tx = press.tx + dx;
          v.ty = press.ty + dy;
          clamp();
          apply(false);
        }
      });
      const end = (e, cancelled) => {
        if (!press || e.pointerId !== press.id) return;
        const p = press;
        press = null;
        el.classList.remove('dragging');
        if (cancelled || p.drag || p.multi || v.locked || !onTap) return;
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        onTap({
          nx: (px - v.tx) / (rect.width * v.s),
          ny: (py - v.ty) / (rect.height * v.s),
          px, py,
          pressMs: Math.round(now() - p.t),
        });
      };
      el.addEventListener('pointerup', (e) => { release(e); end(e, false); });
      el.addEventListener('pointercancel', (e) => { release(e); end(e, true); });
    }

    // (11/2) 디폴트 화면: 그림을 화면에 꽉 채운다 (이전: 작품 전체를 안전 영역 안에).
    // focal = 작품별 중심점(0~1) — 이 점이 화면 가운데에 오도록 해서 잘리는 쪽을 정한다. 작품 전체는 장면 1에서 보여 준다
    // animate: false = 처음 들어올 때 — 1배에서 확대되어 보이지 않게 바로 꽉 찬 화면에서 시작 (11/2, 사용자 확인)
    //          true = 장면 1에서 [이전]으로 돌아올 때 — 확대·이동으로 돌아옴
    function cover(focal, animate = true) {
      fitLayer();
      const { w, h, iw, ih } = size();
      const [fx, fy] = focal || [0.5, 0.4];
      v.cover = focal || [0.5, 0.4]; // 화면 크기가 바뀌면 같은 중심점으로 다시 채운다
      v.framed = false;
      el.classList.remove('framed', 'loupe-on');
      v.stageH = null;
      v.s = Math.max(w / iw, h / ih);
      v.tx = Math.min(0, Math.max(w - iw * v.s, w / 2 - fx * iw * v.s));
      v.ty = Math.min(0, Math.max(h - ih * v.s, h / 2 - fy * ih * v.s));
      el.classList.add('cover');
      stopPan();
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && iw * v.s > w + 1) v.tx = 0; // 이동할 때는 왼쪽 끝에서 시작 (움직임 줄이기 설정이면 중심점에 멈춘 화면)
      apply(animate);
      if (!reduced && iw * v.s > w + 1) {
        // 확대·이동(--t-move)이 끝난 뒤 이동 시작 (처음 들어올 때는 바로)
        pan.timer = setTimeout(() => startPan(w - iw * v.s), animate ? parseFloat(getComputedStyle(el).getPropertyValue('--t-move')) : 0);
      }
    }

    // (11/2) 디폴트 화면 이동 반복: 왼쪽 끝 → 오른쪽 끝 이동(--cover-pan) → 멈춤(--cover-hold)
    //   → 바탕색으로 사라짐(--cover-dissolve) → 왼쪽 끝에서 나타남(--cover-dissolve) → 반복. 그림을 탭하면 멈춤/이어서
    const pan = { raf: 0, timer: 0, t: 0, last: null, paused: false };
    const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2); // 천천히 출발·천천히 멈춤
    function startPan(endX) {
      const css = getComputedStyle(el);
      const PAN = parseFloat(css.getPropertyValue('--cover-pan'));
      const HOLD = parseFloat(css.getPropertyValue('--cover-hold'));
      const FADE = parseFloat(css.getPropertyValue('--cover-dissolve'));
      const CYCLE = PAN + HOLD + FADE * 2;
      layer.classList.remove('animate');
      Object.assign(pan, { t: 0, last: null, paused: false });
      const frame = (now) => {
        if (pan.last != null && !pan.paused) pan.t += now - pan.last;
        pan.last = now;
        const c = pan.t % CYCLE;
        let x = 1;
        let o = 1;
        if (c < PAN) x = easeInOut(c / PAN);
        else if (c < PAN + HOLD) x = 1;
        else if (c < PAN + HOLD + FADE) o = 1 - (c - PAN - HOLD) / FADE;
        else { x = 0; o = (c - PAN - HOLD - FADE) / FADE; }
        v.tx = x * endX;
        layer.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${v.s})`;
        layer.style.opacity = o;
        pan.raf = requestAnimationFrame(frame);
      };
      pan.raf = requestAnimationFrame(frame);
    }
    function stopPan() {
      clearTimeout(pan.timer);
      cancelAnimationFrame(pan.raf);
      pan.raf = 0;
      layer.style.opacity = '';
    }
    el.addEventListener('click', () => { if (v.cover && pan.raf) pan.paused = !pan.paused; });

    // full: 1배 그림 크기를 그림 영역에 맞춘다 (확대·이동 계산은 이 크기 기준)
    function fitLayer() {
      if (!full) return;
      const { iw, ih } = size();
      Object.assign(layer.style, { width: `${iw}px`, height: `${ih}px` });
    }
    fitLayer();

    // (11/2) 돋보기: 액자 장면(장면 1)에서 그림 위에 커서를 올리거나 누르고 있으면 그 주변을 네모 창에 확대. 시연 주소(?preview)에서만 켬
    // 마우스 = 커서 오른쪽 아래(잘리면 뒤집음), 터치 = 손가락에 가리지 않게 손가락 위쪽. 떠 있는 동안 .loupe-on
    const loupeEl = el.querySelector('.loupe');
    if (loupeEl) {
      const paintImg = layer.querySelector('img');
      let touching = false;
      const hide = () => { el.classList.remove('loupe-on'); el.style.cursor = ''; };
      const show = (e) => {
        if (!v.framed) return hide();
        const r = paintImg.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return hide();
        const css = getComputedStyle(el);
        const size = parseFloat(css.getPropertyValue('--loupe-size'));
        const zoom = parseFloat(css.getPropertyValue('--loupe-zoom'));
        const fx = (e.clientX - r.left) / r.width;
        const fy = (e.clientY - r.top) / r.height;
        const bw = r.width * zoom, bh = r.height * zoom;
        const px = e.clientX - box.left, py = e.clientY - box.top;
        let lx, ly; // 돋보기 왼쪽 위
        if (e.pointerType === 'mouse') {
          // (11/2) 커서 오른쪽 아래에 띄우고, 화면 밖으로 잘리면 왼쪽·위쪽으로 뒤집음 (사용자 요청)
          const gap = parseFloat(css.getPropertyValue('--loupe-gap'));
          lx = px + gap + size <= box.width ? px + gap : px - gap - size;
          const floor = v.stageH ?? box.height; // 자막 위까지를 아래 경계로 (자막과 겹치지 않게)
          ly = py + gap + size <= floor ? py + gap : py - gap - size;
        } else {
          // 터치: 손가락에 가리지 않게 손가락 위쪽 가운데
          lx = px - size / 2;
          ly = py - size - parseFloat(css.getPropertyValue('--loupe-lift'));
        }
        lx = Math.min(box.width - size, Math.max(0, lx));
        ly = Math.min((v.stageH ?? box.height) - size, Math.max(0, ly));
        Object.assign(loupeEl.style, {
          left: `${lx}px`, top: `${ly}px`,
          backgroundSize: `${bw}px ${bh}px`,
          backgroundPosition: `${size / 2 - fx * bw}px ${size / 2 - fy * bh}px`,
        });
        el.classList.add('loupe-on');
        el.style.cursor = 'zoom-in'; // (11/2) PC: 그림 위에서 커서가 돋보기 모양
      };
      el.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || touching) show(e); });
      el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { touching = true; show(e); } });
      ['pointerup', 'pointercancel'].forEach((t) => el.addEventListener(t, (e) => { if (e.pointerType !== 'mouse') { touching = false; hide(); } }));
      el.addEventListener('pointerleave', hide);
      el.addEventListener('contextmenu', (e) => { if (v.framed) e.preventDefault(); }); // 길게 누를 때 뜨는 메뉴 막기
    }

    const onResize = () => { if (v.cover) { cover(v.cover); return; } fitLayer(); clamp(); apply(false); };
    window.addEventListener('resize', onResize);

    return {
      el,
      focus,
      cover,
      setHighlights,
      frameBottom: () => (v.framed ? el.getBoundingClientRect().top + v.frameBottom : null), // (11/2) 액자 아래 끝 (화면 기준)
      get zoomUsed() { return v.zoomUsed; },
      lock() { v.locked = true; },
      mark(px, py) {
        const m = document.createElement('div');
        m.className = 'tap-mark';
        m.style.left = `${px}px`;
        m.style.top = `${py}px`;
        el.appendChild(m);
        setTimeout(() => m.remove(), 700);
      },
      destroy() { window.removeEventListener('resize', onResize); stopPan(); },
    };
  }

  // ── 상태 화면 ─────────────────────────────────────────
  function showLoading() {
    render(`<div class="state"><div class="spinner" role="status" aria-label="로딩 중"></div><p>${C.loading}</p></div>`);
  }

  function showError(message, onRetry) {
    render(`<div class="state error"><p>${esc(message)}</p>${onRetry ? `<button class="btn btn-primary" id="retry">${C.retry}</button>` : ''}</div>`);
    if (onRetry) document.getElementById('retry').onclick = onRetry;
  }

  function showMessage(message) {
    render(`<div class="state"><p>${esc(message)}</p></div>`);
  }

  // ── 시작 ──────────────────────────────────────────────
  function preloadImage() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { state.imageTone = imageTone(img); resolve(); };
      img.onerror = reject;
      img.src = CONTENT.image.src;
    });
  }

  // (v2) 작품 전체의 평균 명도로 자막 색을 정한다 — 한 작품 안에서는 고정
  // 계산할 수 없으면(파일로 직접 연 경우 등) 어두운 작품으로 보고 흰 자막
  function imageTone(img) {
    try {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 32, 32);
      const d = ctx.getImageData(0, 0, 32, 32).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return sum / (d.length / 4) / 255 > CONFIG.CAPTION_LIGHT_THRESHOLD ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }

  // phase: main(본 테스트) / beta(수강생 베타) / test(진행자 확인용 — 몇 번이든 가능, 대시보드에서 제외)
  // 그룹: main·beta는 링크를 연 순서대로 A, B 번갈아 배정. test만 ?group=A|B로 직접 지정할 수 있다
  async function boot() {
    // ?art= 에 없는 작품 키가 들어온 링크
    if (!ARTWORK) {
      showError(C.badLink);
      return;
    }
    // 미리보기: 시작 안내·사전 질문을 건너뛰고 해설만 본다. 시트에 배정을 묻거나 기록을 보내지 않는다
    const previewParam = (params.get('preview') || '').toUpperCase();
    // (11/2) ?preview=done: 완료 화면만 예시 결과로 본다 (시트로 보내지 않고 '저장 완료' 상태로 표시)
    if (previewParam === 'DONE') {
      state.preview = true;
      state.participant = { phase: 'preview', group: 'B', started_at: new Date(Date.now() - 395000).toISOString() };
      state.rows = CONTENT.tasks.flatMap((t, k) => [
        ...(t.find ? [{ type: 'find', success: k % 2 ? 0 : 1 }] : []),
        ...(t.meaning ? [{ type: 'meaning', success: k % 3 ? 1 : 0 }] : []),
      ]);
      showDone();
      return;
    }
    // (11/2) ?mode=demo: 서비스 시연 — 동의·사전 질문·퀴즈·저장 없이 디폴트 화면 → 해설 → 끝 화면 (소개 페이지 '시연하러 가기')
    // ?mode=present: 시연과 같은 흐름 + 발표용 (검은 바탕 위에 화면을 창 높이에 꽉 차게)
    const modeParam = params.get('mode');
    if (modeParam === 'demo' || modeParam === 'present') {
      showLoading();
      try {
        await preloadImage();
      } catch {
        showError(C.imageError, boot);
        return;
      }
      state.preview = true; // 돋보기 등 시연 기능 켜기, 시트로 아무것도 보내지 않음
      state.demo = true;
      state.participant = { phase: 'demo', group: 'B' };
      showExplainB();
      return;
    }
    if (['A', 'B'].includes(previewParam)) {
      showLoading();
      try {
        await preloadImage();
      } catch {
        showError(C.imageError, boot);
        return;
      }
      state.preview = true;
      state.participant = { phase: 'preview', group: previewParam };
      if (previewParam === 'A') showCoverA();
      else showExplainB();
      return;
    }

    const phaseParam = params.get('phase');
    const phase = ['beta', 'test'].includes(phaseParam) ? phaseParam : 'main';
    const groupParam = phase === 'test' ? params.get('group') : null;

    if (groupParam !== null && !['A', 'B'].includes(groupParam.toUpperCase())) {
      showError(C.badLink);
      return;
    }
    // 베타는 10/29 20명 완료로 종료 — 베타 링크로 들어오면 안내만 보여 준다 (기록이 섞이지 않게)
    if (phase === 'beta') {
      showMessage(C.betaClosed);
      return;
    }
    if (phase !== 'test' && storage.get(DONE_KEY(phase), false)) {
      showMessage(C.alreadyDone);
      return;
    }

    showLoading();
    try {
      await preloadImage();
    } catch {
      showError(C.imageError, boot);
      return;
    }

    const pid = randomId();
    const { group, method } = groupParam
      ? { group: groupParam.toUpperCase(), method: 'link' }
      : await assignGroup(pid, phase);

    state.participant = {
      participant_id: pid,
      phase,
      group,
      assign_method: method,
      date: today(),
      started_at: '',
      input_type: matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse',
      device_width: window.innerWidth,
      saw_before: '', docent_exp: '', explain_sec: '',
      q1: '', q2: '', q3: '', q3_other: '',
      completed: 0,
      prev_test: '', artwork: CONTENT.artKey,
    };
    Net.flush(); // 이전에 못 보낸 기록이 있으면 먼저 보낸다
    showTestTitle();
  }

  // 실제로 쓴 입력 방식으로 갱신 (마우스/터치)
  document.addEventListener('pointerdown', (e) => {
    if (state.participant && e.pointerType) state.participant.input_type = e.pointerType === 'mouse' ? 'mouse' : 'touch';
  }, { once: true, capture: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) state.leftTab++;
  });

  window.addEventListener('beforeunload', (e) => {
    if (!state.inTest && !Net.queue.length) return;
    e.preventDefault();
    e.returnValue = C.leaveWarn;
  });

  // ⓪ (11/2) 표지: 판화 이미지 가득 + 빈 액자 안 제목. 화면 어디든 탭(클릭)하면 시작 안내로
  function showTestTitle() {
    const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
    const hint = touch ? C.testTitleHintTouch : C.testTitleHintMouse;
    // (11/2) 진행자 확인용 배지: 시작 안내에서 표지 왼쪽 위로 옮김 — 열자마자 A/B 확인. 참가자(main)에게는 안 보임
    const { phase, group } = state.participant;
    const badge = phase === 'test' ? `<span class="badge test-title-badge" aria-hidden="true">진행자 확인용 · ${group}</span>` : '';
    render(`
      <button type="button" class="test-title" id="go" aria-label="${esc(C.testTitleLines.join(' '))}. ${esc(hint)}">
        ${badge}
        <span class="test-title-stage" id="test-title-stage">
          <img src="assets/test_title_museum.webp" alt="" id="test-title-bg" draggable="false">
          <span class="test-title-frame">
            <span class="test-title-heading" role="heading" aria-level="1">${C.testTitleLines.map((l) => `<span>${esc(l)}</span>`).join('')}</span>
            <span class="test-title-hint"><svg class="test-title-play" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor"/></svg><span>${esc(hint)}</span></span>
          </span>
        </span>
        <span class="test-title-status" id="test-title-status" role="status"></span>
      </button>`);
    const stage = document.getElementById('test-title-stage');
    const img = document.getElementById('test-title-bg');
    const loaded = () => stage.classList.add('is-loaded');
    // 로딩: 그림이 오기 전엔 크림 바탕 + 제목·안내만 보임 / 에러: 그대로 시작할 수 있게 안내
    const failed = () => { document.getElementById('test-title-status').textContent = C.testTitleImageError; };
    if (img.complete && img.naturalWidth) loaded();
    else { img.addEventListener('load', loaded); img.addEventListener('error', failed); }
    document.getElementById('go').onclick = showIntro;
  }

  // ① 시작 안내 + 동의
  function showIntro() {
    // 참가자에게는 자기 그룹을 보여 주지 않는다. (11/2) 진행자 확인용 배지는 표지 왼쪽 위로 옮김
    const { phase } = state.participant;
    const badge = phase === 'beta' ? '<span class="badge test-intro-badge">베타</span>' : '';
    // (11/2) 스티플 배경 위: 가운데 정렬 제목(표지와 같은 글꼴) → 설명 → 크림 박스(동의 내용) → 박스 오른쪽 끝에 작은 글자 링크
    render(`
      <section class="screen test-intro">
        <div class="screen-body test-intro-body">
          <header class="test-intro-head">
            ${badge}
            <h1 class="test-intro-title">${esc(C.introTitle)}</h1>
          </header>
          <div class="test-intro-text">
            ${C.introBody.map((lines) => `<p>${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</p>`).join('')}
          </div>
          <div class="test-intro-box">
            <ul>${C.consent.map((li) => `<li>${esc(li).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</li>`).join('')}</ul>
          </div>
          <button type="button" class="test-intro-start" id="go">
            <span>${esc(C.start)}</span>
            <svg class="test-intro-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </section>`);
    document.getElementById('go').onclick = () => {
      state.inTest = true;
      state.participant.started_at = kstIso();
      saveParticipant();
      showPre();
    };
  }

  // ② 사전 질문
  function showPre() {
    const answers = {};
    // (11/2) 시작 안내와 같은 스티플 배경·제목 글꼴, 제목 위치·제목 ↔ 그림 간격도 시작 안내에 맞춤
    render(`
      <section class="screen test-pre">
        <div class="screen-body test-pre-body">
          <h1 class="test-pre-title" aria-label="${esc(C.preTitle)}">${C.preTitleLines.map((l) => `<span>${esc(l)}</span>`).join('')}</h1>
          <figure class="pre-thumb">
            <img src="${CONTENT.image.src}" alt="${esc(CONTENT.image.title)} · ${esc(CONTENT.image.artist)}" draggable="false">
          </figure>
          ${CONTENT.pre.map((q) => `
            <div class="q-block">
              <p class="q">${esc(q.q)}${q.note ? `<span class="q-note">${esc(q.note)}</span>` : ''}</p>
              <div class="options row" data-key="${q.key}">
                ${q.options.map(([val, label]) => `<button type="button" class="option" data-val="${val}" aria-pressed="false">${esc(label)}</button>`).join('')}
              </div>
            </div>`).join('')}
          <button type="button" class="test-intro-start" id="go" disabled>
            <span>${esc(C.next)}</span>
            <svg class="test-intro-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </section>`);
    const go = document.getElementById('go');
    app.querySelectorAll('.options').forEach((group) => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.option');
        if (!btn) return;
        group.querySelectorAll('.option').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        answers[group.dataset.key] = btn.dataset.val;
        go.disabled = CONTENT.pre.some((q) => !answers[q.key]);
      });
    });
    go.onclick = () => {
      Object.assign(state.participant, answers);
      saveParticipant();
      showScenario();
    };
  }

  // (11/2) 화면 전환 디졸브: 바탕색 막 덮기(out) → 머묾(hold, 그 사이 다음 화면 그림) → 걷기(in)
  // 시간은 style.css의 --t-dissolve-* (움직임 줄이기 설정이면 거의 0)
  function dissolveTo(showNext) {
    const css = getComputedStyle(document.documentElement);
    const ms = (name) => parseFloat(css.getPropertyValue(name)) || 0;
    const outMs = ms('--t-dissolve-out'), holdMs = ms('--t-dissolve-hold'), inMs = ms('--t-dissolve-in');
    app.classList.add('is-dark');
    setTimeout(() => {
      app.classList.add('is-lifting');
      showNext(inMs);
      // 다음 화면이 한 번 그려진 뒤 막을 걷는다
      requestAnimationFrame(() => requestAnimationFrame(() => {
        app.classList.remove('is-dark');
        setTimeout(() => app.classList.remove('is-lifting'), inMs);
      }));
    }, outMs + holdMs);
  }

  // ③ 상황 설정
  function showScenario() {
    render(`
      <section class="screen test-scenario">
        <div class="screen-body test-intro-body">
          <h1 class="test-intro-title scenario-in" style="--i: 0">${esc(C.scenarioTitle)}</h1>
          <div class="test-intro-text">
            ${C.scenarioBodyLines.map((lines, n) => `<p class="scenario-in is-body" style="--i: ${n + 1}">${lines.map((l) => `<span>${esc(l)}</span>`).join('')}</p>`).join('')}
          </div>
          <button type="button" class="test-intro-start scenario-in is-body" style="--i: ${C.scenarioBodyLines.length + 1}" id="go" disabled>
            <span>${esc(C.scenarioCta)}</span>
            <svg class="test-intro-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </section>`);
    const go = document.getElementById('go');
    // (11/2) 버튼이 다 떠오른 뒤에만 눌리게 — 움직임 줄이기 설정이면 바로, 혹시 애니메이션이 안 끝나도 5초 뒤엔 풀림
    const enable = () => { go.disabled = false; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) enable();
    else {
      go.addEventListener('animationend', enable, { once: true });
      setTimeout(enable, 5000);
    }
    // (11/2) 바탕색으로 어두워졌다가 다음 화면이 밝아지며 이어짐. 해설 시간은 다 밝아진 뒤부터
    go.onclick = () => {
      go.disabled = true;
      dissolveTo((inMs) => (state.participant.group === 'A' ? showCoverA(inMs) : showExplainB(inMs)));
    };
  }

  function finishExplain(t0) {
    if (state.demo) { showDemoEnd(); return; } // (11/2) 시연 모드: 끝 화면으로
    if (state.preview) {
      // 미리보기: 퀴즈로 넘어가지 않고 해설 처음으로
      if (state.participant.group === 'A') showCoverA();
      else showExplainB();
      return;
    }
    state.participant.explain_sec = round1((now() - t0) / 1000);
    saveParticipant();
    showPractice();
  }

  // ④-A0 (11/2) A 디폴트 화면 — B와 똑같은 첫 화면(그림 꽉 채움 + 작품명 + [들어가기]), 사용자 결정.
  // A는 이 화면에서도 확대·강조 없이 그림만 보여 준다. 해설 시간은 B처럼 이 화면부터 잰다
  function showCoverA(revealMs = 0) {
    const info = Object.fromEntries(CONTENT.image.info);
    render(`
      <section class="screen explain-b is-cover">
        <div id="viewer-slot" class="viewer-slot full"></div>
        <div class="cover-fade" aria-hidden="true"></div>
        <div class="caption-overlay" id="overlay" data-tone="dark">
          <div class="cover-info">
            <h1 class="cover-title">${esc(CONTENT.image.title)}</h1>
            <p class="cover-meta">${esc(info['작가'])} · ${esc(info['연도'])}</p>
          </div>
          <div class="caption-nav">
            <p class="count is-hint">${esc(C.coverHint)}</p>
            <button type="button" class="text-btn is-start" id="next">${C.explainStart}</button>
          </div>
        </div>
      </section>`);
    const viewer = createViewer({ full: true, keepFrame: true });
    document.getElementById('viewer-slot').appendChild(viewer.el);
    const t0 = now() + revealMs;
    requestAnimationFrame(() => viewer.cover(CONTENT.coverFocal, false));
    document.getElementById('next').onclick = () => { viewer.destroy(); showExplainA(0, t0); };
  }

  // ④-A 해설: 그림 전체 + 아래에 글 (스크롤)
  // revealMs: 디졸브로 들어올 때 화면이 다 밝아지기까지 시간 — 해설 시간은 그 뒤부터 잰다
  // startT0: 디폴트 화면에서 넘어올 때 그 화면의 시작 시각 (해설 시간 = 디폴트 화면부터, B와 같게)
  function showExplainA(revealMs = 0, startT0 = null) {
    render(`
      <section class="screen explain-a">
        <div class="screen-body flush" id="scroll">
          <div id="viewer-slot"></div>
          <div class="screen-body flow">
            <h2>${C.explainTitle}</h2>
            <p class="art-meta">${esc(CONTENT.image.title)} · ${esc(CONTENT.image.artist)}</p>
            <div class="explain-text">${CONTENT.explain.map((s) => `<p>${esc(s.text)}</p>`).join('')}</div>
            <div id="end" class="sentinel"></div>
          </div>
        </div>
        <div class="screen-foot foot-col">
          <p class="hint" id="hint">${C.scrollHint}</p>
          <button class="btn btn-primary" id="go" disabled>${C.explainDoneA}</button>
        </div>
      </section>`);
    const viewer = createViewer();
    document.getElementById('viewer-slot').appendChild(viewer.el);
    const t0 = startT0 ?? now() + revealMs;
    const go = document.getElementById('go');
    // B가 문장을 끝까지 넘겨야 하는 것처럼, A도 해설 끝까지 내려야 버튼이 켜진다
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((en) => en.isIntersecting)) return;
      go.disabled = false;
      document.getElementById('hint').hidden = true;
      io.disconnect();
    }, { root: document.getElementById('scroll') });
    io.observe(document.getElementById('end'));
    go.onclick = () => { io.disconnect(); viewer.destroy(); finishExplain(t0); };
  }

  // ④-B 해설: 문장마다 해당 부분으로 확대·이동 + 테두리 + 자막
  // (v2) 그림이 화면 전체를 채우고, 자막·[이전]/[다음]은 그림 위에 글자로 겹친다
  // (v2) 맨 앞 디폴트 화면(i = -1): 작품 전체 + 작품 정보 + 시작 안내, 문장 번호 없음 — 모든 작품 공통 (CLAUDE.md)
  // (11/2) B 자막: 작품 파일의 captionKeep에 적힌 말은 줄이 바뀌지 않게 띄어쓰기를 줄바꿈 없는 공백으로 바꾼다
  // (CSS text-wrap: balance가 줄 길이를 고르게 나누고, 이 목록은 뜻이 끊기는 곳만 보완)
  function keepTogether(text) {
    return (ARTWORK.captionKeep || []).reduce((t, w) => t.split(w).join(w.replace(/ /g, '\u00A0')), text);
  }
  // (11/2) \uC791\uD488 \uD30C\uC77C\uC5D0 lines(\uC0AC\uC6A9\uC790\uAC00 \uC815\uD55C \uC904\uBC14\uAFC8)\uAC00 \uC788\uC73C\uBA74 \uADF8 \uC904\uB300\uB85C \uBCF4\uC5EC \uC900\uB2E4.
  // \uD654\uBA74\uC774 \uC881\uC544 \uD55C \uC904\uC774\uB77C\uB3C4 \uB118\uCE58\uBA74(\uC904 \uC218\uAC00 \uB298\uBA74) \uC815\uD55C \uC904\uBC14\uAFC8\uC744 \uBC84\uB9AC\uACE0 \uAE30\uC874 \uBC29\uC2DD(\uC904 \uAE38\uC774 \uACE0\uB974\uAC8C + captionKeep)\uC73C\uB85C \uB3CC\uC544\uAC10
  function setCaption(step) {
    const cap = document.getElementById('caption');
    cap.hidden = !step;
    if (!step) { cap.textContent = ''; return; }
    if (step.lines && step.lines.length) {
      cap.textContent = step.lines.join('\n');
      cap.classList.add('has-lines');
      const lh = parseFloat(getComputedStyle(cap).lineHeight);
      if (lh && cap.getBoundingClientRect().height <= lh * step.lines.length + 1) return;
    }
    cap.classList.remove('has-lines');
    cap.textContent = keepTogether(step.text);
  }

  function showExplainB(revealMs = 0) {
    const steps = CONTENT.explain;
    let i = -1;
    // (11/2) 디폴트 화면 작품 정보: 작품명 크게 + "작가 · 연도" 한 줄 (소장처는 뺌 — 미술관 안에서 보므로. 출처는 끝 화면 credit)
    const info = Object.fromEntries(CONTENT.image.info);
    render(`
      <section class="screen explain-b">
        <div id="viewer-slot" class="viewer-slot full"></div>
        <div class="cover-fade" aria-hidden="true"></div>
        <p class="loupe-hint" id="loupe-hint" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"/></svg><span>${esc(matchMedia('(pointer: coarse)').matches ? C.loupeHintTouch : C.loupeHintMouse)}</span></p>
        <div class="caption-overlay" id="overlay" aria-live="polite">
          <div class="cover-info" id="cover-info">
            <h1 class="cover-title">${esc(CONTENT.image.title)}</h1>
            <p class="cover-meta">${esc(info['작가'])} · ${esc(info['연도'])}</p>
          </div>
          <p class="caption-text" id="caption"></p>
          <div class="caption-nav">
            <p class="count" id="count"></p>
            <button type="button" class="text-btn" id="prev">${C.explainPrev}</button>
            <button type="button" class="text-btn" id="next"></button>
          </div>
        </div>
      </section>`);
    // (11/2) 돋보기 안내: 시연 + 액자 있는 작품의 그림 전체 장면에서만, 그 장면에 있는 동안 계속 보임 (이전: 한 번 쓰면 숨김 → 사용자 요청으로 변경)
    let hintTimer = 0;
    const hint = document.getElementById('loupe-hint');
    // (11/2) 장면 2 이후에도 액자 유지(어둡게) — 시연·본 테스트 모두 (사용자 결정). 돋보기만 시연에서만
    const viewer = createViewer({ minimap: true, full: true, loupe: state.preview, keepFrame: true }); // 돋보기는 시연(preview)에서만 — 본 테스트 B에는 넣지 않음 (11/2 사용자 결정)
    document.getElementById('viewer-slot').appendChild(viewer.el);
    const overlay = document.getElementById('overlay');
    const prev = document.getElementById('prev');
    const next = document.getElementById('next');
    const t0 = now() + revealMs;

    let firstShow = true; // 처음 그리는 디폴트 화면은 확대 애니메이션 없이
    function show() {
      const isCover = i < 0;
      document.getElementById('cover-info').hidden = !isCover;
      overlay.parentElement.classList.toggle('is-cover', isCover); // 디폴트 화면 아래 그라데이션
      const count = document.getElementById('count');
      count.textContent = isCover ? C.coverHint : `${i + 1} / ${steps.length}`;
      count.classList.toggle('is-hint', isCover);
      setCaption(isCover ? null : steps[i]);
      const f = !isCover && steps[i].focus;
      hint.hidden = !(state.preview && CONTENT.image.frame && f && f[0] <= 0 && f[1] <= 0 && f[2] >= 1 && f[3] >= 1);
      // (11/2) 액자가 자리를 잡는 확대·이동이 끝난 뒤에 안내가 디졸브로 나타남 (먼저 자리 잡고 있지 않게 — 사용자 요청)
      clearTimeout(hintTimer);
      hint.classList.add('is-waiting');
      if (!hint.hidden) hintTimer = setTimeout(() => hint.classList.remove('is-waiting'), parseFloat(getComputedStyle(hint).getPropertyValue('--t-move')) || 0);
      prev.hidden = isCover;
      prev.disabled = isCover;
      next.textContent = isCover ? C.explainStart : i === steps.length - 1 ? C.explainDoneB : C.explainNext;
      next.classList.toggle('is-start', isCover); // 디폴트 화면에서는 강조 버튼 모양 (10/31)
      const stageH = overlay.offsetTop - parseFloat(getComputedStyle(overlay).getPropertyValue('--caption-gap'));
      if (isCover) {
        viewer.cover(CONTENT.coverFocal, !firstShow);
        firstShow = false;
        viewer.setHighlights(null);
        overlay.dataset.tone = 'dark'; // 검은 공간 위 → 흰 글씨
        return;
      }
      const step = steps[i];
      // 대상은 자막 위쪽 공간에 오게 한다
      // (11/2) 돋보기 안내가 보이면 그 높이만큼 비워 두고 액자를 놓는다 (좁은 화면에서 안내가 액자에 닿지 않게)
      const hintGap = parseFloat(getComputedStyle(hint).getPropertyValue('--loupe-hint-gap'));
      const s = viewer.focus(step.focus, step.highlight, hint.hidden ? stageH : stageH - hint.offsetHeight - hintGap * 2, step.maxScale);
      // (11/2) 돋보기 안내를 액자 바로 아래에 (자막과는 겹치지 않게)
      // 안내는 자막 칸 밖(화면 기준)에 두고 액자 아래 끝 + 간격에 놓는다. 자막 칸 위치는 장면이 바뀐 뒤에도 잠시 움직여 기준으로 쓰지 않음
      if (!hint.hidden) {
        const fb = viewer.frameBottom();
        if (fb !== null) hint.style.top = `${fb - hint.parentElement.getBoundingClientRect().top + hintGap}px`;
      }
      // 1배(검은 공간 위)는 항상 흰 자막, 확대 화면은 작품 명도에 따라 고정 (A안, 10/30)
      // (10/31) 강조가 주변을 어둡게 하므로 자막은 늘 어두운 바탕 위 → 크림 글씨
      overlay.dataset.tone = 'dark';
      viewer.setHighlights(step.highlight, 'show', step.spot);
    }
    prev.onclick = () => { if (i > -1) { i--; show(); } };
    next.onclick = () => {
      if (i < steps.length - 1) { i++; show(); return; }
      viewer.destroy();
      finishExplain(t0);
    };
    requestAnimationFrame(show);
  }

  // ⑤ 확대 연습 (기록하지 않음)
  function showPractice() {
    render(`
      <section class="screen theme-cream practice">
        <div class="practice-head">
          <h1 class="test-intro-title">${esc(C.practiceTitle)}</h1>
          <p class="practice-text">${esc(C.practiceBody)}</p>
        </div>
        <div id="viewer-slot" class="viewer-slot fit"></div>
        <div class="screen-foot"><button class="btn btn-primary" id="go">${C.practiceCta}</button></div>
      </section>`);
    const viewer = createViewer({ interactive: true, onTap: () => {} });
    document.getElementById('viewer-slot').appendChild(viewer.el);
    document.getElementById('go').onclick = () => { viewer.destroy(); showQuizIntro(); };
  }

  // ⑤-1 (v2) 문제 시작 안내 — 베타 피드백 "퀴즈가 갑자기 시작돼 당황" (A·B 공통)
  function showQuizIntro() {
    const nFind = CONTENT.tasks.filter((t) => t.find).length;
    const nMeaning = CONTENT.tasks.filter((t) => t.meaning).length;
    render(`
      <section class="screen theme-cream quiz-intro">
        <div class="screen-body">
          <h1 class="test-intro-title">${esc(C.quizIntroTitle)}</h1>
          <p class="quiz-count">${esc(C.quizIntroCount(nFind + nMeaning, nFind, nMeaning))}</p>
          <div class="card">
            <ul class="sub">${C.quizIntroRules.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="screen-foot foot-col quiz-intro-foot">
          <p class="foot-hint">${esc(C.quizIntroReady)}</p>
          <button class="btn btn-primary" id="go">${C.quizIntroCta}</button>
        </div>
      </section>`);
    document.getElementById('go').onclick = runTasks;
  }

  // ⑥ 과업
  function runTasks() {
    const steps = [];
    CONTENT.tasks.forEach((t) => {
      if (t.find) steps.push({ task: t, type: 'find' });
      if (t.meaning) steps.push({ task: t, type: 'meaning' });
    });
    let idx = 0;
    const nextStep = () => {
      idx++;
      if (idx < steps.length) runStep(steps[idx], idx, steps.length, nextStep);
      else showSurvey();
    };
    runStep(steps[0], 0, steps.length, nextStep);
  }

  function baseRow(task, type) {
    const p = state.participant;
    return {
      row_id: `${p.participant_id}-${task.id}-${type}`,
      participant_id: p.participant_id,
      phase: p.phase,
      group: p.group,
      task: task.id,
      type,
      task_kind: task.kind,
      success: 0, found: '', task_sec: '', wrong_taps: '', zoom_used: '', press_ms: '', left_tab: 0, answer: '', fail_reason: '', answer_changes: '',
    };
  }

  function topBar(label, i, total, prompt) {
    return `
      <div class="top">
        <div class="progress" aria-hidden="true"><span style="width:${(i / total) * 100}%"></span></div>
        <div class="top-row">
          <p class="tag">${label} · ${i + 1} / ${total}</p>
          <p class="timer" id="timer" aria-live="off"></p>
        </div>
        <p class="prompt">${esc(prompt)}</p>
      </div>`;
  }

  // 제한 시간: 마지막 몇 초만 표시, 다 되면 onTimeout
  function startTimer(onTimeout) {
    const t0 = now();
    const el = document.getElementById('timer');
    const limit = CONFIG.TIME_LIMIT_SEC * 1000;
    const id = setInterval(() => {
      const remain = limit - (now() - t0);
      if (remain <= CONFIG.SHOW_TIMER_SEC * 1000 && el) el.textContent = C.timeLeft(Math.max(0, Math.ceil(remain / 1000)));
      if (remain <= 0) { clearInterval(id); onTimeout(); }
    }, 200);
    return { stop: () => clearInterval(id), elapsed: () => (now() - t0) / 1000 };
  }

  function runStep(step, i, total, done) {
    if (step.type === 'find') runFind(step.task, i, total, done);
    else runMeaning(step.task, i, total, done);
  }

  function runFind(task, i, total, done) {
    render(`
      <section class="screen theme-cream">
        ${topBar(C.findLabel, i, total, task.find.prompt)}
        <div id="viewer-slot" class="viewer-slot fit"></div>
        <div class="screen-foot"><button class="btn btn-ghost" id="giveup">${C.giveUp}</button></div>
      </section>`);
    const row = baseRow(task, 'find');
    let wrong = 0;
    let finished = false;
    state.leftTab = 0;

    const viewer = createViewer({ interactive: true, onTap });
    document.getElementById('viewer-slot').appendChild(viewer.el);
    const timer = startTimer(() => finish('timeout'));

    function onTap({ nx, ny, px, py, pressMs }) {
      if (finished) return;
      const hit = task.find.regions.find((r) => inRegion(nx, ny, r));
      if (hit) {
        viewer.setHighlights([hit], 'found');
        toast(viewer.el, C.found, 'success');
        finish('found', pressMs);
      } else {
        wrong++;
        viewer.mark(px, py);
        toast(viewer.el, C.wrongTap, '', 600);
      }
    }

    function finish(result, pressMs) {
      if (finished) return;
      finished = true;
      timer.stop();
      viewer.lock();
      const found = result === 'found';
      Object.assign(row, {
        found: found ? 1 : 0,
        success: found && wrong === 0 ? 1 : 0,
        task_sec: result === 'timeout' ? CONFIG.TIME_LIMIT_SEC : round1(timer.elapsed()),
        wrong_taps: wrong,
        zoom_used: viewer.zoomUsed,
        press_ms: found ? pressMs : '',
        left_tab: state.leftTab,
        fail_reason: found ? (wrong > 0 ? 'wrong' : '') : (result === 'timeout' ? 'timeout' : 'gave_up'),
      });
      saveTaskRow(row);
      const next = () => { viewer.destroy(); done(); };
      if (found) {
        // 찾으면 자동으로 넘기지 않고 [다음]을 누르게 한다 (같은 대상이 여러 개일 때 이어서 누른 탭이 다음 화면에 눌리는 것 방지)
        const foot = app.querySelector('.screen-foot');
        foot.innerHTML = `<button class="btn btn-primary" id="next">${C.next}</button>`;
        document.getElementById('next').onclick = next;
        return;
      }
      if (result === 'timeout') toast(viewer.el, C.timeout, '', 1600);
      setTimeout(next, result === 'timeout' ? 1600 : 0);
    }

    document.getElementById('giveup').onclick = () => finish('gave_up');
  }

  function runMeaning(task, i, total, done) {
    const m = task.meaning;
    render(`
      <section class="screen theme-cream">
        ${topBar(C.meaningLabel, i, total, m.prompt)}
        <div class="screen-body tight">
          <div class="options" id="opts">
            ${m.options.map((o, k) => `<button type="button" class="option" data-k="${k + 1}" aria-pressed="false"><span class="num">${k + 1}</span>${esc(o)}</button>`).join('')}
          </div>
        </div>
        <div class="screen-foot">
          <button class="btn btn-ghost" id="giveup">${C.giveUp}</button>
          <button class="btn btn-primary" id="next" disabled>${C.next}</button>
        </div>
      </section>`);
    const row = baseRow(task, 'meaning');
    let finished = false;
    let choice = null;
    let changes = 0;
    state.leftTab = 0;
    const screen = app.querySelector('.screen');
    const next = document.getElementById('next');
    const timer = startTimer(() => finish(null, 'timeout'));

    // 시간은 [다음]을 누른 순간까지. 시간 초과·모르겠어요는 고르던 보기가 있어도 답 없음으로 기록
    function finish(answer, reason) {
      if (finished) return;
      finished = true;
      timer.stop();
      const correct = answer === m.answer;
      Object.assign(row, {
        success: correct ? 1 : 0,
        task_sec: reason === 'timeout' ? CONFIG.TIME_LIMIT_SEC : round1(timer.elapsed()),
        left_tab: state.leftTab,
        answer: answer || '',
        fail_reason: correct ? '' : reason,
        answer_changes: changes,
      });
      saveTaskRow(row);
      if (reason === 'timeout') toast(screen, C.timeout, '', 1600);
      setTimeout(done, reason === 'timeout' ? 1600 : 250);
    }

    // 보기를 고르면 [다음]이 켜진다. [다음]을 누르기 전까지는 다른 보기로 바꿀 수 있다
    document.getElementById('opts').addEventListener('click', (e) => {
      const btn = e.target.closest('.option');
      if (!btn || finished) return;
      const k = Number(btn.dataset.k);
      if (choice !== null && choice !== k) changes++;
      choice = k;
      app.querySelectorAll('#opts .option').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      next.disabled = false;
    });
    next.onclick = () => finish(choice, 'wrong');
    document.getElementById('giveup').onclick = () => finish(null, 'gave_up');
  }

  // ⑦ 사후 설문
  function showSurvey() {
    const S = CONTENT.survey;
    const a = { q1: '', q2: '', q3: '', q3_other: '' };
    const optionList = (key, options) => options.map((o) => `<button type="button" class="option" data-q="${key}" data-val="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('');
    render(`
      <section class="screen theme-cream">
        <div class="screen-body">
          <h2>${C.surveyTitle}</h2>
          <div class="q-block">
            <p class="q">1. ${esc(S.q1.q)}</p>
            <div class="likert">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="option" data-q="q1" data-val="${n}" aria-pressed="false">${n}</button>`).join('')}</div>
            <div class="likert-labels"><span>1 ${esc(S.q1.low)}</span><span>5 ${esc(S.q1.high)}</span></div>
          </div>
          <div class="q-block">
            <p class="q">2. ${esc(S.q2.q)}</p>
            <div class="options">${optionList('q2', S.q2.options)}</div>
          </div>
          <div class="q-block" id="q3" hidden>
            <p class="q">3. ${esc(S.q3.q)}</p>
            <div class="options">${optionList('q3', S.q3.options)}</div>
            <input class="text-input" id="q3-other" type="text" maxlength="200" placeholder="${C.otherPlaceholder}" hidden>
          </div>
        </div>
        <div class="screen-foot"><button class="btn btn-primary" id="go" disabled>${C.submit}</button></div>
      </section>`);
    const go = document.getElementById('go');
    const q3Block = document.getElementById('q3');
    const other = document.getElementById('q3-other');

    const valid = () => a.q1 && a.q2 && (a.q2 === S.q2.none || (a.q3 && (a.q3 !== S.q3.other || a.q3_other.trim())));
    const refresh = () => {
      q3Block.hidden = !a.q2 || a.q2 === S.q2.none;
      other.hidden = a.q3 !== S.q3.other;
      go.disabled = !valid();
    };

    app.querySelector('.screen-body').addEventListener('click', (e) => {
      const btn = e.target.closest('.option');
      if (!btn) return;
      const q = btn.dataset.q;
      app.querySelectorAll(`.option[data-q="${q}"]`).forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      a[q] = btn.dataset.val;
      refresh();
    });
    other.addEventListener('input', () => { a.q3_other = other.value; refresh(); });

    go.onclick = () => {
      const skipQ3 = a.q2 === S.q2.none;
      Object.assign(state.participant, {
        q1: a.q1,
        q2: a.q2,
        q3: skipQ3 ? '' : a.q3,
        q3_other: !skipQ3 && a.q3 === S.q3.other ? a.q3_other.trim() : '',
        completed: 1,
      });
      saveParticipant();
      state.inTest = false;
      if (state.participant.phase !== 'test') storage.set(DONE_KEY(state.participant.phase), true);
      showDone();
    };
  }

  // ⑧ 완료: 저장 상태(크게 강조) + 내 결과
  // 결과를 보는 동안 남은 기록이 스프레드시트로 전송된다. 정답 자체는 다른 참가자를 위해 보여 주지 않는다
  // (11/2) 시연 모드 끝 화면 — 완료 화면과 같은 바다 판화 배경. 저장·점수 없이 다시 보기 + 다른 작품 + 출처
  function showDemoEnd() {
    const others = Object.keys(ARTWORKS).filter((k) => k !== CONTENT.artKey);
    const otherUrl = (k) => {
      const q = new URLSearchParams(location.search);
      q.set('art', k);
      return `?${q.toString()}`;
    };
    render(`
      <section class="screen test-done demo-end">
        <div class="screen-body">
          <h1 class="test-intro-title done-title" aria-label="${esc(C.demoEndTitle)}">${C.demoEndTitleLines.map((l) => `<span>${esc(l)}</span>`).join('')}</h1>
          <p class="demo-end-text">${esc(C.demoEndBody)}</p>
          <div class="demo-end-actions">
            <button type="button" class="btn btn-primary" id="replay">${esc(C.demoReplay)}</button>
            ${others.map((k) => `<a class="demo-end-link" href="${esc(otherUrl(k))}">${esc(C.demoOtherArt)} · ${esc(ARTWORKS[k].image.title)}</a>`).join('')}
          </div>
          <p class="done-credit">${esc(CONTENT.image.credit)}</p>
        </div>
      </section>`);
    document.getElementById('replay').onclick = () => showExplainB();
  }

  function showDone() {
    const rows = state.rows;
    const ofType = (type) => rows.filter((r) => r.type === type);
    const correct = (arr) => arr.filter((r) => r.success === 1).length;
    const find = ofType('find');
    const meaning = ofType('meaning');
    const totalSec = Math.max(0, Math.round((Date.now() - new Date(state.participant.started_at).getTime()) / 1000));
    const score = rows.length ? `
      <div class="score-card">
        <p class="score-main"><strong>${correct(rows)}</strong> / ${rows.length}${C.scoreUnit}</p>
        <div class="score-grid">
          <div><span class="sub">${C.scoreFind}</span><strong>${correct(find)} / ${find.length}</strong></div>
          <div><span class="sub">${C.scoreMeaning}</span><strong>${correct(meaning)} / ${meaning.length}</strong></div>
          <div><span class="sub">${C.scoreTime}</span><strong>${Math.floor(totalSec / 60)}분 ${totalSec % 60}초</strong></div>
        </div>
        <p class="sub">${esc(C.scoreNote)}</p>
      </div>` : '';
    render(`
      <section class="screen test-done">
        <div class="screen-body">
          <div class="save-banner" id="banner" role="status" aria-live="assertive">
            <div class="save-head"><span class="spinner small" id="spin"></span><strong id="banner-title"></strong></div>
            <p id="banner-body"></p>
            <div class="progress" id="save-progress"><span></span></div>
          </div>
          <h1 class="test-intro-title done-title" aria-label="${esc(C.doneTitle)}">${C.doneTitleLines.map((l) => `<span>${esc(l)}</span>`).join('')}</h1>
          ${score}
          <div id="actions" class="options"></div>
          <p class="done-credit">${esc(CONTENT.image.credit)}</p>
        </div>
      </section>`);
    const banner = document.getElementById('banner');
    const actions = document.getElementById('actions');
    const bar = document.querySelector('#save-progress > span');

    function setBanner(kind, title, body) {
      banner.className = `save-banner ${kind}`;
      document.getElementById('banner-title').textContent = title;
      document.getElementById('banner-body').textContent = body;
      document.getElementById('spin').hidden = kind !== 'saving';
      document.getElementById('save-progress').hidden = kind !== 'saving';
    }
    const updateProgress = () => {
      const total = Net.sent + Net.queue.length;
      bar.style.width = `${total ? (Net.sent / total) * 100 : 100}%`;
    };

    const downloadBtn = () => {
      const b = document.createElement('button');
      b.className = 'btn btn-secondary';
      b.textContent = C.download;
      b.onclick = () => {
        const pid = state.participant.participant_id;
        downloadCsv(`participants_${pid}.csv`, toCsv(P_COLS, [state.participant]));
        setTimeout(() => downloadCsv(`tasks_${pid}.csv`, toCsv(T_COLS, state.rows)), 300);
      };
      return b;
    };

    if (!state.rows.length) {
      setBanner('info', C.emptyTitle, C.empty);
      return;
    }
    if (!CONFIG.SHEET_URL) {
      setBanner('info', C.localModeTitle, C.localMode);
      actions.appendChild(downloadBtn());
      return;
    }

    if (state.preview) { setBanner('ok', C.savedTitle, C.saved); return; } // 미리보기: 보내지 않음

    Net.onProgress = updateProgress;
    const trySend = async () => {
      actions.innerHTML = '';
      setBanner('saving', C.savingTitle, C.saving);
      updateProgress();
      const ok = await Net.flush();
      if (ok) {
        setBanner('ok', C.savedTitle, C.saved);
        return;
      }
      setBanner('err', C.saveErrorTitle, C.saveError);
      const resend = document.createElement('button');
      resend.className = 'btn btn-primary';
      resend.textContent = C.resend;
      resend.onclick = trySend;
      actions.append(resend, downloadBtn());
    };
    trySend();
  }

  // (11/2) ?sim=iphone: 아이폰 안전 영역 흉내 (보드·조정 패널 캡처용, style.css .sim-iphone)
  if (new URLSearchParams(location.search).get('sim') === 'iphone') document.documentElement.classList.add('sim-iphone');
  // (11/2) ?sim=bar: 꽉 채운 화면 그대로, 위치 지도만 상태 표시줄 아래로 (보드 캡처용, style.css .sim-bar)
  if (new URLSearchParams(location.search).get('sim') === 'bar') document.documentElement.classList.add('sim-bar');
  // (11/2) ?mode=present: 발표 모드 — 402×874 화면을 창 높이에 꽉 차게 키움 (틀 테두리 없음, 바깥은 검정)
  if (new URLSearchParams(location.search).get('mode') === 'present') {
    document.documentElement.classList.add('mode-present');
    const fit = () => {
      const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-h')) || 874;
      document.getElementById('app').style.zoom = String(window.innerHeight / h);
    };
    fit();
    window.addEventListener('resize', fit);
  }
  boot();
})();
