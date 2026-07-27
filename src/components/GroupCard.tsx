import { Box, Group, Stack, Text } from '../ui/kit';
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

// Shared spring used for every layout move (slot-to-slot, queue-to-tee, row
// expand/collapse) so the whole board animates with one consistent feel.
const LAYOUT_TRANSITION = { type: 'spring', stiffness: 380, damping: 34, mass: 0.7 } as const;

export function GroupCard({ group, players, variant, compact, id, highlighted }: GroupCardProps) {
  const isOnCourse = variant === 'onCourse';
  const slotColors = group.slot ? boardColors.slotGroupColors[group.slot] : null;
  const cardBg = isOnCourse && slotColors ? slotColors.bg : boardColors.pendingGroupBg;
  const cardHeaderBg = isOnCourse && slotColors ? slotColors.headerBg : boardColors.pendingGroupHeaderBg;

  return (
    <motion.div
      layout
      layoutId={`groupcard-${group.id}`}
      transition={LAYOUT_TRANSITION}
      style={{ width: '100%' }}
    >
      <Box
        id={id}
        style={{
          background: cardBg,
          border: `${highlighted ? 3 : 1}px solid ${highlighted ? boardColors.pink : boardColors.groupBorder}`,
          borderRadius: 6,
          overflow: 'hidden',
          width: '100%',
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
          style={{ background: cardHeaderBg, borderBottom: `1px solid ${boardColors.groupBorder}` }}
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

        <Stack gap={0}>
          {group.playerIds.map((pid) => {
            const player = players[pid];
            if (!player) return null;
            const score = isOnCourse ? player.roundScore : player.totalScore;
            const isOnBall = isOnCourse && group.onBall?.playerId === pid;
            return (
              <motion.div key={pid} layout transition={LAYOUT_TRANSITION} style={{ borderTop: `1px solid ${boardColors.groupBorder}` }}>
                <Group justify="space-between" wrap="nowrap" gap={4} px={6} py={1}>
                  <Text size={compact ? '12px' : 'sm'} fw={700} tt="uppercase" c={boardColors.groupText} truncate style={{ flex: 1, minWidth: 0 }}>
                    {surname(player.name)}
                  </Text>
                  <Text size={compact ? '12px' : 'sm'} fw={700} c={scoreColor(score)} style={{ flexShrink: 0 }}>
                    {formatScore(score)}
                  </Text>
                </Group>
                <AnimatePresence initial={false}>
                  {isOnBall && group.onBall && (
                    <motion.div
                      key="onball-detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={LAYOUT_TRANSITION}
                      style={{ overflow: 'hidden' }}
                    >
                      <Stack gap={0} px={6} pb={3}>
                        <Text size="8px" fw={800} c={boardColors.groupText} style={{ letterSpacing: 0.2 }}>
                          Next To Hit
                        </Text>
                        <Text size="8px" fw={600} c={boardColors.groupText} style={{ opacity: 0.85 }}>
                          Distance to pin: {group.onBall.distanceToPin} {group.onBall.distanceUnit}
                        </Text>
                        <Text size="8px" fw={600} c={boardColors.groupText} style={{ opacity: 0.85 }}>
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
