import { useEffect, useRef, useState } from 'react';
import type { Group, LieType, OnBallInfo, Player, SlotType } from '../data/types';
import { MOCK_GROUPS, MOCK_PLAYERS } from '../data/mockData';
import { HOLES } from '../data/courseData';

const SLOT_INDEX: Record<SlotType, number> = { tee: 0, fairway: 1, green: 2 };

const HOLE_YARDS: Record<number, number> = Object.fromEntries(HOLES.map((h) => [h.number, h.yards]));

/** Probability an eligible (unblocked) group actually advances on a given
 * tick, so movement staggers naturally instead of the whole field
 * lock-stepping forward together. Tuned against tickMs=3000; scaled down 4x
 * from the original pace so the field moves noticeably slower overall. */
const MOVE_PROBABILITY = 0.03;

/** Probability an on-course group that *didn't* move this tick still gets a
 * fresh "over the ball" reading — e.g. the scorer clocking that play has
 * passed to the next player in the group, or an updated distance/lie for
 * the player already up. */
const ON_BALL_REFRESH_PROBABILITY = 0.03;

const LIES_BY_SLOT: Record<SlotType, LieType[]> = {
  tee: ['Tee'],
  fairway: ['Fairway', 'Fairway', 'Fairway', 'Rough', 'Bunker'],
  green: ['Green', 'Green', 'Green', 'Fringe'],
};

/** Roughly realistic hole-score distribution, relative to par, rolled per
 * player whenever their group holes out. Used to drive live roundScore and
 * birdie-streak ("on fire") tracking. */
const HOLE_SCORE_WEIGHTS: { delta: number; weight: number }[] = [
  { delta: -2, weight: 3 }, // eagle
  { delta: -1, weight: 22 }, // birdie
  { delta: 0, weight: 50 }, // par
  { delta: 1, weight: 20 }, // bogey
  { delta: 2, weight: 5 }, // double bogey+
];
const HOLE_SCORE_TOTAL_WEIGHT = HOLE_SCORE_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);

function rollHoleScore(): number {
  let r = Math.random() * HOLE_SCORE_TOTAL_WEIGHT;
  for (const { delta, weight } of HOLE_SCORE_WEIGHTS) {
    if (r < weight) return delta;
    r -= weight;
  }
  return 0;
}

function slotKey(hole: number, slot: SlotType) {
  return `${hole}:${slot}`;
}

function progressOrderKey(g: Group): number {
  const holesCompleted = 18 - g.holesRemaining;
  return holesCompleted * 3 + (g.slot ? SLOT_INDEX[g.slot] : 0);
}

/** Simulates the walking scorer's next "over the ball" message for a group
 * already sitting in a given hole/slot. */
function generateOnBall(group: Group, hole: number, slot: SlotType): OnBallInfo {
  const playerId = group.playerIds[Math.floor(Math.random() * group.playerIds.length)];
  const lies = LIES_BY_SLOT[slot];
  const lie = lies[Math.floor(Math.random() * lies.length)];
  const holeYards = HOLE_YARDS[hole] ?? 400;

  if (slot === 'tee') {
    return { playerId, distanceToPin: holeYards, distanceUnit: 'yds', lie };
  }
  if (slot === 'fairway') {
    const max = Math.max(60, Math.min(220, holeYards - 60));
    const distanceToPin = Math.round(40 + Math.random() * (max - 40));
    return { playerId, distanceToPin, distanceUnit: 'yds', lie };
  }
  // green
  const distanceToPin = Math.round(2 + Math.random() * 40);
  return { playerId, distanceToPin, distanceUnit: 'ft', lie };
}

/**
 * Drives a lightweight simulation of live scoring-system updates, polling
 * for changes every 3 seconds by default. Models each hole as three slots
 * (tee, fairway, green) that can hold at most one group at a time — a group
 * can only advance to the next slot (or the tee of the next hole) once it's
 * vacant, so the field naturally queues up just like real play. Pending
 * groups are promoted onto hole 1 / hole 10 tee only once that tee is
 * clear. This stands in for the feed that would normally come from the
 * walking scorer / live scoring API — including, per group, periodic "over
 * the ball" readings (which player, their lie, and distance to the pin).
 */
