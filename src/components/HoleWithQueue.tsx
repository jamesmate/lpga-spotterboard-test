import { Box, Group as MGroup, ScrollArea, Stack, Text } from '@mantine/core';
import type { Group as GroupModel, HoleInfo, Player } from '../data/types';
import { GroupCard } from './GroupCard';
import { SLOTS } from './Hole';
import type { HoleDisplayState } from './Hole';
import { boardColors } from '../theme/theme';

interface HoleWithQueueProps {
  hole: HoleInfo;
  groups: GroupModel[];
  players: Record<string, Player>;
  queue: GroupModel[];
  state: HoleDisplayState;
  onToggle: (holeNumber: number) => void;
  /** Group ids currently matching the search box, drawn with a highlight ring */
  highlightedGroupIds: Set<string>;
}

/** How much wider the waiting-groups list is than a single hole column. */
const QUEUE_UNITS = 1.5;

/**
 * Hole 1 and Hole 10 double up as the header for their tee-off queue: since
 * LPGA groups tee off from both 1 and 10, this single component renders one
 * header (hole number/par/yardage) that spans across both the scrollable
 * waiting-groups list and this hole's own tee/fairway/green slots, so the
 * queue no longer needs a separate header of its own.
 */
export function HoleWithQueue({ hole, groups, players, queue, state, onToggle, highlightedGroupIds }: HoleWithQueueProps) {
  const isCollapsed = state === 'collapsed';
  const isExpanded = state === 'expanded';
  const isDimmed = state === 'dimmed';

  return (
    <Stack
      gap={4}
      style={{
        // Expanded, this stays a fixed width (queue + own slots, no extra
        // grow) so it visually slides left as siblings collapse rather than
        // stretching — the freed space goes to the HoleMap instead. Dimmed
        // (filtered-out) keeps its normal width — only opacity changes — so
        // the par filter never reflows the row.
        flex: isCollapsed
          ? '0 0 0%'
          : isExpanded
          ? `0 0 ${Math.round((QUEUE_UNITS + 1) * 170)}px`
          : `${QUEUE_UNITS + 1} ${QUEUE_UNITS + 1} 0%`,
        minWidth: isCollapsed ? 0 : 0,
        opacity: isCollapsed ? 0 : isDimmed ? 0.25 : 1,
        overflow: 'hidden',
        pointerEvents: isCollapsed || isDimmed ? 'none' : 'auto',
        height: '100%',
        transition: 'flex-grow 280ms ease, flex-basis 280ms ease, opacity 220ms ease',
      }}
    >
      <Box
        onClick={() => onToggle(hole.number)}
        style={{
          background: boardColors.holeHeaderBg,
          borderRadius: 6,
          padding: '4px 8px',
          border: `1px solid ${isExpanded ? boardColors.pink : boardColors.slotBorder}`,
          cursor: 'pointer',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <MGroup gap={6} wrap="nowrap" align="center" justify="space-between">
          <MGroup gap={6} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
            <Text size="lg" fw={800} c="white" lh={1.1}>
              {hole.number}
            </Text>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text size="10px" fw={700} c={boardColors.gold} tt="uppercase" truncate>
                Par {hole.par} · Tee-off queue
              </Text>
              <Text size="10px" c={boardColors.textMuted} truncate>
                {hole.yards} yd
              </Text>
            </Stack>
          </MGroup>
          <Text
            size="sm"
            fw={800}
            c="white"
            style={{
              flexShrink: 0,
              transform: isExpanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms ease',
            }}
          >
            &gt;
          </Text>
        </MGroup>
      </Box>

      <MGroup gap={6} align="stretch" wrap="nowrap" style={{ flex: 1, minHeight: 0 }}>
        <ScrollArea
          style={{ flex: QUEUE_UNITS, minWidth: 0, height: '100%' }}
          type="always"
          scrollbarSize={7}
          offsetScrollbars
          styles={{
            thumb: { backgroundColor: boardColors.holeHeaderBg },
            scrollbar: { background: 'rgba(0,0,0,0.06)' },
          }}
        >
          <Stack gap={0} pb={4} style={{ position: 'relative' }}>
            {queue.map((g) => (
              <GroupCard
                key={g.id}
                id={`group-${g.id}`}
                group={g}
                players={players}
                variant="pending"
                compact
                highlighted={highlightedGroupIds.has(g.id)}
              />
            ))}
            {queue.length === 0 && (
              <Text size="10px" c={boardColors.textMuted} ta="center" mt={8}>
                No groups waiting
              </Text>
            )}
          </Stack>
        </ScrollArea>

        <Stack gap={0} style={{ flex: 1, minWidth: 0, height: '100%' }}>
          {SLOTS.map(({ key, label }) => {
            const slotGroups = groups.filter((g) => g.slot === key);
            return (
              <Box
                key={key}
                style={{
                  background: boardColors.slotBg,
                  border: `1px dashed ${boardColors.emptySlotBorder}`,
                  borderRadius: 6,
                  flex: 1,
                  minHeight: 0,
                  // Fixed regardless of content — a slot's box size must
                  // never depend on whether it currently holds a group.
                  padding: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {slotGroups.length === 0 && (
                  // Positioned out of flow so it can never influence this
                  // slot's flex-computed height (in-flow content, even with
                  // minHeight: 0, subtly biases flex distribution).
                  <Text
                    size="9px"
                    fw={700}
                    c={boardColors.holeHeaderText}
                    tt="uppercase"
                    ta="center"
                    style={{ position: 'absolute', top: 4, left: 0, right: 0, zIndex: 0 }}
                  >
                    {label}
                  </Text>
                )}
                <Stack gap={4} style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0 }}>
                  {slotGroups.map((g) => (
                    <GroupCard
                      key={g.id}
                      id={`group-${g.id}`}
                      group={g}
                      players={players}
                      variant="onCourse"
                      compact
                      highlighted={highlightedGroupIds.has(g.id)}
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </MGroup>
    </Stack>
  );
}
