import 'aframe';
import { SDGS } from './sdgs.js';
import { registerComponents, target } from './lib/gaze.js';
import { v, M, el, group, ball, text, anim, growIn } from './lib/build.js';
import { setEnvironment, texturedGround, loadExternalModels, credits } from './lib/assets.js';
import { BUILDERS } from './scenes/goals.js';

registerComponents();

// ---------------------------------------------------------------------------
// Scene skeleton (injected after components are registered)
// ---------------------------------------------------------------------------
document.body.insertAdjacentHTML('beforeend', `
<a-scene
  renderer="antialias: true; colorManagement: true; foveationLevel: 1; maxCanvasWidth: 1920; maxCanvasHeight: 1920"
  xr-mode-ui="enabled: true"
  loading-screen="enabled: false"
  shadow="type: pcfsoft"
  device-orientation-permission-ui="enabled: false">
  <a-entity light="type: hemisphere; color: #ffffff; groundColor: #6b5a43; intensity: 0.6"></a-entity>
  <a-entity light="type: directional; color: #fff4e0; intensity: 2.2; castShadow: true;
    shadowMapWidth: 1024; shadowMapHeight: 1024; shadowCameraLeft: -9; shadowCameraRight: 9;
    shadowCameraTop: 9; shadowCameraBottom: -9; shadowCameraFar: 40; shadowBias: -0.0005"
    position="4 9 3"></a-entity>

  <a-entity id="world"></a-entity>
  <a-entity id="panel"></a-entity>
  <a-entity id="hud" follow-yaw></a-entity>

  <a-entity id="rig">
    <a-entity id="camera" camera look-controls="magicWindowTrackingEnabled: true" position="0 1.6 0">
      <a-entity id="cursor" position="0 0 -1"
        cursor="fuse: true; fuseTimeout: 1500; rayOrigin: mouse"
        raycaster="objects: .clickable; far: 40; interval: 60"
        gaze-ring="dur: 1500">
        <a-entity class="gaze-bg" geometry="primitive: ring; radiusInner: 0.014; radiusOuter: 0.02"
          material="color: #ffffff; shader: flat; opacity: 0.7; transparent: true; depthTest: false"></a-entity>
        <a-entity class="gaze-fill" geometry="primitive: ring; radiusInner: 0.012; radiusOuter: 0.026; thetaStart: 90; thetaLength: 0.01"
          material="color: #FCC30B; shader: flat; side: double; depthTest: false"></a-entity>
      </a-entity>
      <a-entity id="fader" geometry="primitive: sphere; radius: 0.4"
        material="color: #000000; shader: flat; side: back; opacity: 0; transparent: true; depthTest: false"></a-entity>
    </a-entity>
  </a-entity>
</a-scene>`);

const scene = document.querySelector('a-scene');
const world = document.getElementById('world');
const panel = document.getElementById('panel');
const hud = document.getElementById('hud');
const fader = document.getElementById('fader');
const cursor = document.getElementById('cursor');
const ALL_COLORS = SDGS.map((g) => g.color);

// ---------------------------------------------------------------------------
// Progress (which goals the viewer completed), kept in this browser only
// ---------------------------------------------------------------------------
const STORE = 'sdg-vr-done';
let done = new Set();
try { done = new Set(JSON.parse(localStorage.getItem(STORE) || '[]')); } catch { /* storage unavailable */ }
const saveDone = () => { try { localStorage.setItem(STORE, JSON.stringify([...done])); } catch { /* ignore */ } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

// key: one of SKY in assets.js (HDRI sky + lighting), or null for a plain colour (e.g. underwater).
function setEnv(key, color) { setEnvironment(scene, key, color); }
function setFog(color, near, far) {
  if (color) scene.setAttribute('fog', { type: 'linear', color, near, far });
  else scene.removeAttribute('fog');
}

function fade(to) {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      fader.removeEventListener('animationcomplete__fade', finish);
      resolve();
    };
    fader.addEventListener('animationcomplete__fade', finish);
    fader.setAttribute('animation__fade', { property: 'material.opacity', from: 1 - to, to, dur: 260, easing: 'linear' });
    setTimeout(finish, 500);
  });
}

// A flat gaze button with a label, used by the HUD and the home grid.
function button(parent, label, pos, { w = 0.3, h = 0.12, color = '#ffffff', textColor = '#19486a', wrap = 10, onActivate }) {
  const b = el(parent, 'a-plane', { position: pos, width: w, height: h, material: `color: ${color}; shader: flat; side: double` });
  text(b, label, '0 0 0.002', { color: textColor, width: w * 1.6, wrapCount: wrap });
  target(b, onActivate, { once: false });
  return b;
}

// ---------------------------------------------------------------------------
// HUD: the small navigation bar at the bottom of the view
// ---------------------------------------------------------------------------
let current = 0;
let inVr = false;

