import { Avatar, Box, Group as MGroup, Stack, Text, Tooltip } from '@mantine/core';
import type { Group as GroupModel, HoleInfo, Player } from '../data/types';
import { fairwayPath, getHoleShape, positionForPlayer, seededRand, VIEW_H, VIEW_W } from '../utils/holeGeometry';
import { boardColors } from '../theme/theme';
import { surname } from '../utils/format';

interface HoleMapProps {
  hole: HoleInfo;
  /** Groups currently on this hole (on-course, currentHole === hole.number) */
  groups: GroupModel[];
  players: Record<string, Player>;
}

const AVATAR_PALETTE = ['#ff0c62', '#e9ba49', '#5c84bc', '#3ad19f', '#c77dff', '#ff8c42'];

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatScore(score: number): string {
  if (score === 0) return 'E';
  return score > 0 ? `+${score}` : `${score}`;
}

/**
 * Inline bird's-eye view of a single hole, rendered in the space vacated by
 * sibling holes when this hole is expanded. Only shows players who are
 * currently on this hole right now (i.e. present in `groups`, which the
 * caller has already filtered to on-course groups with currentHole ===
 * hole.number) — never players who merely played through earlier. Since the
 * simulation allows at most one group per slot, each group's players are
 * drawn as a clean side-by-side row (e.g. all standing together at the tee).
 */
export function HoleMap({ hole, groups, players }: HoleMapProps) {
  const shape = getHoleShape(hole);
  const path = fairwayPath(shape);

  const onHoleGroups = groups.filter((g) => g.status === 'on-course' && g.currentHole === hole.number && g.slot);

  const playerEntries = onHoleGroups.flatMap((g, gIdx) =>
    g.playerIds
      .map((pid, pIdx) => ({
        player: players[pid],
        group: g,
        indexInGroup: pIdx,
        groupSize: g.playerIds.length,
        color: AVATAR_PALETTE[Math.floor(seededRand(g.id) * AVATAR_PALETTE.length + gIdx) % AVATAR_PALETTE.length],
      }))
      .filter((e): e is typeof e & { player: Player } => Boolean(e.player))
  );

  return (
    <Box
      style={{
        flex: 1,
        minWidth: 0,
        background: boardColors.panelBg,
        border: `1px solid ${boardColors.slotBorder}`,
        borderRadius: 8,
        padding: 14,
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        animation: 'holeMapFadeIn 260ms ease',
      }}
    >
      <style>{`
        @keyframes holeMapFadeIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <Box
        style={{
          position: 'relative',
          height: '100%',
          maxHeight: '100%',
          aspectRatio: `${VIEW_W} / ${VIEW_H}`,
          flexShrink: 0,
          borderRadius: 8,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #163c22 0%, #1d4a2a 55%, #245a33 100%)',
        }}
      >
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <path d={path} stroke="#3f7d47" strokeWidth={shape.width * 1.5} fill="none" strokeLinecap="round" opacity={0.9} />
          <path d={path} stroke="#4f9457" strokeWidth={shape.width * 0.9} fill="none" strokeLinecap="round" />
          <rect x={shape.tee.x - 16} y={shape.tee.y - 6} width={32} height={12} rx={3} fill="#2f6b39" stroke="#dfe9df" strokeWidth={1} />
          <circle cx={shape.green.x} cy={shape.green.y} r={30} fill="#5fb06a" stroke="#dfe9df" strokeWidth={1.5} />
          <circle cx={shape.green.x} cy={shape.green.y} r={3} fill="#0a2c55" />
          <line x1={shape.green.x} y1={shape.green.y} x2={shape.green.x} y2={shape.green.y - 22} stroke="#f4f4f4" strokeWidth={1.5} />
          <path d={`M ${shape.green.x} ${shape.green.y - 22} l 14 5 l -14 5 z`} fill={boardColors.pink} />
        </svg>

        {playerEntries.map(({ player, group, color, indexInGroup, groupSize }) => {
          const pos = positionForPlayer(shape, group.slot!, indexInGroup, groupSize);
          return (
            <Tooltip key={player.id} label={`${player.name} · ${formatScore(player.roundScore)} · Grp ${group.groupNumber}`} withArrow>
              <Avatar
                size={26}
                radius="xl"
                color="dark"
                style={{
                  position: 'absolute',
                  left: `${(pos.x / VIEW_W) * 100}%`,
                  top: `${(pos.y / VIEW_H) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  border: `2px solid ${color}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                  cursor: 'default',
                }}
              >
                <Text size="9px" fw={700} c="white">
                  {initials(player.name)}
                </Text>
              </Avatar>
            </Tooltip>
          );
        })}
      </Box>

      <Stack gap={8} style={{ flex: 1, minWidth: 0 }}>
        <Stack gap={0}>
          <Text size="md" fw={800} c="white">
            Hole {hole.number} — Par {hole.par}
          </Text>
          <Text size="xs" c={boardColors.gold} fw={600}>
            {hole.yards} yd · {playerEntries.length} player{playerEntries.length === 1 ? '' : 's'} on hole
          </Text>
        </Stack>

        {onHoleGroups.length === 0 && (
          <Text size="sm" c={boardColors.textMuted}>
            No groups currently on hole {hole.number}.
          </Text>
        )}

        {onHoleGroups.map((g) => (
          <Box
            key={g.id}
            style={{
              background: boardColors.headerBg,
              border: `1px solid ${boardColors.slotBorder}`,
              borderRadius: 6,
              padding: '8px 10px',
            }}
          >
            <MGroup justify="space-between" mb={4}>
              <Text size="sm" fw={700} c="white">
                Group {g.groupNumber}
              </Text>
              <Text size="xs" c={boardColors.gold} tt="uppercase" fw={600}>
                {g.slot} · {g.holesRemaining} to play
              </Text>
            </MGroup>
            <Stack gap={2}>
              {g.playerIds.map((pid) => {
                const p = players[pid];
                if (!p) return null;
                return (
                  <MGroup key={pid} justify="space-between">
                    <Text size="xs" fw={700} tt="uppercase" c="white">
                      {surname(p.name)}
                    </Text>
                    <Text size="xs" fw={700} c={p.roundScore < 0 ? boardColors.under : p.roundScore > 0 ? boardColors.over : boardColors.even}>
                      {formatScore(p.roundScore)}
                    </Text>
                  </MGroup>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
