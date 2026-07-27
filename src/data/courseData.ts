import type { HoleInfo } from './types';

// Matches the yardages/pars shown in the reference scoreboard.
export const HOLES: HoleInfo[] = [
  { number: 1, par: 4, yards: 422 },
  { number: 2, par: 4, yards: 337 },
  { number: 3, par: 5, yards: 610 },
  { number: 4, par: 4, yards: 409 },
  { number: 5, par: 3, yards: 238 },
  { number: 6, par: 5, yards: 509 },
  { number: 7, par: 4, yards: 494 },
  { number: 8, par: 4, yards: 421 },
  { number: 9, par: 3, yards: 157 },
  { number: 10, par: 5, yards: 632 },
  { number: 11, par: 4, yards: 399 },
  { number: 12, par: 4, yards: 324 },
  { number: 13, par: 5, yards: 639 },
  { number: 14, par: 3, yards: 141 },
  { number: 15, par: 4, yards: 470 },
  { number: 16, par: 4, yards: 421 },
  { number: 17, par: 3, yards: 220 },
  { number: 18, par: 4, yards: 462 },
];

export const FRONT_NINE = HOLES.slice(0, 9);
export const BACK_NINE = HOLES.slice(9, 18);