// The 3D bar is only needed in VR; on laptop / phone the HTML bar is used instead.
function buildHud() {
  clear(hud);
  if (!inVr) return;
  const bar = group(hud, '0 -0.72 -1.15', { rotation: '-38 0 0' });
  el(bar, 'a-plane', { width: 1.08, height: 0.2, material: 'color: #0d1b2a; shader: flat; opacity: 0.8; transparent: true' });
  button(bar, '<  PREV', '-0.38 0 0.005', { w: 0.28, h: 0.13, onActivate: () => go(current === 0 ? 17 : current - 1) });
  const label = current === 0 ? 'HOME' : `HOME  (${current}/17)`;
  const color = current === 0 ? '#FCC30B' : SDGS[current - 1].color;
  button(bar, label, '0 0 0.005', { w: 0.4, h: 0.13, color, textColor: '#ffffff', wrap: 14, onActivate: () => go(0) });
  button(bar, 'NEXT  >', '0.38 0 0.005', { w: 0.28, h: 0.13, onActivate: () => go(current === 17 ? 0 : current + 1) });
  text(bar, current === 0 ? 'Look at a goal to open it' : 'Look here: PREV, HOME or NEXT', '0 0.15 0.005', { width: 0.9, wrapCount: 34, color: '#d6eaf8' });
}

