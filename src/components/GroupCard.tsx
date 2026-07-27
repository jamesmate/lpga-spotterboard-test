import { Box, Group, Stack, Text } from '@mantine/core';
import { AnimatePresence, motion } from 'framer-motion';
import type { Group as GroupModel, Player } from '../data/types';
import { boardColors } from '../theme/theme';
import { surname } from '../utils/format';

function formatScore(score: number): string {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

function scoreColor(score: number): string {
  if (score < 0) return boardColors.groupUnder;
  if (score > 0) return boardColors.groupOver;
  return boardColors.groupEven;
}

interface GroupCardProps {
  group: GroupModel;
  players: Record<string, Player>;
  variant: 'onCourse' | 'pending';
  compact?: boolean;
  /** DOM id, used so a search match can be scrolled into view */
  id?: string;
  /** True when this group matches the active search — draws an attention ring */
  highlighted?: boolean;
}

// Animations run 25% slower than their base feel across the board.
const ANIMATION_SPEED_MULTIPLIER = 1.25;

// Shared spring used for every layout move (slot-to-slot, queue-to-tee, row
// expand/collapse) so the whole board animates with one consistent feel.
const LAYOUT_TRANSITION = { type: 'spring', duration: 0.3 * ANIMATION_SPEED_MULTIPLIER, bounce: 0.2 } as const;

// A group leaving a slot slides away (no fade); a group entering one
// slides in from the same direction using the exact same transition, so
// leaving and arriving read as one continuous, symmetrical movement.
const SLIDE_DISTANCE = 26;

// Every player row is exactly this tall; a row with its on-ball detail
// expanded is exactly double — deterministic, not just "whatever's left"
// after stretching to fill the card (which produced uneven gaps before).
const ROW_HEIGHT = 24;

export function GroupCard({ group, players, variant, compact, id, highlighted }: GroupCardProps) {
  const isOnCourse = variant === 'onCourse';
  const slotColors = group.slot ? boardColors.slotGroupColors[group.slot] : null;
  const cardBg = isOnCourse && slotColors ? slotColors.bg : boardColors.pendingGroupBg;
  const cardHeaderBg = isOnCourse && slotColors ? slotColors.headerBg : boardColors.pendingGroupHeaderBg;
  // A full three-player group should always fill its hole slot edge to
  // edge, rather than leaving slot background visible beneath it.
  const maximize = isOnCourse && group.playerIds.length === 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 1, y: -SLIDE_DISTANCE }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 1, y: SLIDE_DISTANCE }}
      transition={LAYOUT_TRANSITION}
      style={{ width: '100%', height: maximize ? '100%' : undefined }}
    >
      <Box
        id={id}
        style={{
          background: cardBg,
          border: `${highlighted ? 3 : 1}px solid ${highlighted ? boardColors.pink : boardColors.groupBorder}`,
          borderRadius: 6,
          overflow: 'hidden',
          width: '100%',
          height: maximize ? '100%' : undefined,
          display: maximize ? 'flex' : undefined,
          flexDirection: maximize ? 'column' : undefined,
          boxShadow: highlighted ? `0 0 0 3px ${boardColors.pink}55, 0 2px 8px rgba(0,0,0,0.4)` : '0 1px 3px rgba(0,0,0,0.35)',
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
        }}
      >
        <Group
          justify="space-between"
          wrap="nowrap"
          gap={4}
          px={6}
          py={2}
          style={{ background: cardHeaderBg, borderBottom: `1px solid ${boardColors.groupBorder}`, flexShrink: 0 }}
        >
          <Text size={compact ? '9px' : 'sm'} fw={700} c={boardColors.groupText} tt="uppercase" truncate style={{ flexShrink: 1, minWidth: 0 }}>
            Group {group.groupNumber}
          </Text>
          <Text
            size={compact ? '9px' : 'sm'}
            fw={700}
            c={boardColors.groupText}
            tt="uppercase"
            truncate
            style={{ flexShrink: 0 }}
          >
            {isOnCourse ? `${group.holesRemaining} to play` : group.teeTime}
          </Text>
        </Group>

        <Stack gap={0} style={maximize ? { flex: 1, minHeight: 0 } : undefined}>
          {group.playerIds.map((pid) => {
            const player = players[pid];
            if (!player) return null;
            const score = isOnCourse ? player.roundScore : player.totalScore;
            const isOnBall = isOnCourse && group.onBall?.playerId === pid;
            const isOnFire = isOnCourse && player.birdieStreak >= 2;
            return (
              <motion.div key={pid} layout transition={LAYOUT_TRANSITION} style={{ borderTop: `1px solid ${boardColors.groupBorder}`, flexShrink: 0 }}>
                <Group justify="space-between" wrap="nowrap" gap={4} px={6} style={{ height: ROW_HEIGHT }}>
                  <Group gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                    <Text size={compact ? '12px' : 'sm'} fw={700} tt="uppercase" c={boardColors.groupText} truncate style={{ flex: 1, minWidth: 0 }}>
                      {surname(player.name)}
                    </Text>
                    {isOnFire && (
                      <Text size={compact ? '12px' : 'sm'} style={{ flexShrink: 0, lineHeight: 1 }} title={`${player.birdieStreak} birdies in a row`}>
                        🔥
                      </Text>
                    )}
                    {isOnBall && (
                      <Text size={compact ? '12px' : 'sm'} style={{ flexShrink: 0, lineHeight: 1 }}>
                        🏌
                      </Text>
                    )}
                  </Group>
                  <Text size={compact ? '12px' : 'sm'} fw={700} c={scoreColor(score)} style={{ flexShrink: 0 }}>
                    {formatScore(score)}
                  </Text>
                </Group>
                <AnimatePresence initial={false}>
                  {isOnBall && group.onBall && (
                    <motion.div
                      key="onball-detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: ROW_HEIGHT, opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={LAYOUT_TRANSITION}
                      style={{ overflow: 'hidden' }}
                    >
                      <Stack gap={0} px={6} justify="center" style={{ height: ROW_HEIGHT }}>
                        <Text size="9px" fw={600} c={boardColors.groupText} lh={1.3} style={{ opacity: 0.85 }}>
                          Distance to pin: {group.onBall.distanceToPin} {group.onBall.distanceUnit}
                        </Text>
                        <Text size="9px" fw={600} c={boardColors.groupText} lh={1.3} style={{ opacity: 0.85 }}>
                          Lie: {group.onBall.lie}
                        </Text>
                      </Stack>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </Stack>
      </Box>
    </motion.div>
  );
}
