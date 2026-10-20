// Football Universe Copilot — live replay + force-directed graph. No dependencies.
let D, minute = 0, playing = false, lastTs = null, shown = 0, mode = 'casual_fan';
const $ = id => document.getElementById(id);
const scoreAt = m => { const s = { Arsenal: 0, 'Manchester City': 0 }; for (const e of D.events) { if (e.minute <= m && e.goal) s[e.team]++; } return s; };
function render() {
  const s = scoreAt(minute);
  $('score').textContent = `${s.Arsenal} – ${s['Manchester City']}`;
  $('clock').textContent = `${Math.floor(minute)}'`;
  $('scrub').value = minute;
  const evs = D.events.filter(e => e.minute <= minute);
  const feed = evs.slice(-14).reverse();
  $('feed').innerHTML = feed.map(e => `<li class="${e.goal ? 'goal' : ''}">${e.minute}' <strong>${e.type}</strong> — ${e.player} (${e.team})${e.goal ? ' ⚽ GOAL' : ''}${e.type === 'shot' ? ` · ${e.shot_speed_kmh} km/h${e.on_target ? ' · on target' : ''}` : ''}${e.type === 'pass' ? ` · ${e.distance_m}m · difficulty ${e.difficulty}` : ''}${e.type === 'pressure' ? ` · intensity ${e.pressure_intensity}` : ''}</li>`).join('');
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
  minute += dt * (parseFloat($('speed').value) * 0.5); // match-minutes per real second at 1x = 0.5
  if (minute >= 90) { minute = 90; playing = false; $('playBtn').textContent = '▶ Play replay'; }
  render(); if (playing) requestAnimationFrame(tick);
}
// ---- force-directed graph (small custom physics, canvas) ----
let nodes = [], links = [], pathAnim = null;
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
      ctx.fillStyle = col[n.kind] || '#888'; ctx.beginPath(); ctx.arc(n.x, n.y, onPath ? r + 4 : r, 0, 7); ctx.fill();
      if (onPath) { ctx.strokeStyle = '#f5c542'; ctx.lineWidth = 3; ctx.stroke(); }
      ctx.fillStyle = '#dbe4ff'; ctx.font = '11px system-ui'; ctx.fillText(n.id, n.x + r + 3, n.y + 3);
    }
    if (pathAnim != null) pathAnim += 0.016;
    requestAnimationFrame(step);
  }
  step();
  cv.addEventListener('click', ev => {
    const rect = cv.getBoundingClientRect(), x = (ev.clientX - rect.left) * (W / rect.width), y = (ev.clientY - rect.top) * (H / rect.height);
    const n = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 18);
    if (n) $('nodeInfo').textContent = `${n.id} (${n.kind}) — ${n.degree} connections · Kevin Bacon Score ${n.kevin_bacon_score ?? 'n/a'}/10`;
  });
  $('pathBtn').addEventListener('click', () => { pathAnim = pathAnim == null ? 0 : null; });
}
async function load() {
  D = await (await fetch('data.json')).json();
  $('homeName').textContent = D.fixture.home; $('awayName').textContent = D.fixture.away;
  $('board').innerHTML = D.graph_context.leaderboard.map(x => `<li>${x.name} — <strong>${x.kevin_bacon_score}/10</strong> (${x.degree} connections)</li>`).join('');
  $('why').innerHTML = D.narrative.why_it_matters.map(x => `<li>${x}</li>`).join('');
  $('recap').textContent = D.narrative.recap;
  setMode('casual_fan'); render(); initGraph();
}
$('playBtn').addEventListener('click', () => { playing = !playing; lastTs = null; $('playBtn').textContent = playing ? '⏸ Pause' : '▶ Play replay'; if (playing) requestAnimationFrame(tick); });
$('resetBtn').addEventListener('click', () => { minute = 0; playing = false; $('playBtn').textContent = '▶ Play replay'; render(); });
$('scrub').addEventListener('input', e => { minute = parseFloat(e.target.value); render(); });
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
load().catch(() => { $('modeBody').textContent = 'Could not load data.json — serve this folder over http (python3 -m http.server) or view the live GitHub Pages demo.'; });
