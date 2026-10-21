import { execSync } from 'node:child_process';

/** Identifica o build na tela de configurações: data (UTC) + commit. */
export function buildInfo(): string {
  let sha = process.env.GITHUB_SHA ?? '';
  try { sha ||= execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch { /* sem git */ }
  const d = new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${d}${sha ? ' · ' + sha.trim().slice(0, 7) : ''}`;
}
