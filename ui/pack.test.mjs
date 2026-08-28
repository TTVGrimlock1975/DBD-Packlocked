// Reproduces the "mass Quick Open" lockup: buying a second pack while the
// first pack's burst animation is still in flight leaves the second pack
// permanently sealed, and packOpening (script.js's purchase gate) stuck true
// forever -- every further pack purchase silently no-ops.
//
// ui/pack.js is written against the real DOM, which Node does not have. This
// runs the real module in a vm context against a hand-rolled fake `stage`
// element and a manually-advanced fake `setTimeout`, so the test is
// deterministic and does not actually wait 620ms.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = fs.readFileSync(
    path.join(import.meta.dirname, 'pack.js'),
    'utf8'
);

/* A stage element that supports exactly what ui/pack.js asks of it: setting
   innerHTML replaces its content and bumps a generation counter, and every
   element handed out by querySelector remembers the generation it was born
   in. isConnected mirrors the real DOM: true only while its generation is
   still the stage's current one -- false the moment a later innerHTML
   assignment moves on without it, which is exactly the condition a stale
   setTimeout callback needs to be able to check. */
function makeHarness() {

    const state = { generation: 0, markup: '' };
    const elementsThisGeneration = new Map();

    function makeElement(selector) {

        const listeners = {};
        const gen = state.generation;

        const el = {
            get isConnected() { return gen === state.generation; },
            classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
            style: { setProperty() {} },
            disabled: false,
            setPointerCapture() {},
            addEventListener(type, fn) {
                listeners[type] = listeners[type] || [];
                listeners[type].push(fn);
            },
            fire(type, evt) {
                (listeners[type] || []).forEach((fn) => fn(evt || {}));
            },
            querySelector(sel) { return stage.querySelector(sel); },
            getAttribute() { return null; }
        };

        el._selector = selector;
        return el;

    }

    const stage = {
        get innerHTML() { return state.markup; },
        set innerHTML(value) {
            state.markup = value;
            state.generation++;
            elementsThisGeneration.clear();
        },
        // reveal()'s celebrate() flashes the stage itself for a Legendary or
        // Special pull -- a no-op class list is enough to let that run.
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
        querySelector(selector) {

            const cls = selector.replace('.', '');

            if (!state.markup.includes(cls)) {
                return null;
            }

            if (!elementsThisGeneration.has(selector)) {
                elementsThisGeneration.set(selector, makeElement(selector));
            }

            return elementsThisGeneration.get(selector);

        }
    };

    /* A manually-driven, cumulative clock instead of real timers, so a chain
       of nested setTimeouts (tear -> burst -> reveal -> auto-dismiss) can be
       advanced step by step without waiting on the wall clock, and without
       the test having to know how many timers deep a given advance() call
       needs to reach. Firing a timer can itself schedule another one whose
       fire time already falls within the current advance() -- draining in a
       loop, in fire-time order, is what lets that chain resolve in one call
       instead of needing one advance() per link. */
    const pending = [];
    let now = 0;

    function fakeSetTimeout(fn, delay) {
        const timer = { fn, fireAt: now + delay, fired: false };
        pending.push(timer);
        return timer;
    }

    function advance(ms) {

        now += ms;

        for (;;) {

            const due = pending
                .filter((t) => !t.fired && t.fireAt <= now)
                .sort((a, b) => a.fireAt - b.fireAt)[0];

            if (!due) {
                return;
            }

            due.fired = true;
            due.fn();

        }

    }

    const sandbox = {
        console,
        setTimeout: fakeSetTimeout,
        clearTimeout(timer) { if (timer) timer.fired = true; },
        document: {
            getElementById(id) {
                return id === 'packAnimation' ? stage : null;
            }
        }
    };

    sandbox.window = sandbox;
    sandbox.window.PL = {
        panels: { wrapper() { return ''; } },
        card: { render() { return ''; } },
        sounds: { packRip() {}, cardFlip() {}, specialReveal() {} }
    };

    vm.createContext(sandbox);
    vm.runInContext(SRC, sandbox);

    return { PL: sandbox.window.PL, stage, advance };

}

test('quick-opening a second pack while the first is still bursting does not strand the second pack sealed', () => {

    const { PL, stage, advance } = makeHarness();

    let pack1Done = 0;
    let pack2Done = 0;

    PL.pack.open('Basic', [{ name: 'A', rarity: 'Common', type: 'perk', isNew: true }], () => { pack1Done++; });

    // Quick Open pack #1. finishTear fires onDone synchronously and queues
    // the 620ms burst -> reveal timer -- this is the real script.js gate
    // (packOpening = false) releasing before the reveal has actually run.
    stage.querySelector('.plQuick').fire('click');
    assert.equal(pack1Done, 1, 'pack #1\'s onDone should fire the moment Quick Open is clicked');

    // With packOpening now false, script.js lets a second purchase start
    // before pack #1's burst timer has fired.
    PL.pack.open('Basic', [{ name: 'B', rarity: 'Common', type: 'perk', isNew: true }], () => { pack2Done++; });

    const pack2Quick = stage.querySelector('.plQuick');
    assert.ok(pack2Quick, 'pack #2 should have rendered its own sealed wrapper');

    // Pack #1's deferred reveal now fires. Before the fix this unconditionally
    // overwrote the stage -- including pack #2's still-sealed wrapper -- with
    // pack #1's reveal screen, and pack #2's Quick Open button never existed
    // in the document again.
    advance(620);

    assert.equal(
        pack2Quick.isConnected,
        true,
        'pack #2\'s sealed wrapper must survive pack #1\'s deferred reveal'
    );

    // Now Quick Open pack #2 for real.
    stage.querySelector('.plQuick').fire('click');

    assert.equal(pack2Done, 1, 'pack #2\'s onDone must fire once its own Quick Open is clicked -- this is packOpening actually releasing');

});

