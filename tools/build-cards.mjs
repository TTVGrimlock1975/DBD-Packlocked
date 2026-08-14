// Builds data/cards.js and vendors the artwork it references.
//
// Dev-only. Never runs for a player, and adds no dependency to the game — the
// output it writes is committed and loaded by a plain <script src> tag.
//
// The existing card data is the source of truth for names, rarities and types.
// This script only ATTACHES artwork to those cards. It never renames, adds or
// removes one, because card.name is the key every save is written against.
//
// Usage:  node tools/build-cards.mjs
//         DBDBUILDS=/path/to/DBDBuilds node tools/build-cards.mjs

import fs from 'node:fs';
import path from 'node:path';
import { slugify, dbdRarityToTier, resolvePerkIcon, parseGenericName } from './lib/resolve.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const SRC = process.env.DBDBUILDS
  ?? 'C:/Users/ramzi/OneDrive/Documents/GitHub/DBDBuilds';

if (!fs.existsSync(path.join(SRC, 'public/Perks'))) {
  console.error(`Cannot find DBDBuilds artwork at ${SRC}\nSet DBDBUILDS=/path/to/DBDBuilds`);
  process.exit(1);
}

const HEX_TO_RARITY = {
  '#7a5228': 'Common',
  '#2d8a3e': 'Uncommon',
  '#2f6db5': 'Rare',
  '#8b5cf6': 'Very Rare',
  '#c02020': 'Ultra Rare',
  '#c8a800': 'Rare', // event gold — treated as rare-tier
};

/** His category label → the key used in the source data. */
const CATEGORY_KEY = {
  'Med-Kit': 'Medkit',
  Flashlight: 'Flashlight',
  Toolbox: 'Toolbox',
  'Fog Vial': 'Fog Vial',
};

/** Art for a perk that has none. Already a blank icon in the source set. */
const PLACEHOLDER = 'empty.webp';

// ── Read the source data ────────────────────────────────────────────────────

/** Slice out an object literal, skipping the TypeScript type annotation. */
function section(src, name) {
  const i = src.indexOf('export const ' + name);
  if (i === -1) throw new Error(`missing export: ${name}`);
  const s = src.indexOf('= {', i) + 2;
  return src.slice(s, src.indexOf('\n};', s));
}

const itemData = fs.readFileSync(path.join(SRC, 'src/lib/itemData.ts'), 'utf8');

