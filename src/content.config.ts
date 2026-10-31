import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { defineCollection } from 'astro:content';

// src/content/docs/ is written by scripts/sync-docs.mjs from the product repository; do not edit it here.
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
