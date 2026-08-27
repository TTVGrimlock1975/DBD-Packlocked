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
const raw = fs.readFileSync(path.join(REPO, 'script.js'), 'utf8')
    .replace(/^﻿/, '');

/* Blanks everything that is not executable code -- comments, string and
   template contents, and regex literals -- to a same-length run of spaces,
   leaving real newlines in place so line numbers and `.split('\n')` keep
   lining up with the original file.
 *
 * Every other function below counts braces or matches call sites against
 * this output instead of the raw source. Counting braces in the raw text
 * meant a brace inside a string or a comment, or inside a regex literal like
 * `{2,3}`, threw the count off; matching call sites in the raw text meant a
 * comment or a log string that merely mentions `updateFoo(` could be read as
 * a real call. Neither has bitten yet, but both are the kind of thing that
 * fails silently, in a script whose entire job is catching silent failures. */
function stripToCode(text) {

    const out = Buffer.from(text, 'utf8').toString('utf8').split('');
    const REGEX_STARTERS = /[([{,;=:!&|?+\-*%^~<>]$/;
    const REGEX_KEYWORDS = new Set(['return', 'typeof', 'in', 'of', 'yield', 'case']);

    let mode = 'code';
    let quote = null;
    let inCharClass = false;
    let lastSig = '';
    let lastWord = '';

    for (let i = 0; i < out.length; i++) {

        const c = out[i];
        const next = out[i + 1];

        if (mode === 'lineComment') {

            if (c !== '\n') out[i] = ' '; else mode = 'code';
            continue;

        }

        if (mode === 'blockComment') {

            if (c !== '\n') out[i] = ' ';
            if (c === '*' && next === '/') { out[i + 1] = ' '; i++; mode = 'code'; }
            continue;

        }

        if (mode === 'string' || mode === 'template') {

            if (c !== '\n') out[i] = ' ';
            if (c === '\\') { if (next !== '\n') out[i + 1] = ' '; i++; continue; }
            if (mode === 'string' && c === quote) { mode = 'code'; continue; }
            if (mode === 'template' && c === '`') { mode = 'code'; continue; }
            continue;

        }

        if (mode === 'regex') {

            if (c !== '\n') out[i] = ' ';
            if (c === '\\') { if (next !== '\n') out[i + 1] = ' '; i++; continue; }
            if (c === '[') inCharClass = true;
            else if (c === ']') inCharClass = false;
            else if (c === '/' && !inCharClass) mode = 'code';
            continue;

        }

        // mode === 'code'
        if (c === '/' && next === '/') { out[i] = ' '; out[i + 1] = ' '; i++; mode = 'lineComment'; continue; }
        if (c === '/' && next === '*') { out[i] = ' '; out[i + 1] = ' '; i++; mode = 'blockComment'; continue; }

        if (c === '\'' || c === '"') {
            out[i] = ' ';
            mode = 'string';
            quote = c;
            lastSig = c;
            lastWord = '';
            continue;
        }

        if (c === '`') {
            out[i] = ' ';
            mode = 'template';
            lastSig = c;
            lastWord = '';
            continue;
        }

        if (c === '/') {

            const regexAllowed = lastSig === ''
                || REGEX_STARTERS.test(lastSig)
                || REGEX_KEYWORDS.has(lastWord);

            if (regexAllowed) {
                out[i] = ' ';
                mode = 'regex';
                inCharClass = false;
                lastSig = '/';
                lastWord = '';
                continue;
            }

        }

        // Real code character: leave it in place and track it as the last
        // significant token, so the next `/` can be told apart from division.
        if (/\s/.test(c)) {
            lastWord = '';
        } else if (/[A-Za-z0-9_$]/.test(c)) {
            lastWord += c;
            lastSig = c;
        } else {
            lastWord = '';
            lastSig = c;
        }

    }

    return out.join('');

}

const code = stripToCode(raw);
const src = code.split('\n');
const rawLines = raw.split('\n');

/* Depth of each line, counted before that line's own braces are applied --
   i.e. "how many blocks is this line nested inside". Reused both to find a
   function's closing brace and to tell a genuine module-level statement
   apart from one that merely starts in column zero. */
const depths = new Array(src.length);
{
    let depth = 0;
    for (let i = 0; i < src.length; i++) {
        depths[i] = depth;
        depth += (src[i].match(/{/g) || []).length;
        depth -= (src[i].match(/}/g) || []).length;
    }
}

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

/* Startup is the module-level run: statements after the loadCurrentGame() call
   site that sit at brace depth zero, i.e. are not nested inside any function
   or block -- not merely lines that happen to start in column zero, which a
   reformatted or minified line would slip past either way. */
const boot = src
    .slice(bootAt + 1)
    .filter((l, idx) => depths[bootAt + 1 + idx] === 0)
    .join('\n');

/* A clock that redraws itself every second cannot show a stale slot for long
   enough to matter, so it is not part of the invariant. */
const ticking = new Set(
    [...code.matchAll(/setInterval\(\s*([A-Za-z.]+)/g)].map((m) => m[1])
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
