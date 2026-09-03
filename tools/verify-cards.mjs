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

/* data/characters.js is generated from this same pool, but it is committed
   rather than built at load, so it can be left behind when a card is added and
   nothing complains. That happened: Jack (Of All Trades) joined the Specials
   and the file kept naming the original four, which was invisible until the
   roster feature started reading that list and quietly dropped him from every
   pack in the game.
 *
   Checked here rather than in the builder, because the builder is only run when
   somebody remembers to run it, and being out of date is precisely the state
   nobody remembers. Fix by re-running: node tools/build-characters.mjs */
const characterData = new Function(
  `${fs.readFileSync(path.join(REPO, 'data/characters.js'), 'utf8')}; return characterData;`
)();

const specialsInPool = all.filter((c) => c.rarity === 'Special').map((c) => c.name).sort();
const specialsNamed = [...characterData.special].sort();

assert.deepEqual(
  specialsNamed,
  specialsInPool,
  'data/characters.js is stale: its Specials do not match the pool. ' +
  `Named [${specialsNamed}], pool has [${specialsInPool}]. ` +
  'Re-run: node tools/build-characters.mjs'
);

/* Same failure, the other list. A perk taught by nobody and absent from
   `general` belongs to no category at all, so a roster built from this file
   would never offer it. */
const taught = new Set();
characterData.roster.forEach((r) => r.perks.forEach((p) => taught.add(p)));

const homeless = perks
  .filter((c) => c.rarity !== 'Special')
  .filter((c) => !taught.has(c.name) && !characterData.general.includes(c.name))
  .map((c) => c.name);

assert.equal(
  homeless.length,
  0,
  `perks in the pool that data/characters.js places nowhere: ${homeless.join(', ')}. ` +
  'Re-run: node tools/build-characters.mjs'
);

/* The description tables, checked the same way and for the same reason.
 *
 * data/descriptions.js and data/itemDescriptions.js are generated from a
 * source kept outside this repo and committed, so nothing notices when a card
 * arrives without text or when a rename orphans the text it had. The failure
 * is quiet in both directions: a card with no description silently loses its
 * tooltip and falls back to the browser's own title, and an orphaned entry is
 * dead weight nobody will ever see.
 *
 * Specials are excluded deliberately. They print their effect on the card
 * face and ui/card.js never marks them as described, so a missing entry for
 * one is correct rather than stale.
 */
const descTables = new Function(
  `${fs.readFileSync(path.join(REPO, 'data/descriptions.js'), 'utf8')};` +
  `${fs.readFileSync(path.join(REPO, 'data/itemDescriptions.js'), 'utf8')};` +
  'return { perks: perkDescriptions, items: itemDescriptions };'
)();

const described = new Set([
  ...Object.keys(descTables.perks),
  ...Object.keys(descTables.items)
]);

const undescribed = all
  .filter((c) => c.rarity !== 'Special' && !described.has(c.name))
  .map((c) => c.name);

assert.deepEqual(
  undescribed,
  [],
  `cards in the pool with no description: ${undescribed.join(', ')}. ` +
  'Re-run the description builder.'
);

const poolNames = new Set(all.map((c) => c.name));
const orphaned = [...described].filter((name) => !poolNames.has(name));

assert.deepEqual(
  orphaned,
  [],
  `descriptions for cards no longer in the pool: ${orphaned.join(', ')}. ` +
  'A rename orphans the text it had; re-run the description builder.'
);

const distinct = new Set(all.map((c) => c.icon)).size;
console.log(
  `OK — ${all.length} cards, ${distinct} distinct icons, all present, no renames.\n` +
  `OK — characters.js current: ${specialsInPool.length} Specials, ` +
  `${taught.size} taught, ${characterData.general.length} general, none homeless.`
);

console.log(
  `OK — descriptions current: ${described.size} entries, none missing, none orphaned.`
);
