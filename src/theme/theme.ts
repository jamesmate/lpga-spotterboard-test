import { createTheme, type MantineColorsTuple } from '@mantine/core';

// LPGA brand palette: deep navy, magenta/pink accent, warm gold, cool grey.
const lpgaNavy: MantineColorsTuple = [
  '#eef2f8', '#d6e0ee', '#adc0dd', '#82a0cb', '#5c84bc', '#3f70b1',
  '#2c63ac', '#1c5299', '#0f4180', '#0a2c55',
];
const lpgaPink: MantineColorsTuple = [
  '#ffe8f1', '#ffcfe1', '#ff9dc0', '#ff689d', '#fe3a7f', '#fe1e6c',
  '#ff0c62', '#e40052', '#cb0048', '#b0003c',
];
const lpgaGold: MantineColorsTuple = [
  '#fdf6e3', '#f8e8bd', '#f3d894', '#eec86a', '#e9ba49', '#e6b035',
  '#e5ab28', '#cb941c', '#b48314', '#9c7108',
];

export const theme = createTheme({
  primaryColor: 'lpgaPink',
  colors: {
    lpgaNavy,
    lpgaPink,
    lpgaGold,
  },
  fontFamily: 'Roboto, "Segoe UI", system-ui, sans-serif',
  headings: { fontFamily: 'Roboto, "Segoe UI", system-ui, sans-serif', fontWeight: '700' },
  defaultRadius: 'sm',
  black: '#08162b',
  white: '#ffffff',
});

// Non-Mantine raw colors used for direct styling (board background, slots, etc.)
export const boardColors = {
  pageBg: '#ffffff',
  pageText: '#20232a',
  sectionLabel: '#005288',
  // Generic panel chrome (top bar, hole-map boxes) — matches the hole header colour.
  panelBg: '#005288',
  panelBgAlt: '#6b619c',
  headerBg: '#005288',
  // Sampled from the LPGA logo's background — used for the top toolbar only.
  toolbarBg: '#005288',
  // Hole card header (number/par/yardage) — matches the toolbar blue.
  holeHeaderBg: '#005288',
  holeHeaderText: '#1a2233',
  holeHeaderAccent: '#5E548E',
  holeHeaderMuted: '#3a4152',
  // Tee/Fairway/Green slot background inside each hole card.
  slotBg: 'rgba(0, 0, 0, 0.05)',
  slotBorder: 'rgba(255,255,255,0.14)',
  // Dashed border for the now-empty (transparent) tee/fairway/green slots, visible against the white page.
  emptySlotBorder: 'rgba(87, 93, 144, 0.4)',
  pink: '#ff0c62',
  gold: '#e9ba49',
  textMuted: '#c9c2df',
  // Score colours for text on the dark purple panels (e.g. HoleMap's group list).
  under: '#ff6b8d',
  over: '#7db2ff',
  even: '#d8d2ea',

  // On-course "GroupCard" colours, keyed by slot — per brand spec:
  // blue for tee, yellow for fairway, green for green.
  slotGroupColors: {
    tee: { bg: '#ABCDEF', headerBg: '#8fb4d9' },
    fairway: { bg: '#FCFFA4', headerBg: '#eef27a' },
    green: { bg: '#ACE1AF', headerBg: '#8fce93' },
  },
  groupBorder: 'rgba(35, 25, 66, 0.25)',
  groupText: '#231942',
  groupAccent: '#5E548E',
  // Score colours for text on the light slot-coloured group cards (need
  // darker/more saturated tones than the ones used on dark panels to stay legible).
  groupUnder: '#b3123f',
  groupOver: '#1d4ed8',
  groupEven: '#33313f',

  // Pending / waiting-to-tee-off "GroupCard" colours — a lighter, less
  // saturated shade of the tee blue (these groups will tee off next).
  pendingGroupBg: '#E4EEF8',
  pendingGroupHeaderBg: '#D3E3F1',
};
