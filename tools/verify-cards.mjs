// Gate for the generated card pool.
//
// The important assertion is the name check: card.name is the key every save is
// written against, so a rename would silently orphan a player's collection.
//
// Usage:  node tools/verify-cards.mjs

import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const REPO = path.resolve(import.meta.dirname, '..');

const baseline = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/pool-baseline.json'), 'utf8'));

const gameData = { perks: [], items: [], addons: [], offerings: [] };
new Function('gameData', fs.readFileSync(path.join(REPO, 'data/cards.js'), 'utf8'))(gameData);

const { perks, items, addons } = gameData;
const all = [...perks, ...items, ...addons];

assert.equal(perks.length, baseline.perks, `perk count drifted: ${perks.length} vs ${baseline.perks}`);
assert.equal(items.length, baseline.items, `item count drifted: ${items.length} vs ${baseline.items}`);
assert.equal(addons.length, baseline.addons, `addon count drifted: ${addons.length} vs ${baseline.addons}`);

const now = all.map((c) => `${c.name}|${c.rarity}|${c.type}`).sort();
assert.deepEqual(now, baseline.names, 'a card name, rarity or type changed — saves would break');

const missing = all.filter((c) => !c.icon || !fs.existsSync(path.join(REPO, c.icon)));
assert.equal(missing.length, 0, `cards with unresolved icons: ${missing.map((c) => c.name).join(', ')}`);

const distinct = new Set(all.map((c) => c.icon)).size;
console.log(`OK — ${all.length} cards, ${distinct} distinct icons, all present, no renames.`);
