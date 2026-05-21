# Atlas Engine

A browser-based procedural world generator and terrain-aware pathfinder. Every world is unique, seeded by noise — every route is calculated by A*.

---

## Prerequisites

You need **Node.js** installed on your machine.

- Download it from [nodejs.org](https://nodejs.org) — the **LTS** version is fine
- To check if you already have it: open a terminal and run `node -v`

---

## Running the app

```bash
# 1. Navigate into the project folder
cd atlas-engine

# 2. Install dependencies (only needed once)
npm install

# 3. Start the development server
npm run dev
```

Then open your browser and go to **http://localhost:5173**

> If port 5173 is already in use, Vite will pick the next available one (5174, 5175, …) and print the correct URL in the terminal.

---

## How to use it

| Action | What it does |
|---|---|
| **New World** button | Generates a fresh map with a new random seed |
| **Click once** on the map | Places the origin point (A) |
| **Click again** | Places the destination (B) and calculates the route |
| **Click a third time** | Clears the route so you can pick new points |
| **Cost Heatmap** toggle | Overlays terrain traversal costs (green = cheap, red = expensive) |
| **Landmarks** toggle | Shows procedurally named locations across the map |
| **Export PNG** | Downloads the current map as an image |
| **Seed pill** (top right) | Copies a shareable URL — anyone with the link sees the same world |

---

## Terrain & routing

The map is generated using multi-octave Simplex noise with a moisture and temperature layer, producing 8 terrain types:

| Terrain | Traversal cost |
|---|---|
| Deep Ocean | Impassable |
| Shallow Water | ×3.0 |
| Beach | ×1.0 |
| Plains | ×1.0 |
| Forest | ×2.0 |
| Hills | ×2.5 |
| Mountains | ×4.0 |
| Snow Peak | ×6.0 |

Routing uses **A\*** with an octile-distance heuristic and a typed-array min-heap. The sidebar reports steps taken, total travel cost, detour ratio, and terrain avoided.

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. You can serve it with any static file server.
