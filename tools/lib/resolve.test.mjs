import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, dbdRarityToTier, resolvePerkIcon, parseGenericName } from './resolve.mjs';

test('slugify strips diacritics, apostrophes and punctuation', () => {
  assert.equal(slugify('Déjà Vu'), 'deja-vu');
  assert.equal(slugify("Plunderer's Instinct"), 'plunderers-instinct');
  assert.equal(slugify('We’ll Make It'), 'well-make-it');
  assert.equal(slugify('Windows Of Opportunity'), 'windows-of-opportunity');
  assert.equal(slugify('1 2 3 4!'), '1-2-3-4');
  assert.equal(slugify('Needle & Thread'), 'needle-and-thread');
});

test('dbdRarityToTier folds five DBD tiers into his four', () => {
  assert.equal(dbdRarityToTier('Common'), 'Common');
  assert.equal(dbdRarityToTier('Uncommon'), 'Common');
  assert.equal(dbdRarityToTier('Rare'), 'Rare');
  assert.equal(dbdRarityToTier('Very Rare'), 'Epic');
  assert.equal(dbdRarityToTier('Ultra Rare'), 'Legendary');
});

test('resolvePerkIcon matches on slug regardless of file extension', () => {
  const files = ['iconPerks_AceInTheHole.webp', 'iconPerks_Adrenaline.png'];
  assert.equal(resolvePerkIcon('Ace in the Hole', files), 'iconPerks_AceInTheHole.webp');
  assert.equal(resolvePerkIcon('Adrenaline', files), 'iconPerks_Adrenaline.png');
});

test('resolvePerkIcon uses the alias table for irregular filenames', () => {
  const files = ['iconsPerks_TeamworkSoftSpoken.webp', 'iconPerks_DecisiveStrike.png'];
  assert.equal(resolvePerkIcon('TW: Soft Spoken', files), 'iconsPerks_TeamworkSoftSpoken.webp');
  assert.equal(resolvePerkIcon('Decisive Strike', files), 'iconPerks_DecisiveStrike.png');
});

test('resolvePerkIcon tolerates the inconsistent icon/Icon prefix casing', () => {
  assert.equal(resolvePerkIcon('Made For This', ['IconPerks_madeForThis.webp']), 'IconPerks_madeForThis.webp');
  assert.equal(resolvePerkIcon('Scavenger', ['IconPerks_scavenger.webp']), 'IconPerks_scavenger.webp');
});

test('resolvePerkIcon falls back to the name without its Boon/Invocation prefix', () => {
  assert.equal(resolvePerkIcon('Boon: Dark Theory', ['iconPerks_DarkTheory.webp']), 'iconPerks_DarkTheory.webp');
  assert.equal(resolvePerkIcon('Boon: Illumination', ['iconsPerks_Illumination.webp']), 'iconsPerks_Illumination.webp');
});

test('a prefixed name still prefers an exact match when one exists', () => {
  const files = ['iconPerks_BoonDarkTheory.webp', 'iconPerks_DarkTheory.webp'];
  assert.equal(resolvePerkIcon('Boon: Dark Theory', files), 'iconPerks_BoonDarkTheory.webp');
});

test('resolvePerkIcon handles a perk whose art is filed under a different name', () => {
  // Called "One-Two-Three-Four!" everywhere but in this game's own card data.
  assert.equal(
    resolvePerkIcon('1 2 3 4!', ['iconPerks_OneTwoThreeFour.webp']),
    'iconPerks_OneTwoThreeFour.webp',
  );
});

test('resolvePerkIcon returns null when there is genuinely no art', () => {
  assert.equal(resolvePerkIcon('Nonexistent Perk', ['iconPerks_Adrenaline.webp']), null);
});

test('parseGenericName splits his placeholder item and add-on names', () => {
  assert.deepEqual(parseGenericName('Common Med-Kit'), { rarity: 'Common', category: 'Med-Kit', isAddon: false });
  assert.deepEqual(parseGenericName('Very Rare Toolbox'), { rarity: 'Very Rare', category: 'Toolbox', isAddon: false });
  assert.deepEqual(parseGenericName('Ultra Rare Flashlight Add-on'), { rarity: 'Ultra Rare', category: 'Flashlight', isAddon: true });
  assert.deepEqual(parseGenericName('Rare Fog Vial Add-on'), { rarity: 'Rare', category: 'Fog Vial', isAddon: true });
  assert.deepEqual(parseGenericName('Uncommon Med-Kit Add-on'), { rarity: 'Uncommon', category: 'Med-Kit', isAddon: true });
});

test('parseGenericName returns null for anything not following the pattern', () => {
  assert.equal(parseGenericName('Adrenaline'), null);
});
