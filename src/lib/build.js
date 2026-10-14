// Small helpers for building A-Frame entities from code, plus reusable low-poly props.

export const v = (x, y, z) => `${x} ${y} ${z}`;

// Flat-shaded material string for the low-poly look.
export const M = (color, extra = '') =>
  `color: ${color}; flatShading: true; roughness: 0.95; metalness: 0${extra ? '; ' + extra : ''}`;

export function el(parent, tag, attrs = {}) {
  const e = document.createElement(tag);
  for (const [k, val] of Object.entries(attrs)) e.setAttribute(k, val);
  parent.appendChild(e);
  return e;
}

export const group = (p, pos = '0 0 0', extra = {}) => el(p, 'a-entity', { position: pos, ...extra });

export const box = (p, pos, w, h, d, color, extra = {}) =>
  el(p, 'a-box', { position: pos, width: w, height: h, depth: d, material: M(color), ...extra });

export const cyl = (p, pos, r, h, color, seg = 6, extra = {}) =>
  el(p, 'a-cylinder', { position: pos, radius: r, height: h, 'segments-radial': seg, material: M(color), ...extra });

export const cone = (p, pos, rb, rt, h, color, seg = 6, extra = {}) =>
  el(p, 'a-cone', { position: pos, 'radius-bottom': rb, 'radius-top': rt, height: h, 'segments-radial': seg, material: M(color), ...extra });

export const ball = (p, pos, r, color, extra = {}) =>
  el(p, 'a-sphere', { position: pos, radius: r, 'segments-width': 7, 'segments-height': 5, material: M(color), ...extra });

export function text(p, value, pos, opts = {}) {
  const e = el(p, 'a-entity', { position: pos });
  e.setAttribute('text', {
    value, align: 'center', color: '#ffffff', width: 2, wrapCount: 28, anchor: 'center', baseline: 'center',
    ...opts
  });
  return e;
}

export function anim(e, name, props) {
  e.setAttribute(`animation__${name}`, { easing: 'easeOutQuad', ...props });
}

// Animate from a tiny scale up to `to` (default full size).
export function growIn(e, to = '1 1 1', dur = 900, delay = 0) {
  e.setAttribute('scale', '0.01 0.01 0.01');
  anim(e, 'grow', { property: 'scale', to, dur, delay, easing: 'easeOutElastic' });
}

// --- Low-poly props --------------------------------------------------------

export function ground(p, color, radius = 14) {
  return el(p, 'a-circle', { radius, rotation: '-90 0 0', segments: 20, material: M(color) });
}

export function tree(p, x, z, s = 1, leaf = '#3d9a4a') {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s) });
  cyl(g, '0 0.3 0', 0.08, 0.6, '#7a4f2a', 5);
  cone(g, '0 0.9 0', 0.45, 0, 0.8, leaf);
  cone(g, '0 1.3 0', 0.33, 0, 0.6, leaf);
  return g;
}

export function house(p, x, z, wall = '#f2e3c6', roof = '#c0392b', s = 1, ry = 0) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s), rotation: v(0, ry, 0) });
  box(g, '0 0.4 0', 0.9, 0.8, 0.8, wall);
  cone(g, '0 1.05 0', 0.75, 0, 0.5, roof, 4, { rotation: '0 45 0' });
  box(g, '0 0.25 0.41', 0.22, 0.5, 0.02, '#6b4423');
  return g;
}

export function person(p, x, z, body = '#e67e22', s = 1) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s) });
  cyl(g, '0 0.3 0', 0.13, 0.6, body, 6);
  ball(g, '0 0.74 0', 0.12, '#e0ac69');
  return g;
}

export function cloud(p, x, y, z, s = 1) {
  const g = group(p, v(x, y, z), { scale: v(s, s, s) });
  ball(g, '0 0 0', 0.6, '#ffffff');
  ball(g, '0.6 -0.1 0', 0.45, '#ffffff');
  ball(g, '-0.6 -0.1 0', 0.45, '#ffffff');
  anim(g, 'drift', { property: 'position', to: v(x + 1.5, y, z), dir: 'alternate', loop: true, dur: 9000, easing: 'easeInOutSine' });
  return g;
}

export function sun(p, pos = '6 7 -12', color = '#ffd34d') {
  return ball(p, pos, 1, color, { material: M(color, `emissive: ${color}; emissiveIntensity: 1`) });
}

export function turbine(p, x, z, s = 1) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s) });
  cyl(g, '0 1.1 0', 0.05, 2.2, '#f4f6f7', 6);
  const hub = group(g, '0 2.2 0.08');
  for (let i = 0; i < 3; i++) {
    const arm = group(hub, '0 0 0', { rotation: v(0, 0, i * 120) });
    box(arm, '0 0.45 0', 0.08, 0.9, 0.02, '#ffffff');
  }
  anim(hub, 'spin', { property: 'rotation', to: '0 0 360', loop: true, dur: 2500, easing: 'linear' });
  return g;
}

export function solarPanel(p, x, z, s = 1) {
  const g = group(p, v(x, 0, z), { scale: v(s, s, s) });
  cyl(g, '0 0.3 0', 0.04, 0.6, '#95a5a6', 5);
  box(g, '0 0.65 0', 1, 0.04, 0.6, '#1f4e8c', { rotation: '-30 0 0', material: M('#1f4e8c', 'metalness: 0.3') });
  return g;
}

export function fish(p, color = '#ff8c42', s = 1) {
  const g = group(p, '0 0 0', { scale: v(s, s, s) });
  ball(g, '0 0 0', 0.18, color, { scale: '1.6 1 0.6' });
  cone(g, '-0.36 0 0', 0.14, 0, 0.2, color, 4, { rotation: '0 0 90' });
  return g;
}
