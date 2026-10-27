import type { APIRoute } from 'astro';
import { agentIndex } from '~/lib/agent-content';

export const GET: APIRoute = ({ site }) => new Response(agentIndex(site!), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
