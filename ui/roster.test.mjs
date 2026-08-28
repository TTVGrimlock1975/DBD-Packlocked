// The roster decides which perks a save is playing with. Everything here is
// pure and takes its character data as an argument, so these run against a
// small hand-made roster rather than the real 54, and a change to
// data/characters.js can never quietly rewrite what a test means.
//
// The one case worth stating out loud: general perks belong to nobody and are
// always in. DBD gives them to every survivor from the start, so a save with
// no survivors ticked is still playable rather than empty.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = fs.readFileSync(path.join(import.meta.dirname, 'roster.js'), 'utf8');

function load() {
    const sandbox = { console };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(SRC, sandbox);
    return sandbox.window.PL.roster;
}

const DATA = {
    roster: [
        { name: 'Dwight', perks: ['Bond', 'Prove Thyself', 'Leader'] },
        { name: 'Meg', perks: ['Quick & Quiet', 'Sprint Burst', 'Adrenaline'] },
        { name: 'Feng', perks: ['Technician', 'Lithe', 'Alert'] }
    ],
    general: ['Resilience', 'Kindred'],
    special: ['The Joker', 'The Ace']
};

const sorted = a => [...a].sort();

test('a fresh roster has every survivor ticked, matching how the game played before', () => {

    const roster = load();
    const state = roster.defaultFor(DATA);

    assert.deepEqual(sorted(state.survivors), sorted(['Dwight', 'Meg', 'Feng']));
    assert.deepEqual(sorted(state.perks), []);

});

test('a full roster yields every perk in the data', () => {

    const roster = load();
    const names = roster.perkNamesFor(roster.defaultFor(DATA), DATA);

    assert.equal(names.length, 3 * 3 + 2 + 2, 'nine taught, two general, two special');

});

test('unticking a survivor drops exactly their three perks', () => {

    const roster = load();
    const names = roster.perkNamesFor({ survivors: ['Dwight', 'Feng'], perks: [] }, DATA);

    assert.ok(names.includes('Bond'));
    assert.ok(names.includes('Lithe'));
    assert.ok(!names.includes('Sprint Burst'));
    assert.ok(!names.includes('Adrenaline'));

});

test('general perks are always in, even with nobody ticked', () => {

    const roster = load();
    const names = roster.perkNamesFor({ survivors: [], perks: [] }, DATA);

    assert.deepEqual(sorted(names), sorted(['Resilience', 'Kindred', 'The Joker', 'The Ace']));

});

test('the Specials are always in, they are not anybody\'s perks', () => {

    const roster = load();
    const names = roster.perkNamesFor({ survivors: [], perks: [] }, DATA);

    assert.ok(names.includes('The Joker'));
    assert.ok(names.includes('The Ace'));

});

test('a Shrine perk is in even when its survivor is not', () => {

    const roster = load();
    const names = roster.perkNamesFor({ survivors: [], perks: ['Sprint Burst'] }, DATA);

    assert.ok(names.includes('Sprint Burst'), 'bought on its own');
    assert.ok(!names.includes('Adrenaline'), 'the rest of Meg stays out');

});

test('a perk ticked individually and also owned via its survivor appears once', () => {

    const roster = load();
    const names = roster.perkNamesFor({ survivors: ['Meg'], perks: ['Sprint Burst'] }, DATA);

    assert.equal(names.filter(n => n === 'Sprint Burst').length, 1);

});

test('an unknown survivor or perk name is ignored rather than throwing', () => {

    const roster = load();
    const names = roster.perkNamesFor({ survivors: ['Nobody'], perks: ['Not A Perk'] }, DATA);

    assert.deepEqual(sorted(names), sorted(['Resilience', 'Kindred', 'The Joker', 'The Ace']));

});

test('a missing or malformed state falls back to everything, never to nothing', () => {

    const roster = load();

    assert.equal(roster.perkNamesFor(null, DATA).length, 13);
    assert.equal(roster.perkNamesFor({}, DATA).length, 13);
    assert.equal(roster.perkNamesFor({ survivors: 'nonsense' }, DATA).length, 13);

});

test('survivorOf finds who teaches a perk, and nobody for a general one', () => {

    const roster = load();

    assert.equal(roster.survivorOf('Lithe', DATA), 'Feng');
    assert.equal(roster.survivorOf('Resilience', DATA), null);
    assert.equal(roster.survivorOf('Not A Perk', DATA), null);

});

test('perksLeavingWith lists what unticking a survivor would remove', () => {

    const roster = load();
    const state = { survivors: ['Dwight', 'Meg'], perks: [] };

    assert.deepEqual(
        sorted(roster.perksLeavingWith('Meg', state, DATA)),
        sorted(['Quick & Quiet', 'Sprint Burst', 'Adrenaline'])
    );

});

test('a perk ticked on its own is not lost when its survivor is unticked', () => {

    const roster = load();
    const state = { survivors: ['Meg'], perks: ['Sprint Burst'] };

    assert.deepEqual(
        sorted(roster.perksLeavingWith('Meg', state, DATA)),
        sorted(['Quick & Quiet', 'Adrenaline']),
        'Sprint Burst was bought separately and stays'
    );

});

test('toggling a survivor off and back on returns the same roster', () => {

    const roster = load();
    const start = roster.defaultFor(DATA);

    const off = roster.withSurvivor(start, 'Meg', false);
    const on = roster.withSurvivor(off, 'Meg', true);

    assert.deepEqual(sorted(roster.perkNamesFor(on, DATA)), sorted(roster.perkNamesFor(start, DATA)));

});

test('toggling does not mutate the state it was given', () => {

    const roster = load();
    const start = roster.defaultFor(DATA);
    const before = JSON.stringify(start);

    roster.withSurvivor(start, 'Meg', false);
    roster.withPerk(start, 'Lithe', true);

    assert.equal(JSON.stringify(start), before);

});

test('ticking a perk on adds it, ticking it off removes it', () => {

    const roster = load();

    const added = roster.withPerk({ survivors: [], perks: [] }, 'Lithe', true);
    assert.deepEqual(sorted(added.perks), ['Lithe']);

    const removed = roster.withPerk(added, 'Lithe', false);
    assert.deepEqual(sorted(removed.perks), []);

});

test('counts report the roster size against the whole pool', () => {

    const roster = load();
    const c = roster.countsFor({ survivors: ['Feng'], perks: [] }, DATA);

    assert.equal(c.survivors, 1);
    assert.equal(c.survivorTotal, 3);
    // Feng's three, two general, two special.
    assert.equal(c.perks, 7);
    assert.equal(c.perkTotal, 13);

});
