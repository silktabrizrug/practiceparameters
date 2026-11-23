/* PRACTICE // PARAMETERS — renders everything from /data/*.json.
   Nothing in here needs editing to update the dashboard: change the data files. */
(() => {
  'use strict';

  const FILES = ['site', 'projects', 'applications', 'longterm', 'exhibitions', 'progress', 'texts', 'people', 'references'];
  const D = {};
  const state = { focus: null, type: 'application', showAll: false, showPast: false };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (u && /^(https?:)?\/\//.test(u)) || (u && /^(assets|data)\//.test(u)) ? u : null;
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- dates ---------- */
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const parse = (s) => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const daysUntil = (s) => { const d = parse(s); return d ? Math.round((d - today()) / 864e5) : null; };
  const tLabel = (n) => n == null ? '—' : n === 0 ? 'TODAY' : n > 0 ? `T–${n}` : `T+${-n}`;
  const OPEN = ['to-review', 'interested', 'applying'];
  const effStatus = (it) => {
    const n = daysUntil(it.date);
    return n != null && n < 0 && OPEN.includes(it.status) ? 'missed' : it.status;
  };

  /* ---------- load ---------- */
  async function load() {
    const res = await Promise.all(FILES.map((f) => fetch(`data/${f}.json`, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`data/${f}.json → ${r.status}`);
      return r.json();
    })));
    FILES.forEach((f, i) => { D[f] = res[i]; });
  }

  /* ---------- header ---------- */
  function renderHead() {
    const s = D.site;
    $('#title').textContent = `# ${s.title}`;
    $('#subtitle').textContent = s.subtitle;
    $('#footer').textContent = s.footer;
    $('#tagline').textContent = s.tagline;
    $('#topicCount').textContent = s.topics.length;
    $('#topicLegend').innerHTML = s.topics.map((t, i) =>
      `<li><button data-focus="${esc(t.id)}"><kbd>${i + 1}</kbd>${esc(t.id)} ${esc(t.name)}</button></li>`).join('');
    const ed = $$('.edit');
    const repoOk = s.repo && !s.repo.startsWith('OWNER/');
    ed.forEach((a) => {
      if (!repoOk) { a.hidden = true; return; }
      a.href = `https://github.com/${s.repo}/edit/${s.branch || 'main'}/data/${a.dataset.file}`;
      a.target = '_blank'; a.rel = 'noopener';
    });
    tickConfig();
  }

  function tickConfig() {
    const s = D.site, now = new Date();
    const up = upcoming('application')[0];
    let nextLine = 'NEXT: —';
    if (up) {
      const end = parse(up.date); end.setHours(23, 59, 59);
      let ms = Math.max(0, end - now);
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5); ms -= h * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      nextLine = `NEXT: T–${d}d ${pad(h)}:${pad(m)}:${pad(Math.floor(ms / 1e3))}`;
    }
    $('#config').textContent =
      `[CONFIG.PRACTICE] /* STUDIO */ = {\nARTIST: ${s.artist}\nMODE: ACTIVE // ${D.projects.items.length} MODULES\nUPDATED: ${(D.applications.updated || '').replace(/-/g, '.')}\n${nextLine}`;
  }

  /* ---------- map ---------- */
  const nodes = () => [
    ...D.projects.items.map((p) => ({ ...p, kind: 'px', label: `${p.key} · ${p.name}`, meta: p.state ? `state: ${p.state}` : 'state: [—]' })),
    ...D.site.topics.map((t) => ({ ...t, kind: 'tx', label: t.name, meta: null })),
  ];

  function renderMap() {
    const wrap = $('#callouts');
    wrap.innerHTML = nodes().map((n) => {
      const link = safeUrl(n.link);
      return `<div class="callout ${n.kind}" data-node="${esc(n.id)}" style="left:${n.pos[0]}%;top:${n.pos[1]}%">
        <button class="cbtn" data-focus="${esc(n.id)}" aria-pressed="false"><span class="box"></span><span class="lab">${esc(n.label)}</span></button>
        ${n.meta || link ? `<span class="meta">${n.meta ? esc(n.meta) : ''}${link ? `${n.meta ? ' · ' : ''}<a href="${esc(link)}" target="_blank" rel="noopener">figma ↗</a>` : ''}</span>` : ''}
        <span class="cid">${esc(n.id)}</span>
      </div>`;
    }).join('');
    drawWires();
  }

  function drawWires() {
    const map = $('#map'), svg = $('#wires'), hub = $('#hub');
    const mr = map.getBoundingClientRect(), hr = hub.getBoundingClientRect();
    const hx = hr.left - mr.left - 6, hy = hr.top - mr.top + hr.height / 2;
    const pt = (id) => {
      const el = $(`[data-node="${id}"] .box`); if (!el) return null;
      const r = el.getBoundingClientRect();
      return [r.left - mr.left + r.width, r.top - mr.top];
    };
    let out = '';
    nodes().forEach((n) => {
      const p = pt(n.id); if (!p) return;
      out += `<line data-a="${n.id}" x1="${p[0]}" y1="${p[1]}" x2="${hx}" y2="${hy}"/>`;
    });
    D.projects.items.forEach((p) => (p.topics || []).forEach((t) => {
      const a = pt(p.id), b = pt(t); if (!a || !b) return;
      out += `<line class="link" data-a="${p.id}" data-b="${t}" x1="${a[0] - 8}" y1="${a[1] + 8}" x2="${b[0] - 8}" y2="${b[1] + 8}"/>`;
    }));
    svg.setAttribute('viewBox', `0 0 ${mr.width} ${mr.height}`);
    svg.innerHTML = out;
    applyFocus();
  }

  /* dither core: pixels that drift, flicker, and flee the cursor */
  function startCore() {
    const cv = $('#core'), ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W, H, dpr, px = [], mouse = { x: -1e4, y: -1e4 };
    const G = 8;
    function seed() {
      dpr = window.devicePixelRatio || 1;
      const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = W * 0.46, cy = H * 0.5, R = Math.min(W, H) * 0.24;
      const n = Math.round(Math.min(340, Math.max(120, (R * R) / 110)));
      px = Array.from({ length: n }, () => {
        const a = Math.random() * Math.PI * 2, rr = Math.pow(Math.random(), 0.62) * R;
        const hx = Math.round((cx + Math.cos(a) * rr * 1.15) / G) * G, hy = Math.round((cy + Math.sin(a) * rr) / G) * G;
        return { hx, hy, x: hx, y: hy, s: Math.random() < 0.5 ? 6 : 8, on: true, g: Math.random() };
      });
    }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      const focus = !!state.focus;
      for (const p of px) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 9000) { const f = (9000 - d2) / 9000 * 6; const d = Math.sqrt(d2) || 1; p.x += dx / d * f; p.y += dy / d * f; }
        p.x += (p.hx - p.x) * 0.06; p.y += (p.hy - p.y) * 0.06;
        if (!reduce && Math.random() < 0.004) p.on = !p.on;
        if (!p.on) continue;
        ctx.fillStyle = focus && p.g < 0.35 ? '#3358FF' : '#1E1E1E';
        ctx.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, p.s, p.s);
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    $('#map').addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; if (reduce) frame(); });
    $('#map').addEventListener('pointerleave', () => { mouse = { x: -1e4, y: -1e4 }; });
    seed(); frame();
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { seed(); drawWires(); if (reduce) frame(); }, 120); });
  }

  /* ---------- short-term ---------- */
  const ofType = (it, type) => type === 'all' || it.type === type;
  function upcoming(type) {
    return D.applications.items
      .filter((it) => ofType(it, type) && it.date && daysUntil(it.date) >= 0 && !['not-for-me', 'rejected'].includes(it.status))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  const topicsAttr = (it) => esc([...(it.topics || []), ...(it.projects || [])].join(' '));

  function renderNext() {
    const list = upcoming(state.type), top = list.slice(0, 3);
    $('#next').innerHTML = top.length ? top.map((it, i) => {
      const [y, m, d] = it.date.split('-'); const n = daysUntil(it.date);
      return `<li data-topics="${topicsAttr(it)}">
        <button class="row" aria-expanded="false">
          <span class="lhs">NEXT_${i + 1} =</span>
          <span class="date"><span class="yy">${y}.</span><span class="md">${m}.${d}</span></span>
          <span class="rhs"><span class="nm">// ${esc(it.name.toUpperCase())}</span><span class="tm">${tLabel(n)} · ${esc(it.dateLabel || '')}</span></span>
        </button>
        <div class="detail">${detailHTML(it)}</div>
      </li>`;
    }).join('') : `<li class="empty">// no upcoming ${state.type === 'all' ? 'items' : state.type + 's'} with a date</li>`;
    const rest = D.applications.items.filter((it) => ofType(it, state.type)).length - top.length;
    const more = $('#moreBtn');
    more.textContent = `${state.showAll ? '–' : '+'} ${rest} more → ${state.showAll ? 'hide' : 'show'} all parameters`;
    more.setAttribute('aria-expanded', String(state.showAll));
    $$('#next .row').forEach((b) => b.addEventListener('click', () => {
      const li = b.parentElement; const open = li.classList.toggle('open'); b.setAttribute('aria-expanded', String(open));
    }));
    applyFocus();
  }

  function detailHTML(it) {
    const row = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
    const link = safeUrl(it.link);
    return `<dl>
      ${row('STATUS', esc(effStatus(it).toUpperCase()))}
      ${row('WHERE', esc(it.where))}
      ${row('MONEY', esc(it.money))}
      ${row('NOTES', esc(it.notes))}
      ${row('TOPICS', esc((it.topics || []).join(' · ')))}
      ${row('LINK', link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(it.source || link)}</a>` : '')}
    </dl>`;
  }

  function renderTable() {
    const sec = $('#allParams'); sec.hidden = !state.showAll;
    if (!state.showAll) return;
    const rows = D.applications.items
      .filter((it) => ofType(it, state.type))
      .filter((it) => state.showPast || !(it.date && daysUntil(it.date) < 0))
      .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    $('#allTable tbody').innerHTML = rows.map((it) => {
      const n = daysUntil(it.date), st = effStatus(it), link = safeUrl(it.link);
      return `<tr class="${n != null && n < 0 ? 'past' : ''}" data-topics="${topicsAttr(it)}">
        <td class="n">${it.date ? esc(it.date.replace(/-/g, '.')) : '—'}</td>
        <td class="n">${tLabel(n)}</td>
        <td>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(it.name)}</a>` : esc(it.name)}</td>
        <td>${esc(it.type)}</td>
        <td>${esc(it.where || '')}</td>
        <td><span class="pill ${esc(st)}">${esc(st)}</span></td>
        <td>${esc((it.topics || []).join(' '))}</td></tr>`;
    }).join('') || `<tr><td colspan="7" class="empty">nothing here</td></tr>`;
    applyFocus();
  }


  /* ---------- exhibitions ---------- */
  function renderExhibition() {
    const items = [...D.exhibitions.items].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const next = items.find((e) => e.date && daysUntil(e.date) >= 0) || items[items.length - 1];
    const past = items.filter((e) => e !== next && e.date && daysUntil(e.date) < 0).reverse();
    if (!next) { $('#exhibition').innerHTML = '<p class="empty">// no exhibition planned yet</p>'; return; }
    const [y, m, d] = (next.date || '----').split('-');
    const done = next.tasks.filter((t) => t.done).length, n = daysUntil(next.date);
    const meta = [next.semester, next.venue, next.time, next.course].filter(Boolean).map(esc).join(' · ');
    $('#exhibition').innerHTML = `
      <div class="ex" data-topics="${esc((next.topics || []).join(' '))}">
        <div class="ex-row">
          <span class="lhs">${esc(next.title)} =</span>
          <span class="date"><span class="yy">${y}.</span><span class="md">${m}.${d}</span></span>
          <span class="rhs"><span class="nm">// ${meta || 'STUDENT EXHIBITION'}</span>
            <span class="tm">${tLabel(n)} · ${done}/${next.tasks.length} READY</span></span>
        </div>
        <div class="ex-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${next.tasks.length}" aria-valuenow="${done}"><span style="width:${next.tasks.length ? (done / next.tasks.length) * 100 : 0}%"></span></div>
        <ol class="ex-tasks">${next.tasks.map((t) => {
          const due = t.due ? ` <span class="muted">// ${esc(t.due.slice(5).replace('-', '.'))} ${tLabel(daysUntil(t.due))}</span>` : '';
          return `<li class="${t.done ? 'done' : ''}"><i aria-hidden="true"></i>${esc(t.label)}${due}</li>`;
        }).join('')}</ol>
        ${past.length ? `<p class="ex-past">PAST: ${past.map((e) => `${esc(e.title)} (${esc(e.semester || e.date)})`).join(' · ')}</p>` : ''}
      </div>`;
  }

  /* ---------- long-term ---------- */
  function renderProtocol() {
    const labels = D.longterm.stepLabels;
    $('#protocol').innerHTML = D.longterm.items.map((it) => {
      const done = it.steps.filter(Boolean).length;
      const dl = it.deadline
        ? `// ${it.deadline.replace(/-/g, '.')} ${tLabel(daysUntil(it.deadline))}${it.deadlineNote ? ` · ${it.deadlineNote}` : ''}`
        : `// ${it.deadlineNote || '[deadline]'}`;
      return `<li data-topics="${esc((it.topics || []).join(' '))}">
        <button aria-expanded="false">
          <span>${esc(it.school)}</span><span>= ${esc(it.program)}</span>
          <span class="dl muted">${esc(dl)}</span>
          <span class="steps" title="${done}/${labels.length}: ${labels.map((l, i) => `${l} ${it.steps[i] ? '✓' : '·'}`).join(', ')}">${it.steps.map((s) => `<i class="${s ? 'done' : ''}"></i>`).join('')}</span>
        </button>
        <div class="detail">${labels.map((l, i) => `${it.steps[i] ? '■' : '□'} ${l}`).join('   ')}${it.notes ? `<br>${esc(it.notes)}` : ''}${safeUrl(it.link) ? `<br><a href="${esc(it.link)}" target="_blank" rel="noopener">program page →</a>` : ''}</div>
      </li>`;
    }).join('');
    $$('#protocol li>button').forEach((b) => b.addEventListener('click', () => {
      const open = b.parentElement.classList.toggle('open'); b.setAttribute('aria-expanded', String(open));
    }));
  }

  /* ---------- right column ---------- */
  function renderRight() {
    $('#progress').innerHTML = D.progress.items.map((p) => `
      <li data-topics="${esc((p.topics || []).join(' '))}">
        <span>${esc(p.kind)}</span><span>= ${esc(p.name)} // ${esc(p.where)}</span>
        ${p.progress != null ? `<span class="bar" title="${p.progress}%"><span style="width:${Math.max(0, Math.min(100, +p.progress))}%"></span></span>` : ''}
      </li>`).join('');

    $('#texts').innerHTML = D.texts.items.map((t) => {
      const src = safeUrl(t.cover);
      return `<li data-topics="${esc([...(t.topics || []), ...(t.projects || [])].join(' '))}">
        <button class="cover" data-why="${esc(t.why || '')}" aria-label="${esc(`${t.title} — ${t.author}`)}">
          ${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}
          <span class="t">${esc(t.title)}</span><span class="a">${esc(t.author)}${t.year ? ` · ${esc(t.year)}` : ''}</span>
        </button></li>`;
    }).join('');
    $$('#texts .cover').forEach((c) => {
      const show = () => { $('#why').textContent = c.dataset.why ? `// ${c.dataset.why}` : ''; };
      c.addEventListener('mouseenter', show); c.addEventListener('focus', show); c.addEventListener('click', show);
    });

    $('#people').innerHTML = D.people.items.map((p) => {
      const l = safeUrl(p.link);
      return `<li data-topics="${esc((p.topics || []).join(' '))}">${esc(p.role)} = ${l ? `<a href="${esc(l)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : esc(p.name)}</li>`;
    }).join('');

    $('#refs').innerHTML = D.references.items.map((r) => {
      const img = safeUrl(r.image), l = safeUrl(r.link);
      const inner = `${img ? `<img src="${esc(img)}" alt="${esc(r.title)}" loading="lazy">` : esc(r.title)}`;
      return `<li data-topics="${esc((r.topics || []).join(' '))}">${l ? `<a href="${esc(l)}" target="_blank" rel="noopener">${inner}</a>` : `<div>${inner}</div>`}</li>`;
    }).join('');
  }

  /* ---------- focus / filter ---------- */
  function setFocus(id) {
    state.focus = state.focus === id ? null : id;
    history.replaceState(null, '', state.focus ? `#${state.focus}` : location.pathname + location.search);
    applyFocus();
  }
  function related(id) {
    const set = new Set([id]);
    const p = D.projects.items.find((x) => x.id === id);
    if (p) (p.topics || []).forEach((t) => set.add(t));
    D.projects.items.forEach((x) => { if ((x.topics || []).includes(id)) set.add(x.id); });
    return set;
  }
  function applyFocus() {
    const f = state.focus, rel = f ? related(f) : null;
    $$('.callout').forEach((c) => {
      const on = !!f && rel.has(c.dataset.node);
      c.classList.toggle('active', c.dataset.node === f);
      c.classList.toggle('dim', !!f && !on);
      const b = c.querySelector('.cbtn'); if (b) b.setAttribute('aria-pressed', String(c.dataset.node === f));
    });
    $$('#wires line').forEach((l) => {
      const on = !!f && (rel.has(l.dataset.a) || rel.has(l.dataset.b));
      l.classList.toggle('dim', !!f && !on); l.classList.toggle('on', on);
    });
    $$('[data-topics]').forEach((el) => {
      if (!f) { el.classList.remove('dim', 'hit'); return; }
      const tags = el.dataset.topics.split(' ').filter(Boolean);
      const hit = tags.some((t) => rel.has(t));
      el.classList.toggle('hit', hit); el.classList.toggle('dim', !hit);
    });
  }

  /* ---------- events ---------- */
  function bind() {
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-focus]'); if (b) setFocus(b.dataset.focus);
    });
    $('#topicsBtn').addEventListener('click', (e) => {
      const lg = $('#topicLegend'); lg.hidden = !lg.hidden; e.currentTarget.setAttribute('aria-expanded', String(!lg.hidden));
    });
    $$('.tabs button').forEach((b) => b.addEventListener('click', () => {
      state.type = b.dataset.type;
      $$('.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      renderNext(); renderTable();
    }));
    $('#moreBtn').addEventListener('click', () => { state.showAll = !state.showAll; renderNext(); renderTable(); if (state.showAll) $('#allParams').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('#showPast').addEventListener('change', (e) => { state.showPast = e.target.checked; renderTable(); });
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input,textarea')) return;
      if (e.key === 'Escape') setFocus(null);
      const i = Number(e.key);
      if (i >= 1 && i <= D.site.topics.length) setFocus(D.site.topics[i - 1].id);
    });
  }

  /* ---------- boot ---------- */
  load().then(() => {
    renderHead(); renderMap(); renderNext(); renderExhibition(); renderProtocol(); renderRight(); renderTable(); bind(); startCore();
    if (location.hash.length > 1) setFocus(decodeURIComponent(location.hash.slice(1)));
    setInterval(tickConfig, 1000);
    document.fonts && document.fonts.ready.then(drawWires);
  }).catch((err) => {
    $('#config').textContent = `ERROR // ${err.message}\n(open via a web server, not file://)`;
    console.error(err);
  });
})();
