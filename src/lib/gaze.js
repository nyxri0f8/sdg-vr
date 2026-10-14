// Gaze helpers: make an entity selectable by looking at it, and keep the HUD near the viewer.
/* global AFRAME, THREE */

// Turn an entity into a one-shot gaze target. The cursor's fuse timer emits `click` after 1.5 s.
export function target(e, onActivate, { once = true } = {}) {
  e.classList.add('clickable');
  e.addEventListener('mouseenter', () => {
    if (!e._baseScale) e._baseScale = e.object3D.scale.clone();
    e.object3D.scale.copy(e._baseScale).multiplyScalar(1.15);
  });
  e.addEventListener('mouseleave', () => {
    if (e._baseScale) e.object3D.scale.copy(e._baseScale);
  });
  const handler = () => {
    if (once) {
      e.classList.remove('clickable');
      e.removeEventListener('click', handler);
      if (e._baseScale) e.object3D.scale.copy(e._baseScale);
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

  // Keeps an object (fish, birds) swimming in a circle around its parent.
  AFRAME.registerComponent('orbit', {
    schema: { speed: { default: 20 } },
    tick(t, dt) {
      this.el.object3D.rotation.y += THREE.MathUtils.degToRad(this.data.speed) * (dt / 1000);
    }
  });
}
