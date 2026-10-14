# SDG VR

Explore the 17 UN Sustainable Development Goals in virtual reality. Built for **Meta Quest 2** with WebXR, so it runs in the Quest browser with no install and **no controllers** — everything is done by looking (head gaze).

## How it works for visitors

1. Open the site in the **Meta Quest Browser** and press **VR** (bottom-right).
2. A small ring sits in the centre of your view. Hold it on something for **1.5 seconds** to select it.
3. The home screen shows all 17 goals. Look at one to open it.
4. Each goal is its own scene with an info panel and a task, such as planting trees or removing ocean plastic.
5. Look **down** to find the **PREV · HOME · NEXT** bar to move between goals.

On a laptop or phone the same site works: drag to look around, click objects, and use the bar at the bottom of the screen.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. To test on the Quest over USB (Developer Mode + USB debugging on), forward the port so the headset can use `localhost`:

```bash
adb reverse tcp:5173 tcp:5173
```

## Deploy

The repo is a static Vite site. Vercel builds it with `npm run build` and serves `dist/` over HTTPS, which WebXR requires.

```bash
npx vercel --prod
```

## Project layout

| Path | What it is |
|---|---|
| `src/main.js` | Scene setup, home view, info panel, VR nav bar, transitions, progress |
| `src/scenes/goals.js` | One builder per goal (scene + gaze task) |
| `src/sdgs.js` | Titles, official colours, facts and tasks for all 17 goals |
| `src/lib/assets.js` | HDRI skies, PBR ground, Poly Haven models, Sketchfab slots |
| `src/lib/gaze.js` | Gaze targets, VR nav bar follow, gaze ring, glTF animation |
| `src/lib/build.js` | Helpers and code-built stand-in props |
| `public/assets/` | Skies, textures and models |

## Adding Sketchfab models (people, houses, turbines, fish…)

Some things Poly Haven doesn't offer are drawn in code until you add a real model. To swap one in:

1. Download the model from Sketchfab as **glTF Binary (.glb)**. Prefer **CC0** or **CC-BY** licences, and keep them light for Quest 2 (ideally under ~20k triangles and under ~3 MB each).
2. Put the file in `public/assets/sketchfab/`.
3. Add an entry to `public/assets/sketchfab/models.json`:

```json
{
  "person": {
    "file": "person.glb",
    "scale": 1,
    "credit": "\"Casual Person\" by AuthorName (CC-BY 4.0) via Sketchfab"
  }
}
```

| Slot name | Used in goals | Notes |
|---|---|---|
| `person` | 1, 3, 4, 5, 8, 10 | Standing person, ~1.7 m tall |
| `house` | 1, 2, 7, 13 | Small house, ~3–4 m wide at `scale: 1` → tune `scale` |
| `wind_turbine` | 7, 13 | ~2–3 m tall works best (scale it down) |
| `solar_panel` | 7 | Ground-mounted panel |
| `factory` | 8 | Building placed 8 m in front |
| `city_building` | 11 | Low building, under 1.5 m tall, so its roof is visible |
| `fish` | 14 | Set `"animated": true` if it has a swim animation |
| `dove` | 16 | Small bird |
| `tree` | 1, 15 | Lightweight tree |

Optional fields: `scale` (multiplies the model size), `yOffset` (lifts it, in model units), `animated` (plays built-in animations). Every `credit` you add is shown on the home screen. CC-BY models **must** be credited.

## Credits

- 3D models, PBR textures and HDRI skies: [Poly Haven](https://polyhaven.com) (CC0).
- Built with [A-Frame](https://aframe.io) and [Vite](https://vitejs.dev).
