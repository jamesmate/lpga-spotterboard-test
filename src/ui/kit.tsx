/**
 * Thin adapter layer over MUI so the rest of the app (ported from Mantine)
 * didn't need every layout prop rewritten by hand. Every component here is
 * a real MUI primitive underneath (Box, Stack, Typography, TextField,
 * Avatar, Tooltip, ThemeProvider) — this file just gives them the same
 * ergonomic shorthand props (gap, px, py, c, fw, tt, truncate, ...) the
 * components were written against, so the visual result is unchanged while
 * the rendering is 100% MUI.
 */
import type { CSSProperties, ElementType, ReactNode } from 'react';
import {
  Avatar as MuiAvatar,
  Box as MuiBox,
  Stack as MuiStack,
  TextField,
  ThemeProvider,
  Tooltip as MuiTooltip,
  Typography,
  type Theme,
} from '@mui/material';

// ---- shared helpers -------------------------------------------------------

type SpacingValue = number | string;

/** Mantine's style props treat bare numbers as px; strings pass through untouched. */
function px(value: SpacingValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

const FONT_SIZE_TOKENS: Record<string, string> = {
  xs: '12px',
  sm: '14px',
  md: '16px',
  lg: '18px',
  xl: '20px',
};

function fontSize(size: string | undefined): string | undefined {
  if (!size) return undefined;
  if (size in FONT_SIZE_TOKENS) return FONT_SIZE_TOKENS[size];
  return size; // already a raw CSS size like '9px'
}

// ---- Box --------------------------------------------------------------

export const Box = MuiBox;

// ---- Group (horizontal flex row) --------------------------------------

interface GroupProps {
  justify?: CSSProperties['justifyContent'];
  align?: CSSProperties['alignItems'];
  wrap?: CSSProperties['flexWrap'];
  gap?: SpacingValue;
  px?: SpacingValue;
  py?: SpacingValue;
  mb?: SpacingValue;
  mt?: SpacingValue;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;
  onClick?: () => void;
  [key: string]: unknown;
}

export function Group({ justify, align, wrap, gap, px: pxProp, py, mb, mt, style, children, ...rest }: GroupProps) {
  return (
    <MuiBox
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: justify,
        alignItems: align,
        flexWrap: wrap,
        gap: px(gap),
        paddingLeft: px(pxProp),
        paddingRight: px(pxProp),
        paddingTop: px(py),
        paddingBottom: px(py),
        marginBottom: px(mb),
        marginTop: px(mt),
        ...style,
      }}
      {...rest}
    >
      {children}
    </MuiBox>
  );
}

// ---- Stack (vertical flex column) --------------------------------------

interface StackProps {
  gap?: SpacingValue;
  align?: CSSProperties['alignItems'];
  p?: SpacingValue;
  px?: SpacingValue;
  py?: SpacingValue;
  pb?: SpacingValue;
  mb?: SpacingValue;
  mt?: SpacingValue;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;
  [key: string]: unknown;
}

export function Stack({ gap, align, p, px: pxProp, py, pb, mb, mt, style, children, ...rest }: StackProps) {
  return (
    <MuiStack
      style={{
        gap: px(gap),
        alignItems: align,
        padding: px(p),
        paddingLeft: px(pxProp),
        paddingRight: px(pxProp),
        paddingTop: px(py),
        paddingBottom: pb !== undefined ? px(pb) : px(py),
        marginBottom: px(mb),
        marginTop: px(mt),
        ...style,
      }}
      {...rest}
    >
      {children}
    </MuiStack>
  );
}

// ---- Text (typography with Mantine-style shorthand props) -------------

interface TextProps {
  size?: string;
  fw?: number;
  c?: string;
  tt?: CSSProperties['textTransform'];
  ta?: CSSProperties['textAlign'];
  lh?: CSSProperties['lineHeight'];
  truncate?: boolean;
  span?: boolean;
  inherit?: boolean;
  mb?: SpacingValue;
  mt?: SpacingValue;
  style?: CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
}

