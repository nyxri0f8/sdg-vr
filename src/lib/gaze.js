// Gaze helpers: make an entity selectable by looking at it, and keep the HUD near the viewer.
/* global AFRAME, THREE */
import { sfx } from './audio.js';

// A-Frame's raycaster only tests an entity's own meshes, so a group (a shack made of walls,
// roof and door) could never be gazed at. Every task target gets one invisible box covering its
// whole shape, slightly padded, so the gaze always lands on the target itself and the 1.5 s timer
// does not restart while the gaze drifts from one part to another.
function addHitbox(e) {
  const root = e.object3D;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  const m = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.hitbox) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    tmp.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
    box.union(tmp);
  });
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  // Pad by 15% and keep a minimum size so small items (bottles, books) are easy to hold the gaze on.
  const minSize = 0.3 / Math.max(1e-3, root.getWorldScale(new THREE.Vector3()).x);
  const sx = Math.max(size.x * 1.15, minSize), sy = Math.max(size.y * 1.15, minSize), sz = Math.max(size.z * 1.15, minSize);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshBasicMaterial({ visible: false }));
  mesh.position.copy(center);
  mesh.userData.hitbox = true;
  e.setObject3D('hitbox', mesh);
}

// A bobbing yellow arrow above a task target so visitors always know where to look next.
function addMarker(e) {
  const m = document.createElement('a-entity');
  m.setAttribute('geometry', 'primitive: cone; radiusBottom: 0.07; radiusTop: 0; height: 0.16; segmentsRadial: 16');
  m.setAttribute('material', 'color: #FCC30B; emissive: #FCC30B; emissiveIntensity: 0.8; roughness: 0.4');
  m.setAttribute('rotation', '180 0 0');
  const place = () => {
    const box = new THREE.Box3().setFromObject(e.object3D);
    if (box.isEmpty()) return;
    const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y + 0.25, (box.min.z + box.max.z) / 2);
    e.parentNode.object3D.worldToLocal(top);
    m.setAttribute('position', `${top.x} ${top.y} ${top.z}`);
    m.setAttribute('animation__bob', { property: 'position', to: `${top.x} ${top.y + 0.12} ${top.z}`, dir: 'alternate', loop: true, dur: 700, easing: 'easeInOutSine' });
    e.parentNode.appendChild(m);
  };
  return { m, place };
}

// Runs `fn` once a target's shape is final: after its model loads, and after anything placed on
// top of another model (e.g. a book on a desk) or merged (merge-static) has settled.
function whenReady(e, fn) {
  if (e.hasAttribute('cached-model') && !e.getObject3D('mesh')) e.addEventListener('model-loaded', () => setTimeout(fn, 50), { once: true });
  else setTimeout(fn, 450);
}

// Turn an entity into a gaze target. The cursor's fuse timer emits `click` after 1.5 s.
// One-shot targets (task objects) get a hit box and a marker arrow that disappears once activated.
export function target(e, onActivate, { once = true } = {}) {
  e.classList.add('clickable');
  let marker = null;
  if (once) {
    const mk = addMarker(e);
    marker = mk.m;
    whenReady(e, () => {
      if (!e.parentNode || !e.classList.contains('clickable')) return;
      mk.place();
      addHitbox(e);
    });
  }
  e.addEventListener('mouseenter', () => {
    if (!e._baseScale) e._baseScale = e.object3D.scale.clone();
    e.object3D.scale.copy(e._baseScale).multiplyScalar(1.15);
  });
  e.addEventListener('mouseleave', () => {
    if (e._baseScale) e.object3D.scale.copy(e._baseScale);
  });
  const handler = () => {
    sfx.select();
    if (once) {
      e.classList.remove('clickable');
      e.removeEventListener('click', handler);
      if (e._baseScale) e.object3D.scale.copy(e._baseScale);
      if (marker && marker.parentNode) marker.parentNode.removeChild(marker);
    }
    onActivate(e);
  };
  e.addEventListener('click', handler);
  return e;
}

