import type { zhCN } from './zh-cn';

/** Turns literal types into their general shape, so other locales must match structure, not wording. */
type Widen<T> = T extends string
  ? string
  : T extends boolean
    ? boolean
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : { readonly [K in keyof T]: Widen<T[K]> };

export type Copy = Widen<typeof zhCN>;
/** The README languages of Varin itself. English is the default and lives at the site root. */
export type Locale = 'en' | 'zh-cn' | 'zh-tw' | 'fr' | 'ja';
export type TeamRole = 'main' | 'worker' | 'retrieval' | 'verifier' | 'peer';
