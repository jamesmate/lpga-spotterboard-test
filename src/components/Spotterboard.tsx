import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Group as MGroup, Stack, Text, TextInput } from '@mantine/core';
import { BACK_NINE, FRONT_NINE } from '../data/courseData';
import { useLiveBoard } from '../hooks/useLiveBoard';
import { HoleRow } from './HoleRow';
import { boardColors } from '../theme/theme';
import lpgaLogo from '../assets/lpga-logo.png';

const HEADER_HEIGHT = 52;
const PAR_OPTIONS = [3, 4, 5] as const;
type NineFilter = 'all' | 'front' | 'back';

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        border: '1.5px solid white',
        background: active ? 'white' : 'transparent',
        color: active ? boardColors.toolbarBg : 'white',
        borderRadius: 999,
        padding: '4px 14px',
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        transition: 'background 150ms ease, color 150ms ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

export function Spotterboard() {
  const { groups, players } = useLiveBoard();
  const [expandedHoleNumber, setExpandedHoleNumber] = useState<number | null>(null);
  const [activePars, setActivePars] = useState<Set<number>>(new Set());
  const [nineFilter, setNineFilter] = useState<NineFilter>('all');
  const [showOnFireOnly, setShowOnFireOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const lastScrollKeyRef = useRef<string | null>(null);

  const onCourseGroups = groups.filter((g) => g.status === 'on-course');
  const hole1Queue = groups
    .filter((g) => g.status === 'pending' && g.startingHole === 1)
    .sort((a, b) => a.groupNumber - b.groupNumber);
  const hole10Queue = groups
    .filter((g) => g.status === 'pending' && g.startingHole === 10)
    .sort((a, b) => a.groupNumber - b.groupNumber);

  const toggleHole = (holeNumber: number) => {
    setExpandedHoleNumber((prev) => (prev === holeNumber ? null : holeNumber));
  };

  const togglePar = (par: number) => {
    setActivePars((prev) => {
      const next = new Set(prev);
      if (next.has(par)) next.delete(par);
      else next.add(par);
      return next;
    });
  };

  const toggleNine = (value: 'front' | 'back') => {
    setNineFilter((prev) => (prev === value ? 'all' : value));
  };

  const query = searchQuery.trim().toLowerCase();

  // Group ids matching the search box. A purely numeric query is treated
  // as an explicit group-number lookup (exact match only — "1" won't also
  // highlight groups 10-19 or 21); anything else matches against player
  // names.
  const isNumericQuery = /^\d+$/.test(query);
  const highlightedGroupIds = useMemo(() => {
    const result = new Set<string>();
    if (!query) return result;
    for (const g of groups) {
      const match = isNumericQuery
        ? g.groupNumber.toString() === query
        : g.playerIds.some((pid) => players[pid]?.name.toLowerCase().includes(query));
      if (match) result.add(g.id);
    }
    return result;
  }, [query, isNumericQuery, groups, players]);

  // If a match is currently in a waiting-to-tee-off queue, auto-scroll that
  // list to it. Guarded so it only fires once per new match (not every
  // simulation tick) by tracking the last query+group combo scrolled to.
  useEffect(() => {
    if (!query) {
      lastScrollKeyRef.current = null;
      return;
    }
    const pendingMatch = groups.find((g) => highlightedGroupIds.has(g.id) && g.status === 'pending');
    const key = pendingMatch ? `${query}:${pendingMatch.id}` : null;
    if (key && key !== lastScrollKeyRef.current) {
      lastScrollKeyRef.current = key;
      document.getElementById(`group-${pendingMatch!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [query, highlightedGroupIds, groups]);

  const showFront = nineFilter !== 'back';
  const showBack = nineFilter !== 'front';

  return (
    <Box style={{ background: boardColors.pageBg, height: '100vh', overflow: 'hidden', color: boardColors.pageText }}>
      <MGroup
        justify="space-between"
        align="center"
        wrap="nowrap"
        px={16}
        style={{ height: HEADER_HEIGHT, background: boardColors.toolbarBg, borderBottom: `2px solid ${boardColors.pink}` }}
      >
        <MGroup gap={10} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
          <img src={lpgaLogo} alt="LPGA" style={{ height: HEADER_HEIGHT - 14, width: 'auto', display: 'block' }} />
          <Text fw={800} size="xl" c="white" tt="uppercase" lh={1} truncate>
            LPGA <Text span c="white" inherit fw={800}>Spotterboard</Text>
          </Text>
        </MGroup>

        <MGroup gap={18} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text size="sm" c={boardColors.textMuted} truncate>
            Final Round · Live
          </Text>

          <MGroup gap={8} align="center" wrap="nowrap">
            <Text size="xs" fw={700} c="white" tt="uppercase">
              Par:
            </Text>
            {PAR_OPTIONS.map((par) => (
              <FilterButton key={par} label={`Par ${par}`} active={activePars.has(par)} onClick={() => togglePar(par)} />
            ))}
            {activePars.size > 0 && (
              <Box
                component="button"
                onClick={() => setActivePars(new Set())}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  color: boardColors.textMuted,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'underline',
                  padding: '4px 6px',
                  whiteSpace: 'nowrap',
                }}
              >
                Clear
              </Box>
            )}
          </MGroup>

          <MGroup gap={8} align="center" wrap="nowrap">
            <Text size="xs" fw={700} c="white" tt="uppercase">
              Nine:
            </Text>
            <FilterButton label="Front 9" active={nineFilter === 'front'} onClick={() => toggleNine('front')} />
            <FilterButton label="Back 9" active={nineFilter === 'back'} onClick={() => toggleNine('back')} />
          </MGroup>

          <FilterButton
            label="🔥 On Fire"
            active={showOnFireOnly}
            onClick={() => setShowOnFireOnly((prev) => !prev)}
          />

          <TextInput
            placeholder="Search name or group #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="xs"
            radius="xl"
            leftSection={<span style={{ fontSize: 12 }}>🔍</span>}
            style={{ width: 200 }}
            styles={{
              input: {
                backgroundColor: 'white',
                borderColor: boardColors.toolbarBg,
                color: boardColors.toolbarBg,
                '&::placeholder': { color: boardColors.toolbarBg, opacity: 0.6 },
              },
            }}
          />
        </MGroup>
      </MGroup>

      <Stack gap={6} p={10} style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)`, minHeight: 0 }}>
        {showFront && (
          <Box style={{ flex: 1, minHeight: 0 }}>
            <HoleRow
              holes={FRONT_NINE}
              onCourseGroups={onCourseGroups}
              players={players}
              expandedHoleNumber={expandedHoleNumber}
              onToggle={toggleHole}
              queue={hole1Queue}
              activePars={activePars}
              showOnFireOnly={showOnFireOnly}
              highlightedGroupIds={highlightedGroupIds}
            />
          </Box>
        )}

        {showBack && (
          <Box style={{ flex: 1, minHeight: 0 }}>
            <HoleRow
              holes={BACK_NINE}
              onCourseGroups={onCourseGroups}
              players={players}
              expandedHoleNumber={expandedHoleNumber}
              onToggle={toggleHole}
              queue={hole10Queue}
              activePars={activePars}
              showOnFireOnly={showOnFireOnly}
              highlightedGroupIds={highlightedGroupIds}
            />
          </Box>
        )}
      </Stack>
    </Box>
  );
}
