// Realistic assets: Poly Haven CC0 models / textures / skies, plus optional Sketchfab models
// that the team drops into public/assets/sketchfab/ and lists in models.json.
//
// Performance: every .glb is downloaded and parsed once, its textures are uploaded to the GPU once,
// and each placement is a cheap clone that shares geometry and materials.
import { el, v } from './build.js';

const BASE = `${import.meta.env.BASE_URL}assets/`;

// HDRI skies (converted to JPG). They are both the visible sky and the lighting environment.
export const SKY = {
  day: 'kloofendal_48d_partly_cloudy_puresky',
  clear: 'kloofendal_43d_clear_puresky',
  farm: 'farm_field_puresky',
  dusk: 'qwantani_dusk_2_puresky',
  overcast: 'kloofendal_overcast_puresky'
};

// Every Poly Haven model shipped with the site (optimised .glb files).
export const MODELS = [
  'SchoolDesk_01', 'SchoolChair_01', 'standing_chalkboard_01', 'food_apple_01', 'wicker_basket_01',
  'medical_box', 'wheelchair_01', 'wooden_bucket_01', 'plastic_jerrycan', 'trashbag', 'cardboard_box_01',
  'plastic_bottle_gallon', 'plastic_crate_02', 'ocean_buoy', 'lambis_shell', 'street_lamp_01',
  'painted_wooden_bench', 'lightbulb_led', 'portable_generator', 'metal_toolbox', 'concrete_road_barrier_02',
  'planter_box_01', 'marble_bust_01', 'rock_07', 'shrub_03', 'tree_stump_01', 'quiver_tree_02', 'old_tyre'
];

// --- Shared glTF cache ----------------------------------------------------------
const gltfCache = new Map();
let loader = null;

function loadGltf(url, renderer) {
  if (!gltfCache.has(url)) {
    loader = loader || new THREE.GLTFLoader();
    gltfCache.set(url, new Promise((resolve, reject) => {
      loader.load(url, (gltf) => {
        // Upload textures now so the first time a model appears there is no frame hitch.
        if (renderer) {
          gltf.scene.traverse((o) => {
            if (!o.isMesh) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach((k) => m[k] && renderer.initTexture(m[k])));
          });
        }
        resolve(gltf);
      }, undefined, reject);
    }));
  }
  return gltfCache.get(url);
}

AFRAME.registerComponent('cached-model', {
  schema: { src: { type: 'string' }, castShadow: { default: true } },
  init() {
    const renderer = this.el.sceneEl.renderer;
    loadGltf(this.data.src, renderer).then((gltf) => {
      if (!this.el.parentNode) return; // removed while loading
      const clone = gltf.scene.clone(true);
      clone.traverse((o) => { if (o.isMesh) { o.castShadow = this.data.castShadow; o.receiveShadow = false; } });
      clone.animations = gltf.animations;
      this.el.setObject3D('mesh', clone);
      this.el.emit('model-loaded', { format: 'gltf', model: clone });
    }).catch((err) => console.warn('Model failed to load', this.data.src, err));
  },
  remove() {
    if (this.el.getObject3D('mesh')) this.el.removeObject3D('mesh');
  }
});

// Downloads and prepares every model in the background so tasks never wait on the network.
export async function preloadModels(renderer) {
  for (const id of MODELS) {
    try { await loadGltf(`${BASE}models/${id}.glb`, renderer); } catch { /* keep going */ }
  }
}

// --- Sky + lighting ---------------------------------------------------------------
const skyCache = new Map();

// Average colour of the sky right at the horizon, used to fade distant ground into the sky.
function horizonColor(image) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  g.drawImage(image, 0, 0, 64, 32);
  const row = g.getImageData(0, 15, 64, 2).data;
  let r = 0, gr = 0, b = 0;
  for (let i = 0; i < row.length; i += 4) { r += row[i]; gr += row[i + 1]; b += row[i + 2]; }
  const n = row.length / 4;
  return `rgb(${Math.round(r / n)}, ${Math.round(gr / n)}, ${Math.round(b / n)})`;
}