test('quick-opening a single pack with nothing racing it still reveals normally', () => {

    const { PL, stage, advance } = makeHarness();

    PL.pack.open('Basic', [{ name: 'A', rarity: 'Common', type: 'perk', isNew: true }], () => {});

    stage.querySelector('.plQuick').fire('click');
    advance(620);

    assert.ok(
        stage.querySelector('.plContinue'),
        'the reveal screen should render when nothing else has touched the stage in the meantime'
    );

});

test('the reveal heading appends "Pack" for a bare shelf packType', () => {

    const { PL, stage, advance } = makeHarness();

    PL.pack.open('Basic', [{ name: 'A', rarity: 'Common', type: 'perk', isNew: true }], () => {});
    stage.querySelector('.plQuick').fire('click');
    advance(620);

    assert.match(stage.innerHTML, /Basic Pack · 1 pulled/);

});

test('the reveal heading does not double "Pack" for a rotating pack whose own name already ends in it', () => {

    const { PL, stage, advance } = makeHarness();

    PL.pack.open('Duplicator Pack', [{ name: 'A', rarity: 'Common', type: 'perk', isNew: true }], () => {});
    stage.querySelector('.plQuick').fire('click');
    advance(620);

    assert.match(stage.innerHTML, /Duplicator Pack · 1 pulled/);
    assert.doesNotMatch(stage.innerHTML, /Duplicator Pack Pack/);

});

test('the reveal heading still appends "Pack" for a rotating pack whose name does not already carry it', () => {

    const { PL, stage, advance } = makeHarness();

    PL.pack.open('Faces & Aces', [{ name: 'The Joker', rarity: 'Special', type: 'Perk', isNew: true }], () => {});
    stage.querySelector('.plQuick').fire('click');
    advance(620);

    assert.match(stage.innerHTML, /Faces & Aces Pack · 1 pulled/);

});

test('openAuto does not signal done until the seal, burst, and view delays have all elapsed', () => {

    const { PL, advance } = makeHarness();

    let done = 0;

    PL.pack.openAuto('Basic', [{ name: 'A', rarity: 'Common', type: 'perk', isNew: true }], null, () => { done++; });

    advance(1); // nothing has had time to happen yet
    assert.equal(done, 0);

    advance(400); // seal has torn, burst is still running
    assert.equal(done, 0);

    advance(620); // reveal is now showing, view pause hasn't elapsed
    assert.equal(done, 0);

    advance(1000); // view pause elapses
    assert.equal(done, 1, 'onCycleDone should fire exactly once, after the full cycle');

});

test('openAuto chains cleanly: a second call after the first finishes runs a normal full cycle', () => {

    const { PL, stage, advance } = makeHarness();

    let firstDone = 0;
    let secondDone = 0;

    PL.pack.openAuto('Basic', [{ name: 'A', rarity: 'Common', type: 'perk', isNew: true }], null, () => { firstDone++; });
    advance(400); advance(620); advance(1000);
    assert.equal(firstDone, 1);

    PL.pack.openAuto('Basic', [{ name: 'B', rarity: 'Common', type: 'perk', isNew: true }], null, () => { secondDone++; });
    advance(400); advance(620); advance(1000);
    assert.equal(secondDone, 1, 'the second auto cycle should complete normally once chained after the first');

});

test('openAuto still calls onCycleDone, exactly once, if something else clobbers the stage mid-cycle', () => {

    const { PL, stage, advance } = makeHarness();

    let done = 0;

    PL.pack.openAuto('Basic', [{ name: 'A', rarity: 'Common', type: 'perk', isNew: true }], null, () => { done++; });

    // Something else takes over the stage before this cycle's own timers run
    // -- should never happen given the loop always waits for onCycleDone,
    // but the cycle must not hang forever if it somehow does.
    stage.innerHTML = '<div class="unrelated"></div>';

    advance(400); advance(620); advance(1000);

    assert.equal(done, 1, 'a stolen stage should still resolve the cycle instead of stalling the loop');

});

test('a human clicking Continue early still resolves the cycle exactly once, without a duplicate signal from the auto-dismiss timer', () => {

    const { PL, stage, advance } = makeHarness();

    let done = 0;

    PL.pack.openAuto('Basic', [{ name: 'A', rarity: 'Common', type: 'perk', isNew: true }], null, () => { done++; });

    advance(400); // tear
    advance(620); // burst -> reveal now showing

    stage.querySelector('.plContinue').fire('click');
    assert.equal(done, 1, 'clicking Continue during an auto cycle should resolve it immediately');

    advance(1000); // the auto-dismiss timer still fires later
    assert.equal(done, 1, 'it must not fire onCycleDone a second time');

});