export function Text({ size, fw, c, tt, ta, lh, truncate, span, inherit, mb, mt, style, children, ...rest }: TextProps) {
  const component: ElementType = span ? 'span' : 'div';
  return (
    <Typography
      component={component}
      style={{
        fontSize: inherit ? undefined : fontSize(size),
        fontWeight: inherit ? undefined : fw,
        color: c,
        textTransform: tt,
        textAlign: ta,
        lineHeight: lh,
        marginBottom: px(mb),
        marginTop: px(mt),
        ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Typography>
  );
}

// ---- TextInput ----------------------------------------------------------

interface TextInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  size?: string;
  radius?: string;
  leftSection?: ReactNode;
  style?: CSSProperties;
  styles?: { input?: CSSProperties & Record<string, unknown> };
  [key: string]: unknown;
}

export function TextInput({ placeholder, value, onChange, radius, leftSection, style, styles, ...rest }: TextInputProps) {
  return (
    <TextField
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      size="small"
      variant="outlined"
      style={style}
      InputProps={{
        startAdornment: leftSection,
        style: {
          borderRadius: radius === 'xl' ? 999 : 8,
          backgroundColor: styles?.input?.backgroundColor as string | undefined,
          color: styles?.input?.color as string | undefined,
        },
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: radius === 'xl' ? '999px' : '8px',
        },
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: styles?.input?.borderColor as string | undefined,
        },
        '& input::placeholder': {
          color: (styles?.input as Record<string, unknown> | undefined)?.['&::placeholder']
            ? ((styles!.input as Record<string, Record<string, unknown>>)['&::placeholder'].color as string)
            : undefined,
          opacity: (styles?.input as Record<string, unknown> | undefined)?.['&::placeholder']
            ? ((styles!.input as Record<string, Record<string, unknown>>)['&::placeholder'].opacity as number)
            : undefined,
        },
      }}
      {...rest}
    />
  );
}

// ---- ScrollArea -----------------------------------------------------------

interface ScrollAreaProps {
  type?: string;
  scrollbarSize?: number;
  offsetScrollbars?: boolean;
  style?: CSSProperties;
  styles?: { thumb?: CSSProperties; scrollbar?: CSSProperties };
  children?: ReactNode;
}

export function ScrollArea({ scrollbarSize = 8, style, styles, children }: ScrollAreaProps) {
  const thumbColor = (styles?.thumb as Record<string, unknown> | undefined)?.backgroundColor as string | undefined;
  const trackColor = (styles?.scrollbar as Record<string, unknown> | undefined)?.background as string | undefined;
  return (
    <MuiBox
      style={{ overflowY: 'auto', overflowX: 'hidden', ...style }}
      sx={{
        '&::-webkit-scrollbar': { width: scrollbarSize },
        '&::-webkit-scrollbar-track': { background: trackColor ?? 'transparent' },
        '&::-webkit-scrollbar-thumb': { backgroundColor: thumbColor ?? 'rgba(0,0,0,0.3)', borderRadius: scrollbarSize },
        scrollbarWidth: 'thin',
      }}
    >
      {children}
    </MuiBox>
  );
}

// ---- Avatar ---------------------------------------------------------------

interface AvatarProps {
  size?: number;
  radius?: string;
  style?: CSSProperties;
  children?: ReactNode;
  [key: string]: unknown;
}

export function Avatar({ size = 32, style, children, ...rest }: AvatarProps) {
  return (
    <MuiAvatar
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      {children}
    </MuiAvatar>
  );
}

// ---- Tooltip ----------------------------------------------------------

interface TooltipProps {
  label: ReactNode;
  withArrow?: boolean;
  children: React.ReactElement;
}

export function Tooltip({ label, withArrow, children }: TooltipProps) {
  return (
    <MuiTooltip title={label} arrow={withArrow}>
      {children}
    </MuiTooltip>
  );
}

// ---- Provider ---------------------------------------------------------

export function AppThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
