// Builds data/cards.js and vendors the artwork it references.
//
// Dev-only. Never runs for a player, and adds no dependency to the game — the
// output it writes is committed and loaded by a plain <script src> tag.
//
// The existing card data is the source of truth for names, rarities and types.
// This script only ATTACHES artwork to those cards. It never renames, adds or
// removes one, because card.name is the key every save is written against.
//
// Items and add-ons used to be generic buckets ("Rare Med-Kit") standing in
// for whichever real card's art got matched to them, because the pool held
// one slot per category+rarity rather than the real roster. The pool now
// carries every real item and add-on by its own name, so this script's job
// for them collapsed from "guess which real card this generic slot means"
// down to the same direct lookup perks have always used.
//
// Usage:  node tools/build-cards.mjs
//         DBDBUILDS=/path/to/DBDBuilds node tools/build-cards.mjs

import fs from 'node:fs';
import path from 'node:path';
import { slugify, resolvePerkIcon } from './lib/resolve.mjs';

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

/* The source's own category key → the label this game already shows the
   player (ui/roller.js prints it directly: "No Med-Kit add-ons owned").
   Most match; "Medkit" is the one the source spells as one word where the
   game always has not. Key and Map are new categories -- the old generic
   pool never had item slots for either -- and need no translation. */
const CATEGORY_LABEL = {
  Medkit: 'Med-Kit',
  Flashlight: 'Flashlight',
  Toolbox: 'Toolbox',
  'Fog Vial': 'Fog Vial',
  Key: 'Key',
  Map: 'Map',
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
// (\w[\w ]*): matches a bare key (Toolbox:) but not a quoted one ('Fog
// Vial':) -- the source quotes any key containing a space, which this
// missed entirely until now: 'Fog Vial' silently never matched, and every
// Fog Vial add-on fell through to whatever fallback the caller had.
const addonsByCategory = {};
for (const m of section(itemData, 'ITEM_TYPE_ADDONS').matchAll(/(?:'([\w ]+)'|(\w[\w ]*)):\s*\[([^\]]*)\]/g)) {
  addonsByCategory[(m[1] ?? m[2]).trim()] = [...m[3].matchAll(/'([^']*)'|"([^"]*)"/g)].map((x) => x[1] ?? x[2]);
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

/** The category a real add-on's name belongs to, from addonsByCategory run
    in reverse -- built once rather than searched per add-on. */
const categoryOfAddon = new Map();
for (const [category, names] of Object.entries(addonsByCategory)) {
  for (const name of names) categoryOfAddon.set(name, category);
}

/* The four Specials aren't real DBD perks -- they're this game's own
   invention -- so DBDBuilds has no art for them and resolvePerkIcon can only
   ever fail to find one, landing all four on the blank placeholder. Each
   already has its own hand-made icon committed in images/cards/perks/; this
   is what actually wires them up, same as The Joker always was on its own.
   It used to be only The Joker's problem to solve because it was the only
   Special that existed when this special-case was written -- King, Queen
   and Ace were silently riding the generic path straight to empty.webp
   ever since they were added, and nothing caught it until this script
   next got run for an unrelated reason. */
const SPECIAL_ICON = {
    'The Joker': 'the-joker.webp',
    'The King': 'the-king.webp',
    'The Queen': 'the-queen.webp',
    'The Ace': 'the-ace.webp',
    'Jack (Of All Trades)': 'the-jack.webp',
};

const unresolved = [];

for (const card of gameData.perks) {
    if (SPECIAL_ICON[card.name]) {
        card.icon = 'images/cards/perks/' + SPECIAL_ICON[card.name];
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

/** The source's category key, translated to what the game already displays. */
function categoryLabel(sourceKey) {
  const label = CATEGORY_LABEL[sourceKey];
  if (!label) throw new Error(`no display label for category: ${sourceKey}`);
  return label;
}

for (const card of gameData.items) {
  const info = items.get(card.name);
  if (!info) throw new Error(`item in the pool but not in DBDBuilds' ITEM_INFO: ${card.name}`);

  const rel = itemIcon.get(card.name);
  if (!rel) throw new Error(`no ITEM_ICON entry for: ${card.name}`);

  card.icon = vendor(path.join(SRC, 'public', rel), 'items');
  card.category = categoryLabel(info.category);
  card.realName = null; // the name already is the real one, same as perks
}

for (const card of gameData.addons) {
  const sourceCategory = categoryOfAddon.get(card.name);
  if (!sourceCategory) throw new Error(`add-on in the pool but not in any ITEM_TYPE_ADDONS list: ${card.name}`);

  const rel = addonIcon.get(card.name);
  if (!rel) throw new Error(`no ADDON_ICON entry for: ${card.name}`);

  card.icon = vendor(path.join(SRC, 'public', rel), 'addons');
  card.category = categoryLabel(sourceCategory);
  card.realName = null;
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
//   realName  null for everything now -- every card's own name already is
//             its real Dead by Daylight name, the same as perks always were

${emit('perks', gameData.perks)}
${emit('items', gameData.items)}
${emit('addons', gameData.addons)}`;

fs.writeFileSync(path.join(REPO, 'data/cards.js'), out);

// ── Report ──────────────────────────────────────────────────────────────────

console.log(`cards      ${gameData.perks.length} perks, ${gameData.items.length} items, ${gameData.addons.length} add-ons`);
console.log(`artwork    ${copied} distinct files copied into images/cards/`);
if (unresolved.length) {
  console.log(`placeholder art used for: ${unresolved.join(', ')}`);
}
