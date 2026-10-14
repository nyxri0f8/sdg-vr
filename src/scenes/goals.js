// One builder per SDG. Each builds a small low-poly world in `ctx.root`, registers a gaze task
// with `ctx.task(total)` and calls the returned `step()` every time the viewer completes part of it.
import {
  v, M, el, group, box, cyl, cone, ball, text, anim, growIn,
  ground, tree, house, person, cloud, sun, turbine, solarPanel, fish
} from '../lib/build.js';
import { target } from '../lib/gaze.js';

// Evenly spread `n` points on an arc in front of the viewer.
function arc(n, radius, spanDeg = 90, centerDeg = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = THREE.MathUtils.degToRad(centerDeg - spanDeg / 2 + (spanDeg * i) / Math.max(1, n - 1));
    pts.push([Math.sin(a) * radius, -Math.cos(a) * radius]);
  }
  return pts;
}

function ringOfTrees(root, count = 14, radius = 11, leaf) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    tree(root, Math.sin(a) * radius, Math.cos(a) * radius, 1.4 + (i % 3) * 0.3, leaf);
  }
}

const sparkle = (p, pos, color = '#ffffff') => {
  const s = ball(p, pos, 0.08, color, { material: M(color, `emissive: ${color}; emissiveIntensity: 1`) });
  anim(s, 'up', { property: 'position', to: pos.replace(/(\S+) (\S+) (\S+)/, (_, x, y, z) => `${x} ${+y + 1.2} ${z}`), dur: 1400 });
  anim(s, 'fade', { property: 'scale', to: '0.01 0.01 0.01', dur: 1400, delay: 400 });
  setTimeout(() => s.parentNode && s.parentNode.removeChild(s), 1900);
};

