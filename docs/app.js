// Football Universe Copilot — live replay + force-directed graph. No dependencies.
let D, minute = 0, playing = false, lastTs = null, shown = 0, mode = 'casual_fan';
const $ = id => document.getElementById(id);
function xtModel(x, y) { const d = Math.hypot(105 - x, 34 - y); return Math.round(0.38 * Math.exp(-d / 24) * (1 - 0.45 * Math.abs(y - 34) / 34) * 1000) / 1000; }
const FORMATION = [[4,34],[18,10],[18,26],[18,42],[18,58],[34,16],[34,34],[34,52],[52,22],[52,46],[66,34]];
function positionsFor(rng, bx, by) { const out = []; for (let ti = 0; ti < 2; ti++) for (const [fx, fy] of FORMATION) { let x = ti ? 105 - fx : fx, y = ti ? 68 - fy : fy; x += (bx - 52.5) * 0.35; y += (by - 34) * 0.3; out.push([Math.round(Math.max(1, Math.min(104, x + rng() * 14 - 7)) * 10) / 10, Math.round(Math.max(1, Math.min(67, y + rng() * 12 - 6)) * 10) / 10, ti]); } return out; }
function poiPmf(lam, k) { let p = Math.exp(-lam); for (let i = 1; i <= k; i++) p *= lam / i; return p; }
function poiOutcomes(lh, la) { let hw = 0, dr = 0, aw = 0, best = [0, -1, -1]; for (let i = 0; i <= 10; i++) for (let j = 0; j <= 10; j++) { const p = poiPmf(lh, i) * poiPmf(la, j); if (i > j) hw += p; else if (i === j) dr += p; else aw += p; if (p > best[0]) best = [p, i, j]; } return { hw, dr, aw, best }; }
function updatePoisson() { const lh = parseFloat($('lamH').value), la = parseFloat($('lamA').value); $('lamHV').textContent = lh.toFixed(2); $('lamAV').textContent = la.toFixed(2); const o = poiOutcomes(lh, la); const bar = (lbl, v, c) => `<div class="hbar"><span class="hl">${lbl}</span><span class="ht"><span class="hf" style="width:${(v * 100).toFixed(1)}%;background:${c}"></span></span><strong>${(v * 100).toFixed(1)}%</strong></div>`; $('poiOut').innerHTML = bar($('lamHName').textContent + ' win', o.hw, 'var(--brand)') + bar('Draw', o.dr, '#616161') + bar($('lamAName').textContent + ' win', o.aw, '#C50F1F') + `<p class="small">Most likely score: ${o.best[1]}–${o.best[2]} (${(o.best[0] * 100).toFixed(1)}%). Computed live in your browser from the two λ values.</p>`; }
let perf = { steps: 0, ms: 0, last: 0 };
const scoreAt = m => { const s = { [D.fixture.home]: 0, [D.fixture.away]: 0 }; for (const e of D.events) { if (e.minute <= m && e.goal) s[e.team]++; } return s; };
function render() {
  const s = scoreAt(minute);
  $('score').textContent = `${s[D.fixture.home]} – ${s[D.fixture.away]}`;
  $('clock').textContent = `${Math.floor(minute)}'`;
  const cc = $('chipClock'); if (cc) cc.textContent = `${Math.floor(minute)}'`;
  $('scrub').value = minute;
  const evs = D.events.filter(e => e.minute <= minute);
  const feed = evs.slice(-14).reverse();
  $('feed').innerHTML = feed.map(e => `<li class="${e.goal ? 'goal' : ''}">${e.minute}' <strong>${e.type}</strong> — ${e.player} (${e.team})${e.goal ? ' ⚽ GOAL' : ''}${e.type === 'shot' ? ` · ${e.shot_speed_kmh} km/h${e.on_target ? ' · on target' : ''}` : ''}${e.type === 'pass' ? ` · ${e.distance_m}m · difficulty ${e.difficulty}` : ''}${e.type === 'pressure' ? ` · intensity ${e.pressure_intensity}` : ''}${e.threshold_alerts ? ' ⚡ ' + e.threshold_alerts.join(', ') : ''}</li>`).join('');
  const shots = evs.filter(e => e.type === 'shot').length, passes = evs.filter(e => e.type === 'pass').length;
  $('liveStats').textContent = `${evs.length} events so far · ${shots} shots · ${passes} passes · chaos index (full match) ${D.stats.chaos_index}`;
  const ov = [...D.overlay.feed].reverse().find(o => o.at_minute <= minute);
  if (ov) { $('overlayCard').hidden = false; $('overlayText').textContent = `${ov.at_minute}' — ${ov.title}: ${ov.body}`; }
  const pp = $('payloadPre'); if (pp) pp.textContent = JSON.stringify({ schema: 'football-universe-overlay/v1', at_minute: Math.floor(minute), fixture: D.fixture, score: s, overlay: ov || null, persona: mode, narration_source: D.narrative.narration_source || 'deterministic-template' }, null, 2);
  const w = Math.min(5, Math.floor(minute / 15));
  const mkey = D.fixture.home + '|' + w; if (window._momKey !== mkey) { window._momKey = mkey; $('momentum').innerHTML = momentumChart(w); }
}
function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  if (!D) return;
  $('modeTitle').textContent = D.personalized[m].headline;
  $('modeBody').textContent = D.personalized[m].body;
}
function tick(ts) {
  if (!playing) return;
  if (lastTs == null) lastTs = ts;
  const dt = (ts - lastTs) / 1000; lastTs = ts;
  minute += dt * (parseFloat($('speed').value) * 0.5);
  if (minute >= 90) { minute = 90; playing = false; $('playBtn').textContent = '▶ Play replay'; }
  render(); drawPitch(true);
  perf.steps++; const pl = $('perfLine'); if (pl && perf.steps % 30 === 0) { const evs = D.events.filter(e => e.minute <= minute).length; pl.textContent = `Measured in your browser: ${evs} events rendered so far · ${perf.steps} replay steps this session · current speed ${$('speed').value}×. Timings are measured live — never hard-coded.`; }
  if (playing) requestAnimationFrame(tick);
}
// ---- force-directed graph (small custom physics, canvas) ----
let nodes = [], links = [], pathAnim = null, selectedNode = null;
function showNode(n) {
  selectedNode = n;
  $('nodeInfo').textContent = `${n.id} (${n.kind}) — ${n.degree} connections · Kevin Bacon Score ${n.kevin_bacon_score ?? 'n/a'}/10`;
  const sel = $('nodeSelect'); if (sel && sel.value !== n.id) sel.value = n.id;
}
function initGraph() {
  const W = 1020, H = 560, cx = W / 2, cy = H / 2;
  nodes = D.graph.nodes.map((n, i) => { const a = (i / D.graph.nodes.length) * Math.PI * 2, r = 90 + (i % 5) * 38; return { ...n, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: 0, vy: 0 }; });
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  links = D.graph.edges.map(e => ({ a: byId[e.source], b: byId[e.target], label: e.label })).filter(l => l.a && l.b);
  const cv = $('graph'); const ctx = cv.getContext('2d');
  const col = { Player: '#3b82f6', Club: '#ef4444', Manager: '#22c55e' };
  function step() {
    for (const n of nodes) { n.vx += (cx - n.x) * 0.0012; n.vy += (cy - n.y) * 0.0012; }
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]; let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy || 1;
      const f = 2600 / d2; a.vx += dx * f * 0.016; a.vy += dy * f * 0.016; b.vx -= dx * f * 0.016; b.vy -= dy * f * 0.016;
    }
    for (const l of links) { const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y, d = Math.hypot(dx, dy) || 1, f = (d - 120) * 0.004; l.a.vx += dx * f * 0.016 * 60 / 60; l.a.vy += dy * f * 0.016; l.b.vx -= dx * f * 0.016; l.b.vy -= dy * f * 0.016; }
    for (const n of nodes) { n.vx *= 0.82; n.vy *= 0.82; n.x += n.vx; n.y += n.vy; }
    ctx.clearRect(0, 0, W, H);
    const path = D.graph.highlight_path;
    for (const l of links) {
      const onPath = pathAnim != null && path.includes(l.a.id) && path.includes(l.b.id) && Math.abs(path.indexOf(l.a.id) - path.indexOf(l.b.id)) === 1;
      ctx.strokeStyle = onPath ? '#C77400' : 'rgba(36,36,36,.18)'; ctx.lineWidth = onPath ? 4 : 1;
      ctx.beginPath(); ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y); ctx.stroke();
    }
    for (const n of nodes) {
      const r = 7 + (n.kevin_bacon_score || 0) * 2.4;
      const onPath = pathAnim != null && path.includes(n.id);
      const isSel = selectedNode && selectedNode.id === n.id;
      ctx.fillStyle = col[n.kind] || '#888'; ctx.beginPath(); ctx.arc(n.x, n.y, (onPath || isSel) ? r + 4 : r, 0, 7); ctx.fill();
      if (onPath || isSel) { ctx.strokeStyle = isSel ? '#0F6CBD' : '#C77400'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.fillStyle = '#242424'; ctx.font = '11px "Segoe UI", system-ui'; ctx.fillText(n.id, n.x + r + 3, n.y + 3);
    }
    if (pathAnim != null) pathAnim += 0.016;
    requestAnimationFrame(step);
  }
  step();
  // Pointer events cover mouse AND touch; generous 34px hit radius for phones.
  function pick(ev) {
    const rect = cv.getBoundingClientRect(), x = (ev.clientX - rect.left) * (W / rect.width), y = (ev.clientY - rect.top) * (H / rect.height);
    let best = null, bd = 34;
    for (const n of nodes) { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } }
    if (best) showNode(best);
  }
  cv.addEventListener('pointerdown', pick);
  cv.addEventListener('click', pick);
  cv.style.touchAction = 'pan-y';
  $('pathBtn').addEventListener('click', () => { pathAnim = pathAnim == null ? 0 : null; });
  const sel = $('nodeSelect');
  if (sel) {
    sel.innerHTML = '<option value="">Select a connection…</option>' + [...nodes].sort((a, b) => a.id.localeCompare(b.id)).map(n => `<option value="${n.id}">${n.id} (${n.kind})</option>`).join('');
    sel.addEventListener('change', () => { const n = nodes.find(x => x.id === sel.value); if (n) showNode(n); });
  }
}
// ---- fixture picker: any match from the full synthetic calendar ----
function hashSeed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ROLES = ['No. 9', 'No. 10', 'No. 7', 'No. 11', 'No. 8', 'the captain', 'the full-back', 'the winger', 'No. 6', 'the goalkeeper'];
function genMatchData(m, lg) {
  const rng = mulberry32(hashSeed(m.home + '|' + m.away + '|' + m.matchweek));
  const events = [];
  const goalMin = () => 1 + Math.floor(rng() * 90);
  const mkShot = (team, goal) => ({ minute: goalMin(), type: 'shot', team, player: ROLES[Math.floor(rng() * 6)], goal: !!goal, on_target: goal || rng() > 0.45, shot_speed_kmh: Math.round(72 + rng() * 58), distance_m: Math.round(6 + rng() * 26) });
  for (let i = 0; i < m.home_goals; i++) events.push(mkShot(m.home, true));
  for (let i = 0; i < m.away_goals; i++) events.push(mkShot(m.away, true));
  for (let i = m.home_goals; i < m.home_shots; i++) events.push(mkShot(m.home, false));
  for (let i = m.away_goals; i < m.away_shots; i++) events.push(mkShot(m.away, false));
  const passes = 46 + Math.floor(rng() * 30);
  for (let i = 0; i < passes; i++) { const team = rng() > (1 - m.home_possession / 100) ? m.home : m.away; events.push({ minute: goalMin(), type: 'pass', team, player: ROLES[Math.floor(rng() * ROLES.length)], distance_m: Math.round(4 + rng() * 38), difficulty: +(0.1 + rng() * 0.85).toFixed(2) }); }
  for (let i = 0; i < 12; i++) { const team = rng() > 0.5 ? m.home : m.away; events.push({ minute: goalMin(), type: 'pressure', team, player: ROLES[Math.floor(rng() * ROLES.length)], pressure_intensity: +(0.3 + rng() * 0.7).toFixed(2) }); }
  events.sort((a, b) => a.minute - b.minute);
  const alerts = [];
  for (const e of events) { const a = []; if (e.type === 'shot' && e.shot_speed_kmh >= 110) a.push('SPEED_ALERT'); if (e.type === 'pass' && e.distance_m >= 35) a.push('LONG_RANGE_ALERT'); if (a.length) { e.threshold_alerts = a; alerts.push({ minute: e.minute, player: e.player + ' (' + e.team + ')', alerts: a }); } }
  const momentum = [];
  for (let w = 0; w < 6; w++) { const evs = events.filter(e => e.minute >= w * 15 && e.minute < (w + 1) * 15); const h = evs.filter(e => e.team === m.home).length; momentum.push({ window: `${w * 15}-${(w + 1) * 15}`, events: evs.length, dominant: h * 2 > evs.length ? m.home : (h * 2 < evs.length ? m.away : 'Even'), split: { [m.home]: h, [m.away]: evs.length - h } }); }
  const goals = events.filter(e => e.goal); let lead = 0, changes = 0, run = { [m.home]: 0, [m.away]: 0 };
  for (const g of goals) { run[g.team]++; const nl = Math.sign(run[m.home] - run[m.away]); if (lead !== 0 && nl !== 0 && nl !== lead) changes++; if (nl !== 0) lead = nl; }
  const chaos = +Math.min(1, (goals.length * 0.09 + changes * 0.16 + events.filter(e => e.type === 'shot').length / 300)).toFixed(3);
  const hs = lg.standings.find(r => r.club === m.home), as = lg.standings.find(r => r.club === m.away);
  const why = [
    `${m.home} finished the synthetic season ${hs.position} (${hs.points} pts); ${m.away} finished ${as.position} (${as.points} pts) — this matchweek ${m.matchweek} result fed directly into that table.`,
    `Possession split ${m.home_possession}%–${100 - m.home_possession}% and ${m.home_shots + m.away_shots} total shots made this a ${chaos > 0.45 ? 'chaotic, end-to-end' : 'controlled'} game (chaos index ${chaos}).`,
    goals.length ? `Goals: ${goals.map(g => g.minute + "' " + g.team).join(' · ')}.` : 'A goalless draw — the points were shared, which mattered at both ends of the table.'
  ];
  const recap = `${m.home} ${m.home_goals}–${m.away_goals} ${m.away} (synthetic, matchweek ${m.matchweek}). ${m.home_shots + m.away_shots} shots, possession ${m.home_possession}%–${100 - m.home_possession}%. Timeline, speeds and passing events on this page are generated deterministically from the simulated scoreline — no real match data is used anywhere in this project.`;
  const overlay = [{ at_minute: 0, title: 'Match context', body: `MW${m.matchweek}: ${hs.position} vs ${as.position} in the final synthetic table.` }];
  if (goals.length) overlay.push({ at_minute: goals[0].minute, title: 'First goal', body: `${goals[0].minute}' — ${goals[0].team} strike first through ${goals[0].player}.` });
  const pers = (club) => ({ headline: `${m.home} vs ${m.away} — the story`, body: recap });
  return { fixture: { home: m.home, away: m.away }, events, stats: { chaos_index: chaos, momentum, threshold_alerts: alerts }, overlay: { feed: overlay },
    narrative: { why_it_matters: why, recap, narration_source: 'browser-generated-timeline (deterministic; the Azure API narrates with Phi-4-mini-instruct)' }, personalized: { casual_fan: pers(), analyst: { headline: 'Analyst view', body: `${events.length} generated events · xThreat proxy from shot volume ${m.home_shots}–${m.away_shots} · chaos ${chaos} · possession ${m.home_possession}%–${100 - m.home_possession}%.` }, player_focus: pers(), club_focus: pers(), es: { headline: 'Resumen', body: `${m.home} ${m.home_goals}–${m.away_goals} ${m.away} (sintético, jornada ${m.matchweek}). ${m.home_shots + m.away_shots} tiros en total.` } },
    graph: D.graph, graph_context: D.graph_context };
}
function momentumChart(curW) {
  const H = D.fixture.home, A = D.fixture.away, W = 560, HT = 176, base = 148, maxV = Math.max(...D.stats.momentum.map(m => Math.max(m.split[H] || 0, m.split[A] || 0)), 10);
  const bw = 21, gap = 5, gw = (W - 40) / 6;
  let g = '';
  for (let i = 0; i <= 3; i++) { const y = base - (base - 14) * i / 3; g += `<line x1="24" x2="${W - 8}" y1="${y}" y2="${y}" stroke="#E0E0E0" stroke-width="1"/><text x="20" y="${y + 3}" font-size="9" fill="#616161" text-anchor="end">${Math.round(maxV * i / 3)}</text>`; }
  let bars = '';
  D.stats.momentum.forEach((m, i) => {
    const gx = 34 + i * gw, op = i < curW ? 0.85 : (i === curW ? 1 : 0.32);
    [[H, '#0F6CBD', 0], [A, '#C50F1F', bw + gap]].forEach(([team, col, off]) => {
      const v = m.split[team] || 0, h = Math.max(2, (base - 14) * v / maxV), x = gx + off, y = base - h;
      bars += `<path d="M${x},${base} L${x},${y + 3} Q${x},${y} ${x + 3},${y} L${x + bw - 3},${y} Q${x + bw},${y} ${x + bw},${y + 3} L${x + bw},${base} Z" fill="${col}" opacity="${op}" style="transform-origin:${x + bw / 2}px ${base}px;animation:bargrow var(--durSlow) var(--curveDecelerateMax) both;animation-delay:${i * 45}ms"><title>${team} · ${m.window}' · ${v} events</title></path><text x="${x + bw / 2}" y="${y - 3}" font-size="9.5" fill="#424242" text-anchor="middle" opacity="${op}">${v}</text>`;
    });
    bars += `<text x="${gx + bw + 1}" y="${base + 14}" font-size="9.5" fill="#616161" text-anchor="middle">${m.window}'</text>`;
  });
  return `<div style="display:flex;gap:14px;font-size:12px;color:var(--text-2);margin-bottom:4px"><span><span style="display:inline-block;width:9px;height:9px;background:#0F6CBD;border-radius:2px"></span> ${H}</span><span><span style="display:inline-block;width:9px;height:9px;background:#C50F1F;border-radius:2px"></span> ${A}</span><span style="margin-left:auto">events per 15'</span></div><svg viewBox="0 0 ${W} ${HT}" style="width:100%;height:auto" role="img" aria-label="Grouped bar chart of events per 15 minute window by team">${g}${bars}</svg>`;
}
function updateAgents() {
  const gc = $('agGraph'); if (!gc) return;
  $('agInterpreter').textContent = `${D.events.length} events interpreted · chaos index ${D.stats.chaos_index} · ${(D.stats.threshold_alerts || []).length} threshold alerts`;
  gc.textContent = `${D.graph.nodes.length} nodes · ${D.graph.edges.length} edges · verified path Anelka → Haaland: 2 degrees (via Manchester City)`;
  const src = D.narrative.narration_source || 'deterministic-template';
  $('agNarrator').textContent = `Narration source: ${src}. The narrator only verbalizes verified events and graph paths — it never invents a connection.`;
  const nc = $('narrChip'); if (nc) nc.textContent = 'Narration: ' + src;
  $('agPersonalizer').textContent = 'Five personas rendered from the same intelligence: Casual Fan · Analyst · Player Focus · Club Focus · Español';
}
function updateModelUI() { const xl = $('xgLine'); if (xl && D.model) xl.textContent = `Model xG (Poisson λ): ${D.fixture.home} ${D.model.xg_home.toFixed(2)} — ${D.model.xg_away.toFixed(2)} ${D.fixture.away} · the same ratings model that simulated the season`; const lh = $('lamH'); if (lh && D.model) { $('lamHName').textContent = D.fixture.home; $('lamAName').textContent = D.fixture.away; lh.value = D.model.xg_home; $('lamA').value = D.model.xg_away; updatePoisson(); } drawPitch(true); }
let pitchKey = -2, pitchSnap = null, pitchMarkers = [];
function drawPitch(force) {
  const cv = $('pitch'); if (!cv) return; const ctx = cv.getContext('2d'); const W = 1050, H = 680, S = 10;
  let snap = null; for (const e of D.events) { if (e.minute > minute) break; if (e.positions) snap = e; }
  const key = snap ? D.events.indexOf(snap) : -1; if (!force && key === pitchKey) return; pitchKey = key; pitchSnap = snap; pitchMarkers = D.events.filter(e => e.positions).map(e => ({ x: e.x, y: e.y, ev: e }));
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#F1FAF1'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(16,124,16,.45)'; ctx.lineWidth = 2; ctx.strokeRect(30, 30, W - 60, H - 60);
  ctx.beginPath(); ctx.moveTo(W / 2, 30); ctx.lineTo(W / 2, H - 30); ctx.stroke(); ctx.beginPath(); ctx.arc(W / 2, H / 2, 91, 0, 7); ctx.stroke();
  ctx.strokeRect(30, 138, 165, H - 276); ctx.strokeRect(W - 195, 138, 165, H - 276); ctx.strokeRect(30, 248, 55, H - 496); ctx.strokeRect(W - 85, 248, 55, H - 496);
  if (!snap) { let pv = null; for (const e of D.events) { if (e.clock <= minute) pv = e; else break; } if (pv) { ctx.beginPath(); ctx.arc(pv.x * S, pv.y * S, 7, 0, 7); ctx.fillStyle = '#0F6CBD'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); } $('pitchInfo').textContent = 'The blue ball tracks the event stream live. Player snapshots with Voronoi zones appear at key moments (shots, corners, 35m+ passes) — the first one is coming up.'; return; }
  const pts = snap.positions;
  if ($('vorToggle').checked) { for (let i = 0; i < pts.length; i++) { let poly = [[0, 0], [105, 0], [105, 68], [0, 68]]; for (let j = 0; j < pts.length; j++) { if (j === i) continue; const mx = (pts[i][0] + pts[j][0]) / 2, my = (pts[i][1] + pts[j][1]) / 2, dx = pts[j][0] - pts[i][0], dy = pts[j][1] - pts[i][1]; const np = []; for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; const da = (a[0] - mx) * dx + (a[1] - my) * dy, db = (b[0] - mx) * dx + (b[1] - my) * dy; if (da <= 0) np.push(a); if ((da < 0) !== (db < 0)) { const f = da / (da - db); np.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); } } poly = np; if (!poly.length) break; } if (poly.length) { ctx.beginPath(); poly.forEach((q, qi) => qi ? ctx.lineTo(q[0] * S, q[1] * S) : ctx.moveTo(q[0] * S, q[1] * S)); ctx.closePath(); ctx.fillStyle = pts[i][2] === 0 ? 'rgba(15,108,189,.10)' : 'rgba(197,15,31,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(36,36,36,.10)'; ctx.lineWidth = 1; ctx.stroke(); } } }
  if (snap.dx !== undefined) { ctx.strokeStyle = '#0F6CBD'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo((snap.x - snap.dx) * S, (snap.y - snap.dy) * S); ctx.lineTo(snap.x * S, snap.y * S); ctx.stroke(); }
  for (const q of pts) { ctx.beginPath(); ctx.arc(q[0] * S, q[1] * S, 7, 0, 7); ctx.fillStyle = q[2] === 0 ? '#0F6CBD' : '#C50F1F'; ctx.fill(); }
  ctx.beginPath(); ctx.arc(snap.x * S, snap.y * S, 6, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#242424'; ctx.lineWidth = 2; ctx.stroke();
  // Live ball: interpolated between the events surrounding the current clock, plus a fading trail.
  let prev = null, next = null; for (const e of D.events) { if (e.clock <= minute) prev = e; else { next = e; break; } }
  if (prev) { let bx = prev.x, by = prev.y; if (next && next.clock > prev.clock) { const f = Math.min(1, Math.max(0, (minute - prev.clock) / (next.clock - prev.clock))); bx = prev.x + (next.x - prev.x) * f; by = prev.y + (next.y - prev.y) * f; }
    const trail = D.events.filter(e => e.clock <= minute).slice(-8); trail.forEach((e, i) => { ctx.beginPath(); ctx.arc(e.x * S, e.y * S, 3, 0, 7); ctx.fillStyle = `rgba(15,108,189,${0.08 + 0.05 * i})`; ctx.fill(); });
    const pulse = 7 + (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.sin(performance.now() / 280) * 1.6); ctx.beginPath(); ctx.arc(bx * S, by * S, pulse + 5, 0, 7); ctx.strokeStyle = 'rgba(15,108,189,.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx * S, by * S, pulse, 0, 7); ctx.fillStyle = '#0F6CBD'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  for (const m of pitchMarkers) { ctx.beginPath(); ctx.arc(m.x * S, m.y * S, 4, 0, 7); ctx.strokeStyle = m.ev.goal ? '#B7860B' : 'rgba(36,36,36,.4)'; ctx.lineWidth = m.ev.goal ? 2.5 : 1.2; ctx.stroke(); }
  ctx.font = '600 15px "Segoe UI", system-ui'; ctx.fillStyle = '#242424'; ctx.fillText(snap.player, Math.min(W - 150, snap.x * S + 10), Math.max(18, snap.y * S - 10));
  let info = `Snapshot: ${snap.type} · ${snap.minute}' · ${snap.team} · ball at (${snap.x}, ${snap.y}) · xT ${snap.xt}`;
  if (snap.xt_delta !== undefined) info += ` · ΔxT ${snap.xt_delta >= 0 ? '+' : ''}${snap.xt_delta}`;
  if (snap.xg !== undefined) info += ` · shot xG (model) ${snap.xg}`;
  if (snap.dx !== undefined) info += ` · ball vector (${snap.dx}, ${snap.dy}) m`;
  $('pitchInfo').textContent = info + ' · Voronoi zones computed in your browser from these positions (blue = ' + D.fixture.home + ', red = ' + D.fixture.away + ').';
}
function applyMatch(nd, label) {
  D = nd; minute = 0; playing = false; $('playBtn').textContent = '▶ Play replay';
  $('homeName').textContent = D.fixture.home; $('awayName').textContent = D.fixture.away;
  $('matchLabel').textContent = label;
  setMode(mode); render(); updateAgents(); updateModelUI(); perf = { steps: 0, ms: 0, last: performance.now() }; window.scrollTo({ top: 0, behavior: 'smooth' });
}
function initPicker(season) {
  const lgSel = $('pickLeague'), teamSel = $('pickTeam'), matchSel = $('pickMatch');
  const leagues = [['premier_league', 'Premier League'], ['wsl', "Women's Super League"]];
  lgSel.innerHTML = leagues.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  function fillTeams() {
    const lg = season[lgSel.value];
    teamSel.innerHTML = '<option value="">All teams</option>' + lg.standings.map(r => `<option value="${r.club}">${r.club}</option>`).join('');
    fillMatches();
  }
  function fillMatches() {
    const lg = season[lgSel.value], t = teamSel.value;
    const ms = lg.matches.filter(m => !t || m.home === t || m.away === t);
    matchSel.innerHTML = ms.map((m, i) => `<option value="${lg.matches.indexOf(m)}">MW${m.matchweek} · ${m.home} ${m.home_goals}–${m.away_goals} ${m.away}</option>`).join('');
  }
  lgSel.addEventListener('change', fillTeams); teamSel.addEventListener('change', fillMatches);
  fillTeams();
  $('loadMatchBtn').addEventListener('click', () => {
    const lg = season[lgSel.value]; const m = lg.matches[parseInt(matchSel.value, 10)]; if (!m) return;
    const st = $('genStatus'), card = $('storyCard');
    if (st) st.innerHTML = '<span class="morse"><i></i><i></i><i></i></span> Generating timeline — personalizing multi-persona matrix ...';
    if (card) card.classList.add('shimmer');
    setTimeout(() => { applyMatch(genMatchData(m, lg), `${lg.competition} · Matchweek ${m.matchweek}`); if (card) card.classList.remove('shimmer'); if (st) st.textContent = 'Timeline generated deterministically from the simulated scoreline.'; }, 550);
  });
  $('featuredBtn').addEventListener('click', () => { if (window.__featured) applyMatch(window.__featured, 'Featured match — full agent pipeline'); });
}
async function load() {
  D = await (await fetch('data.json')).json();
  window.__featured = D;
  $('homeName').textContent = D.fixture.home; $('awayName').textContent = D.fixture.away;
  $('board').innerHTML = D.graph_context.leaderboard.map(x => `<li>${x.name} — <strong>${x.kevin_bacon_score}/10</strong> (${x.degree} connections)</li>`).join('');
  $('why').innerHTML = D.narrative.why_it_matters.map(x => `<li>${x}</li>`).join('');
  $('recap').textContent = D.narrative.recap;
  $('alerts').innerHTML = (D.stats.threshold_alerts || []).slice(0, 10).map(a => `<li>${a.minute}' ${a.player} — ${a.alerts.join('; ')}</li>`).join('') || '<li>None in this match.</li>';
  setMode('casual_fan'); render(); updateAgents(); updateModelUI(); initGraph();
  try { const season = await (await fetch('season.json')).json(); initPicker(season); } catch (e) { /* picker optional */ }
}
$('playBtn').addEventListener('click', () => { playing = !playing; lastTs = null; $('playBtn').textContent = playing ? '⏸ Pause' : '▶ Play replay'; if (playing) requestAnimationFrame(tick); });
$('resetBtn').addEventListener('click', () => { minute = 0; playing = false; $('playBtn').textContent = '▶ Play replay'; render(); });
$('scrub').addEventListener('input', e => { minute = parseFloat(e.target.value); render(); drawPitch(true); });
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
const cp = $('copyPayloadBtn'); if (cp) cp.addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText($('payloadPre').textContent); cp.textContent = 'Copied ✓'; setTimeout(() => cp.textContent = 'Copy JSON', 1500); });
['lamH', 'lamA'].forEach(id => { const el = $(id); if (el) el.addEventListener('input', updatePoisson); });
const vt = $('vorToggle'); if (vt) vt.addEventListener('change', () => drawPitch(true));
(function pitchInteract() {
  const cv = $('pitch'); if (!cv) return;
  const toMeters = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 1050 / r.width / 10, (e.clientY - r.top) * 680 / r.height / 10]; };
  const LINES = ['Goalkeeper', 'Defence', 'Defence', 'Defence', 'Defence', 'Midfield', 'Midfield', 'Midfield', 'Attack', 'Attack', 'Attack'];
  cv.style.cursor = 'crosshair';
  cv.addEventListener('pointermove', e => { const [mx, my] = toMeters(e); const hot = pitchMarkers.some(m => Math.hypot(m.x - mx, m.y - my) < 1.8) || (pitchSnap && pitchSnap.positions.some(q => Math.hypot(q[0] - mx, q[1] - my) < 1.6)); cv.style.cursor = hot ? 'pointer' : 'crosshair'; });
  cv.addEventListener('pointerdown', e => {
    const [mx, my] = toMeters(e);
    const mk = pitchMarkers.map(m => [Math.hypot(m.x - mx, m.y - my), m]).sort((a, b) => a[0] - b[0])[0];
    if (mk && mk[0] < 1.8) { minute = mk[1].ev.minute + 0.01; playing = false; $('playBtn').textContent = '▶ Play replay'; render(); drawPitch(true); $('pitchInfo').textContent = `Jumped to ${mk[1].ev.minute}' — ${mk[1].ev.type} by ${mk[1].ev.player} (${mk[1].ev.team}).`; return; }
    if (pitchSnap) { const dots = pitchSnap.positions.map((q, i) => [Math.hypot(q[0] - mx, q[1] - my), q, i]).sort((a, b) => a[0] - b[0])[0];
      if (dots && dots[0] < 1.6) { const q = dots[1], teamName = q[2] === 0 ? D.fixture.home : D.fixture.away;
        if (Math.hypot(pitchSnap.x - mx, pitchSnap.y - my) < 2.2) { $('pitchInfo').textContent = `Ball carrier: ${pitchSnap.player} (${pitchSnap.team}). Selecting them in the knowledge graph…`; const gn = (typeof nodes !== 'undefined') && nodes.find(n => n.id === pitchSnap.player); if (gn) { showNode(gn); $('graphCard').scrollIntoView({ behavior: 'smooth', block: 'center' }); } else { $('pitchInfo').textContent += ' (That player is not a node in the seed graph.)'; } return; }
        $('pitchInfo').textContent = `${teamName} · ${LINES[dots[2] % 11]} slot at (${q[0]}, ${q[1]}) — synthetic formation position for the ${pitchSnap.minute}' snapshot. Player dots are formation slots; only the labelled ball carrier is a named player.`; return; } }
    $('pitchInfo').textContent = `Pitch point (${mx.toFixed(1)}, ${my.toFixed(1)}) — xT there is ${xtModel(mx, my)} on our documented threat surface. Click a ringed marker to jump the replay to that key moment.`;
  });
})();
(function azureButton() {
  const btn = $('azureBtn'); if (!btn) return; const API = 'https://fuc-api-pv4pnqx2o2t4y.azurewebsites.net';
  btn.addEventListener('click', async () => {
    btn.disabled = true; const st = $('azureStatus'), out = $('azureOut'); out.innerHTML = '';
    const t0 = performance.now(); const tick = setInterval(() => { const s = Math.floor((performance.now() - t0) / 1000); st.innerHTML = '<span class="morse"><i></i><i></i><i></i></span> Asking Azure… ' + s + 's elapsed' + (s > 5 ? ' — Phi-4-mini serverless endpoint is warming up / generating; this is a real live call' : ''); }, 500);
    try {
      try { await fetch(API + '/api/health'); } catch (e) { /* warm-up ping only */ }
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 170000);
      const r = await fetch(API + '/api/match/intelligence', { signal: ctl.signal }); clearTimeout(to);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json(); const secs = ((performance.now() - t0) / 1000).toFixed(1);
      const src = (d.narrative && d.narrative.narration_source) || 'unknown';
      const isPhi = src.includes('Phi') || src.includes('phi');
      out.innerHTML = '<div class="agent ai" style="margin-top:8px"><strong>Live from Azure in ' + secs + 's</strong> · narration_source: <code>' + src + '</code>' + (isPhi ? '' : '<p class="small">Phi did not respond within its window on this call, so Azure served the labelled deterministic template instead — the source string above always tells you which one you got.</p>') + '<p style="margin-top:6px">' + ((d.narrative && d.narrative.recap) || '') + '</p></div>';
      st.textContent = '';
    } catch (e) {
      st.textContent = 'The live Azure call did not complete (' + (e.name === 'AbortError' ? 'timed out after 170s — the serverless endpoint is very cold' : e.message) + '). The static recap above is the same pipeline running locally; you can retry the Azure call.';
    } finally { clearInterval(tick); btn.disabled = false; }
  });
})();
load().catch(() => { $('modeBody').textContent = 'Could not load data.json — serve this folder over http (python3 -m http.server) or view the live GitHub Pages demo.'; });
