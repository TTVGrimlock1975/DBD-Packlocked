// Volume is now three numbers multiplied together rather than two: the mix
// balance baked into the module, the channel the cue belongs to, and the
// master slider. These pin that arithmetic down, and pin down which channel
// each of the twelve cues answers to, because getting a cue into the wrong
// group is silent and invisible until a player complains that turning the
// pack sounds down also quietened their clicks.
//
// ui/sounds.js builds twelve Audio objects at load, which Node has no notion
// of, so the vm context hands it a stub that records nothing and does nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = fs.readFileSync(path.join(import.meta.dirname, 'sounds.js'), 'utf8');

function load(store = {}) {

    const storage = {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; }
    };

    const sandbox = {
        console,
        localStorage: storage,
        Audio: function () { return { volume: 1, currentTime: 0, play() { return null; } }; }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(SRC, sandbox);

    const sounds = sandbox.window.PL.sounds;
    sounds.init();
    return { sounds, store };

}

const INTERFACE = ['click', 'confirm', 'error', 'select', 'toggle',
                   'modalOpen', 'modalClose', 'sell', 'milestoneComplete'];
const PACKS = ['packRip', 'cardFlip', 'specialReveal'];

test('every cue belongs to exactly one channel, and all twelve are placed', () => {

    const { sounds } = load();

    assert.equal(INTERFACE.length + PACKS.length, 12);

    for (const cue of [...INTERFACE, ...PACKS]) {
        assert.equal(typeof sounds.volumeFor(cue), 'number', cue + ' has no volume');
    }

});

test('channels default to full, so an existing player hears no change', () => {

    const { sounds } = load({ plVolume: '1' });

    assert.equal(sounds.getChannel('interface'), 1);
    assert.equal(sounds.getChannel('packs'), 1);

    // click's mix balance is 0.75; at master 1 and channel 1 that is what plays.
    assert.equal(sounds.volumeFor('click'), 0.75);

});

test('the interface channel scales interface cues and leaves pack cues alone', () => {

    const { sounds } = load();

    const packBefore = sounds.volumeFor('cardFlip');

    sounds.setChannel('interface', 0.5);

    assert.equal(sounds.volumeFor('click'), 0.75 * 0.5);
    assert.equal(sounds.volumeFor('cardFlip'), packBefore);

});

test('the packs channel scales pack cues and leaves interface cues alone', () => {

    const { sounds } = load();

    const clickBefore = sounds.volumeFor('click');

    sounds.setChannel('packs', 0.25);

    assert.equal(sounds.volumeFor('cardFlip'), 0.5 * 0.25);
    assert.equal(sounds.volumeFor('click'), clickBefore);

});

test('master multiplies on top of the channel', () => {

    const { sounds } = load();

    sounds.setVolume(0.5);
    sounds.setChannel('interface', 0.5);

    assert.equal(sounds.volumeFor('click'), 0.75 * 0.5 * 0.5);

});

test('mute beats every channel and the master together', () => {

    const { sounds } = load();

    sounds.setChannel('packs', 1);
    sounds.setVolume(1);
    sounds.setMuted(true);

    assert.equal(sounds.volumeFor('packRip'), 0);
    assert.equal(sounds.volumeFor('click'), 0);

});

test('channels persist under their own keys, apart from the save', () => {

    const { sounds, store } = load();

    sounds.setChannel('interface', 0.4);
    sounds.setChannel('packs', 0.8);

    assert.equal(store.plVolInterface, '0.4');
    assert.equal(store.plVolPacks, '0.8');

    for (const key of Object.keys(store)) {
        assert.ok(!key.startsWith('save'), key + ' would be swept into an export');
    }

});

test('stored channel levels are read back on init', () => {

    const { sounds } = load({ plVolInterface: '0.5', plVolPacks: '0.2' });

    assert.equal(sounds.getChannel('interface'), 0.5);
    assert.equal(sounds.getChannel('packs'), 0.2);

});

test('a missing channel key means full, not silent', () => {

    const { sounds } = load({});

    assert.equal(sounds.getChannel('packs'), 1);

});

test('an unreadable channel key falls back to full rather than silencing the game', () => {

    const { sounds } = load({ plVolInterface: 'banana', plVolPacks: '' });

    assert.equal(sounds.getChannel('interface'), 1);
    assert.equal(sounds.getChannel('packs'), 1);

});

test('channel levels are clamped to 0..1', () => {

    const { sounds } = load();

    sounds.setChannel('packs', 5);
    assert.equal(sounds.getChannel('packs'), 1);

    sounds.setChannel('packs', -3);
    assert.equal(sounds.getChannel('packs'), 0);

});

test('a nonsense channel value is ignored rather than muting the channel', () => {

    const { sounds } = load();

    sounds.setChannel('interface', 0.6);
    sounds.setChannel('interface', NaN);

    assert.equal(sounds.getChannel('interface'), 0.6);

});

test('an unknown channel name is ignored', () => {

    const { sounds } = load();

    sounds.setChannel('music', 0.5);

    assert.equal(sounds.getChannel('interface'), 1);
    assert.equal(sounds.getChannel('packs'), 1);

});
