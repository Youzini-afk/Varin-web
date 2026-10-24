/**
 * Brand geometry copied from Varin's own sources so the site and the product draw the same shapes:
 * the fold mark (packages/ui/src/components/ui/varin-mark.ts) and agent avatars
 * (packages/ui/src/components/ui/agent-avatar-art.ts).
 */
export const MARK_VIEWBOX = '-64 -64 128 128';
export const MARK_PATHS = [
  'M-35 -19 L-11 -43 L44 -43 L57 -30 L2 -30 L-21 -7 L-21 26 L-35 12 Z',
  'M35 19 L11 43 L-44 43 L-57 30 L-2 30 L21 7 L21 -26 L35 -12 Z',
] as const;
/** The splash cube draws the mark at this scale on its top face. */
export const MARK_ON_CUBE_SCALE = 0.82;

/** Per-cell opacities of the cube's two visible walls, identical to the product splash. */
export const CUBE_LEFT_CELLS = [0.2, 0.45, 0.15, 0.55, 0.35, 0.1, 0.5, 0.25, 0.4, 0.3, 0.45, 0.15, 0.55, 0.2, 0.35, 0.1] as const;
export const CUBE_RIGHT_CELLS = [0.3, 0.15, 0.45, 0.25, 0.5, 0.35, 0.1, 0.4, 0.2, 0.55, 0.3, 0.15, 0.45, 0.25, 0.4, 0.2] as const;

export interface AvatarArt {
  readonly body: string;
  readonly color: string;
  readonly eyes: string;
  readonly eyeStroke?: string;
}

/** Product avatar ink. */
export const AVATAR_EYE = '#202326';

/** The four teammates shown on the site use these existing avatar characters. */
export const AVATARS = {
  worker: {
    color: '#C7B5EF',
    body: 'M13 18Q15 14 21 13L43 8Q47 7 50 10L57 17Q59 19 59 24L61 47Q62 54 54 55L13 60Q6 61 7 53L10 26Q11 21 13 18Z',
    eyes: 'M19 31L24 30Q27 30 27 32Q27 34 25 34L20 35Q17 35 17 33Q17 31 19 31ZM40 28L45 27Q48 27 48 29Q48 31 46 31L41 32Q38 32 38 30Q38 28 40 28Z',
  },
  retrieval: {
    color: '#85B3D2',
    body: 'M7 28Q15 11 30 11L37 11Q49 12 56 27Q62 39 59 48Q57 55 47 56Q30 60 14 56Q5 54 4 44Q3 36 7 28Z',
    eyes: 'M18 31H24Q26 31 26 33Q26 35 24 35H18Q16 35 16 33Q16 31 18 31ZM40 31H46Q48 31 48 33Q48 35 46 35H40Q38 35 38 33Q38 31 40 31Z',
  },
  verifier: {
    color: '#A8BD96',
    body: 'M15 13Q19 8 25 9L45 12Q51 13 53 20L61 48Q63 55 55 55L10 53Q3 53 5 46L11 23Q12 17 15 13Z',
    eyes: 'M20 29L25 30Q27 30 27 32Q27 34 25 34L20 33Q18 33 18 31Q18 29 20 29Z',
    eyeStroke: 'M40 33Q44 27 48 33',
  },
  peer: {
    color: '#E9DED0',
    body: 'M5 43C6 23 18 12 32 12C49 12 59 26 60 45Q61 51 54 52Q32 55 10 52Q3 52 5 43Z',
    eyes: 'M21 29H24Q26 29 26 32V34Q26 36 23 36H21Q19 36 19 33V32Q19 29 21 29ZM41 29H44Q46 29 46 32V34Q46 36 43 36H41Q39 36 39 33V32Q39 29 41 29Z',
  },
} as const satisfies Record<string, AvatarArt>;

export type AvatarRole = keyof typeof AVATARS | 'main';

export const isAvatarRole = (value: string): value is AvatarRole => value === 'main' || value in AVATARS;