export const BUILDERS = {
  // 1 — No Poverty: rebuild shacks into safe homes.
  1(ctx) {
    const { root } = ctx;
    ctx.sky('#9fd3f0');
    ground(root, '#cdb68a');
    sun(root);
    cloud(root, -4, 6, -12, 1.4);
    ringOfTrees(root, 12, 11, '#6a9a3a');
    const step = ctx.task(5);
    const colors = ['#f6d7a7', '#a7d8f6', '#f6a7c1', '#b8f6a7', '#f6eda7'];
    arc(5, 4.2, 80, 15).forEach(([x, z], i) => {
      const shack = box(root, v(x, 0.35, z), 0.9, 0.7, 0.8, '#8d8d8d');
      box(shack, '0 0.38 0', 1.05, 0.05, 0.95, '#6f6f6f', { rotation: '0 0 8' });
      target(shack, () => {
        root.removeChild(shack);
        const h = house(root, x, z, colors[i], '#c0392b', 1.1, -Math.atan2(x, -z) * 57.3);
        growIn(h, '1.1 1.1 1.1');
        const pp = person(root, x + 0.7, z + 0.3, '#2e86de', 0.9);
        anim(pp, 'jump', { property: 'position', to: v(x + 0.7, 0.2, z + 0.3), dir: 'alternate', loop: 4, dur: 300 });
        step();
      });
    });
  },

  // 2 — Zero Hunger: grow crops on empty plots.
  2(ctx) {
    const { root } = ctx;
    ctx.sky('#a9dcf5');
    ground(root, '#8ab35a');
    sun(root);
    cloud(root, 3, 6.5, -11, 1.2);
    house(root, -4.5, -6, '#b03a2e', '#5d4037', 1.8, 20);
    const step = ctx.task(6);
    const plots = [[-1.2, -3.2], [0.2, -3.2], [1.6, -3.2], [-1.2, -4.6], [0.2, -4.6], [1.6, -4.6]];
    plots.forEach(([x, z], i) => {
      const plot = box(root, v(x, 0.06, z), 1.1, 0.12, 1.1, '#6d4c2f');
      target(plot, () => {
        plot.setAttribute('material', M('#5b3d24'));
        const crop = group(root, v(x, 0.12, z));
        const isCorn = i % 2 === 0;
        for (let a = -1; a <= 1; a++) {
          for (let b = -1; b <= 1; b++) {
            const c = group(crop, v(a * 0.32, 0, b * 0.32));
            cyl(c, '0 0.2 0', 0.03, 0.4, '#5a8f29', 4);
            cone(c, '0 0.5 0', 0.08, 0, 0.3, isCorn ? '#f4d03f' : '#e67e22', 5);
          }
        }
        growIn(crop, '1 1 1', 1100);
        step();
      });
    });
  },

  // 3 — Good Health: vaccinate people next to the clinic.
  3(ctx) {
    const { root } = ctx;
    ctx.sky('#bfe6f7');
    ground(root, '#9ccc65');
    ringOfTrees(root, 12, 11);
    const clinic = group(root, '1 0 -7');
    box(clinic, '0 1.1 0', 4, 2.2, 2, '#fdfefe');
    box(clinic, '0 2.25 0', 4.2, 0.1, 2.2, '#4C9F38');
    box(clinic, '0 1.4 1.02', 0.8, 0.22, 0.02, '#e74c3c');
    box(clinic, '0 1.4 1.02', 0.22, 0.8, 0.02, '#e74c3c');
    box(clinic, '0 0.45 1.01', 0.7, 0.9, 0.02, '#85c1e9');
    const step = ctx.task(5);
    arc(5, 3.6, 90, 10).forEach(([x, z]) => {
      const p = person(root, x, z, '#95a5a6');
      const hit = box(p, '0 0.45 0', 0.4, 0.9, 0.4, '#ffffff', { material: 'opacity: 0; transparent: true' });
      target(hit, () => {
        p.querySelector('a-cylinder').setAttribute('material', M('#4C9F38'));
        const heart = ball(root, v(x, 1.1, z), 0.1, '#e74c3c', { material: M('#e74c3c', 'emissive: #e74c3c; emissiveIntensity: 0.6') });
        anim(heart, 'beat', { property: 'scale', to: '1.4 1.4 1.4', dir: 'alternate', loop: true, dur: 450 });
        step();
      });
    });
  },

  // 4 — Quality Education: open books in a classroom.
  4(ctx) {
    const { root } = ctx;
    ctx.sky('#f5e6c8');
    ground(root, '#d7b98e');
    box(root, '0 1.6 -6', 6, 3.2, 0.2, '#f7dc6f');
    box(root, '0 1.7 -5.85', 3, 1.4, 0.05, '#1e4d2b');
    text(root, 'A B C   1 2 3\nLearning for all', '0 1.7 -5.8', { width: 3, wrapCount: 18 });
    const step = ctx.task(5);
    [[-1.6, -3.2], [0, -3.2], [1.6, -3.2], [-0.8, -4.4], [0.8, -4.4]].forEach(([x, z], i) => {
      box(root, v(x, 0.45, z), 0.9, 0.06, 0.6, '#a0522d');
      box(root, v(x, 0.22, z), 0.06, 0.44, 0.5, '#7b3f1d');
      person(root, x, z + 0.55, ['#e67e22', '#8e44ad', '#2e86de', '#16a085', '#c0392b'][i], 0.85);
      const book = box(root, v(x, 0.53, z), 0.3, 0.1, 0.22, '#C5192D');
      target(book, () => {
        book.setAttribute('height', 0.03);
        book.setAttribute('width', 0.5);
        book.setAttribute('material', M('#fdfefe'));
        const bulb = ball(root, v(x, 1.45, z + 0.55), 0.12, '#f9e79f', { material: M('#f9e79f', 'emissive: #f7dc6f; emissiveIntensity: 1') });
        growIn(bulb);
        step();
      });
    });
  },

  // 5 — Gender Equality: add opportunity blocks until the seesaw balances.
  5(ctx) {
    const { root } = ctx;
    ctx.sky('#fde2dc');
    ground(root, '#f5b7a8');
    ringOfTrees(root, 10, 11, '#e67e22');
    const base = group(root, '0 0 -4');
    cone(base, '0 0.4 0', 0.4, 0, 0.8, '#7f8c8d', 3);
    const plank = group(base, '0 0.82 0', { rotation: '0 0 -14' });
    box(plank, '0 0 0', 4, 0.1, 0.5, '#FF3A21');
    person(plank, -1.6, 0, '#8e44ad', 0.9);
    person(plank, 1.6, 0, '#2e86de', 0.9);
    const step = ctx.task(4);
    let placed = 0;
    [[-2.6, 1.8, -3.2], [-1.6, 2.4, -3.0], [1.6, 2.4, -3.0], [2.6, 1.8, -3.2]].forEach(([x, y, z]) => {
      const blk = box(root, v(x, y, z), 0.35, 0.35, 0.35, '#f39c12');
      anim(blk, 'bob', { property: 'position', to: v(x, y + 0.15, z), dir: 'alternate', loop: true, dur: 1200, easing: 'easeInOutSine' });
      target(blk, () => {
        root.removeChild(blk);
        const nb = box(plank, v(-1.15 - (placed % 2) * 0.3, 0.25 + Math.floor(placed / 2) * 0.32, 0), 0.28, 0.28, 0.28, '#f39c12');
        growIn(nb);
        placed++;
        anim(plank, 'tilt', { property: 'rotation', to: v(0, 0, -14 + placed * 3.5), dur: 900 });
        step();
      });
    });
  },

  // 6 — Clean Water: filter the dirty pond.
  6(ctx) {
    const { root } = ctx;
    ctx.sky('#bfe9f7');
    ground(root, '#a5c87a');
    ringOfTrees(root, 12, 11);
    const pond = cyl(root, '0 0.05 -4.5', 2.2, 0.1, '#7a5c2e', 12);
    cyl(root, '2.8 0.7 -4.5', 0.4, 1.4, '#bdc3c7', 8);
    box(root, '2.3 1.2 -4.5', 0.6, 0.08, 0.08, '#95a5a6');
    const steps = ['#6f6a3a', '#5d8a6a', '#4aa7b8', '#26BDE2'];
    const step = ctx.task(4);
    let done = 0;
    [[-1.6, 1.5, -3.2], [-0.5, 1.9, -3.0], [0.6, 1.9, -3.0], [1.6, 1.5, -3.2]].forEach(([x, y, z]) => {
      const drop = cone(root, v(x, y, z), 0.18, 0, 0.35, '#7a5c2e', 6);
      ball(drop, '0 -0.17 0', 0.18, '#7a5c2e');
      anim(drop, 'bob', { property: 'position', to: v(x, y + 0.12, z), dir: 'alternate', loop: true, dur: 1100, easing: 'easeInOutSine' });
      target(drop, () => {
        drop.setAttribute('material', M('#26BDE2'));
        drop.querySelector('a-sphere').setAttribute('material', M('#26BDE2'));
        pond.setAttribute('material', M(steps[done], 'opacity: 0.9; transparent: true'));
        done++;
        if (done === 4) {
          const fountain = cyl(root, '0 0.2 -4.5', 0.08, 0.4, '#d6f4fb', 6);
          anim(fountain, 'spray', { property: 'scale', to: '1 4 1', dir: 'alternate', loop: true, dur: 700 });
        }
        step();
      });
    });
  },

  // 7 — Clean Energy: install solar panels and wind turbines to light the village.
  7(ctx) {
    const { root } = ctx;
    ctx.sky('#2c3e66');
    ground(root, '#4f6b3a');
    const windows = [];
    [[-3, -8], [-1.2, -8.5], [0.8, -8.5], [2.8, -8], [4.5, -7]].forEach(([x, z]) => {
      const h = house(root, x, z, '#d5c4a1', '#7b241c', 1.3);
      windows.push(box(h, '0.25 0.5 0.41', 0.2, 0.2, 0.02, '#1b2631'));
    });
    const step = ctx.task(5);
    let lit = 0;
    arc(5, 3.6, 100, 10).forEach(([x, z], i) => {
      const pad = cyl(root, v(x, 0.04, z), 0.45, 0.08, '#7f8c8d', 8);
      target(pad, () => {
        const g = i % 2 === 0 ? solarPanel(root, x, z, 1.2) : turbine(root, x, z, 1);
        growIn(g);
        windows[lit].setAttribute('material', M('#f9e79f', 'emissive: #f7dc6f; emissiveIntensity: 1'));
        lit++;
        if (lit === 5) ctx.sky('#7fb3e0');
        step();
      });
    });
  },

  // 8 — Decent Work: start the factory gears and give workers safety gear.
  8(ctx) {
    const { root } = ctx;
    ctx.sky('#d6dbe0');
    ground(root, '#9e9e9e');
    const f = group(root, '0 0 -7.5');
    box(f, '0 1.2 0', 5, 2.4, 2, '#A21942');
    cyl(f, '-1.5 3 0', 0.25, 1.6, '#7f8c8d', 6);
    cyl(f, '1.5 3 0', 0.25, 1.6, '#7f8c8d', 6);
    const workers = [];
    [[-2, -4.2], [-0.7, -4.6], [0.7, -4.6], [2, -4.2]].forEach(([x, z]) => workers.push(person(root, x, z, '#5d6d7e')));
    const step = ctx.task(4);
    [[-1.8, 1.7, -3], [-0.6, 2.1, -3], [0.6, 2.1, -3], [1.8, 1.7, -3]].forEach(([x, y, z], i) => {
      const gear = cyl(root, v(x, y, z), 0.32, 0.12, '#95a5a6', 8, { rotation: '90 0 0' });
      target(gear, () => {
        gear.setAttribute('material', M('#f5b041'));
        anim(gear, 'spin', { property: 'rotation', to: '90 360 0', loop: true, dur: 2000, easing: 'linear' });
        const w = workers[i];
        w.querySelector('a-cylinder').setAttribute('material', M('#e67e22'));
        growIn(cone(w, '0 0.86 0', 0.16, 0.12, 0.1, '#f1c40f', 8));
        sparkle(root, `${x} ${y} ${z}`, '#f4d03f');
        step();
      });
    });
  },

  // 9 — Industry, Innovation, Infrastructure: build a bridge across the river.
  9(ctx) {
    const { root } = ctx;
    ctx.sky('#b3dcf2');
    ground(root, '#7cb342');
    box(root, '0 0.02 -5', 30, 0.05, 3, '#3498db');
    box(root, '0 0.15 -3.1', 6, 0.3, 0.8, '#95a5a6');
    box(root, '0 0.15 -6.9', 6, 0.3, 0.8, '#95a5a6');
    const tower = group(root, '4.5 0 -9');
    cyl(tower, '0 2 0', 0.08, 4, '#7f8c8d', 4);
    const step = ctx.task(5);
    let built = 0;
    [-2, -1, 0, 1, 2].forEach((x) => {
      const ghost = box(root, v(x, 0.4, -5), 0.95, 0.15, 3.4, '#ffffff', { material: 'color: #ffd2b8; opacity: 0.55; transparent: true' });
      target(ghost, () => {
        ghost.setAttribute('material', M('#FD6925'));
        growIn(ghost);
        built++;
        if (built === 5) {
          const sig = el(tower, 'a-torus', { position: '0 4 0', radius: 0.4, 'radius-tubular': 0.03, rotation: '90 0 0', material: M('#FD6925', 'emissive: #FD6925') });
          anim(sig, 'pulse', { property: 'scale', to: '3 3 3', loop: true, dur: 1500 });
          const car = box(root, '-2.2 0.6 -5', 0.3, 0.25, 0.5, '#2e86de');
          anim(car, 'drive', { property: 'position', to: '2.2 0.6 -5', dir: 'alternate', loop: true, dur: 4000, easing: 'easeInOutSine' });
        }
        step();
      });
    });
  },

  // 10 — Reduced Inequalities: even out the columns.
  10(ctx) {
    const { root } = ctx;
    ctx.sky('#f9d6e6');
    ground(root, '#e8a0bf');
    ringOfTrees(root, 10, 11, '#DD1367');
    const heights = [0.4, 2.4, 0.7, 1.8, 0.5];
    const avg = heights.reduce((a, b) => a + b, 0) / heights.length;
    const step = ctx.task(5);
    arc(5, 4, 80, 0).forEach(([x, z], i) => {
      const col = box(root, v(x, heights[i] / 2, z), 0.6, heights[i], 0.6, '#DD1367');
      person(root, x, z + 0.6, '#ffffff', 0.8);
      target(col, () => {
        anim(col, 'h', { property: 'geometry.height', to: avg, dur: 900 });
        anim(col, 'p', { property: 'position', to: v(x, avg / 2, z), dur: 900 });
        col.setAttribute('material', M('#f06292'));
        step();
      });
    });
  },

  // 11 — Sustainable Cities: green the rooftops.
  11(ctx) {
    const { root } = ctx;
    ctx.sky('#cde7f5');
    ground(root, '#7f8c8d');
    box(root, '0 0.02 -3', 14, 0.03, 1.2, '#34495e');
    const bus = group(root, '-6 0 -3');
    box(bus, '0 0.4 0', 1.6, 0.6, 0.6, '#27ae60');
    anim(bus, 'drive', { property: 'position', to: '6 0 -3', dir: 'alternate', loop: true, dur: 9000, easing: 'easeInOutSine' });
    const step = ctx.task(5);
    // Kept below eye height so every rooftop is visible from where the viewer stands.
    [[-2.8, -5, 1.1], [-1.3, -5.4, 1.4], [0.2, -5, 0.8], [1.7, -5.4, 1.3], [3.2, -5, 1.0]].forEach(([x, z, h]) => {
      const b = box(root, v(x, h / 2, z), 1.2, h, 1.2, '#b2babb');
      for (let r = 0.35; r < h - 0.2; r += 0.4) box(b, v(0, r - h / 2, 0.61), 0.8, 0.15, 0.02, '#5dade2');
      const roof = box(root, v(x, h + 0.04, z), 1.2, 0.08, 1.2, '#7b7d7d');
      target(roof, () => {
        roof.setAttribute('material', M('#58d68d'));
        const t = tree(root, x, z, 0.5);
        t.setAttribute('position', v(x, h + 0.08, z));
        growIn(t, '0.5 0.5 0.5');
        step();
      });
    });
    ringOfTrees(root, 10, 12);
  },

  // 12 — Responsible Consumption: sort waste into the right bins.
  12(ctx) {
    const { root } = ctx;
    ctx.sky('#e8f6d6');
    ground(root, '#c5d86d');
    ringOfTrees(root, 10, 11);
    const bins = { paper: [-1.5, '#2e86de'], glass: [0, '#27ae60'], plastic: [1.5, '#f1c40f'] };
    for (const [name, [x, color]] of Object.entries(bins)) {
      cyl(root, v(x, 0.45, -5), 0.4, 0.9, color, 8);
      text(root, name.toUpperCase(), v(x, 1.15, -5), { width: 2, color: '#1b2631' });
    }
    const items = [
      ['paper', () => box(root, '-2.5 0.12 -3', 0.4, 0.05, 0.3, '#ecf0f1')],
      ['glass', () => cyl(root, '-1.4 0.2 -2.6', 0.08, 0.4, '#58d68d', 6)],
      ['plastic', () => cyl(root, '-0.4 0.18 -2.8', 0.07, 0.35, '#f7f9f9', 6)],
      ['paper', () => box(root, '0.6 0.15 -2.6', 0.3, 0.3, 0.3, '#c69c6d')],
      ['glass', () => cyl(root, '1.5 0.2 -2.8', 0.08, 0.4, '#1e8449', 6)],
      ['plastic', () => box(root, '2.5 0.1 -3', 0.4, 0.2, 0.3, '#f8c471')]
    ];
    const step = ctx.task(items.length);
    items.forEach(([kind, make]) => {
      const it = make();
      target(it, () => {
        anim(it, 'toss', { property: 'position', to: v(bins[kind][0], 1.0, -5), dur: 700 });
        anim(it, 'shrink', { property: 'scale', to: '0.01 0.01 0.01', dur: 400, delay: 650 });
        setTimeout(() => sparkle(root, v(bins[kind][0], 1, -5), '#7dcea0'), 700);
        step();
      });
    });
  },

  // 13 — Climate Action: swap smokestacks for clean power; the sea falls back.
  13(ctx) {
    const { root } = ctx;
    ctx.sky('#b7a99a');
    ground(root, '#8d9b6a');
    const sea = box(root, '0 0.55 -9', 30, 1.1, 6, '#2471a3', { material: M('#2471a3', 'opacity: 0.85; transparent: true') });
    [[-3, -6.2], [-1.5, -6.4], [0, -6.2], [1.5, -6.4], [3, -6.2]].forEach(([x, z]) => house(root, x, z, '#f0e6d2', '#a04000', 0.9));
    const thermo = group(root, '4.2 0 -3');
    cyl(thermo, '0 1 0', 0.08, 1.6, '#ecf0f1', 8);
    const mercury = cyl(thermo, '0 0.7 0', 0.06, 1, '#e74c3c', 8);
    ball(thermo, '0 0.2 0', 0.14, '#e74c3c');
    const step = ctx.task(4);
    let fixed = 0;
    [[-2.8, -3.8], [-1, -3.4], [1, -3.4], [2.8, -3.8]].forEach(([x, z]) => {
      const stack = group(root, v(x, 0, z));
      const chimney = cyl(stack, '0 0.5 0', 0.2, 1, '#5d6d7e', 6);
      const smoke = ball(stack, '0 1.25 0', 0.2, '#566573');
      anim(smoke, 'rise', { property: 'position', to: '0 1.8 0', dir: 'alternate', loop: true, dur: 1500, easing: 'easeInOutSine' });
      target(chimney, () => {
        root.removeChild(stack);
        growIn(turbine(root, x, z, 0.9));
        fixed++;
        const k = fixed / 4;
        anim(sea, 'fall', { property: 'position', to: v(0, 0.55 - k * 0.5, -9), dur: 1200 });
        anim(mercury, 'cool', { property: 'scale', to: v(1, 1 - k * 0.6, 1), dur: 1200 });
        if (fixed === 4) ctx.sky('#8fd0f2');
        step();
      });
    });
  },

  // 14 — Life Below Water: remove plastic from the reef.
  14(ctx) {
    const { root } = ctx;
    ctx.sky('#0b4f7a');
    ctx.fog('#0b4f7a', 4, 22);
    ground(root, '#e3c58f');
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = 3.5 + (i % 4) * 1.5;
      const weed = cone(root, v(Math.sin(a) * r, 0.7, -Math.cos(a) * r), 0.12, 0, 1.4, i % 2 ? '#1e8449' : '#c0392b', 4);
      anim(weed, 'sway', { property: 'rotation', to: '0 0 10', dir: 'alternate', loop: true, dur: 1800 + i * 90, easing: 'easeInOutSine' });
    }
    const school = group(root, '0 1.8 -5', { orbit: 'speed: 18' });
    const addFish = (r, y, color) => {
      const f = fish(school, color, 1);
      f.setAttribute('position', v(r, y, 0));
      f.setAttribute('rotation', '0 90 0');
      growIn(f);
    };
    addFish(2.5, 0, '#ff8c42');
    const step = ctx.task(6);
    const colors = ['#f4d03f', '#5dade2', '#af7ac5', '#ff6f61', '#48c9b0', '#f5b041'];
    [[-2, 1.4, -3], [-1, 2.2, -3.5], [0, 1.2, -2.8], [1, 2.4, -3.4], [2, 1.5, -3], [0.3, 3, -4]].forEach(([x, y, z], i) => {
      const bottle = cyl(root, v(x, y, z), 0.08, 0.32, '#ecf0f1', 6, { rotation: v(i * 30, 0, 60) , material: M('#ecf0f1', 'opacity: 0.8; transparent: true') });
      anim(bottle, 'float', { property: 'position', to: v(x, y + 0.2, z), dir: 'alternate', loop: true, dur: 1600, easing: 'easeInOutSine' });
      target(bottle, () => {
        root.removeChild(bottle);
        addFish(1.5 + (i % 3) * 0.7, (i % 2) * 0.6 - 0.3, colors[i]);
        step();
      });
    });
  },

  // 15 — Life on Land: plant trees on bare soil.
  15(ctx) {
    const { root } = ctx;
    ctx.sky('#cfe8c9');
    const land = ground(root, '#b89c6e');
    for (let i = 0; i < 6; i++) cyl(root, v(-5 + i * 2, 0.15, -9), 0.2, 0.3, '#6e4b2a', 6);
    const step = ctx.task(6);
    let planted = 0;
    const shades = ['#b89c6e', '#a9a76b', '#9bb168', '#8cbb65', '#7cc461', '#6ccb5c', '#56C02B'];
    [[-2.4, -3], [-1, -3.6], [0.6, -3.2], [2, -3.6], [-1.6, -5], [1.4, -5.2]].forEach(([x, z]) => {
      const soil = cyl(root, v(x, 0.04, z), 0.45, 0.08, '#5d4037', 8);
      target(soil, () => {
        growIn(tree(root, x, z, 1.1, '#2e8b57'), '1.1 1.1 1.1', 1400);
        planted++;
        land.setAttribute('material', M(shades[planted]));
        if (planted === 6) {
          const birds = group(root, '0 3.5 -4', { orbit: 'speed: 40' });
          [0, 1, 2].forEach((b) => {
            const bird = cone(birds, v(1.5 + b * 0.4, b * 0.2, 0), 0.1, 0, 0.3, '#34495e', 3, { rotation: '0 0 -90' });
            growIn(bird);
          });
        }
        step();
      });
    });
  },

  // 16 — Peace, Justice and Strong Institutions: set the doves free.
  16(ctx) {
    const { root } = ctx;
    ctx.sky('#d4e6f1');
    ground(root, '#d5d8dc');
    const court = group(root, '0 0 -8');
    box(court, '0 0.15 0', 6, 0.3, 2.5, '#ecf0f1');
    for (let i = -2; i <= 2; i++) cyl(court, v(i * 1.2, 1.4, 1), 0.18, 2.2, '#fdfefe', 8);
    box(court, '0 2.6 0.6', 6.2, 0.2, 1.4, '#ecf0f1');
    el(court, 'a-triangle', { position: '0 2.7 1.31', 'vertex-a': '0 0.9 0', 'vertex-b': '-3.1 0 0', 'vertex-c': '3.1 0 0', material: M('#00689D', 'side: double') });
    const step = ctx.task(5);
    arc(5, 3.4, 90, 0).forEach(([x, z], i) => {
      const dove = group(root, v(x, 0.25, z));
      const body = ball(dove, '0 0 0', 0.18, '#ffffff', { scale: '1.4 0.9 0.9' });
      ball(dove, '0.24 0.1 0', 0.1, '#ffffff');
      box(dove, '0 0.08 0.18', 0.25, 0.03, 0.25, '#f4f6f7', { rotation: '30 0 0' });
      box(dove, '0 0.08 -0.18', 0.25, 0.03, 0.25, '#f4f6f7', { rotation: '-30 0 0' });
      target(body, () => {
        anim(dove, 'fly', { property: 'position', to: v(x * 2, 7 + i, z * 2 - 4), dur: 3500, easing: 'easeInQuad' });
        setTimeout(() => dove.parentNode && dove.parentNode.removeChild(dove), 3600);
        step();
      });
    });
  },

  // 17 — Partnerships: connect partners to the globe.
  17(ctx) {
    const { root } = ctx;
    ctx.sky('#0d2a40');
    ground(root, '#1b4f72');
    const center = [0, 1.8, -5];
    const globe = ball(root, v(...center), 0.9, '#2e86de', { 'segments-width': 10, 'segments-height': 7 });
    ball(globe, '0.4 0.4 0.6', 0.4, '#58d68d');
    ball(globe, '-0.5 -0.2 0.55', 0.35, '#58d68d');
    anim(globe, 'spin', { property: 'rotation', to: '0 360 0', loop: true, dur: 20000, easing: 'linear' });
    const partners = ['Governments', 'Business', 'Science', 'Communities', 'Youth', 'NGOs'];
    const step = ctx.task(partners.length);
    let joined = 0;
    partners.forEach((name, i) => {
      const a = (i / partners.length) * Math.PI * 2;
      const pos = [center[0] + Math.cos(a) * 2.6, center[1] + Math.sin(a) * 1.3, center[2] + 0.6];
      const node = el(root, 'a-octahedron', { position: v(...pos), radius: 0.25, material: M('#5d6d7e') });
      text(root, name, v(pos[0], pos[1] - 0.42, pos[2]), { width: 2 });
      target(node, () => {
        node.setAttribute('material', M('#f4d03f', 'emissive: #f4d03f; emissiveIntensity: 0.6'));
        el(root, 'a-entity', { [`line__${i}`]: `start: ${v(...pos)}; end: ${v(...center)}; color: #f4d03f` });
        joined++;
        if (joined === partners.length) {
          const ring = group(root, v(...center), { orbit: 'speed: 25' });
          for (let k = 0; k < 17; k++) {
            const b = (k / 17) * Math.PI * 2;
            const c = ctx.allColors[k];
            growIn(ball(ring, v(Math.cos(b) * 1.5, 0, Math.sin(b) * 1.5), 0.12, c, { material: M(c, `emissive: ${c}; emissiveIntensity: 0.5`) }));
          }
        }
        step();
      });
    });
  }
};
