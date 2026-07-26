# LPGA Spotterboard

A live-style spotterboard for tracking which hole every group/player is on
during an LPGA round, built with React + Vite + Mantine.

## Layout

- **Left panel** — groups waiting to tee off, split into a scrollable queue
  for Hole 1 and a scrollable queue for Hole 10 (LPGA groups tee off on both
  1 and 10). Cards show each player's cumulative tournament score and the
  group's tee time.
- **Main board** — Front Nine (holes 1–9) on top, Back Nine (holes 10–18)
  below. Each hole is a column with a header (hole #, par, yardage) and three
  slots — Tee, Fairway, Green — showing which group is currently there.
  On-course group cards show "X To Play" and each player's live round score.

## Data

`src/data/mockData.ts` procedurally generates a full field of players/groups
(on-course + pending queues for both nines) with a seeded RNG so the layout
is stable across reloads. `src/hooks/useLiveBoard.ts` simulates the walking
scorer feed: every few seconds it advances a handful of on-course groups
(tee → fairway → green → next hole) and promotes the next queued group onto
holes 1 and 10 as earlier groups clear the tee.

To wire up a real feed, replace `useLiveBoard` with a hook that subscribes to
your live scoring API/websocket and produces the same `{ groups, players }`
shape defined in `src/data/types.ts` — the rest of the UI just re-renders
based on each group's `currentHole` / `slot` fields.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. `npm run build` produces a production
bundle in `dist/`.
