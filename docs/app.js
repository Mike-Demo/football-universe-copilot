// Football Universe Copilot — live replay + force-directed graph. No dependencies.
let D, minute = 0, playing = false, lastTs = null, shown = 0, mode = 'casual_fan';
let focusPlayer = 'Erling Haaland', focusClub = 'Arsenal', dockClosed = false;
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
  $('feed').innerHTML = feed.map(e => `<li class="${e.goal ? 'goal' : ''}">${e.minute}' <strong>${e.type}</strong> — ${e.player} (${e.team})${e.goal ? ' <img class="fe" src="assets/fluent-emoji/soccer-ball.svg" alt="" aria-hidden="true"> GOAL' : ''}${e.type === 'shot' ? ` · ${e.shot_speed_kmh} km/h${e.on_target ? ' · on target' : ''}` : ''}${e.type === 'pass' ? ` · ${e.distance_m}m · difficulty ${e.difficulty}` : ''}${e.type === 'pressure' ? ` · intensity ${e.pressure_intensity}` : ''}${e.threshold_alerts ? ' <img class="fe" src="assets/fluent-emoji/high-voltage.svg" alt="" aria-hidden="true"> ' + e.threshold_alerts.join(', ') : ''}</li>`).join('');
  const shots = evs.filter(e => e.type === 'shot').length, passes = evs.filter(e => e.type === 'pass').length;
  $('liveStats').textContent = `${evs.length} events so far · ${shots} shots · ${passes} passes · chaos index (full match) ${D.stats.chaos_index}`;
  const ov = [...D.overlay.feed].reverse().find(o => o.at_minute <= minute);
  if (ov) { $('overlayCard').hidden = false; $('overlayText').textContent = `${ov.at_minute}' — ${ov.title}: ${ov.body}`; }
  const pp = $('payloadPre'); if (pp) pp.textContent = JSON.stringify({ schema: 'football-universe-overlay/v1', at_minute: Math.floor(minute), fixture: D.fixture, score: s, overlay: ov || null, persona: mode, narration_source: D.narrative.narration_source || 'deterministic-template' }, null, 2);
  const fxk = D.fixture.home + '|' + D.fixture.away; if (window._fxk !== fxk) { window._fxk = fxk; populateFocus(); }
  refreshPersona(); updateDock();
  const w = Math.min(5, Math.floor(minute / 15));
  const mkey = D.fixture.home + '|' + w; if (window._momKey !== mkey) { window._momKey = mkey; $('momentum').innerHTML = momentumChart(w); }
}
function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  refreshPersona(true);
}
function refreshPersona(force) {
  if (!D) return;
  let h, b;
  if (mode === 'player_focus') { const r = playerFocusText(focusPlayer); h = r[0]; b = r[1]; }
  else if (mode === 'club_focus') { const r = clubFocusText(focusClub); h = r[0]; b = r[1]; }
  else { h = D.personalized[mode].headline; b = D.personalized[mode].body; }
  const key = h + '|' + b;
  if (force || window._pzKey !== key) { window._pzKey = key; $('modeTitle').textContent = h; $('modeBody').textContent = b; }
}
function playerFocusText(p) {
  const nm = x => (x && x.id) || x;
  const evs = D.events.filter(e => e.player === p);
  const soFar = evs.filter(e => (e.clock ?? e.minute) <= minute);
  const team = (evs[0] && evs[0].team) || '';
  const gn = (typeof nodes !== 'undefined') && nodes.find(n => n.id === p);
  let graph = '';
  if (gn) { const nb = new Set(); links.forEach(l => { if (nm(l.source) === p) nb.add(nm(l.target)); if (nm(l.target) === p) nb.add(nm(l.source)); }); graph = ` In the universe graph, ${p} carries a Kevin Bacon Score of ${gn.kevin_bacon_score ?? 'n/a'}/10 with ${gn.degree} connections (${[...nb].slice(0, 3).join(', ')}).`; }
  else if (p) graph = ` ${p} is not a node in the seed universe graph, so this focus stays on their match events.`;
  if (!soFar.length) return [`Player focus: ${p}`, `${p}${team ? ` (${team})` : ''} is yet to feature at ${Math.floor(minute)}'.${graph} Press Play — this focus updates with every involvement.`];
  const g = soFar.filter(e => e.goal).length, sh = soFar.filter(e => e.type === 'shot'), ot = sh.filter(e => e.on_target).length, pa = soFar.filter(e => e.type === 'pass').length, pr = soFar.filter(e => e.type === 'pressure').length;
  const best = sh.reduce((m, e) => Math.max(m, e.shot_speed_kmh || 0), 0);
  const al = [...new Set(soFar.flatMap(e => e.threshold_alerts || []))];
  let b = `${p} so far at ${Math.floor(minute)}': ${soFar.length} involvements — ${g} goal${g === 1 ? '' : 's'}, ${sh.length} shots (${ot} on target), ${pa} passes, ${pr} pressure actions.`;
  if (best) b += ` Fastest shot ${best} km/h.`;
  if (al.length) b += ` Threshold alerts: ${al.join(', ')}.`;
  const gl = soFar.find(e => e.goal); if (gl) b += ` Scored at ${Math.floor(gl.clock ?? gl.minute)}'.`;
  return [`Player focus: ${p}`, b + graph];
}
function clubFocusText(c) {
  const opp = c === D.fixture.home ? D.fixture.away : D.fixture.home;
  const upto = D.events.filter(e => (e.clock ?? e.minute) <= minute);
  const mine = upto.filter(e => e.team === c), theirs = upto.filter(e => e.team === opp);
  const goals = a => a.filter(e => e.goal).length, shots = a => a.filter(e => e.type === 'shot').length;
  const share = upto.length ? Math.round(100 * mine.length / upto.length) : 50;
  const wCount = D.stats.momentum.slice(0, Math.floor(minute / 15)).filter(m => m.dominant === c).length;
  const alerts = mine.flatMap(e => e.threshold_alerts || []).length;
  let b = `${c} at ${Math.floor(minute)}': ${goals(mine)}–${goals(theirs)} vs ${opp} · ${shots(mine)} shots to ${shots(theirs)} · ${share}% of all recorded events.`;
  if (wCount) b += ` Dominant in ${wCount} completed 15-minute momentum window${wCount === 1 ? '' : 's'}.`;
  if (alerts) b += ` ${alerts} threshold alert${alerts === 1 ? '' : 's'} from ${c} players.`;
  if (minute >= 90) b += ` Full time — the recap below has the complete story.`;
  return [`My club: ${c}`, b];
}
function syncModeLabels() {
  const ln = x => (x || '').split(' ').slice(-1)[0];
  const pb = document.querySelector('[data-mode="player_focus"]'); if (pb) pb.textContent = 'Player Focus: ' + ln(focusPlayer);
  const cb = document.querySelector('[data-mode="club_focus"]'); if (cb) cb.textContent = 'My Club: ' + (focusClub || '');
}
function populateFocus() {
  const counts = {}; D.events.forEach(e => { if (e.player) counts[e.player] = (counts[e.player] || 0) + 1; });
  const players = Object.keys(counts).sort((x, y) => counts[y] - counts[x]).slice(0, 16);
  if (!players.includes(focusPlayer)) { const sc = D.events.find(e => e.goal); focusPlayer = (sc && players.includes(sc.player)) ? sc.player : players[0]; }
  const fp = $('focusPlayer'); if (fp) fp.innerHTML = players.map(p => `<option ${p === focusPlayer ? 'selected' : ''}>${p}</option>`).join('');
  const clubs = [D.fixture.home, D.fixture.away];
  if (!clubs.includes(focusClub)) { const yt = $('pickTeam') && $('pickTeam').value; focusClub = (yt && clubs.includes(yt)) ? yt : clubs[0]; }
  const fc = $('focusClub'); if (fc) fc.innerHTML = clubs.map(c => `<option ${c === focusClub ? 'selected' : ''}>${c}</option>`).join('');
  syncModeLabels();
}
function updateDock() {
  const dk = $('dock'); if (!dk || !D) return;
  const show = (playing || minute > 0) && !dockClosed;
  dk.hidden = !show; document.body.classList.toggle('dock-on', show);
  if (!show) return;
  const sc = {}; D.events.forEach(e => { if (e.goal && (e.clock ?? e.minute) <= minute) sc[e.team] = (sc[e.team] || 0) + 1; });
  const title = `Copilot live · ${Math.floor(minute)}' · ${D.fixture.home} ${sc[D.fixture.home] || 0}–${sc[D.fixture.away] || 0} ${D.fixture.away}`;
  const ovs = ((D.overlay && D.overlay.feed) || []).filter(o => o.at_minute <= minute);
  const fe = D.events.filter(e => (e.clock ?? e.minute) <= minute);
  let body;
  if (ovs.length) { const o = ovs[ovs.length - 1]; body = `${o.at_minute}' ${o.title} — ${o.body}`; }
  else if (fe.length) { const e = fe[fe.length - 1]; body = `${Math.floor(e.clock ?? e.minute)}' ${e.type} — ${e.player} (${e.team})${e.goal ? ' — GOAL' : ''}. The Copilot overlay commentary lands at the key moments.`; }
  else body = 'Kick-off — commentary anchors here as the events roll in.';
  const key = title + '|' + body + '|' + playing;
  if (window._dockKey !== key) { window._dockKey = key; $('dockTitle').textContent = title; $('dockBody').textContent = body; $('dockPlay').textContent = playing ? '⏸' : '▶'; }
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
  return { model: { xg_home: m.xg_home, xg_away: m.xg_away }, fixture: { home: m.home, away: m.away }, events, stats: { chaos_index: chaos, momentum, threshold_alerts: alerts, possession_events: { [m.home]: events.filter(e => e.team === m.home).length, [m.away]: events.filter(e => e.team === m.away).length } }, overlay: { feed: overlay },
    narrative: { why_it_matters: why, recap, narration_source: 'browser-generated-timeline (deterministic; the Azure API narrates with Phi-4-mini-instruct)' }, personalized: { casual_fan: pers(), analyst: { headline: 'Analyst view', body: `${events.length} generated events · xThreat proxy from shot volume ${m.home_shots}–${m.away_shots} · chaos ${chaos} · possession ${m.home_possession}%–${100 - m.home_possession}%.` }, player_focus: pers(), club_focus: pers(), es: { headline: 'Resumen', body: `${m.home} ${m.home_goals}–${m.away_goals} ${m.away} (sintético, jornada ${m.matchweek}). ${m.home_shots + m.away_shots} tiros en total.` } },
    graph: D.graph, graph_context: D.graph_context };
}
function donutOf(H, A) { const pe = (D.stats && D.stats.possession_events) || {}; const tot = (pe[H] || 0) + (pe[A] || 0); if (!tot) return ''; const share = (pe[H] || 0) / tot, C = 2 * Math.PI * 30;
  return `<div style="display:flex;align-items:center;gap:14px;margin-top:8px"><svg viewBox="0 0 84 84" style="width:84px;height:84px" role="img" aria-label="Donut chart of event share by team"><circle cx="42" cy="42" r="30" fill="none" stroke="#C50F1F" stroke-width="15"/><circle cx="42" cy="42" r="30" fill="none" stroke="#0F6CBD" stroke-width="15" stroke-dasharray="${(share * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 42 42)"/><text x="42" y="40" font-size="15" font-weight="600" fill="#242424" text-anchor="middle">${tot}</text><text x="42" y="54" font-size="8.5" fill="#616161" text-anchor="middle">events</text></svg><div style="font-size:12px;color:var(--text-2)"><div><span style="display:inline-block;width:9px;height:9px;background:#0F6CBD;border-radius:2px"></span> ${H} · ${pe[H] || 0}</div><div style="margin-top:3px"><span style="display:inline-block;width:9px;height:9px;background:#C50F1F;border-radius:2px"></span> ${A} · ${pe[A] || 0}</div><div style="margin-top:3px">Event share (all recorded events)</div></div></div>`; }
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
      bars += `<path d="M${x},${base} L${x},${y + 4} Q${x},${y} ${x + 4},${y} L${x + bw - 4},${y} Q${x + bw},${y} ${x + bw},${y + 4} L${x + bw},${base} Z" fill="${col}" opacity="${op}" style="transform-origin:${x + bw / 2}px ${base}px;animation:bargrow var(--durSlow) var(--curveDecelerateMax) both;animation-delay:${i * 45}ms"><title>${team} · ${m.window}' · ${v} events</title></path><text x="${x + bw / 2}" y="${y - 3}" font-size="11" font-weight="600" fill="#424242" text-anchor="middle" opacity="${op}">${v}</text>`;
    });
    bars += `<text x="${gx + bw + 1}" y="${base + 14}" font-size="10.5" fill="#616161" text-anchor="middle">${m.window}'</text>`;
  });
  return `<div style="display:flex;gap:14px;font-size:12px;color:var(--text-2);margin-bottom:4px"><span><span style="display:inline-block;width:9px;height:9px;background:#0F6CBD;border-radius:2px"></span> ${H}</span><span><span style="display:inline-block;width:9px;height:9px;background:#C50F1F;border-radius:2px"></span> ${A}</span><span style="margin-left:auto">events per 15'</span></div><svg viewBox="0 0 ${W} ${HT}" style="width:100%;height:auto" role="img" aria-label="Grouped bar chart of events per 15 minute window by team">${g}${bars}</svg>` + donutOf(H, A);
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
  const key = (snap ? D.events.indexOf(snap) : -1) + '|' + D.fixture.home + '|' + D.fixture.away; if (!force && key === pitchKey) return; pitchKey = key; pitchSnap = snap; pitchMarkers = D.events.filter(e => e.positions).map(e => ({ x: e.x, y: e.y, ev: e }));
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
  D = nd; minute = 0; playing = false; pitchKey = -2; pitchSnap = null; pitchMarkers = []; $('playBtn').textContent = '▶ Play replay';
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
$('playBtn').addEventListener('click', () => { playing = !playing; if (playing) dockClosed = false; lastTs = null; $('playBtn').textContent = playing ? '⏸ Pause' : '▶ Play replay'; if (playing) requestAnimationFrame(tick); });
$('resetBtn').addEventListener('click', () => { minute = 0; playing = false; $('playBtn').textContent = '▶ Play replay'; render(); });
const fps = $('focusPlayer'); if (fps) fps.addEventListener('change', () => { focusPlayer = fps.value; syncModeLabels(); if (mode !== 'player_focus') setMode('player_focus'); else refreshPersona(true); });
const fcs = $('focusClub'); if (fcs) fcs.addEventListener('change', () => { focusClub = fcs.value; syncModeLabels(); if (mode !== 'club_focus') setMode('club_focus'); else refreshPersona(true); });
const dkc = $('dockClose'); if (dkc) dkc.addEventListener('click', () => { dockClosed = true; updateDock(); });
const dkp = $('dockPlay'); if (dkp) dkp.addEventListener('click', () => $('playBtn').click());
const dkEl = $('dock'); if (dkEl) dkEl.addEventListener('click', e => { if (e.target.closest('button')) return; $('storyCard').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
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

/* ================= CHAOS ARCADE — hidden easter egg mode =================
   A joke skin over the same verified synthetic data. Every "novelty" number
   is arcade math computed live from the real event stream, formulas shown. */
const CH = {}; ['soccer-ball','partying-face','loudly-crying-face','face-with-symbols-on-mouth','broken-heart','beer-mug','fireworks','rocket','exploding-head','star-struck','face-screaming-in-fear','banana','party-popper','crown','fire','beaming-face','cloud-with-rain','flamingo','pizza','sparkles','high-voltage'].forEach(n => { const i = new Image(); i.src = 'assets/fluent-emoji/' + n + '.svg'; CH[n] = i; });
let chaosOpen = false, chaosCam = 'tactical', chaosParts = [], chaosFxCount = 0, chaosLastGoals = 0, chaosMetaAt = 0, chaosView = { k: 1, ox: 0, oy: 0 };
let flam = { on: false, t0: 0 }, piz = { on: false, t0: 0 }, auraUntil = 0, tifoUntil = 0;
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function chaosBall() { let prev = null, next = null; for (const e of D.events) { if (e.clock <= minute) prev = e; else { next = e; break; } } if (!prev) return { x: 52.5, y: 34 }; if (next && next.clock > prev.clock) { const f = Math.min(1, Math.max(0, (minute - prev.clock) / (next.clock - prev.clock))); return { x: prev.x + (next.x - prev.x) * f, y: prev.y + (next.y - prev.y) * f }; } return { x: prev.x, y: prev.y }; }
function chaosSnap() { let snap = null; for (const e of D.events) { if (e.minute > minute) break; if (e.positions) snap = e; } return snap; }
function chaosKeys() {
  const keys = [{ m: 0, label: "0' Kickoff", icon: 'soccer-ball' }];
  D.events.filter(e => e.goal).forEach(g => keys.push({ m: g.minute, label: `${g.minute}' GOAL — ${g.player}`, icon: 'partying-face', goal: true }));
  const shots = D.events.filter(e => e.type === 'shot' && e.shot_speed_kmh);
  if (shots.length) { const b = shots.reduce((a, b) => (b.shot_speed_kmh > a.shot_speed_kmh ? b : a)); keys.push({ m: b.minute, label: `${b.minute}' Screamer — ${b.player} ${b.shot_speed_kmh} km/h`, icon: 'high-voltage' }); }
  const passes = D.events.filter(e => e.type === 'pass' && e.distance_m);
  if (passes.length) { const b = passes.reduce((a, b) => (b.distance_m > a.distance_m ? b : a)); keys.push({ m: b.minute, label: `${b.minute}' Hollywood ball — ${b.player} ${b.distance_m}m`, icon: 'rocket' }); }
  keys.push({ m: 90, label: "90' Full time", icon: 'crown' });
  return keys.sort((a, b) => a.m - b.m);
}
function openChaos() {
  if (!D) return;
  chaosOpen = true; $('chaos').hidden = false; document.body.style.overflow = 'hidden';
  $('chaosKeys').innerHTML = chaosKeys().map((k, i) => `<button class="chaos-key" data-m="${k.m}" data-goal="${k.goal ? 1 : 0}"><img class="fe" src="assets/fluent-emoji/${k.icon}.svg" alt="">${k.label}</button>`).join('');
  document.querySelectorAll('.chaos-key').forEach(b => b.addEventListener('click', () => { minute = parseFloat(b.dataset.m); chaosLastGoals = D.events.filter(e => e.goal && e.minute <= minute).length; render(); if (b.dataset.goal === '1') { const bl = chaosBall(); spawnConfetti((bl.x * 10 * chaosView.k) + chaosView.ox, (bl.y * 10 * chaosView.k) + chaosView.oy, 130); popSound(); } updateChaosMeta(true); }));
  chaosLastGoals = D.events.filter(e => e.goal && e.minute <= minute).length;
  updateChaosMeta(true); requestAnimationFrame(chaosLoop);
}
function closeChaos() { chaosOpen = false; $('chaos').hidden = true; document.body.style.overflow = ''; }
function chaosLoop() { if (!chaosOpen) return; drawChaos(); const now = performance.now(); if (now - chaosMetaAt > 500) { chaosMetaAt = now; updateChaosMeta(false); } requestAnimationFrame(chaosLoop); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function spawnConfetti(sx, sy, n) { if (REDUCED) return; const cols = ['#00ff87', '#00d2ff', '#ffd4d6', '#FFD966', '#ffffff']; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6; chaosParts.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, rot: Math.random() * 6.3, vr: (Math.random() - .5) * .3, life: 1, col: cols[i % cols.length] }); } }
function drawChaosScene(g, k, ox, oy, W, H) {
  const X = x => ox + x * 10 * k, Y = y => oy + y * 10 * k;
  g.fillStyle = '#0b2417'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 10; i++) { if (i % 2) continue; g.fillStyle = 'rgba(255,255,255,.03)'; g.fillRect(X(i * 10.5), 0, 10.5 * 10 * k, H); }
  g.strokeStyle = 'rgba(217,228,238,.8)'; g.lineWidth = Math.max(1, 2 * k);
  g.strokeRect(X(3), Y(3), 99 * 10 * k, 62 * 10 * k);
  g.beginPath(); g.moveTo(X(52.5), Y(3)); g.lineTo(X(52.5), Y(65)); g.stroke();
  g.beginPath(); g.arc(X(52.5), Y(34), 9.15 * 10 * k, 0, 7); g.stroke();
  g.strokeRect(X(3), Y(13.84), 16.5 * 10 * k, 40.32 * 10 * k); g.strokeRect(X(85.5), Y(13.84), 16.5 * 10 * k, 40.32 * 10 * k);
  const snap = chaosSnap(), ball = chaosBall();
  if (snap) {
    const homeIdx = 0, carrierTeamIdx = snap.team === D.fixture.home ? 0 : 1;
    let ci = 0, cd = 1e9; snap.positions.forEach((q, i) => { const d = Math.hypot(q[0] - snap.x, q[1] - snap.y); if (d < cd) { cd = d; ci = i; } });
    snap.positions.forEach((q, i) => {
      let face = 'beaming-face';
      if (snap.goal) face = q[2] === carrierTeamIdx ? 'partying-face' : 'loudly-crying-face';
      if (i === 0 || i === 11) face = snap.type === 'shot' ? 'face-screaming-in-fear' : face;
      if (i === ci) face = snap.goal ? 'partying-face' : 'star-struck';
      const px = X(q[0]), py = Y(q[1]), s = Math.max(13, 30 * k), img = CH[face];
      if (i === ci) { g.beginPath(); g.arc(px, py, s * .72, 0, 7); g.strokeStyle = '#00ff87'; g.lineWidth = 2.5; g.stroke(); }
      if (img && img.complete && img.naturalWidth) g.drawImage(img, px - s / 2, py - s / 2, s, s);
      else { g.beginPath(); g.arc(px, py, s / 3, 0, 7); g.fillStyle = q[2] === 0 ? '#0F6CBD' : '#C50F1F'; g.fill(); }
    });
    const trail = D.events.filter(e => e.clock <= minute).slice(-8);
    g.strokeStyle = 'rgba(0,255,135,.5)'; g.lineWidth = 2; g.beginPath(); trail.forEach((e, i) => { i ? g.lineTo(X(e.x), Y(e.y)) : g.moveTo(X(e.x), Y(e.y)); }); g.stroke();
    let txt = null;
    if (snap.goal) txt = 'WHAT A HIT SON!';
    else if (snap.type === 'shot' && snap.shot_speed_kmh >= 110) txt = `SCREAMER! ${snap.shot_speed_kmh} KM/H`;
    else if (snap.type === 'shot') txt = 'SO CLOSE!';
    else if (snap.type === 'pass' && snap.distance_m >= 35) txt = 'HOLLYWOOD BALL!';
    else if (snap.type === 'corner') txt = 'INCOMING!';
    else if (snap.type === 'pressure') txt = 'CALMA CALMA';
    if (txt && k >= 0.9) {
      g.font = '700 13px "Segoe UI", system-ui'; const w = g.measureText(txt).width + 18, bx = Math.min(W - w - 6, Math.max(6, X(snap.x) - w / 2)), by = Math.max(6, Y(snap.y) - 58 * k);
      rr(g, bx, by, w, 24, 8); g.fillStyle = '#d9e4ee'; g.fill(); g.fillStyle = '#0a151c'; g.fillText(txt, bx + 9, by + 16);
      if (snap.goal) { const gk = snap.positions[carrierTeamIdx === 0 ? 11 : 0]; const gx = X(gk[0]), gy = Y(gk[1]); g.font = '700 12px "Segoe UI", system-ui'; const w2 = g.measureText('NO CHANCE!').width + 16; rr(g, Math.min(W - w2 - 6, Math.max(6, gx - w2 / 2)), Math.max(6, gy - 52 * k), w2, 22, 8); g.fillStyle = '#ffd4d6'; g.fill(); g.fillStyle = '#67001c'; g.fillText('NO CHANCE!', Math.min(W - w2 - 6, Math.max(6, gx - w2 / 2)) + 8, Math.max(6, gy - 52 * k) + 15); }
    }
  }
  const bp = { x: X(ball.x), y: Y(ball.y) };
  const bimg = CH['soccer-ball'], bs = Math.max(11, 17 * k);
  if (bimg && bimg.complete && bimg.naturalWidth) { g.save(); g.translate(bp.x, bp.y); g.rotate(REDUCED ? 0 : (minute * 2.2) % 6.283); g.drawImage(bimg, -bs / 2, -bs / 2, bs, bs); g.restore(); }
  else { g.beginPath(); g.arc(bp.x, bp.y, Math.max(3, 6.5 * k), 0, 7); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#0a151c'; g.lineWidth = 1.5; g.stroke(); }
  if (performance.now() < auraUntil) { g.beginPath(); g.arc(bp.x, bp.y, 30 * k + 6, 0, 7); g.strokeStyle = 'rgba(255,217,102,.9)'; g.lineWidth = 3; g.stroke(); g.beginPath(); g.arc(bp.x, bp.y, 40 * k + 8, 0, 7); g.strokeStyle = 'rgba(255,217,102,.4)'; g.stroke(); }
  const now = performance.now();
  if (flam.on) { const p = (now - flam.t0) / 7000; if (p > 1) flam.on = false; else { const fx = -5 + p * 115, fy = 34 + Math.sin(p * 6.3) * 14, img = CH['flamingo'], s = Math.max(20, 46 * k); if (img && img.complete) g.drawImage(img, X(fx) - s / 2, Y(fy) - s / 2, s, s); g.font = '700 11px "Segoe UI", system-ui'; g.fillStyle = '#ffd4d6'; g.fillText('SIR FLAPPY · PITCH INVADER', Math.min(W - 170, X(fx) - 60), Y(fy) - s / 2 - 6); } }
  if (piz.on) { const p = (now - piz.t0) / 1400; if (p > 1) piz.on = false; else { const px = -5 + p * 115, py = 6 + Math.sin(p * Math.PI) * -2 + p * 40, img = CH['pizza'], s = Math.max(16, 34 * k); g.save(); g.translate(X(px), Y(py)); g.rotate(p * 9); if (img && img.complete) g.drawImage(img, -s / 2, -s / 2, s, s); g.restore(); } }
  return bp;
}
function drawChaos() {
  const cv = $('chaosCanvas'); if (!cv || !D) return; const ctx = cv.getContext('2d'); const W = 1050, H = 680;
  const ball = chaosBall(); let k = 1, ox = 0, oy = 0;
  if (chaosCam === 'keeper' || chaosCam === 'rocket') { k = chaosCam === 'keeper' ? 2.1 : 2.7; const fx = ball.x, fy = ball.y; ox = Math.min(0, Math.max(W - 1050 * k, W / 2 - fx * 10 * k)); oy = Math.min(0, Math.max(H - 680 * k, H / 2 - fy * 10 * k)); }
  chaosView = { k, ox, oy };
  if (chaosCam === 'retro') { const oc = drawChaos._oc || (drawChaos._oc = document.createElement('canvas')); oc.width = 210; oc.height = 136; const og = oc.getContext('2d'); drawChaosScene(og, 0.2, 0, 0, 210, 136); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, W, H); ctx.drawImage(oc, 0, 0, W, H); ctx.imageSmoothingEnabled = true; }
  else drawChaosScene(ctx, k, ox, oy, W, H);
  for (let i = chaosParts.length - 1; i >= 0; i--) { const p = chaosParts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr; p.life -= 0.008; if (p.life <= 0 || p.y > H + 10) { chaosParts.splice(i, 1); continue; } ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
  ctx.globalAlpha = 1;
  const gc = D.events.filter(e => e.goal && e.minute <= minute).length;
  if (gc > chaosLastGoals) { chaosLastGoals = gc; const b = chaosBall(); spawnConfetti((b.x * 10 * k) + ox, (b.y * 10 * k) + oy, 130); popSound(); $('chaosFxLine').textContent = 'GOOOAL — the confetti cannons fired themselves. Scenes.'; }
  if (gc < chaosLastGoals) chaosLastGoals = gc;
}
function standHTML(team, other) {
  const upto = D.events.filter(e => (e.clock ?? e.minute) <= minute);
  const gF = upto.filter(e => e.goal && e.team === team).length, gA = upto.filter(e => e.goal && e.team === other).length;
  const wins = D.stats.momentum.slice(0, Math.floor(minute / 15)).filter(m => m.dominant === team).length, owins = D.stats.momentum.slice(0, Math.floor(minute / 15)).filter(m => m.dominant === other).length;
  let eu = Math.max(4, Math.min(98, Math.round(50 + 24 * (gF - gA) + 9 * (wins - owins))));
  const leading = gF > gA, trailing = gF < gA;
  const faces = leading ? ['partying-face', 'beer-mug', 'fireworks', 'rocket', 'crown', 'fire'] : trailing ? ['loudly-crying-face', 'face-with-symbols-on-mouth', 'broken-heart', 'cloud-with-rain', 'banana', 'exploding-head'] : ['beaming-face', 'beer-mug', 'fire', 'rocket', 'sparkles', 'crown'];
  const db = leading || (!trailing && eu >= 50) ? (86 + eu * 0.37).toFixed(1) + ' dB (jet engine neighbourhood)' : (24 + (100 - eu) * 0.14).toFixed(1) + ' dB (pin-drop adjacent)';
  const chant = leading ? 'CHAMPIONES! OLÉ OLÉ OLÉ!' : trailing ? (() => { const lg = [...upto].reverse().find(e => e.goal); return lg ? `Not in the ${lg.minute}' again…` : 'Still believing. Mostly.'; })() : 'ALL TO PLAY FOR — nobody is crying (yet)';
  return { eu, html: `<div class="stand-head"><span>${team} end</span><span>${leading ? 'EUPHORIA' : trailing ? 'DESPAIR' : 'HOPEFUL'} ${leading || !trailing ? eu : 100 - eu}%</span></div><div class="stand-bar"><div class="stand-fill" style="width:${eu}%;background:${trailing ? '#ff5d73' : '#00ff87'}"></div></div><div class="stand-emojis">${faces.map(f => `<img class="fe" src="assets/fluent-emoji/${f}.svg" alt="">`).join('')}</div><div class="stand-chant">"${chant}"</div><div class="small">Stadium decibel meter: ${db} — arcade math</div>` };
}
function updateChaosMeta(force) {
  if (!D) return;
  const sc = {}; D.events.forEach(e => { if (e.goal && e.minute <= minute) sc[e.team] = (sc[e.team] || 0) + 1; });
  $('chaosScore').textContent = `${D.fixture.home} ${sc[D.fixture.home] || 0} – ${sc[D.fixture.away] || 0} ${D.fixture.away}`;
  $('chaosClock').textContent = `${Math.floor(minute)}'`;
  $('chaosRecClock').textContent = `T+${String(Math.floor(minute)).padStart(2, '0')}:${String(Math.floor((minute % 1) * 60)).padStart(2, '0')}`;
  $('chaosPlay').textContent = playing ? '⏸' : '▶';
  const snap = chaosSnap();
  $('chaosLock').textContent = snap ? `TARGET LOCK: ${snap.player.toUpperCase()}` : '';
  $('chaosSnapLine').textContent = snap ? `${snap.minute}' ${snap.type} — ${snap.player} (${snap.team}) · xT ${snap.xt}${snap.shot_speed_kmh ? ` · ${snap.shot_speed_kmh} km/h` : ''}` : 'Ball in play — the next key-moment snapshot is coming.';
  const goals = D.events.filter(e => e.goal && e.minute <= minute);
  $('chaosVar').textContent = goals.length ? (minute - goals[goals.length - 1].minute < 1 ? 'VAR: CHECKING…' : 'VAR: CONFIRMED GOLAZO') : '';
  $('chaosHud').textContent = `TILT 0° · ROT 0° · FOV ${{ tactical: 68, retro: 54, keeper: 41, rocket: 33 }[chaosCam]}°`;
  document.querySelectorAll('.chaos-key').forEach(b => b.classList.toggle('on', Math.abs(parseFloat(b.dataset.m) - minute) < 0.6));
  const sh = standHTML(D.fixture.home, D.fixture.away), sa = standHTML(D.fixture.away, D.fixture.home);
  $('standHome').innerHTML = sh.html; $('standAway').innerHTML = sa.html;
  if (performance.now() < tifoUntil) { const lead = sh.eu >= sa.eu ? D.fixture.home : D.fixture.away; $('standHome').innerHTML = `<div class="stand-chant" style="font-size:16px;color:#00ff87">GIANT TIFO DROPPED: ${lead.toUpperCase()} — the whole end is one flag.</div>` + $('standHome').innerHTML; }
  const upto = D.events.filter(e => (e.clock ?? e.minute) <= minute);
  const goalsN = upto.filter(e => e.goal).length;
  const trailTeam = (sc[D.fixture.home] || 0) < (sc[D.fixture.away] || 0) ? D.fixture.home : D.fixture.away;
  const conceded = upto.filter(e => e.goal && e.team !== trailTeam).length, otConceded = upto.filter(e => e.type === 'shot' && e.on_target && e.team !== trailTeam).length;
  $('teleTears').textContent = (conceded * 7.1 + otConceded * 0.35).toFixed(1) + ' Liters';
  $('teleTearsCap').textContent = `of ${trailTeam} tears (est.) · arcade math: 7.1 L × ${conceded} goals conceded + 0.35 L × ${otConceded} on-target shots conceded`;
  $('teleGiggles').textContent = (D.stats.chaos_index * 10 * (1 + 0.25 * goalsN)).toFixed(2) + ' xG';
  $('teleGigglesCap').textContent = `expected giggles · chaos index ${D.stats.chaos_index} × 10, +25% per goal (${goalsN} so far)`;
  $('teleFives').textContent = (upto.length * 13 + chaosFxCount * 25).toLocaleString('en-US');
  $('teleFivesCap').textContent = `community high fives · 13 × ${upto.length} events so far + 25 × ${chaosFxCount} soundboard triggers`;
  const maxW = Math.max(...D.stats.momentum.slice(0, Math.floor(minute / 15) + 1).map(m => m.events), 0);
  $('teleDb').textContent = (84 + maxW * 1.35).toFixed(1) + ' dB';
  $('teleDbCap').textContent = `acoustic peak · loudest 15' window so far: ${maxW} events × 1.35 + 84 base`;
  $('chaosKeyName').textContent = snap ? `Active keyframe: ${snap.minute}' ${snap.type} — ${snap.player}` : '';
}
let AC = null;
function tone(freq, dur, type, vol, when) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, AC.currentTime + (when || 0)); g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + (when || 0) + dur); o.connect(g); g.connect(AC.destination); o.start(AC.currentTime + (when || 0)); o.stop(AC.currentTime + (when || 0) + dur); } catch (e) {} }
function hornSound() { tone(466, 0.8, 'sawtooth', 0.10, 0); tone(622, 0.8, 'sawtooth', 0.08, 0); tone(233, 0.8, 'square', 0.05, 0); }
function popSound() { tone(880, 0.12, 'triangle', 0.12, 0); tone(1320, 0.1, 'triangle', 0.08, 0.05); }
function whistleSound() { tone(2350, 0.5, 'square', 0.04, 0); tone(2350, 0.3, 'square', 0.04, 0.6); }
document.querySelectorAll('.chaos-fx').forEach(b => b.addEventListener('click', () => {
  chaosFxCount++; const fx = b.dataset.fx, line = $('chaosFxLine'), now = performance.now();
  if (fx === 'airhorn') { hornSound(); line.textContent = 'AIRHORN BLAST — synthesized honk delivered. The neighbours have questions.'; }
  if (fx === 'pizza') { piz = { on: true, t0: now }; line.textContent = 'Pizza slice airborne. Tunnel drama levels rising.'; }
  if (fx === 'flamingo') { flam = { on: true, t0: now }; line.textContent = 'Sir Flappy has entered the pitch. Security is doing nothing.'; }
  if (fx === 'confetti') { const bl = chaosBall(); spawnConfetti((bl.x * 10 * chaosView.k) + chaosView.ox, (bl.y * 10 * chaosView.k) + chaosView.oy, 150); popSound(); line.textContent = 'CONFETTI STORM — the tifo budget is gone and nobody regrets it.'; }
  if (fx === 'aura') { auraUntil = now + 3500; tone(196, 0.5, 'sawtooth', 0.05, 0); tone(392, 0.5, 'sawtooth', 0.04, 0.1); line.textContent = 'SAIYAN GOAL AURA — power level comfortably above 9000 for 3.5 seconds.'; }
  if (fx === 'tifo') { tifoUntil = now + 5000; whistleSound(); line.textContent = 'GIANT TIFO DROP — check the stands card. Choreography: elite.'; }
  updateChaosMeta(true);
}));
document.querySelectorAll('.chaos-cam').forEach(b => b.addEventListener('click', () => { chaosCam = b.dataset.cam; document.querySelectorAll('.chaos-cam').forEach(x => x.classList.toggle('on', x === b)); updateChaosMeta(true); }));
$('chaosClose').addEventListener('click', closeChaos);
$('chaosPlay').addEventListener('click', () => $('playBtn').click());
$('chaosBack').addEventListener('click', () => { minute = Math.max(0, minute - 10); render(); updateChaosMeta(true); });
$('chaosFwd').addEventListener('click', () => { minute = Math.min(90, minute + 10); render(); updateChaosMeta(true); });
$('chaosConfetti').addEventListener('click', () => { chaosFxCount++; const bl = chaosBall(); spawnConfetti((bl.x * 10 * chaosView.k) + chaosView.ox, (bl.y * 10 * chaosView.k) + chaosView.oy, 130); popSound(); updateChaosMeta(true); });
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konIdx = 0;
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && chaosOpen) { closeChaos(); return; }
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konIdx = (k === KONAMI[konIdx]) ? konIdx + 1 : (k === KONAMI[0] ? 1 : 0);
  if (konIdx === KONAMI.length) { konIdx = 0; openChaos(); }
});
let logoTaps = [];
const lb = $('logoBall'); if (lb) lb.addEventListener('click', () => { const now = Date.now(); logoTaps = logoTaps.filter(t => now - t < 3000); logoTaps.push(now); if (logoTaps.length >= 7) { logoTaps = []; openChaos(); } });

