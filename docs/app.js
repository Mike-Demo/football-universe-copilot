// Football Universe Copilot — live replay + force-directed graph. No dependencies.
let D, minute = 0, playing = false, lastTs = null, shown = 0, mode = 'casual_fan';
const $ = id => document.getElementById(id);
const scoreAt = m => { const s = { [D.fixture.home]: 0, [D.fixture.away]: 0 }; for (const e of D.events) { if (e.minute <= m && e.goal) s[e.team]++; } return s; };
function render() {
  const s = scoreAt(minute);
  $('score').textContent = `${s[D.fixture.home]} – ${s[D.fixture.away]}`;
  $('clock').textContent = `${Math.floor(minute)}'`;
  $('scrub').value = minute;
  const evs = D.events.filter(e => e.minute <= minute);
  const feed = evs.slice(-14).reverse();
  $('feed').innerHTML = feed.map(e => `<li class="${e.goal ? 'goal' : ''}">${e.minute}' <strong>${e.type}</strong> — ${e.player} (${e.team})${e.goal ? ' ⚽ GOAL' : ''}${e.type === 'shot' ? ` · ${e.shot_speed_kmh} km/h${e.on_target ? ' · on target' : ''}` : ''}${e.type === 'pass' ? ` · ${e.distance_m}m · difficulty ${e.difficulty}` : ''}${e.type === 'pressure' ? ` · intensity ${e.pressure_intensity}` : ''}${e.threshold_alerts ? ' ⚡ ' + e.threshold_alerts.join(', ') : ''}</li>`).join('');
  const shots = evs.filter(e => e.type === 'shot').length, passes = evs.filter(e => e.type === 'pass').length;
  $('liveStats').textContent = `${evs.length} events so far · ${shots} shots · ${passes} passes · chaos index (full match) ${D.stats.chaos_index}`;
  const ov = [...D.overlay.feed].reverse().find(o => o.at_minute <= minute);
  if (ov) { $('overlayCard').hidden = false; $('overlayText').textContent = `${ov.at_minute}' — ${ov.title}: ${ov.body}`; }
  const w = Math.min(5, Math.floor(minute / 15));
  $('momentum').innerHTML = D.stats.momentum.map((m, i) => `<div class="mbar"><span>${m.window}'</span><div class="bar" style="width:${Math.min(100, m.events * 2)}%;${i === w ? 'background:#cc7a00' : ''}"></div><span>${m.dominant || ''} · ${m.events}</span></div>`).join('');
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
  render(); if (playing) requestAnimationFrame(tick);
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
      ctx.strokeStyle = onPath ? '#f5c542' : 'rgba(160,175,205,.35)'; ctx.lineWidth = onPath ? 4 : 1;
      ctx.beginPath(); ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y); ctx.stroke();
    }
    for (const n of nodes) {
      const r = 7 + (n.kevin_bacon_score || 0) * 2.4;
      const onPath = pathAnim != null && path.includes(n.id);
      const isSel = selectedNode && selectedNode.id === n.id;
      ctx.fillStyle = col[n.kind] || '#888'; ctx.beginPath(); ctx.arc(n.x, n.y, (onPath || isSel) ? r + 4 : r, 0, 7); ctx.fill();
      if (onPath || isSel) { ctx.strokeStyle = isSel ? '#ffffff' : '#f5c542'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.fillStyle = '#dbe4ff'; ctx.font = '11px system-ui'; ctx.fillText(n.id, n.x + r + 3, n.y + 3);
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
  for (let w = 0; w < 6; w++) { const evs = events.filter(e => e.minute >= w * 15 && e.minute < (w + 1) * 15); const h = evs.filter(e => e.team === m.home).length; momentum.push({ window: `${w * 15}-${(w + 1) * 15}`, events: evs.length, dominant: h * 2 > evs.length ? m.home : (h * 2 < evs.length ? m.away : 'Even') }); }
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
    narrative: { why_it_matters: why, recap }, personalized: { casual_fan: pers(), analyst: { headline: 'Analyst view', body: `${events.length} generated events · xThreat proxy from shot volume ${m.home_shots}–${m.away_shots} · chaos ${chaos} · possession ${m.home_possession}%–${100 - m.home_possession}%.` }, player_focus: pers(), club_focus: pers(), es: { headline: 'Resumen', body: `${m.home} ${m.home_goals}–${m.away_goals} ${m.away} (sintético, jornada ${m.matchweek}). ${m.home_shots + m.away_shots} tiros en total.` } },
    graph: D.graph, graph_context: D.graph_context };
}
function applyMatch(nd, label) {
  D = nd; minute = 0; playing = false; $('playBtn').textContent = '▶ Play replay';
  $('homeName').textContent = D.fixture.home; $('awayName').textContent = D.fixture.away;
  $('matchLabel').textContent = label;
  setMode(mode); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
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
    applyMatch(genMatchData(m, lg), `${lg.competition} · Matchweek ${m.matchweek}`);
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
  setMode('casual_fan'); render(); initGraph();
  try { const season = await (await fetch('season.json')).json(); initPicker(season); } catch (e) { /* picker optional */ }
}
$('playBtn').addEventListener('click', () => { playing = !playing; lastTs = null; $('playBtn').textContent = playing ? '⏸ Pause' : '▶ Play replay'; if (playing) requestAnimationFrame(tick); });
$('resetBtn').addEventListener('click', () => { minute = 0; playing = false; $('playBtn').textContent = '▶ Play replay'; render(); });
$('scrub').addEventListener('input', e => { minute = parseFloat(e.target.value); render(); });
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
load().catch(() => { $('modeBody').textContent = 'Could not load data.json — serve this folder over http (python3 -m http.server) or view the live GitHub Pages demo.'; });