const ITEM_LINE = /^\s*(?:'([^']*)'|"([^"]*)"):\s*\{\s*type:\s*'([^']+)',\s*color:\s*'([^']+)'/;
const ADDON_LINE = /^\s*(?:'([^']*)'|"([^"]*)"):\s*\{\s*color:\s*'([^']+)'/;
const ICON_LINE = /^\s*(?:'([^']*)'|"([^"]*)"):\s*'([^']+)'/;

// Anniversary/Masquerade/Halloween variants are event cosmetics, not part of
// the standard item set. Without this filter they sort ahead of the real items
// and a Rare Med-Kit ends up wearing the Halloween art.
const eventBlock = itemData.slice(itemData.indexOf('const EVENT_ITEMS'));
const EVENT_ITEMS = new Set(
  [...eventBlock.slice(0, eventBlock.indexOf(']')).matchAll(/'([^']*)'|"([^"]*)"/g)]
    .map((m) => m[1] ?? m[2]),
);

/** name → { category, rarity } */
const items = new Map();
for (const line of section(itemData, 'ITEM_INFO').split('\n')) {
  const m = line.match(ITEM_LINE);
  const name = m && (m[1] ?? m[2]);
  if (m && !EVENT_ITEMS.has(name)) {
    items.set(name, { category: m[3], rarity: HEX_TO_RARITY[m[4]] ?? 'Common' });
  }
}

/** name → rarity */
const addonRarity = new Map();
for (const line of section(itemData, 'SURVIVOR_ADDON_INFO').split('\n')) {
  const m = line.match(ADDON_LINE);
  if (m) addonRarity.set(m[1] ?? m[2], HEX_TO_RARITY[m[3]] ?? 'Common');
}

/** category → [addon names] */
const addonsByCategory = {};
for (const m of section(itemData, 'ITEM_TYPE_ADDONS').matchAll(/(\w[\w ]*):\s*\[([^\]]*)\]/g)) {
  addonsByCategory[m[1].trim()] = [...m[2].matchAll(/'([^']*)'|"([^"]*)"/g)].map((x) => x[1] ?? x[2]);
}

/** name → '/Items/foo.webp' */
function iconMap(name) {
  const map = new Map();
  for (const line of section(itemData, name).split('\n')) {
    const m = line.match(ICON_LINE);
    if (m) map.set(m[1] ?? m[2], m[3]);
  }
  return map;
}
const itemIcon = iconMap('ITEM_ICON');
const addonIcon = iconMap('ADDON_ICON');

const perkFiles = fs.readdirSync(path.join(SRC, 'public/Perks'));

/**
 * The source data already states which file each perk uses, and it is right
 * even when the filename has nothing to do with the perk's name — Quick Gambit
 * is filed under iconPerks_VittoriosGambit, after the character. Matching on
 * the name alone could never find those, so the declared path is tried first
 * and name matching is only the fallback.
 */
const perkData = fs.readFileSync(path.join(SRC, 'src/data/perksData2026.js'), 'utf8');
const declaredIcon = new Map();
{
  const entry = /^\s{2}["']([^"']+)["']:\s*\{[\s\S]*?icon:\s*["']\/Perks\/([^"']+)["']/gm;
  for (const m of perkData.matchAll(entry)) declaredIcon.set(slugify(m[1]), m[2]);
}

// ── Load his existing pool ──────────────────────────────────────────────────

// pool-baseline.json is the frozen record of the original pool and the sole
// authority for names, rarities and types. Artwork is layered on top of it, so
// regenerating can never invent, drop or rename a card.
const BUCKET = { Perk: 'perks', Item: 'items', Addon: 'addons' };

const gameData = { perks: [], items: [], addons: [], offerings: [] };
for (const entry of JSON.parse(fs.readFileSync(path.join(REPO, 'tools/pool-baseline.json'), 'utf8')).names) {
  const [name, rarity, type] = entry.split('|');
  const bucket = BUCKET[type];
  if (!bucket) throw new Error(`unknown card type in baseline: ${type}`);
  gameData[bucket].push({ name, rarity, type });
}

// ── Resolve artwork ─────────────────────────────────────────────────────────

// Keyed by DESTINATION, not source: one source file can legitimately land in
// two buckets — the Fog Vial item art is also the fallback for the Fog Vial
// add-ons — and keying by source would drop all but the last destination.
const copies = new Map(); // repo-relative destination → absolute source path

function vendor(absSource, bucket) {
  const dest = `images/cards/${bucket}/${path.basename(absSource)}`;
  copies.set(dest, absSource);
  return dest;
}

/** Candidates for a category + rarity, in a stable order. */
function candidates(category, rarity, isAddon) {
  const key = CATEGORY_KEY[category];
  if (!key) return [];

  const names = isAddon
    ? (addonsByCategory[key] ?? []).filter((n) => addonRarity.get(n) === rarity)
    : [...items.entries()].filter(([, v]) => v.category === key && v.rarity === rarity).map(([k]) => k);

  return names.sort((a, b) => slugify(a).localeCompare(slugify(b)));
}

/** Any item art for a category — the fallback when no add-on art exists. */
function categoryItemIcon(category) {
  const key = CATEGORY_KEY[category];
  const match = [...items.entries()]
    .filter(([, v]) => v.category === key)
    .map(([k]) => k)
    .sort((a, b) => slugify(a).localeCompare(slugify(b)))[0];
  return match ? itemIcon.get(match) : null;
}

const unresolved = [];

for (const card of gameData.perks) {
    if (card.name === 'The Joker') {
        card.icon = 'images/cards/perks/the-joker.webp';
        card.category = null;
        card.realName = null;
        continue;
    }

    const declared = declaredIcon.get(slugify(card.name));
    const file = (declared && perkFiles.includes(declared))
      ? declared
      : resolvePerkIcon(card.name, perkFiles);

    if (!file) unresolved.push(card.name);
    card.icon = vendor(path.join(SRC, 'public/Perks', file ?? PLACEHOLDER), 'perks');
    card.category = null;
    card.realName = null;
}

for (const card of [...gameData.items, ...gameData.addons]) {
  const parsed = parseGenericName(card.name);
  if (!parsed) throw new Error(`unparseable placeholder name: ${card.name}`);

  const { rarity, category, isAddon } = parsed;
  const list = candidates(category, rarity, isAddon);

  let srcPath = null;
  if (list.length > 0) {
    const pick = list[0];
    const rel = isAddon ? addonIcon.get(pick) : itemIcon.get(pick);
    if (rel) {
      srcPath = path.join(SRC, 'public', rel);
      // Naming one of several would assert something untrue, so the real name
      // is only shown when the mapping is unambiguous.
      card.realName = list.length === 1 ? pick : null;
    }
  }

  if (!srcPath) {
    // No art for this add-on exists anywhere (all five Fog Vial add-ons and
    // Very Rare Toolbox). Fall back to the category's item art.
    const rel = categoryItemIcon(category);
    if (!rel) throw new Error(`no art at all for category: ${category}`);
    srcPath = path.join(SRC, 'public', rel);
    card.realName = null;
  }

  card.icon = vendor(srcPath, isAddon ? 'addons' : 'items');
  card.category = category;
}

// ── Copy the artwork ────────────────────────────────────────────────────────

for (const bucket of ['perks', 'items', 'addons']) {
  fs.mkdirSync(path.join(REPO, 'images/cards', bucket), { recursive: true });
}

let copied = 0;
for (const [to, from] of copies) {
  if (!fs.existsSync(from)) throw new Error(`source art missing: ${from}`);
  fs.copyFileSync(from, path.join(REPO, to));
  copied++;
}

// ── Emit data/cards.js ──────────────────────────────────────────────────────

function emit(arrayName, cards) {
  const body = cards
    .map((c) => {
      const lines = [
        `        name: ${JSON.stringify(c.name)}`,
        `        rarity: ${JSON.stringify(c.rarity)}`,
        `        type: ${JSON.stringify(c.type)}`,
        `        icon: ${JSON.stringify(c.icon)}`,
        `        category: ${JSON.stringify(c.category)}`,
        `        realName: ${JSON.stringify(c.realName)}`,
      ];
      return `    {\n${lines.join(',\n')}\n    }`;
    })
    .join(',\n');
  return `gameData.${arrayName}.push(\n${body}\n);\n`;
}

const out = `// GENERATED by tools/build-cards.mjs — do not edit by hand.
//
// Names, rarities and types come from the original card data and are never
// changed: card.name is the key every save is written against. This file only
// adds artwork and display metadata.
//
//   icon      repo-relative path to the card art
//   category  item/add-on family, or null for perks
//   realName  the actual Dead by Daylight card, when exactly one matches;
//             null when several do, since naming one would be a guess

${emit('perks', gameData.perks)}
${emit('items', gameData.items)}
${emit('addons', gameData.addons)}`;

fs.writeFileSync(path.join(REPO, 'data/cards.js'), out);

// ── Report ──────────────────────────────────────────────────────────────────

const withRealName = [...gameData.items, ...gameData.addons].filter((c) => c.realName).length;

console.log(`cards      ${gameData.perks.length} perks, ${gameData.items.length} items, ${gameData.addons.length} add-ons`);
console.log(`artwork    ${copied} distinct files copied into images/cards/`);
console.log(`realName   ${withRealName} of 32 items/add-ons map to exactly one real card`);
if (unresolved.length) {
  console.log(`placeholder art used for: ${unresolved.join(', ')}`);
}
