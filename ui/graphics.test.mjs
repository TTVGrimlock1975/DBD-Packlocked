// ui/graphics.js decides how much the page is allowed to paint, and it runs
// from <head> before there is a DOM to speak of. That makes it small enough to
// run whole in a vm context against a fake documentElement and a fake
// localStorage, which is what these do.
//
// The migration cases matter most. Reduced Effects shipped as a boolean in
// plReducedEffects, and anyone who turned it on has that key sitting in their
// browser right now. Losing it would silently put a struggling machine back on
// the full spectacle.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = fs.readFileSync(path.join(import.meta.dirname, 'graphics.js'), 'utf8');

/* `store` seeds localStorage, so each test states the browser it is starting
   from. Returns the module plus the fakes, so a test can assert on what was
   written and on which classes ended up on <html>. */
function load(store = {}) {

    const classes = new Set();

    const storage = {
        getItem: k => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; }
    };

    const sandbox = {
        console,
        localStorage: storage,
        document: {
            documentElement: {
                classList: {
                    add: c => classes.add(c),
                    remove: c => classes.delete(c),
                    contains: c => classes.has(c),
                    toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); }
                }
            }
        }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(SRC, sandbox);

    return { graphics: sandbox.window.PL.graphics, classes, store };

}

test('a browser that has never seen the setting starts on full', () => {

    const { graphics, classes } = load();

    assert.equal(graphics.level(), 'full');
    assert.equal(classes.size, 0);

});

test('reduced sets plReduced and nothing else', () => {

    const { graphics, classes } = load();

    graphics.setLevel('reduced');

    assert.equal(graphics.level(), 'reduced');
    assert.ok(classes.has('plReduced'));
    assert.ok(!classes.has('plMinimal'));

});

test('minimal is a superset of reduced, so it carries both classes', () => {

    const { graphics, classes } = load();

    graphics.setLevel('minimal');

    assert.equal(graphics.level(), 'minimal');
    assert.ok(classes.has('plReduced'), 'every plReduced rule has to keep applying');
    assert.ok(classes.has('plMinimal'));

});

test('going back to full clears both classes', () => {

    const { graphics, classes } = load();

    graphics.setLevel('minimal');
    graphics.setLevel('full');

    assert.equal(classes.size, 0);

});

test('the level is written to plGraphics', () => {

    const { graphics, store } = load();

    graphics.setLevel('minimal');

    assert.equal(store.plGraphics, 'minimal');

});

test('a stored level is read back on load', () => {

    const { graphics, classes } = load({ plGraphics: 'minimal' });

    assert.equal(graphics.level(), 'minimal');
    assert.ok(classes.has('plMinimal'));

});

test('an unrecognised stored level falls back to full rather than throwing', () => {

    const { graphics, classes } = load({ plGraphics: 'ultra' });

    assert.equal(graphics.level(), 'full');
    assert.equal(classes.size, 0);

});

test('someone who had Reduced Effects switched on lands on reduced', () => {

    const { graphics, classes, store } = load({ plReducedEffects: '1' });

    assert.equal(graphics.level(), 'reduced');
    assert.ok(classes.has('plReduced'));
    assert.equal(store.plGraphics, 'reduced', 'the migration should persist');

});

test('someone who had it switched off lands on full', () => {

    const { graphics } = load({ plReducedEffects: '0' });

    assert.equal(graphics.level(), 'full');

});

test('the old key is cleared once migrated, so it cannot fight the new one', () => {

    const { store } = load({ plReducedEffects: '1' });

    assert.equal(store.plReducedEffects, undefined);

});

test('plGraphics wins over a stale plReducedEffects', () => {

    const { graphics } = load({ plGraphics: 'full', plReducedEffects: '1' });

    assert.equal(graphics.level(), 'full');

});

test('subscribers are told when the level changes', () => {

    const { graphics } = load();
    const seen = [];

    graphics.onChange(l => seen.push(l));

    graphics.setLevel('minimal');
    graphics.setLevel('full');

    assert.deepEqual(seen, ['minimal', 'full']);

});

test('setting the level it is already on does not notify', () => {

    const { graphics } = load();
    const seen = [];

    graphics.setLevel('reduced');
    graphics.onChange(l => seen.push(l));
    graphics.setLevel('reduced');

    assert.deepEqual(seen, []);

});

test('an unrecognised level is ignored rather than applied', () => {

    const { graphics } = load();

    graphics.setLevel('reduced');
    graphics.setLevel('potato');

    assert.equal(graphics.level(), 'reduced');

});
