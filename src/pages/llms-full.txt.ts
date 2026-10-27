import type { APIRoute } from 'astro';
import { homeMarkdown } from '~/lib/agent-content';

export const GET: APIRoute = ({ site }) => new Response(homeMarkdown('en', site!), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
