// Builds the Reveal.js deck from the section modules.
// A slide is { layout, title, steps, fig(F), html, notes, cite, live }:
//  - steps: one sentence per press of →. Step 0 is on screen when the slide opens.
//    A step is a string or { say, tag }; the tag (a few words) stays on screen once the step is past.
//  - fig(F): draws the figure. F.at(i) returns the SVG group that appears at step i (0 = always there);
//    F.at(i, 'fade-out') returns a group that disappears at step i. F.chart(opts) is a psychrometric chart.
//  - html: for 'text' slides; any element with data-step="i" appears at step i.
// Every step-i element becomes a Reveal fragment with index i − 1, so the speaker view, the overview
// and PDF export (?print-pdf) all follow the same steps.

import { el, C } from './lib/svg.js';
import { pchart, rhFromW, h as enth } from './lib/pchart.js';
import S0 from './sections/s0-intro.js';
import S1 from './sections/s1-air.js';
import S2 from './sections/s2-moves.js';
import S3 from './sections/s3-ahu.js';
import S4 from './sections/s4-plant.js';
import S5 from './sections/s5-systems.js';
import S6 from './sections/s6-design.js';
import S7 from './sections/s7-fooled.js';

// ?deck=fooled opens the short "Don't get fooled" deck on its own
const DECK = new URLSearchParams(location.search).get('deck');
const SECTIONS = DECK === 'fooled' ? [{ ...S7, n: 0 }] : [S0, S1, S2, S3, S4, S5, S6];
if (DECK === 'fooled') document.title = 'Don’t get fooled · Airport Building Systems';
const FIG = { split: [900, 640], wide: [1500, 560] };
const esc = s => String(s).replace(/&(?![a-z#0-9]+;)/gi, '&amp;');
// a bad formula must show as red source text, never break the slide
if (window.katex) { const render = katex.renderToString; katex.renderToString = (s, o = {}) => render(s, { throwOnError: false, ...o }); }
// output 'mathml' for the speaker notes: their window has no KaTeX stylesheet, so the HTML copy would show twice
const tex = (src, display = false, output = 'htmlAndMathml') => window.katex ? katex.renderToString(src, { displayMode: display, throwOnError: false, output }) : src;
// **bold**, _italic_, $inline maths$ and $$display maths$$ (LaTeX, rendered with KaTeX)
const md = (s, out) => String(s).split(/(\$\$[^$]+\$\$|\$[^$]+\$)/).map(seg =>
  seg.startsWith('$$') ? tex(seg.slice(2, -2), true, out)
  : seg.length > 2 && seg.startsWith('$') && seg.endsWith('$') ? tex(seg.slice(1, -1), false, out)
  : esc(seg).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<i>$2</i>')).join('');
const fmt = (v, d = 1) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d).replace('-', '−');
const stepOf = s => typeof s === 'string' ? { say: s } : s;
const tagOf = s => s.tag ?? s.say.replace(/\*\*/g, '').split(/[.:;,]/)[0].split(' ').slice(0, 7).join(' ');

function fragment(node, i, extra) {
  if (i < 1) return;
  node.classList.add('fragment');
  if (extra) extra.split(' ').forEach(c => node.classList.add(c));
  node.setAttribute('data-fragment-index', i - 1);
}

function makeFig(holder, layout, spec) {
  const [W, H] = FIG[layout] ?? FIG.split;
  const svg = el(holder, 'svg', { viewBox: `0 0 ${W} ${H}`, class: 'fig-svg' });
  el(svg, 'defs');
  const groups = new Map();
  const F = {
    svg, W, H, C,
    at(i = 0, cls) {
      const key = i + '|' + (cls || '');
      if (!groups.has(key)) { const g = el(svg, 'g', { 'data-step': i }); fragment(g, i, cls); groups.set(key, g); }
      return groups.get(key);
    },
    chart: opts => pchart(opts),
    // HTML inside the drawing, appearing with step i: a box at (x, y), w × hh
    html(i, x, y, w, hh, inner, cls = '') {
      const fo = el(F.at(i), 'foreignObject', { x, y, width: w, height: hh });
      const d = document.createElement('div'); d.className = 'fo ' + cls; d.innerHTML = inner; fo.appendChild(d);
      return d;
    },
    // a LaTeX formula with its "where" list: where = [['\\dot m', 'mass flow of dry air, kg/s'], ...]
    formula(i, x, y, w, latex, where = [], hh = 420) {
      const list = where.length ? `<div class="where"><em>where</em>${where.map(([sym, txt]) => `<div>${tex(sym)}<span>${md(txt)}</span></div>`).join('')}</div>` : '';
      return F.html(i, x, y, w, hh, `<div class="eq">${tex(latex, true)}</div>${list}`, 'fo-formula');
    },
    // the table of states on a chart: rows = [[name, { T, w }, colour?], ...]
    states(i, x, y, rows, w = 440) {
      const body = rows.map(([n, s, col]) => `<tr><td style="color:${col || C.ink}"><b>${md(n)}</b></td><td>${fmt(s.T)}</td><td>${Math.round(rhFromW(s.T, s.w) * 100)}</td><td>${fmt(s.w * 1000)}</td><td>${fmt(enth(s.T, s.w) / 1000)}</td></tr>`).join('');
      return F.html(i, x, y, w, 50 + rows.length * 32, `<table><tr><th></th><th>T °C</th><th>RH %</th><th>w g/kg</th><th>h kJ/kg</th></tr>${body}</table>`, 'fo-states');
    },
  };
  spec.fig(F);
  return F;
}

function sayList(holder, steps, layout) {
  const box = document.createElement('div');
  box.className = 'says ' + layout;
  steps.map(stepOf).forEach((s, i) => {
    const p = document.createElement('p');
    p.className = 'say s' + i;
    p.innerHTML = `<span class="full">${md(s.say)}</span><span class="tag">${md(tagOf(s))}</span>`;
    fragment(p, i);
    box.appendChild(p);
  });
  holder.appendChild(box);
}

function build(spec, sec) {
  const layout = spec.layout ?? 'split';
  const s = document.createElement('section');
  s.className = 'L-' + layout;
  if (spec.id) s.id = spec.id;
  // UPC mark top-left on every slide; white on the blue cover and section slides
  const blue = layout === 'title' || layout === 'section';
  if (blue) s.setAttribute('data-background-color', '#016AB4');
  const logo = document.createElement('img');
  logo.className = 'upc-logo'; logo.alt = 'Universitat Politècnica de Catalunya · BarcelonaTech';
  logo.src = blue ? 'assets/upc-white.png' : 'assets/upc-blue.png';
  s.appendChild(logo);
  const head = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; s.appendChild(d); return d; };

  if (layout === 'title') {
    head('t-kicker', md(spec.kicker ?? 'Airport Building Systems · HVAC'));
    head('t-title', md(spec.title));
    if (spec.sub) head('t-sub', md(spec.sub));
    if (spec.html) head('t-html', spec.html);
  } else if (layout === 'section') {
    head('sec-n', String(sec.n));
    head('sec-title', md(spec.title));
    if (spec.sub) head('sec-sub', md(spec.sub));
  } else {
    head('kicker', md(spec.kicker ?? sec.kicker ?? `${sec.n} · ${sec.name}`));
    head('title', md(spec.title));
    if (spec.fig) makeFig(head('fig', ''), layout, spec);
    if (spec.html) head('body', spec.html).querySelectorAll('[data-step]').forEach(n => fragment(n, +n.dataset.step, n.dataset.cls));
    if (spec.steps?.length) sayList(s, spec.steps, layout);
    head('foot', `<span>Airport Building Systems · HVAC</span><span>${md(spec.cite ?? '')}</span>`);
  }
  const notes = [spec.notes, ...(spec.steps ?? []).map(stepOf).map((x, i) => `${i}. ${x.say}`)].filter(Boolean);
  if (notes.length) { const a = document.createElement('aside'); a.className = 'notes'; a.innerHTML = notes.map(n => `<p>${md(n, 'mathml')}</p>`).join(''); s.appendChild(a); }
  return s;
}

const root = document.querySelector('.reveal .slides');
const lives = [];
for (const sec of SECTIONS) {
  if (sec.n > 0) root.appendChild(build({ layout: 'section', title: sec.name, sub: sec.sub }, sec));
  for (const spec of sec.slides) {
    let node;
    try { node = build(spec, sec); }
    catch (e) { console.error('slide failed:', spec.title, e); node = build({ title: spec.title, html: `<p class="err">This slide failed to draw: ${e.message}</p>` }, sec); }
    root.appendChild(node);
    if (spec.live) lives.push([spec, node]);
  }
}

Reveal.initialize({
  width: 1600, height: 900, margin: 0.02, center: false, hash: true, slideNumber: 'c/t',
  transition: 'fade', transitionSpeed: 'fast', backgroundTransition: 'none',
  pdfSeparateFragments: true, plugins: [RevealNotes],
}).then(() => {
  for (const [spec, node] of lives) { try { spec.live(node); } catch (e) { console.error('live slide failed:', spec.title, e); } }
  document.documentElement.dataset.ready = '1';
});
