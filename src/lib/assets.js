// Realistic assets: Poly Haven CC0 models / textures / skies, plus optional Sketchfab models
// that the team drops into public/assets/sketchfab/ and lists in models.json.
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

const skyCache = new Map();

// Sets the 360° background and image-based lighting. `null` falls back to a plain colour.
export function setEnvironment(sceneEl, key, fallbackColor = '#87ceeb') {
  const obj = sceneEl.object3D;
  if (!key) {
    obj.background = new THREE.Color(fallbackColor);
    obj.environment = null;
    return;
  }
  const apply = (tex) => { obj.background = tex; obj.environment = tex; };
  if (skyCache.has(key)) { apply(skyCache.get(key)); return; }
  new THREE.TextureLoader().load(`${BASE}sky/${SKY[key]}.jpg`, (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    skyCache.set(key, tex);
    apply(tex);
  });
}

// Large textured ground disc using a Poly Haven PBR texture set.
export function texturedGround(parent, id, { radius = 16, repeat = 12, color = '#ffffff' } = {}) {
  const t = `${BASE}textures/${id}/`;
  const r = `${repeat} ${repeat}`;
  return el(parent, 'a-circle', {
    radius, segments: 32, rotation: '-90 0 0', shadow: 'receive: true; cast: false',
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
  const e = el(parent, 'a-entity', {
    position: pos, rotation: rot, scale: v(scale, scale, scale),
    'gltf-model': `url(${BASE}models/${id}/${id}.gltf)`
  });
  if (shadow) e.setAttribute('shadow', 'cast: true; receive: false');
  return e;
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
  const e = el(parent, 'a-entity', {
    position: pos, rotation: `${rot}`, scale: v(s, s, s),
    'gltf-model': `url(${BASE}sketchfab/${m.file})`, shadow: 'cast: true; receive: false'
  });
  if (m.yOffset) e.object3D.position.y += m.yOffset * s;
  if (m.animated) e.setAttribute('gltf-anim', '');
  return e;
}

export function credits() {
  return Object.values(external).filter((m) => m.file && m.credit).map((m) => m.credit);
}
