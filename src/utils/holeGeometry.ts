import type { HoleInfo, SlotType } from '../data/types';

export interface Point {
  x: number;
  y: number;
}

export interface HoleShape {
  tee: Point;
  apex: Point;
  green: Point;
  /** Half-width of the fairway corridor at the widest point, for drawing + spacing */
  width: number;
}

export const VIEW_W = 320;
export const VIEW_H = 520;

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/** Deterministic pseudo-random in [0,1) from a seed string. */
export function seededRand(seed: string): number {
  const h = hashSeed(seed);
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

/** Build a stylised bird's-eye fairway shape for a hole, varied by par/number. */
export function getHoleShape(hole: HoleInfo): HoleShape {
  const seed = seededRand(`hole-${hole.number}-${hole.par}`);
  const direction = seed > 0.5 ? 1 : -1;
  const doglegStrength = hole.par === 3 ? 8 : hole.par === 5 ? 70 : 40;
  const apexOffset = direction * (doglegStrength * (0.5 + seed));

  const tee: Point = { x: VIEW_W / 2, y: 60 };
  const green: Point = { x: VIEW_W / 2, y: VIEW_H - 40 };
  const apex: Point = { x: VIEW_W / 2 + apexOffset, y: VIEW_H / 2 };

  return { tee, apex, green, width: hole.par === 3 ? 40 : hole.par === 5 ? 55 : 48 };
}

function quadBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

export function fairwayPath(shape: HoleShape): string {
  const { tee, apex, green } = shape;
  return `M ${tee.x} ${tee.y} Q ${apex.x} ${apex.y} ${green.x} ${green.y}`;
}

const SLOT_T: Record<SlotType, number> = {
  tee: 0.06,
  fairway: 0.5,
  green: 0.9,
};

const AVATAR_SPACING = 22;

/**
 * Since the live simulation now allows at most one group per slot, players
 * are laid out as a clean side-by-side row anchored at that slot's point on
 * the hole (rather than randomly scattered) — e.g. the whole group standing
 * together at the tee.
 */
export function positionForPlayer(shape: HoleShape, slot: SlotType, indexInGroup: number, groupSize: number): Point {
  const t = SLOT_T[slot];
  const base = quadBezier(shape.tee, shape.apex, shape.green, t);
  const offsetFromCenter = (indexInGroup - (groupSize - 1) / 2) * AVATAR_SPACING;

  if (slot === 'tee') {
    // Row of players standing beside the tee marker (tee is now at the top).
    return { x: base.x + offsetFromCenter, y: base.y + 26 };
  }
  if (slot === 'green') {
    // Row of players clustered just above the green/flag (green is now at the bottom).
    return { x: base.x + offsetFromCenter, y: base.y - 40 };
  }
  // Fairway: spread horizontally across the fairway corridor.
  return { x: base.x + offsetFromCenter, y: base.y };
}