export function registerComponents() {
  // Keeps the navigation bar in front of the viewer: it turns to follow the head
  // only after the head has turned far away, so it never jitters.
  AFRAME.registerComponent('follow-yaw', {
    schema: { threshold: { default: 45 }, speed: { default: 3 } },
    init() {
      this.q = new THREE.Quaternion();
      this.e = new THREE.Euler(0, 0, 0, 'YXZ');
      this.p = new THREE.Vector3();
      this.moving = false;
    },
    tick(t, dt) {
      const cam = this.el.sceneEl.camera;
      if (!cam || !dt) return;
      cam.getWorldQuaternion(this.q);
      cam.getWorldPosition(this.p);
      this.e.setFromQuaternion(this.q, 'YXZ');
      const obj = this.el.object3D;
      obj.position.set(this.p.x, this.p.y, this.p.z);
      let diff = this.e.y - obj.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) > THREE.MathUtils.degToRad(this.data.threshold)) this.moving = true;
      if (this.moving) {
        obj.rotation.y += diff * Math.min(1, (dt / 1000) * this.data.speed);
        if (Math.abs(diff) < 0.03) this.moving = false;
      }
    }
  });

  // Draws the gaze progress ring that fills while the cursor is fusing.
  AFRAME.registerComponent('gaze-ring', {
    schema: { dur: { default: 1500 } },
    init() {
      this.fill = this.el.querySelector('.gaze-fill');
      this.active = false;
      this.start = 0;
      this.el.addEventListener('fusing', () => { this.active = true; this.start = performance.now(); });
      const stop = () => { this.active = false; this.set(0); };
      this.el.addEventListener('mouseleave', stop);
      this.el.addEventListener('click', stop);
    },
    set(deg) {
      if (this.fill) this.fill.setAttribute('geometry', 'thetaLength', Math.max(0.01, deg));
    },
    tick() {
      if (!this.active) return;
      const k = Math.min(1, (performance.now() - this.start) / this.data.dur);
      this.set(k * 360);
    }
  });

  // Plays every animation clip baked into a glTF model (e.g. a swimming fish from Sketchfab).
  AFRAME.registerComponent('gltf-anim', {
    init() {
      this.mixer = null;
      this.el.addEventListener('model-loaded', (e) => {
        const model = e.detail.model;
        if (!model.animations || !model.animations.length) return;
        this.mixer = new THREE.AnimationMixer(model);
        model.animations.forEach((clip) => this.mixer.clipAction(clip).play());
      });
    },
    tick(t, dt) {
      if (this.mixer && dt) this.mixer.update(dt / 1000);
    }
  });

  // Merges every static child primitive of a prop (house, person, tree…) into one mesh with
  // vertex colours, so a prop costs one draw call instead of 10–20. Children that animate, or that
  // tasks change later (class "no-merge"), stay separate.
  AFRAME.registerComponent('merge-static', {
    init() {
      const run = () => setTimeout(() => this.merge(), 0);
      if (this.el.hasLoaded) run(); else this.el.addEventListener('loaded', run, { once: true });
    },
    merge() {
      const root = this.el.object3D;
      if (!this.el.parentNode) return;
      root.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
      const keep = (ent) => {
        for (let n = ent; n && n !== this.el; n = n.parentNode) {
          if (n.classList && n.classList.contains('no-merge')) return true;
          if (n.attributes && [...n.attributes].some((a) => a.name.startsWith('animation'))) return true;
        }
        return false;
      };
      const pos = [], nor = [], col = [];
      const merged = [];
      const m = new THREE.Matrix4();
      root.traverse((o) => {
        if (!o.isMesh || !o.el || o.el === this.el || keep(o.el) || !o.material || !o.material.color) return;
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        g.applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
        const p = g.attributes.position.array, nn = g.attributes.normal.array;
        const c = o.material.color;
        for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(nn[i]); }
        for (let i = 0; i < p.length / 3; i++) col.push(c.r, c.g, c.b);
        g.dispose();
        merged.push(o);
      });
      if (merged.length < 2) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.castShadow = true;
      root.add(this.mesh);
      merged.forEach((o) => { o.visible = false; });
    },
    remove() {
      if (this.mesh) { this.mesh.parent.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
    }
  });

  // A dome of twinkling-looking stars drawn as a single cheap point cloud.
  AFRAME.registerComponent('starfield', {
    schema: { count: { default: 900 }, radius: { default: 70 } },
    init() {
      const pos = new Float32Array(this.data.count * 3);
      const col = new Float32Array(this.data.count * 3);
      for (let i = 0; i < this.data.count; i++) {
        const u = Math.random(), w = Math.random() * 0.95 + 0.05; // upper hemisphere only
        const theta = u * Math.PI * 2, phi = Math.acos(w);
        const r = this.data.radius;
        pos.set([r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)], i * 3);
        const b = 0.6 + Math.random() * 0.4;
        col.set([b, b, b * (0.9 + Math.random() * 0.1)], i * 3);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 0.25, vertexColors: true, fog: false, toneMapped: false, sizeAttenuation: true });
      this.el.setObject3D('mesh', new THREE.Points(geo, mat));
    },
    remove() {
      const pts = this.el.getObject3D('mesh');
      if (pts) { pts.geometry.dispose(); pts.material.dispose(); this.el.removeObject3D('mesh'); }
    }
  });

  // Keeps an object (fish, birds) swimming in a circle around its parent.
  AFRAME.registerComponent('orbit', {
    schema: { speed: { default: 20 } },
    tick(t, dt) {
      this.el.object3D.rotation.y += THREE.MathUtils.degToRad(this.data.speed) * (dt / 1000);
    }
  });
}