export function useLiveBoard(tickMs = 3000) {
  const [groups, setGroups] = useState<Group[]>(() =>
    MOCK_GROUPS.map((g) =>
      g.status === 'on-course' && g.slot
        ? { ...g, onBall: generateOnBall(g, g.currentHole, g.slot) }
        : { ...g }
    )
  );
  const [players, setPlayers] = useState<Record<string, Player>>(MOCK_PLAYERS);
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;

      const holeOutUpdates: { pid: string; delta: number }[] = [];

      setGroups((prev) => {
        const byId = new Map(prev.map((g) => [g.id, { ...g } as Group]));
        const occupancy = new Map<string, string>();
        for (const g of prev) {
          if (g.status === 'on-course' && g.slot) occupancy.set(slotKey(g.currentHole, g.slot), g.id);
        }

        // Most-progressed groups get first refusal on moving forward, so a
        // group vacating a slot can free it up for the group behind it
        // within the same tick (a small realistic cascade).
        const onCourseSorted = prev
          .filter((g) => g.status === 'on-course')
          .sort((a, b) => progressOrderKey(b) - progressOrderKey(a));

        for (const snapshot of onCourseSorted) {
          const g = byId.get(snapshot.id);
          if (!g || g.status !== 'on-course' || !g.slot) continue;
          if (Math.random() > MOVE_PROBABILITY) {
            // Didn't advance slots this tick — still a chance the walking
            // scorer reports a fresh over-the-ball reading for this group.
            if (Math.random() < ON_BALL_REFRESH_PROBABILITY) {
              g.onBall = generateOnBall(g, g.currentHole, g.slot);
            }
            continue;
          }

          const { currentHole, slot } = g;
          let targetHole = currentHole;
          let targetSlot: SlotType | 'finish';

          if (slot === 'tee') targetSlot = 'fairway';
          else if (slot === 'fairway') targetSlot = 'green';
          else if (g.holesRemaining <= 1) targetSlot = 'finish';
          else {
            targetHole = currentHole === 18 ? 1 : currentHole + 1;
            targetSlot = 'tee';
          }

          if (targetSlot === 'finish') {
            occupancy.delete(slotKey(currentHole, slot));
            g.status = 'finished';
            g.holesRemaining = 0;
            g.onBall = null;
            continue;
          }

          const key = slotKey(targetHole, targetSlot);
          if (occupancy.has(key)) continue; // blocked — slot ahead is occupied

          occupancy.delete(slotKey(currentHole, slot));
          occupancy.set(key, g.id);
          const holedOut = slot === 'green';
          g.currentHole = targetHole;
          g.slot = targetSlot;
          if (holedOut) {
            g.holesRemaining = Math.max(g.holesRemaining - 1, 0);
            for (const pid of g.playerIds) {
              holeOutUpdates.push({ pid, delta: rollHoleScore() });
            }
          }
          g.onBall = generateOnBall(g, targetHole, targetSlot);
        }

        // Promote the next queued group onto hole 1 / hole 10 only if that
        // tee is currently clear. Checked roughly every 192s (64 ticks at
        // 3s) — 4x slower than before, matching the reduced sim speed.
        if (tickRef.current % 64 === 0) {
          for (const startHole of [1, 10] as const) {
            const key = slotKey(startHole, 'tee');
            if (occupancy.has(key)) continue;
            const queue = prev
              .filter((g) => g.status === 'pending' && g.startingHole === startHole)
              .sort((a, b) => a.groupNumber - b.groupNumber);
            const promote = queue[0];
            if (!promote) continue;
            const g = byId.get(promote.id);
            if (!g) continue;
            g.status = 'on-course';
            g.currentHole = startHole;
            g.slot = 'tee';
            g.holesRemaining = 18;
            g.onBall = generateOnBall(g, startHole, 'tee');
            occupancy.set(key, g.id);
          }
        }

        return prev.map((g) => byId.get(g.id) ?? g);
      });

      if (holeOutUpdates.length) {
        setPlayers((prevPlayers) => {
          const next = { ...prevPlayers };
          for (const { pid, delta } of holeOutUpdates) {
            const p = next[pid];
            if (!p) continue;
            const isBirdie = delta === -1;
            next[pid] = {
              ...p,
              roundScore: p.roundScore + delta,
              birdieStreak: isBirdie ? p.birdieStreak + 1 : 0,
            };
          }
          return next;
        });
      }
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return { groups, players };
}