/* ================= PRIDE MATCHDAY — visible celebration mode =================
   Same verified synthetic match, rainbow stadium skin. Sentiment reuses the
   Chaos arcade math, framed positively for both ends. */
['rainbow','rainbow-flag','red-heart','orange-heart','yellow-heart','green-heart','blue-heart','purple-heart'].forEach(n => { const i = new Image(); i.src = 'assets/fluent-emoji/' + n + '.svg'; CH[n] = i; });
const PRIDE_COLORS = ['#E40303', '#FF8A00', '#FFED00', '#008026', '#244EE0', '#732982'];
const TRANS_COLORS = ['#5BCFFA', '#F5ABB9', '#FFFFFF'];
let prideOpen = false, prideCam = 'tactical', prideParts = [], prideFxCount = 0, prideLastGoals = 0, prideMetaAt = 0, prideView = { k: 1, ox: 0, oy: 0 };
let pFlam = { on: false, t0: 0 }, pAuraUntil = 0, pTifoUntil = 0, discoUntil = 0;
function openPride() {
  if (!D) return;
  prideOpen = true; $('pride').hidden = false; document.body.style.overflow = 'hidden';
  $('prideKeys').innerHTML = chaosKeys().map(k => `<button class="chaos-key" data-m="${k.m}" data-goal="${k.goal ? 1 : 0}"><img class="fe" src="assets/fluent-emoji/${k.icon}.svg" alt="">${k.label}</button>`).join('');
  document.querySelectorAll('#prideKeys .chaos-key').forEach(b => b.addEventListener('click', () => { minute = parseFloat(b.dataset.m); prideLastGoals = D.events.filter(e => e.goal && e.minute <= minute).length; render(); if (b.dataset.goal === '1') { const bl = chaosBall(); spawnPrideConfetti((bl.x * 10 * prideView.k) + prideView.ox, (bl.y * 10 * prideView.k) + prideView.oy, 130); popSound(); } updatePrideMeta(); }));
  prideLastGoals = D.events.filter(e => e.goal && e.minute <= minute).length;
  updatePrideMeta(); requestAnimationFrame(prideLoop);
}
function closePride() { prideOpen = false; $('pride').hidden = true; document.body.style.overflow = ''; }
function prideLoop() { if (!prideOpen) return; drawPride(); const now = performance.now(); if (now - prideMetaAt > 500) { prideMetaAt = now; updatePrideMeta(); } requestAnimationFrame(prideLoop); }
function spawnPrideConfetti(sx, sy, n) { if (REDUCED) return; for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 6; prideParts.push({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, rot: Math.random() * 6.3, vr: (Math.random() - .5) * .3, life: 1, col: PRIDE_COLORS[i % 6] }); } }
function drawPrideScene(g, k, ox, oy, W, H) {
  const X = x => ox + x * 10 * k, Y = y => oy + y * 10 * k;
  g.fillStyle = '#0b2417'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 12; i++) { g.fillStyle = PRIDE_COLORS[i % 6] + '24'; g.fillRect(X(i * 8.75), 0, 8.75 * 10 * k, H); }
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = Math.max(1, 2 * k);
  g.strokeRect(X(3), Y(3), 99 * 10 * k, 62 * 10 * k);
  g.beginPath(); g.moveTo(X(52.5), Y(3)); g.lineTo(X(52.5), Y(65)); g.stroke();
  g.beginPath(); g.arc(X(52.5), Y(34), 9.15 * 10 * k, 0, 7); g.stroke();
  g.strokeRect(X(3), Y(13.84), 16.5 * 10 * k, 40.32 * 10 * k); g.strokeRect(X(85.5), Y(13.84), 16.5 * 10 * k, 40.32 * 10 * k);
  const snap = chaosSnap(), ball = chaosBall();
  if (snap) {
    let ci = 0, cd = 1e9; snap.positions.forEach((q, i) => { const d = Math.hypot(q[0] - snap.x, q[1] - snap.y); if (d < cd) { cd = d; ci = i; } });
    snap.positions.forEach((q, i) => {
      const px = X(q[0]), py = Y(q[1]);
      g.beginPath(); g.arc(px, py, Math.max(4, 8 * k), 0, 7); g.fillStyle = q[2] === 0 ? PRIDE_COLORS[i % 6] : TRANS_COLORS[i % 3]; g.fill(); g.strokeStyle = 'rgba(10,21,28,.65)'; g.lineWidth = 1.5; g.stroke();
      if (i === ci) { g.beginPath(); g.arc(px, py, Math.max(7, 13 * k), 0, 7); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); const img = CH[snap.goal ? 'partying-face' : 'star-struck'], s = Math.max(14, 30 * k); if (img && img.complete && img.naturalWidth) g.drawImage(img, px - s / 2, py - s - 4, s, s); }
    });
    const trail = D.events.filter(e => e.clock <= minute).slice(-8);
    if (trail.length > 1) { const grad = g.createLinearGradient(X(trail[0].x), Y(trail[0].y), X(ball.x), Y(ball.y)); PRIDE_COLORS.forEach((c, i) => grad.addColorStop(i / 5, c)); g.strokeStyle = grad; g.lineWidth = 3; g.beginPath(); trail.forEach((e, i) => { i ? g.lineTo(X(e.x), Y(e.y)) : g.moveTo(X(e.x), Y(e.y)); }); g.lineTo(X(ball.x), Y(ball.y)); g.stroke(); }
    let txt = null;
    if (snap.goal) txt = 'GOOOAAAL OF LOVE!';
    else if (snap.type === 'shot' && snap.shot_speed_kmh >= 110) txt = `SPECTACULAR! ${snap.shot_speed_kmh} KM/H`;
    else if (snap.type === 'pass' && snap.distance_m >= 35) txt = 'RAINBOW BALL!';
    else if (snap.type === 'corner') txt = 'EVERYBODY UP!';
    if (txt && k >= 0.9) { g.font = '700 13px "Segoe UI", system-ui'; const w = g.measureText(txt).width + 18, bx = Math.min(W - w - 6, Math.max(6, X(snap.x) - w / 2)), by = Math.max(6, Y(snap.y) - 62 * k); rr(g, bx, by, w, 24, 8); g.fillStyle = '#fff'; g.fill(); g.fillStyle = '#0a151c'; g.fillText(txt, bx + 9, by + 16); }
  }
  const bp = { x: X(ball.x), y: Y(ball.y) };
  const bimg = CH['soccer-ball'], bs = Math.max(11, 17 * k);
  if (bimg && bimg.complete && bimg.naturalWidth) { g.save(); g.translate(bp.x, bp.y); g.rotate(REDUCED ? 0 : (minute * 2.2) % 6.283); g.drawImage(bimg, -bs / 2, -bs / 2, bs, bs); g.restore(); }
  else { g.beginPath(); g.arc(bp.x, bp.y, Math.max(3, 6.5 * k), 0, 7); g.fillStyle = '#fff'; g.fill(); }
  if (performance.now() < pAuraUntil) { for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(bp.x, bp.y, (26 + i * 5) * k + 6, i * 1.047, i * 1.047 + 0.8); g.strokeStyle = PRIDE_COLORS[i]; g.lineWidth = 3; g.stroke(); } }
  const now = performance.now();
  if (pFlam.on) { const p = (now - pFlam.t0) / 7000; if (p > 1) pFlam.on = false; else { const fx = -5 + p * 115, fy = 34 + Math.sin(p * 6.3) * 14, img = CH['flamingo'], s = Math.max(20, 46 * k); if (img && img.complete) g.drawImage(img, X(fx) - s / 2, Y(fy) - s / 2, s, s); g.font = '700 11px "Segoe UI", system-ui'; g.fillStyle = '#F5ABB9'; g.fillText('SIR FLAPPY · STRUTTING', Math.min(W - 160, X(fx) - 55), Y(fy) - s / 2 - 6); } }
  if (now < discoUntil && !REDUCED) { for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(Math.random() * W, Math.random() * H, 2.2, 0, 7); g.fillStyle = PRIDE_COLORS[i % 6]; g.globalAlpha = 0.75; g.fill(); } g.globalAlpha = 1; }
  return bp;
}
function drawPride() {
  const cv = $('prideCanvas'); if (!cv || !D) return; const ctx = cv.getContext('2d'); const W = 1050, H = 680;
  const ball = chaosBall(); let k = 1, ox = 0, oy = 0;
  if (prideCam === 'keeper' || prideCam === 'rocket') { k = prideCam === 'keeper' ? 2.1 : 2.7; ox = Math.min(0, Math.max(W - 1050 * k, W / 2 - ball.x * 10 * k)); oy = Math.min(0, Math.max(H - 680 * k, H / 2 - ball.y * 10 * k)); }
  prideView = { k, ox, oy };
  if (prideCam === 'retro') { const oc = drawPride._oc || (drawPride._oc = document.createElement('canvas')); oc.width = 210; oc.height = 136; drawPrideScene(oc.getContext('2d'), 0.2, 0, 0, 210, 136); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, W, H); ctx.drawImage(oc, 0, 0, W, H); ctx.imageSmoothingEnabled = true; }
  else drawPrideScene(ctx, k, ox, oy, W, H);
  for (let i = prideParts.length - 1; i >= 0; i--) { const p = prideParts[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr; p.life -= 0.008; if (p.life <= 0 || p.y > H + 10) { prideParts.splice(i, 1); continue; } ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
  ctx.globalAlpha = 1;
  const gc = D.events.filter(e => e.goal && e.minute <= minute).length;
  if (gc > prideLastGoals) { prideLastGoals = gc; const b = chaosBall(); spawnPrideConfetti((b.x * 10 * k) + ox, (b.y * 10 * k) + oy, 140); popSound(); $('prideFxLine').textContent = 'GOOOAAAL OF LOVE — rainbow cannons fired. Pure euphoria.'; }
  if (gc < prideLastGoals) prideLastGoals = gc;
}
function prideStand(team, other) {
  const upto = D.events.filter(e => (e.clock ?? e.minute) <= minute);
  const gF = upto.filter(e => e.goal && e.team === team).length, gA = upto.filter(e => e.goal && e.team === other).length;
  const wins = D.stats.momentum.slice(0, Math.floor(minute / 15)).filter(m => m.dominant === team).length, owins = D.stats.momentum.slice(0, Math.floor(minute / 15)).filter(m => m.dominant === other).length;
  const eu = Math.max(4, Math.min(98, Math.round(50 + 24 * (gF - gA) + 9 * (wins - owins))));
  const leading = gF > gA, trailing = gF < gA;
  const hearts = ['red-heart', 'orange-heart', 'yellow-heart', 'green-heart', 'blue-heart', 'purple-heart', 'rainbow', 'partying-face'];
  const chant = leading ? 'CHAMPIONES! LOVE WINS!' : trailing ? 'Heartbroken, proud, and still singing.' : 'Singing out loud & proud!';
  return { eu, html: `<div class="stand-head"><span>${team} end</span><span>${leading ? 'RAINBOW EUPHORIA' : trailing ? 'PASSIONATE LOVE' : 'ALL LOVE'} ${eu}%</span></div><div class="stand-bar"><div class="stand-fill" style="width:${eu}%;background:linear-gradient(90deg,#E40303,#FF8A00,#FFED00,#008026,#244EE0,#732982)"></div></div><div class="stand-emojis">${hearts.map(f => `<img class="fe" src="assets/fluent-emoji/${f}.svg" alt="">`).join('')}</div><div class="stand-chant">"${chant}"</div><div class="small">Decibel peak: ${(86 + eu * 0.37).toFixed(1)} dB of joy — arcade math</div>` };
}
function updatePrideMeta() {
  if (!D) return;
  const sc = {}; D.events.forEach(e => { if (e.goal && e.minute <= minute) sc[e.team] = (sc[e.team] || 0) + 1; });
  $('prideScore').textContent = `${D.fixture.home} ${sc[D.fixture.home] || 0} – ${sc[D.fixture.away] || 0} ${D.fixture.away}`;
  $('prideClock').textContent = `${Math.floor(minute)}'`;
  $('prideRecClock').textContent = `T+${String(Math.floor(minute)).padStart(2, '0')}:${String(Math.floor((minute % 1) * 60)).padStart(2, '0')}`;
  $('pridePlay').textContent = playing ? '⏸' : '▶';
  const snap = chaosSnap();
  $('prideLock').textContent = snap ? `TARGET LOCK: ${snap.player.toUpperCase()}` : '';
  $('prideSnapLine').textContent = snap ? `${snap.minute}' ${snap.type} — ${snap.player} (${snap.team}) · xT ${snap.xt}${snap.shot_speed_kmh ? ` · ${snap.shot_speed_kmh} km/h` : ''}` : 'Ball in play — the next key-moment snapshot is coming.';
  const sh = prideStand(D.fixture.home, D.fixture.away), sa = prideStand(D.fixture.away, D.fixture.home);
  $('prideStandHome').innerHTML = sh.html; $('prideStandAway').innerHTML = sa.html;
  if (performance.now() < pTifoUntil) $('prideStandHome').innerHTML = `<div class="stand-chant" style="font-size:16px;background:linear-gradient(90deg,#E40303,#FF8A00,#FFED00,#008026,#244EE0,#732982);-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:900">GIANT LOVE TIFO: LOVE WINS — the whole end is one heart.</div>` + $('prideStandHome').innerHTML;
  const share = Math.round(100 * sh.eu / Math.max(1, sh.eu + sa.eu));
  $('prideBarHome').style.width = share + '%'; $('prideBarAway').style.width = (100 - share) + '%';
  $('prideHomeLabel').textContent = `${D.fixture.home} pride — love ${sh.eu}%`; $('prideAwayLabel').textContent = `${D.fixture.away} pride — love ${sa.eu}%`;
  const goals = D.events.filter(e => e.goal && e.minute <= minute);
  const recent = goals.length && (minute - goals[goals.length - 1].minute) < 2 ? goals[goals.length - 1] : null;
  const gb = $('prideGoalBanner'); gb.hidden = !recent; if (recent) gb.textContent = `GOOOAAAL OF LOVE! ${recent.minute}' — ${recent.player}`;
  document.querySelectorAll('#prideKeys .chaos-key').forEach(b => b.classList.toggle('on', Math.abs(parseFloat(b.dataset.m) - minute) < 0.6));
  $('prideKeyName').textContent = snap ? `Active keyframe: ${snap.minute}' ${snap.type} — ${snap.player}` : '';
  const upto = D.events.filter(e => (e.clock ?? e.minute) <= minute);
  $('pTeleFives').textContent = (upto.length * 13 + prideFxCount * 25).toLocaleString('en-US');
  $('pTeleFivesCap').textContent = `hugs & high fives · 13 × ${upto.length} events + 25 × ${prideFxCount} soundboard triggers`;
  $('pTeleTears').textContent = (goals.length * 7.1).toFixed(1) + ' Liters';
  $('pTeleTearsCap').textContent = `of happy tears · arcade math: 7.1 L per goal celebrated (${goals.length} so far), joy edition`;
  const maxW = Math.max(...D.stats.momentum.slice(0, Math.floor(minute / 15) + 1).map(m => m.events), 0);
  $('pTeleDb').textContent = (84 + maxW * 1.35).toFixed(1) + ' dB';
  $('pTeleDbCap').textContent = `acoustic pride peak · loudest 15' window: ${maxW} events × 1.35 + 84 base`;
  $('pTeleGiggles').textContent = (D.stats.chaos_index * 10 * (1 + 0.25 * goals.length)).toFixed(2) + ' xG';
  $('pTeleGigglesCap').textContent = `expected giggles · chaos index ${D.stats.chaos_index} × 10, +25% per goal`;
}
document.querySelectorAll('.pride-fx').forEach(b => b.addEventListener('click', () => {
  prideFxCount++; const fx = b.dataset.fx, line = $('prideFxLine'), now = performance.now(), bl = chaosBall(), sx = (bl.x * 10 * prideView.k) + prideView.ox, sy = (bl.y * 10 * prideView.k) + prideView.oy;
  if (fx === 'airhorn') { hornSound(); tone(523, 0.4, 'triangle', 0.07, 0.55); tone(659, 0.4, 'triangle', 0.07, 0.65); tone(784, 0.5, 'triangle', 0.07, 0.75); line.textContent = 'RAINBOW AIRHORN — honk, but fabulous, with a major-key sparkle on top.'; }
  if (fx === 'disco') { discoUntil = now + 4000; tone(392, 0.3, 'triangle', 0.06, 0); tone(523, 0.3, 'triangle', 0.06, 0.12); tone(659, 0.3, 'triangle', 0.06, 0.24); line.textContent = 'DISCO BALL DROP — glitter over the pitch for four fabulous seconds.'; }
  if (fx === 'flamingo') { pFlam = { on: true, t0: now }; line.textContent = 'Sir Flappy is strutting. An icon, obviously.'; }
  if (fx === 'smoke') { spawnPrideConfetti(20, 340, 90); spawnPrideConfetti(1030, 340, 90); popSound(); line.textContent = 'PRIDE SMOKE STORM — rainbow flares from both ends. Inclusive pyrotechnics.'; }
  if (fx === 'aura') { pAuraUntil = now + 3500; line.textContent = 'PRISMATIC AURA — the ball carrier is glowing in all six colours.'; }
  if (fx === 'tifo') { pTifoUntil = now + 5000; whistleSound(); line.textContent = 'GIANT LOVE TIFO — check the stands. LOVE WINS, full choreography.'; }
  updatePrideMeta();
}));
document.querySelectorAll('.pride-cam').forEach(b => b.addEventListener('click', () => { prideCam = b.dataset.cam; document.querySelectorAll('.pride-cam').forEach(x => x.classList.toggle('on', x === b)); }));
$('prideBtn').addEventListener('click', openPride);
$('prideClose').addEventListener('click', closePride);
$('pridePlay').addEventListener('click', () => $('playBtn').click());
$('prideBack').addEventListener('click', () => { minute = Math.max(0, minute - 10); render(); updatePrideMeta(); });
$('prideFwd').addEventListener('click', () => { minute = Math.min(90, minute + 10); render(); updatePrideMeta(); });
$('prideConfetti').addEventListener('click', () => { prideFxCount++; const bl = chaosBall(); spawnPrideConfetti((bl.x * 10 * prideView.k) + prideView.ox, (bl.y * 10 * prideView.k) + prideView.oy, 150); popSound(); updatePrideMeta(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && prideOpen) closePride(); });
