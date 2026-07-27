import type { HoleInfo } from '../data/types';
import { seededRand } from './holeGeometry';

export type ShotResult = 'fairway' | 'green' | 'rough' | 'bunker' | 'water';

export interface SimPlayer {
  id: string;
  name: string;
  /** Live round score relative to par (lower = playing better) — used to bias shot quality */
  roundScore: number;
}

export interface SimShot {
  playerId: string;
  shotNumber: number;
  club: string;
  isTee: boolean;
  isLast: boolean;
  /** Scene units (yards * UNIT), consistent with the 3D shot tracer's coordinate space */
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  carry: number; // yards
  result: ShotResult;
}

export interface HoleExtras {
  /** -1 (bends left), 0 (straight), 1 (bends right) */
  dogleg: number;
  hazard: 'bunker' | 'water' | null;
}

export const UNIT = 1 / 3; // yards -> three.js scene units

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/**
 * Deterministic dogleg direction + hazard for a hole, derived from the same
 * seeded approach the 2D bird's-eye map (holeGeometry.ts) uses, so the two
 * views stay visually consistent for a given hole.
 */
export function getHoleExtras(hole: HoleInfo): HoleExtras {
  const seed = seededRand(`hole-${hole.number}-${hole.par}`);
  const direction = seed > 0.5 ? 1 : -1;
  const dogleg = hole.par === 3 ? 0 : direction;
  const hazardRoll = seededRand(`hole-${hole.number}-hazard`);
  const hazard: HoleExtras['hazard'] = hazardRoll < 0.35 ? 'bunker' : hazardRoll < 0.55 ? 'water' : null;
  return { dogleg, hazard };
}

export function bendOffset(dogleg: number, frac: number): number {
  return dogleg * Math.sin(frac * Math.PI) * 9;
}

function clubForShot(remaining: number, isTee: boolean, par: number): string {
  if (isTee && par >= 4) return remaining > 300 ? 'Driver' : '3-Wood';
  if (isTee && par === 3) {
    if (remaining > 190) return '4-Iron';
    if (remaining > 160) return '6-Iron';
    return '8-Iron';
  }
  if (remaining > 230) return '3-Wood';
  if (remaining > 200) return 'Hybrid';
  if (remaining > 170) return '5-Iron';
  if (remaining > 150) return '7-Iron';
  if (remaining > 120) return '9-Iron';
  if (remaining > 80) return 'PW';
  return 'SW';
}

/** Map a player's live round score to a 0-1 "skill" used to bias shot dispersion. */
function skillFromScore(roundScore: number): number {
  const s = 0.75 - roundScore * 0.05;
  return Math.min(0.95, Math.max(0.45, s));
}

/**
 * Synthesize a plausible tee-to-green shot sequence for one player on one
 * hole. There's no real shot-by-shot feed in this app's data model (groups
 * only carry a current slot), so this fabricates a deterministic sequence
 * seeded by hole + player, in the spirit of the uploaded shot-tracer
 * sandbox, scaled to this hole's actual par/yardage/dogleg.
 */
export function generateHoleShots(hole: HoleInfo, extras: HoleExtras, players: SimPlayer[]): SimShot[] {
  const shots: SimShot[] = [];
  const L = hole.yards;

  players.forEach((player) => {
    const rng = mulberry32(hashSeed(`${hole.number}-${player.id}`));
    const skill = skillFromScore(player.roundScore);
    const fullShotCount = Math.max(1, hole.par - 2 + (rng() < skill ? 0 : 1));
    const skillDrift = (1 - skill) * 14 + 3;

    let remaining = L;
    let x = 0;
    let z = 0;
    for (let i = 0; i < fullShotCount; i++) {
      const isTee = i === 0;
      const isLast = i === fullShotCount - 1;
      const club = clubForShot(remaining, isTee, hole.par);
      const shotsLeft = fullShotCount - i;
      let carry = isLast ? remaining * (0.9 + rng() * 0.08) : (remaining / shotsLeft) * (0.82 + rng() * 0.32);
      carry = Math.min(carry, remaining + 6);

      const startX = x;
      const startZ = z;
      const frac = (L - remaining) / L;
      const aimZ = bendOffset(extras.dogleg, frac + (carry / L) * 0.5);
      const drift = (rng() - 0.5) * skillDrift * (isLast ? 0.5 : 1);
      // startX is in scene units (yards * UNIT); convert back to yards, add
      // this shot's carry, then back to scene units.
      x = (startX / UNIT + carry) * UNIT;
      z = aimZ + drift;
      remaining -= carry;

      let result: ShotResult = 'fairway';
      const offMag = Math.abs(drift);
      if (isLast) {
        result = offMag < skillDrift * 0.35 ? 'green' : rng() < 0.5 ? 'bunker' : 'rough';
      } else if (offMag > skillDrift * 0.8) {
        result = rng() < 0.3 && extras.hazard === 'water' ? 'water' : 'rough';
      } else if (offMag > skillDrift * 0.55 && extras.hazard === 'bunker' && rng() < 0.4) {
        result = 'bunker';
      }

      shots.push({
        playerId: player.id,
        shotNumber: i + 1,
        club,
        isTee,
        isLast,
        startX: startX * UNIT,
        startZ,
        endX: x,
        endZ: z,
        carry: Math.round(carry),
        result,
      });
    }
  });

  return shots;
}
