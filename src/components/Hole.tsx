import { Box, Group as MGroup, Stack, Text } from '@mantine/core';
import type { Group as GroupModel, HoleInfo, Player, SlotType } from '../data/types';
import { GroupCard } from './GroupCard';
import { boardColors } from '../theme/theme';

export type HoleDisplayState = 'normal' | 'expanded' | 'collapsed' | 'dimmed';

interface HoleProps {
  hole: HoleInfo;
  groups: GroupModel[];
  players: Record<string, Player>;
  state: HoleDisplayState;
  onToggle: (holeNumber: number) => void;
  /** Group ids currently matching the search box, drawn with a highlight ring */
  highlightedGroupIds: Set<string>;
}

export const SLOTS: { key: SlotType; label: string }[] = [
  { key: 'tee', label: 'Tee' },
  { key: 'fairway', label: 'Fairway' },
  { key: 'green', label: 'Green' },
];

/**
 * A single hole "card": header (number/par/yardage) + Tee/Fairway/Green
 * slots, sized fluidly (flex-grow) so a full nine always fits the
 * available width, and slots fill available height so a full row always
 * fits the available height — no scrolling needed regardless of window
 * size or zoom. Clicking the header toggles this hole's expanded state,
 * which the parent row uses to fade/collapse siblings and mount an inline
 * HoleMap.
 */
export function Hole({ hole, groups, players, state, onToggle, highlightedGroupIds }: HoleProps) {
  const isCollapsed = state === 'collapsed';
  const isExpanded = state === 'expanded';
  const isDimmed = state === 'dimmed';

  return (
    <Stack
      gap={4}
      style={{
        // Expanded holes get a fixed basis and no grow, so the card itself
        // stays its normal size and visually slides left as siblings
        // collapse, rather than stretching to soak up the freed space
        // (that space goes to the HoleMap instead). Dimmed (filtered-out)
        // holes keep their normal width — only their opacity changes — so
        // the par filter never reflows the row.
        flex: isCollapsed ? '0 0 0%' : isExpanded ? '0 0 170px' : '1 1 0%',
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
                Par {hole.par}
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
              padding: slotGroups.length ? 0 : 4,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {slotGroups.length === 0 && (
              <Text size="9px" fw={700} c={boardColors.holeHeaderText} tt="uppercase" mb={4} ta="center">
                {label}
              </Text>
            )}
            <Stack gap={4}>
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
  );
}
