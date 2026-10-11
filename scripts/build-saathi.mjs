import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, ['node_modules/next/dist/bin/next', 'build', 'worker-web'], { cwd: root, env: { ...process.env, BUDGETWORKER_EMBEDDED_EXPORT: '1' }, stdio: 'inherit' });
mkdirSync(new URL('../public/saathi/', import.meta.url), { recursive: true });
cpSync(new URL('../worker-web/.next-embedded/', import.meta.url), new URL('../public/saathi/', import.meta.url), { recursive: true });
console.log('Saathi exported for /saathi on the existing BudgetWorker domain.');
