// Small SVG toolkit for the class slides: elements, coloured arrows, rich text and boxes.
// Units are the slide's own pixels (the figure viewBox is 900 × 620 in split slides).

export const NS = 'http://www.w3.org/2000/svg';
export const C = {
  ink: '#1b1b1b', ink2: '#3a3a3a', muted: '#6e6b66', soft: '#a29d95', line: '#d6d1c8', line2: '#ece8e1',
  paper: '#fbfaf7', white: '#ffffff',
  hot: '#c8442f', cold: '#2f6fc0', vap: '#6f8aa6', sens: '#d98a2b', water: '#3d86d6', room: '#8a5a9e', green: '#3f7f4f',
  hotBg: '#f6e3df', coldBg: '#e1ebf7', vapBg: '#e6ecf2', sensBg: '#f8ebd9', greenBg: '#e3efe5',
};

export function el(parent, tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

// one arrow-head marker per colour, created on demand in the svg's <defs>
// ids are unique per svg: a url(#id) shared by several slides would resolve to a hidden slide's marker
let svgCount = 0;
export function marker(svg, color) {
  svg.dataset.mk ??= String(++svgCount);
  const id = 'ar' + svg.dataset.mk + '-' + color.replace(/[^a-z0-9]/gi, '');
  if (!svg.querySelector('#' + id)) {
    let defs = svg.querySelector('defs') || el(svg, 'defs');
    const m = el(defs, 'marker', { id, viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse', markerUnits: 'strokeWidth' });
    el(m, 'path', { d: 'M0,0 L10,5 L0,10 z', fill: color });
  }
  return `url(#${id})`;
}
const svgOf = p => p.ownerSVGElement || p;

// a path; draw:true makes it trace itself when its step appears (pathLength = 1)
export function path(p, d, { color = C.ink, w = 3, fill = 'none', dash, arrow = false, start = false, draw = false, opacity, cap = 'round' } = {}) {
  const a = { d, stroke: color, 'stroke-width': w, fill, 'stroke-linecap': cap, 'stroke-linejoin': 'round', opacity };
  if (dash) a['stroke-dasharray'] = dash;
  if (arrow) a['marker-end'] = marker(svgOf(p), color);
  if (start) a['marker-start'] = marker(svgOf(p), color);
  if (draw && !dash) { a.pathLength = 1; a.class = 'trace'; }
  return el(p, 'path', a);
}
export const line = (p, x1, y1, x2, y2, o) => path(p, `M${x1},${y1} L${x2},${y2}`, o);
export const poly = (p, pts, o) => path(p, 'M' + pts.map(q => q.join(',')).join(' L'), o);

// text; **bold** and _muted_ marks become tspans; \n starts a new line
export function text(p, x, y, str, { size = 20, color = C.ink, weight = 400, anchor = 'start', lh = 1.25, italic = false, mono = false, base } = {}) {
  const t = el(p, 'text', { x, y, 'font-size': size, fill: color, 'font-weight': weight, 'text-anchor': anchor, 'font-style': italic ? 'italic' : null, 'dominant-baseline': base,
    'font-family': mono ? '"Helvetica Neue", Helvetica, Arial, sans-serif' : null });
  String(str).split('\n').forEach((ln, i) => {
    const row = el(t, 'tspan', { x, dy: i ? size * lh : 0 });
    // _muted_ only when the underscores stand at word edges, so labels like T_M stay as written
    ln.split(/(\*\*[^*]+\*\*|(?<![\w])_[^_\s][^_]*_(?![\w]))/).filter(Boolean).forEach(seg => {
      if (seg.startsWith('**')) el(row, 'tspan', { 'font-weight': 600, fill: color === C.ink ? C.ink : color }, seg.slice(2, -2));
      else if (seg.startsWith('_') && seg.endsWith('_') && seg.length > 2) el(row, 'tspan', { fill: C.muted }, seg.slice(1, -1));
      else row.appendChild(document.createTextNode(seg));
    });
  });
  return t;
}

// a rounded box with a label and an optional second line
export function box(p, x, y, w, h, { label, sub, stroke = C.ink, fill = C.white, size = 22, r = 12, sw = 2, color = C.ink } = {}) {
  const g = el(p, 'g');
  el(g, 'rect', { x, y, width: w, height: h, rx: r, fill, stroke, 'stroke-width': sw });
  if (label) text(g, x + w / 2, y + h / 2 + (sub ? -4 : size * 0.35), label, { size, weight: 600, anchor: 'middle', color });
  if (sub) text(g, x + w / 2, y + h / 2 + size * 0.95, sub, { size: size * 0.7, anchor: 'middle', color: C.muted });
  return g;
}
export const circle = (p, cx, cy, r, a = {}) => el(p, 'circle', { cx, cy, r, ...a });

// a small water drop
export function drop(p, x, y, s = 1, color = C.vap) {
  return el(p, 'path', { d: `M${x},${y} q${-7 * s},${11 * s} 0,${15 * s} q${7 * s},${-4 * s} 0,${-15 * s}z`, fill: color });
}
// a wavy heat line rising from (x,y)
export function heat(p, x, y, color = C.hot, len = 34) {
  return path(p, `M${x},${y} q8,${-len / 4} 0,${-len / 2} q-8,${-len / 4} 0,${-len / 2}`, { color, w: 2.5, opacity: 0.75 });
}
// a person, standing; height ~ 60·s
export function person(p, x, y, s = 1, color = C.ink2) {
  const g = el(p, 'g', { fill: color });
  el(g, 'circle', { cx: x, cy: y - 52 * s, r: 7 * s });
  el(g, 'path', { d: `M${x - 9 * s},${y - 42 * s} h${18 * s} l${3 * s},${22 * s} h${-5 * s} l${-1 * s},${20 * s} h${-12 * s} l${-1 * s},${-20 * s} h${-5 * s} z` });
  return g;
}
// a finned coil seen from the side, centred on (x, y)
export function coil(p, x, y, w = 70, h = 180, color = C.cold) {
  const g = el(p, 'g');
  el(g, 'rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, fill: color === C.hot ? C.hotBg : C.coldBg, stroke: color, 'stroke-width': 2, rx: 4 });
  for (let i = 1; i < 9; i++) line(g, x - w / 2, y - h / 2 + i * h / 9, x + w / 2, y - h / 2 + i * h / 9, { color, w: 1, opacity: 0.5 });
  for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) circle(g, x - w / 3 + r * w / 3, y - h / 2 + (i + 0.5 + (r % 2) * 0.5) * h / 6.5, 5, { fill: color });
  return g;
}
// a fan (circle with blades), centred on (x, y)
export function fan(p, x, y, r = 34) {
  const g = el(p, 'g');
  circle(g, x, y, r, { fill: C.white, stroke: C.ink, 'stroke-width': 2 });
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; el(g, 'path', { d: `M${x},${y} Q${x + r * 0.9 * Math.cos(a + 0.6)},${y + r * 0.9 * Math.sin(a + 0.6)} ${x + r * 0.8 * Math.cos(a + 1.2)},${y + r * 0.8 * Math.sin(a + 1.2)} z`, fill: C.ink2 }); }
  return g;
}
// thin airflow arrows (a stream) from x1 to x2 at height y
export function stream(p, x1, x2, y, color = C.muted, n = 3, gap = 22) {
  const g = el(p, 'g');
  for (let i = 0; i < n; i++) line(g, x1, y + (i - (n - 1) / 2) * gap, x2, y + (i - (n - 1) / 2) * gap, { color, w: 2.5, arrow: true, opacity: 0.8 });
  return g;
}
