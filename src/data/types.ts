export type SlotType = 'tee' | 'fairway' | 'green';

export type LieType = 'Tee' | 'Fairway' | 'Rough' | 'Bunker' | 'Green' | 'Fringe';

/** A single "who's over the ball" update, as reported by the walking scorer. */
export interface OnBallInfo {
  playerId: string;
  distanceToPin: number;
  distanceUnit: 'yds' | 'ft';
  lie: LieType;
}

export interface HoleInfo {
  number: number;
  par: number;
  yards: number;
}

export interface Player {
  id: string;
  name: string;
  country?: string;
  /** Score relative to par for the live round in progress (e.g. -3, 0, +2) */
  roundScore: number;
  /** Score relative to par for the tournament so far (prior rounds, used pre-tee-off) */
  totalScore: number;
}

export type GroupStatus = 'pending' | 'on-course' | 'finished';

export interface Group {
  id: string;
  groupNumber: number;
  playerIds: string[];
  startingHole: 1 | 10;
  status: GroupStatus;
  /** ISO time string for tee time, used while pending */
  teeTime: string;
  /** Current hole number 1-18, only meaningful when on-course */
  currentHole: number;
  /** Current slot within the hole, only meaningful when on-course */
  slot: SlotType | null;
  /** Holes left to play */
  holesRemaining: number;
  /** Which player in the group is currently over the ball, per the walking
   * scorer feed — null when off-course (pending) or between updates. */
  onBall: OnBallInfo | null;
}

export interface TournamentData {
  holes: HoleInfo[];
  players: Record<string, Player>;
  groups: Group[];
}
