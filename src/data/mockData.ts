import type { Group, Player, SlotType } from './types';
import { HOLES } from './courseData';

// --- deterministic PRNG so the mock "live" data is stable across reloads ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const FIRST_NAMES = [
  'Nelly', 'Lydia', 'Jin', 'Minjee', 'Charley', 'Brooke', 'Lilia', 'Atthaya',
  'Hyo Joo', 'Ruoning', 'Rose', 'Celine', 'Yuka', 'Ayaka', 'Hannah', 'Leona',
  'Jeeno', 'Yealimi', 'Angel', 'Nasa', 'Lauren', 'Alison', 'Megan', 'Gaby',
  'Ariya', 'Sei', 'In Gee', 'Chella', 'Cheyenne', 'Amy', 'Georgia', 'Linn',
  'Pajaree', 'Patty', 'Stephanie', 'Xiyu', 'Andrea', 'Carlota', 'Esther', 'Grace',
];
const LAST_NAMES = [
  'Korda', 'Ko', 'Young', 'Lee', 'Hull', 'Henderson', 'Vu', 'Thitikul',
  'Kim', 'Yin', 'Zhang', 'Boutier', 'Saso', 'Furue', 'Green', 'Maguire',
  'Thompson', 'Noh', 'Yin', 'Hataoka', 'Coughlin', 'Corpuz', 'Khang', 'Lopez',
  'Jutanugarn', 'Young', 'Chun', 'Choi', 'Knight', 'Yang', 'Hall', 'Grant',
  'Chanpen', 'Tavatanakit', 'Kyriacou', 'Wang', 'Lee', 'Ciganda', 'Henseleit', 'Kim',
];
const COUNTRIES = ['USA', 'KOR', 'THA', 'AUS', 'JPN', 'CHN', 'ENG', 'CAN', 'NZL', 'ESP', 'FRA', 'GER', 'PHI'];

let nameIdx = 0;
function nextName() {
  const first = FIRST_NAMES[nameIdx % FIRST_NAMES.length];
  const last = LAST_NAMES[(nameIdx * 7 + 3) % LAST_NAMES.length];
  nameIdx++;
  return `${first} ${last}`;
}

const players: Record<string, Player> = {};
let playerSeq = 0;
function makePlayer(totalScore: number): Player {
  const id = `p${playerSeq++}`;
  const p: Player = {
    id,
    name: nextName(),
    country: pick(COUNTRIES),
    roundScore: 0,
    totalScore,
  };
  players[id] = p;
  return p;
}

const SLOT_ORDER: SlotType[] = ['tee', 'fairway', 'green'];

interface GenOptions {
  count: number;
  startingHole: 1 | 10;
  groupNumberStart: number;
  status: 'on-course' | 'pending';
  firstTeeTimeMinutes?: number; // minutes from a base time, for pending groups
  distributeAcrossHoles?: [number, number]; // hole range for on-course groups
}

const groups: Group[] = [];

function genGroups(opts: GenOptions) {
  // For on-course groups, pre-shuffle every (hole, slot) pair in range so
  // each group gets a unique slot — at most one group per hole/slot, just
  // like the live simulation enforces afterwards.
  let slotPool: { hole: number; slot: SlotType }[] = [];
  if (opts.status === 'on-course') {
    const [lo, hi] = opts.distributeAcrossHoles ?? [1, 18];
    const pairs: { hole: number; slot: SlotType }[] = [];
    for (let h = lo; h <= hi; h++) {
      for (const slot of SLOT_ORDER) pairs.push({ hole: h, slot });
    }
    slotPool = shuffle(pairs).slice(0, opts.count);
  }

  for (let i = 0; i < opts.count; i++) {
    const groupNumber = opts.groupNumberStart + i;
    const size = randInt(2, 3);
    const totalBase = randInt(-8, 8);
    const memberIds: string[] = [];
    for (let j = 0; j < size; j++) {
      const totalScore = totalBase + randInt(-2, 2);
      memberIds.push(makePlayer(totalScore).id);
    }

    if (opts.status === 'pending') {
      const baseMinutes = (opts.firstTeeTimeMinutes ?? 480) + i * 11; // 11 min intervals
      const hh = Math.floor(baseMinutes / 60) % 24;
      const mm = baseMinutes % 60;
      const teeTime = `${hh % 12 === 0 ? 12 : hh % 12}:${mm.toString().padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
      groups.push({
        id: `g${groupNumber}`,
        groupNumber,
        playerIds: memberIds,
        startingHole: opts.startingHole,
        status: 'pending',
        teeTime,
        currentHole: opts.startingHole,
        slot: null,
        holesRemaining: 18,
      });
    } else {
      const { hole: currentHole, slot } = slotPool[i];
      const holesPlayed =
        opts.startingHole === 1
          ? currentHole - 1
          : currentHole >= 10
          ? currentHole - 10
          : 9 + currentHole;
      groups.push({
        id: `g${groupNumber}`,
        groupNumber,
        playerIds: memberIds,
        startingHole: opts.startingHole,
        status: 'on-course',
        teeTime: '',
        currentHole,
        slot,
        holesRemaining: Math.max(18 - holesPlayed, 0),
      });
      // give on-course players a live round score too
      memberIds.forEach((id) => {
        players[id].roundScore = randInt(-6, 4);
      });
    }
  }
}

// Groups already out on the course, spread across the front nine (started hole 1)
// — at most one group per hole/slot (9 holes x 3 slots = 27 possible slots).
genGroups({ count: 9, startingHole: 1, groupNumberStart: 1, status: 'on-course', distributeAcrossHoles: [1, 9] });
// Groups already out on the course, spread across the back nine (started hole 10)
genGroups({ count: 9, startingHole: 10, groupNumberStart: 11, status: 'on-course', distributeAcrossHoles: [10, 18] });
// Groups waiting to tee off hole 1
genGroups({ count: 8, startingHole: 1, groupNumberStart: 20, status: 'pending', firstTeeTimeMinutes: 9 * 60 + 40 });
// Groups waiting to tee off hole 10
genGroups({ count: 8, startingHole: 10, groupNumberStart: 28, status: 'pending', firstTeeTimeMinutes: 9 * 60 + 20 });

export const MOCK_PLAYERS = players;
export const MOCK_GROUPS = groups;
export const MOCK_HOLES = HOLES;
