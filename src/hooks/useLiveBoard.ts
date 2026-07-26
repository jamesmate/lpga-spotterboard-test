import { useEffect, useRef, useState } from 'react';
import type { Group, Player, SlotType } from '../data/types';
import { MOCK_GROUPS, MOCK_PLAYERS } from '../data/mockData';

const SLOT_INDEX: Record<SlotType, number> = { tee: 0, fairway: 1, green: 2 };

/** Probability an eligible (unblocked) group actually advances on a given
 * tick, so movement staggers naturally instead of the whole field
 * lock-stepping forward together. */
const MOVE_PROBABILITY = 0.55;

function slotKey(hole: number, slot: SlotType) {
  return `${hole}:${slot}`;
}

function progressOrderKey(g: Group): number {
  const holesCompleted = 18 - g.holesRemaining;
  return holesCompleted * 3 + (g.slot ? SLOT_INDEX[g.slot] : 0);
}

/**
 * Drives a lightweight simulation of live scoring-system updates. Models
 * each hole as three slots (tee, fairway, green) that can hold at most one
 * group at a time — a group can only advance to the next slot (or the tee
 * of the next hole) once it's vacant, so the field naturally queues up just
 * like real play. Pending groups are promoted onto hole 1 / hole 10 tee only
 * once that tee is clear. This stands in for the feed that would normally
 * come from the walking scorer / live scoring API.
 */
export function useLiveBoard(tickMs = 16000) {
  const [groups, setGroups] = useState<Group[]>(() => MOCK_GROUPS.map((g) => ({ ...g })));
  const [players] = useState<Record<string, Player>>(MOCK_PLAYERS);
  const tickRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;

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
          if (Math.random() > MOVE_PROBABILITY) continue;

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
            continue;
          }

          const key = slotKey(targetHole, targetSlot);
          if (occupancy.has(key)) continue; // blocked — slot ahead is occupied

          occupancy.delete(slotKey(currentHole, slot));
          occupancy.set(key, g.id);
          const holedOut = slot === 'green';
          g.currentHole = targetHole;
          g.slot = targetSlot;
          if (holedOut) g.holesRemaining = Math.max(g.holesRemaining - 1, 0);
        }

        // Promote the next queued group onto hole 1 / hole 10 only if that
        // tee is currently clear.
        if (tickRef.current % 3 === 0) {
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
            occupancy.set(key, g.id);
          }
        }

        return prev.map((g) => byId.get(g.id) ?? g);
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return { groups, players };
}
