// Pure helpers for matching Packlocked cards to Dead by Daylight artwork.
// No I/O here so the matching rules can be tested on their own.

/** Deterministic slug: 'Déjà Vu' → 'deja-vu', "Alex's" → 'alexs'. */
export function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * DBD ships five rarities; this game has four.
 * The fold follows the convention already used in the existing card data:
 * an "Uncommon Med-Kit" was already tagged Common, "Very Rare" already Epic.
 */
export function dbdRarityToTier(dbdRarity) {
  switch (dbdRarity) {
    case 'Rare':
      return 'Rare';
    case 'Very Rare':
      return 'Epic';
    case 'Ultra Rare':
      return 'Legendary';
    case 'Common':
    case 'Uncommon':
    default:
      return 'Common';
  }
}

/**
 * Perks whose icon filename does not follow `iconPerks_<PascalName>`.
 * Keyed by slug so lookup ignores case and punctuation.
 */
export const PERK_ICON_ALIASES = {
  'decisive-strike': 'iconPerks_DecisiveStrike.png',
  'detectives-hunch': 'iconPerks_DetectivesHunch.webp',
  'object-of-obsession': 'iconPerks_ObjectOfObsession.webp',
  'plunderers-instinct': 'iconPerks_PlunderersInstinct.webp',
  'sole-survivor': 'iconPerks_SoleSurvivor.webp',
  'well-make-it': 'iconPerks_WellMakeIt.png',
  'were-gonna-live-forever': 'iconPerks_WereGonnaLiveForever.webp',
  'tw-soft-spoken': 'iconsPerks_TeamworkSoftSpoken.webp',
  'tw-full-circuit': 'iconsPerks_TeamworkFullCircuit.webp',
  'tw-throwdown': 'iconPerks_TeamworkThrowDown.webp',
  'tw-toughen-up': 'iconPerks_TeamworkToughenUp.webp',
  'treacherous-crows': 'iconsPerks_InvocationTreacherousCrows.webp',
  // Named "One-Two-Three-Four!" everywhere else, so nothing about "1 2 3 4!"
  // can be matched from the name alone.
  '1-2-3-4': 'iconPerks_OneTwoThreeFour.webp',
};

/**
 * Slug with separators removed, for comparing across naming styles.
 * A filename is PascalCase with no delimiters ('AceInTheHole') while the card
 * name is spaced ('Ace in the Hole'), so the dashes must come out of both
 * before they can be compared.
 */
function squash(name) {
  return slugify(name).replace(/-/g, '');
}

/**
 * Find the icon file for a perk.
 * `available` is a flat list of filenames from the source Perks folder.
 * Returns the filename, or null when no art exists for that perk.
 */
export function resolvePerkIcon(name, available) {
  const alias = PERK_ICON_ALIASES[slugify(name)];
  if (alias && available.includes(alias)) return alias;

  // The prefix is spelled iconPerks_, iconsPerks_ and IconPerks_ across the
  // set, and the first letter of the stem is sometimes lowercased.
  const stems = available.map((file) => ({
    file,
    key: squash(file.replace(/^icons?perks_/i, '').replace(/\.(webp|png|jpg)$/i, '')),
  }));

  // 'iconPerks_AceInTheHole.webp' → 'aceinthehole' ← 'Ace in the Hole'
  const exact = stems.find((s) => s.key === squash(name));
  if (exact) return exact.file;

  // Some Boon and Invocation icons drop the category prefix from the filename:
  // 'Boon: Dark Theory' is stored as iconPerks_DarkTheory.webp. Tried only
  // after an exact match fails, so a properly prefixed file always wins.
  const stripped = String(name).replace(/^(Boon|Invocation|Scourge Hook|TW):\s*/i, '');
  if (stripped !== String(name)) {
    const loose = stems.find((s) => s.key === squash(stripped));
    if (loose) return loose.file;
  }

  return null;
}

/** DBD rarity words, longest first so "Very Rare" wins over "Rare". */
const RARITY_WORDS = ['Ultra Rare', 'Very Rare', 'Uncommon', 'Common', 'Rare'];

/**
 * Split a placeholder name into its parts.
 * 'Ultra Rare Flashlight Add-on' → { rarity, category, isAddon }.
 * Returns null when the name is not a placeholder — every real perk name.
 */
export function parseGenericName(name) {
  const raw = String(name).trim();

  const rarity = RARITY_WORDS.find((r) => raw.startsWith(r + ' '));
  if (!rarity) return null;

  let rest = raw.slice(rarity.length + 1).trim();

  const isAddon = /\s+Add-on$/i.test(rest);
  if (isAddon) rest = rest.replace(/\s+Add-on$/i, '').trim();

  if (!rest) return null;

  return { rarity, category: rest, isAddon };
}