// Sets the 360° background and image-based lighting. Resolves with the horizon colour
// (or null for a plain colour background such as underwater).
export function setEnvironment(sceneEl, key, fallbackColor = '#87ceeb') {
  const obj = sceneEl.object3D;
  if (!key) {
    obj.background = new THREE.Color(fallbackColor);
    obj.environment = null;
    return Promise.resolve(null);
  }
  const apply = ({ tex, horizon }) => { obj.background = tex; obj.environment = tex; return horizon; };
  if (skyCache.has(key)) return Promise.resolve(apply(skyCache.get(key)));
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(`${BASE}sky/${SKY[key]}.jpg`, (tex) => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      const entry = { tex, horizon: horizonColor(tex.image) };
      skyCache.set(key, entry);
      resolve(apply(entry));
    });
  });
}

// Large textured ground using a Poly Haven PBR texture set. It is big enough that its edge
// disappears into the distance fog. `repeat` is the tiling for a 16 m radius and is scaled up.
export function texturedGround(parent, id, { radius = 45, repeat = 12, color = '#ffffff' } = {}) {
  const t = `${BASE}textures/${id}/`;
  const n = Math.round((repeat * radius) / 16);
  const r = `${n} ${n}`;
  return el(parent, 'a-circle', {
    radius, segments: 48, rotation: '-90 0 0', shadow: 'receive: true; cast: false',
    material: `src: url(${t}diff.jpg); repeat: ${r}; normalMap: url(${t}nor.jpg); normalTextureRepeat: ${r}; ` +
      `roughnessMap: url(${t}rough.jpg); roughnessTextureRepeat: ${r}; roughness: 1; metalness: 0; color: ${color}`
  });
}

// A material string that tiles one of the ground textures onto any primitive.
export function texturedMaterial(id, repeat = 1) {
  const t = `${BASE}textures/${id}/`;
  return `src: url(${t}diff.jpg); repeat: ${repeat} ${repeat}; normalMap: url(${t}nor.jpg); normalTextureRepeat: ${repeat} ${repeat}; roughness: 1`;
}

// Poly Haven model (real-world scale, metres).
export function model(parent, id, pos, { scale = 1, rot = '0 0 0', shadow = true } = {}) {
  return el(parent, 'a-entity', {
    position: pos, rotation: rot, scale: v(scale, scale, scale),
    'cached-model': `src: ${BASE}models/${id}.glb; castShadow: ${shadow}`
  });
}

// Once a model has loaded, put `child` on top of it (e.g. a book on a desk).
export function placeOnTop(modelEl, child, offset = 0.01) {
  const place = () => {
    const box = new THREE.Box3().setFromObject(modelEl.object3D);
    const p = child.object3D.position;
    const local = modelEl.parentNode.object3D.worldToLocal(new THREE.Vector3(p.x, box.max.y + offset, p.z));
    child.object3D.position.y = local.y;
  };
  if (modelEl.getObject3D('mesh')) place(); else modelEl.addEventListener('model-loaded', place, { once: true });
}

// --- Sketchfab (or any other) GLB models supplied by the team -------------------
let external = {};

export async function loadExternalModels() {
  try {
    const res = await fetch(`${BASE}sketchfab/models.json`, { cache: 'no-cache' });
    if (res.ok && (res.headers.get('content-type') || '').includes('json')) external = await res.json();
  } catch { external = {}; }
  return external;
}

export const hasExternal = (name) => Boolean(external[name] && external[name].file);

// Uses the team's GLB for `name` when it is listed in models.json, otherwise calls `fallback()`.
export function externalOr(parent, name, pos, { scale = 1, rot = '0 0 0' } = {}, fallback) {
  const m = external[name];
  if (!m || !m.file) return fallback();
  const s = scale * (m.scale || 1);
  const url = `${BASE}sketchfab/${m.file}`;
  // Animated (skinned) models can't share one cached clone, so they use A-Frame's own loader.
  const e = el(parent, 'a-entity', {
    position: pos, rotation: `${rot}`, scale: v(s, s, s),
    ...(m.animated ? { 'gltf-model': `url(${url})`, shadow: 'cast: true', 'gltf-anim': '' } : { 'cached-model': `src: ${url}` })
  });
  if (m.yOffset) e.object3D.position.y += m.yOffset * s;
  return e;
}

export function credits() {
  return Object.values(external).filter((m) => m.file && m.credit).map((m) => m.credit);
}
