// Leonida Trophy Atlas — entrypoint. The guide is this directory's app/ folder:
// plain static files a browser opens at app/index.html (ES modules, CSS, no build
// step), offline: it loads nothing over the network, and its trophy list and guides
// are app/data/trophies.json — all 55 official GTA VI trophies, verified against
// Exophase's list (names, descriptions, grades, hidden flags). The program hands
// it in: it copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads (your screenshots, the first
// load's files and bytes, and your source), with the vendored make.fun library.
// Leave vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be
// byte for byte what its own copy writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// My own check, before anything is copied: the guide must carry exactly the 55
// official trophies (1 platinum, 2 gold, 6 silver, 46 bronze), each with a guide.
const trophyDoc = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf-8'));
const grades = trophyDoc.trophies.reduce((acc, t) => {
  acc[t.grade] = (acc[t.grade] ?? 0) + 1;
  return acc;
}, {});
if (trophyDoc.trophies.length !== 55 || grades.platinum !== 1 || grades.gold !== 2 || grades.silver !== 6 || grades.bronze !== 46) {
  throw new Error(`trophies.json must hold 55 official trophies (1P/2G/6S/46B), got ${JSON.stringify(grades)}`);
}
if (trophyDoc.trophies.some((t) => !t.name || !t.description || !t.guide || !t.source)) {
  throw new Error('every trophy needs a name, official description, guide and source');
}
console.log(`Leonida Trophy Atlas: ${trophyDoc.trophies.length} trophies verified (${grades.platinum}P/${grades.gold}G/${grades.silver}S/${grades.bronze}B)`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files and directories in app/ or
// 48 MiB of app files: app/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
console.log(`dossier written to ${join(out, 'dossier.json')}`);