// ---------------------------------------------------------------------------
// Info panel shown on the left of every goal
// ---------------------------------------------------------------------------
function infoPanel(goal) {
  clear(panel);
  const p = group(panel, '-1.9 1.55 -2.1', { rotation: '0 42 0' });
  el(p, 'a-plane', { width: 1.7, height: 1.55, material: 'color: #0d1b2a; shader: flat; opacity: 0.9; transparent: true' });
  el(p, 'a-plane', { position: '0 0.62 0.002', width: 1.7, height: 0.32, material: `color: ${goal.color}; shader: flat` });
  text(p, `GOAL ${goal.n}`, '-0.62 0.68 0.004', { width: 0.9, wrapCount: 12, align: 'left', anchor: 'left', color: '#ffffff' });
  text(p, goal.title, '-0.62 0.56 0.004', { width: 1.3, wrapCount: 26, align: 'left', anchor: 'left', color: '#ffffff' });
  text(p, goal.goal, '0 0.3 0.004', { width: 1.5, wrapCount: 38, color: '#ffffff' });
  text(p, `DID YOU KNOW?\n${goal.fact}`, '0 0.03 0.004', { width: 1.5, wrapCount: 40, color: '#d6eaf8' });
  text(p, `YOU CAN HELP: ${goal.tip}`, '0 -0.24 0.004', { width: 1.5, wrapCount: 40, color: '#abebc6' });
  const status = text(p, '', '0 -0.55 0.004', { width: 1.5, wrapCount: 36, color: '#FCC30B' });
  return status;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------
function buildHome() {
  setEnv(null, '#0d2a40');
  setFog(null);
  texturedGround(world, 'gravel_concrete', { repeat: 10, color: '#8899aa' });
  clear(panel);

  text(world, 'SUSTAINABLE DEVELOPMENT GOALS', '0 3.1 -3.6', { width: 4.6, wrapCount: 32, color: '#ffffff' });
  text(world, `17 goals to transform our world  ·  ${done.size} of 17 completed`, '0 2.8 -3.6', { width: 3, wrapCount: 46, color: '#aed6f1' });

  // Rotating low-poly globe on the right.
  const globe = ball(world, '3.1 1.6 -2', 0.6, '#2e86de', { 'segments-width': 10, 'segments-height': 7 });
  ball(globe, '0.3 0.3 0.4', 0.28, '#58d68d');
  ball(globe, '-0.35 -0.15 0.4', 0.24, '#58d68d');
  ball(globe, '0.1 -0.3 -0.45', 0.25, '#58d68d');
  anim(globe, 'spin', { property: 'rotation', to: '0 360 0', loop: true, dur: 24000, easing: 'linear' });

  // Instructions on the left.
  const p = group(world, '-3 1.6 -2', { rotation: '0 55 0' });
  el(p, 'a-plane', { width: 1.4, height: 1, material: 'color: #0d1b2a; shader: flat; opacity: 0.9; transparent: true' });
  text(p, 'HOW TO PLAY\n\nNo controllers needed.\nTurn your head and hold the dot on a goal for 1.5 seconds to open it.\n\nLook down to find PREV, HOME and NEXT.', '0 0 0.004', { width: 1.25, wrapCount: 30 });

  // Credits for third-party assets (CC-BY requires attribution).
  const c = group(world, '0 0.35 -3.2', { rotation: '-30 0 0' });
  const lines = ['3D models, textures and skies: Poly Haven (CC0)', ...credits()];
  el(c, 'a-plane', { width: 2.6, height: 0.12 + lines.length * 0.08, material: 'color: #0d1b2a; shader: flat; opacity: 0.75; transparent: true' });
  text(c, `CREDITS\n${lines.join('\n')}`, '0 0 0.004', { width: 2.4, wrapCount: 70, color: '#aed6f1' });

  // 17 tiles on a curved wall: 9 on top, 8 below.
  const rows = [SDGS.slice(0, 9), SDGS.slice(9)];
  rows.forEach((row, r) => {
    const y = r === 0 ? 2.15 : 1.42;
    const span = r === 0 ? 96 : 84;
    row.forEach((g, i) => {
      const a = THREE.MathUtils.degToRad(-span / 2 + (span * i) / (row.length - 1));
      const pos = v(Math.sin(a) * 3.4, y, -Math.cos(a) * 3.4);
      const tile = el(world, 'a-plane', { position: pos, rotation: v(0, -THREE.MathUtils.radToDeg(a), 0), width: 0.56, height: 0.62, material: `color: ${g.color}; shader: flat; side: double` });
      text(tile, String(g.n), '0 0.12 0.003', { width: 1.6, wrapCount: 8 });
      text(tile, g.short.toUpperCase(), '0 -0.14 0.003', { width: 0.52, wrapCount: 13 });
      if (done.has(g.n)) {
        el(tile, 'a-plane', { position: '0 -0.27 0.004', width: 0.4, height: 0.08, material: 'color: #ffffff; shader: flat' });
        text(tile, 'COMPLETED', '0 -0.27 0.006', { width: 0.38, wrapCount: 11, color: g.color });
      }
      target(tile, () => go(g.n), { once: false });
    });
  });
}

function buildGoal(n) {
  const goal = SDGS[n - 1];
  const status = infoPanel(goal);
  setFog(null);

  const ctx = {
    root: world,
    goal,
    allColors: ALL_COLORS,
    env: setEnv,
    fog: setFog,
    task(total) {
      let count = 0;
      const show = () => status.setAttribute('text', 'value',
        count < total ? `TASK: ${goal.task}  (${count}/${total})` : 'GOAL COMPLETE! Look down at NEXT to continue.');
      show();
      return () => {
        count = Math.min(total, count + 1);
        show();
        if (count === total) celebrate(goal);
      };
    }
  };
  BUILDERS[n](ctx);
}

function celebrate(goal) {
  done.add(goal.n);
  saveDone();
  const burst = group(world, '0 2.6 -3.2');
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const c = i % 2 ? goal.color : '#ffffff';
    const s = ball(burst, '0 0 0', 0.07, c, { material: M(c, `emissive: ${c}; emissiveIntensity: 0.8`) });
    anim(s, 'out', { property: 'position', to: v(Math.cos(a) * 1.4, Math.sin(a) * 1.0, 0), dur: 1100 });
    anim(s, 'fade', { property: 'scale', to: '0.01 0.01 0.01', dur: 900, delay: 900 });
  }
  const banner = text(world, 'GOAL COMPLETE!', '0 2.6 -3.2', { width: 3, wrapCount: 16, color: '#ffffff' });
  growIn(banner);
  setTimeout(() => burst.parentNode && burst.parentNode.removeChild(burst), 2200);
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
let busy = false;

async function go(n) {
  if (busy || n < 0 || n > 17) return;
  busy = true;
  await fade(1);
  current = n;
  clear(world);
  if (n === 0) buildHome(); else buildGoal(n);
  buildHud();
  sync2d();
  history.replaceState(null, '', n === 0 ? '#' : `#${n}`);
  await fade(0);
  busy = false;
}

// 2D bar for laptop / phone.
const select2d = document.getElementById('select2d');
select2d.innerHTML = '<option value="0">Home: all 17 goals</option>' +
  SDGS.map((g) => `<option value="${g.n}">${g.n}. ${g.title}</option>`).join('');
select2d.addEventListener('change', () => go(Number(select2d.value)));
document.getElementById('prev2d').addEventListener('click', () => go(current === 0 ? 17 : current - 1));
document.getElementById('next2d').addEventListener('click', () => go(current === 17 ? 0 : current + 1));
function sync2d() { select2d.value = String(current); }

// In VR the cursor follows the head; outside VR it follows the mouse / touch.
function setGazeMode(vr) {
  inVr = vr;
  buildHud();
  document.body.classList.toggle('in-vr', inVr);
  cursor.setAttribute('cursor', 'rayOrigin', inVr ? 'entity' : 'mouse');
  cursor.querySelector('.gaze-bg').setAttribute('visible', inVr);
  cursor.querySelector('.gaze-fill').setAttribute('visible', inVr);
}

scene.addEventListener('enter-vr', () => setGazeMode(true));
scene.addEventListener('exit-vr', () => setGazeMode(false));

async function start() {
  await loadExternalModels();
  // Draw overlays (cursor + fade sphere) on top of everything else.
  cursor.object3D.traverse((o) => { o.renderOrder = 1000; });
  fader.object3D.traverse((o) => { o.renderOrder = 999; });
  setGazeMode(false);
  const initial = Number(location.hash.slice(1)) || 0;
  current = initial;
  if (initial === 0) buildHome(); else buildGoal(initial);
  buildHud();
  sync2d();
  document.getElementById('loading').classList.add('hide');
}

if (scene.hasLoaded) start(); else scene.addEventListener('loaded', start);

// Handy from the browser console while testing, e.g. sdg.go(7) or sdg.setGazeMode(true).
window.sdg = { go, setGazeMode };
