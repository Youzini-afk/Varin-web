import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { agentIndex } from '~/lib/agent-content';
import { englishGuides } from '~/lib/docs';

export const GET: APIRoute = async ({ site }) => new Response(agentIndex(site!, englishGuides(await getCollection('docs'))), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
