// Gate for the save-slot repaint invariant.
//
// Loading a save swaps every piece of game state at once. Startup gets away
// with repainting by hand afterwards because it repaints everything; switching
// slots does not, and any panel the switch forgets keeps showing the previous
// slot's data until something unrelated happens to redraw it. That is how the
// pull log came to survive a slot change: loadCurrentGame reads the new slot's
// history into eventLog and never redraws the panel built from it.
//
// The invariant: every repaint startup performs after loadCurrentGame() is one
// loadCurrentGame already reaches, so a slot switch cannot leave a panel behind.
//
// Reached transitively, not just directly — updatePackButtons is only ever
// called through refreshTokenDisplays, and counting direct calls alone would
// report it as stale every run. Interval-driven repaints are exempt for the
// same reason: a clock that redraws itself every second cannot go stale.
//
// Usage:  node tools/verify-save-repaints.mjs

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const REPO = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(REPO, 'script.js'), 'utf8')
    .replace(/^﻿/, '')
    .split('\n');

/* Braces rather than a blank-line heuristic: loadCurrentGame contains nested
   blocks that a naive "next line starting with }" scan stops on early, which is
   how this omission survived being looked for by eye. */
function bodyOf(name) {

    const start = src.findIndex((l) => l.startsWith(`function ${name}`));

    if (start === -1) return null;

    let depth = 0;
    let opened = false;

    for (let i = start; i < src.length; i++) {

        depth += (src[i].match(/{/g) || []).length;
        depth -= (src[i].match(/}/g) || []).length;

        if (src[i].includes('{')) opened = true;
        if (opened && depth === 0) return src.slice(start, i + 1).join('\n');

    }

    return null;

}

/* A repaint is a PL.panels call, or a function whose name begins with "update"
   or "refresh" — script.js's own two families for the same job. */
const REPAINT = /(PL\.panels\.[a-zA-Z]+|update[A-Za-z]+|refresh[A-Za-z]+)\s*\(/g;

const callsIn = (text) =>
    new Set([...text.matchAll(REPAINT)].map((m) => m[1]));

/* Everything a starting point redraws, directly or through anything it calls.
   PL.panels.* are leaves here: they live in ui/panels.js and do not call back
   into script.js's repaints. */
function reach(from) {

    const seen = new Set();
    const queue = [...callsIn(from)];

    while (queue.length) {

        const fn = queue.shift();

        if (seen.has(fn)) continue;

        seen.add(fn);

        if (fn.startsWith('PL.panels.')) continue;

        const body = bodyOf(fn);

        if (body) queue.push(...callsIn(body));

    }

    return seen;

}

const loadStart = src.findIndex((l) => l.startsWith('function loadCurrentGame'));
const load = bodyOf('loadCurrentGame');

assert.ok(load, 'loadCurrentGame not found in script.js');

const bootAt = src.findIndex((l) => l.trim() === 'loadCurrentGame();');

assert.notEqual(bootAt, -1, 'no module-level loadCurrentGame() call');

/* Startup is the module-level run: top-level calls at column zero after the
   loadCurrentGame() call site. */
const boot = src
    .slice(bootAt + 1)
    .filter((l) => /^(PL\.panels\.|update|refresh)/.test(l))
    .join('\n');

/* A clock that redraws itself every second cannot show a stale slot for long
   enough to matter, so it is not part of the invariant. */
const ticking = new Set(
    [...src.join('\n').matchAll(/setInterval\(\s*([A-Za-z.]+)/g)].map((m) => m[1])
);

const reachedByLoad = reach(load);

const stale = [...callsIn(boot)]
    .filter((fn) => !reachedByLoad.has(fn))
    .filter((fn) => !ticking.has(fn));

assert.deepEqual(
    stale,
    [],
    'repainted at startup but never reached by loadCurrentGame, so switching ' +
    `save slots leaves it showing the previous slot: ${stale.join(', ')}`
);

console.log(
    `OK — loadCurrentGame (line ${loadStart + 1}) reaches all ` +
    `${reachedByLoad.size} repaints; a slot switch leaves nothing stale.`
);
