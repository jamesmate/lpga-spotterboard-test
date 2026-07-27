import { Fragment } from 'react';
import { Box, Group as MGroup } from '@mantine/core';
import type { Group as GroupModel, HoleInfo, Player } from '../data/types';
import { Hole } from './Hole';
import { HoleWithQueue } from './HoleWithQueue';
import { HoleMap } from './HoleMap';

interface HoleRowProps {
  holes: HoleInfo[];
  onCourseGroups: GroupModel[];
  players: Record<string, Player>;
  expandedHoleNumber: number | null;
  onToggle: (holeNumber: number) => void;
  /** Waiting-to-tee-off groups for this nine's starting hole (1 or 10) */
  queue: GroupModel[];
  /** Par values currently toggled on in the filter bar; empty = show all */
  activePars: Set<number>;
  /** When true, dim every hole that doesn't currently have a player on a
   * 2+ birdie streak (🔥) */
  showOnFireOnly: boolean;
  /** Group ids currently matching the search box, drawn with a highlight ring */
  highlightedGroupIds: Set<string>;
}

/**
 * One nine (front or back) rendered as a horizontal, fully-fluid row of
 * Hole cards — flex-grow based, so all nine holes always fit the available
 * width regardless of window size or zoom. The first hole (1 or 10) is
 * rendered as HoleWithQueue, whose header doubles as the header for the
 * tee-off waiting list. If the expanded hole belongs to this row, its
 * siblings (in this row only) collapse to width 0 (fading + shrinking
 * out), which visually slides the expanded hole to the left, and an inline
 * HoleMap grows to fill the reclaimed space. The other nine's row is left
 * completely untouched and stays fully visible. Holes whose par isn't in
 * the active par filter, or (when the fire filter is on) that have no
 * player currently on a 2+ birdie streak, collapse the same way, letting
 * the matching holes fill the freed width.
 */
export function HoleRow({ holes, onCourseGroups, players, expandedHoleNumber, onToggle, queue, activePars, showOnFireOnly, highlightedGroupIds }: HoleRowProps) {
  const containsExpanded = holes.some((h) => h.number === expandedHoleNumber);

  return (
    <Box style={{ height: '100%', minHeight: 0 }}>
      <MGroup gap={8} align="stretch" wrap="nowrap" style={{ height: '100%' }}>
        {holes.map((hole, idx) => {
          const isExpanded = hole.number === expandedHoleNumber;
          const holeGroups = onCourseGroups.filter((g) => g.currentHole === hole.number);
          const hasFireGroup = holeGroups.some((g) => g.playerIds.some((pid) => (players[pid]?.birdieStreak ?? 0) >= 2));
          const filteredOut = (activePars.size > 0 && !activePars.has(hole.par)) || (showOnFireOnly && !hasFireGroup);
          // Siblings of an expanded hole collapse away (width -> 0) so the
          // expanded hole + HoleMap can take the space. Filtered-out holes
          // just dim in place, keeping every hole the same width.
          const collapseForExpand = !isExpanded && containsExpanded;
          const state = isExpanded
            ? 'expanded'
            : collapseForExpand
            ? 'collapsed'
            : filteredOut
            ? 'dimmed'
            : 'normal';
          const isFirst = idx === 0;
          return (
            <Fragment key={hole.number}>
              {isFirst ? (
                <HoleWithQueue
                  hole={hole}
                  groups={holeGroups}
                  players={players}
                  queue={queue}
                  state={state}
                  onToggle={onToggle}
                  highlightedGroupIds={highlightedGroupIds}
                />
              ) : (
                <Hole
                  hole={hole}
                  groups={holeGroups}
                  players={players}
                  state={state}
                  onToggle={onToggle}
                  highlightedGroupIds={highlightedGroupIds}
                />
              )}
              {isExpanded && <HoleMap hole={hole} groups={holeGroups} players={players} />}
            </Fragment>
          );
        })}
      </MGroup>
    </Box>
  );
}
