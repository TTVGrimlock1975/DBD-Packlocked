import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function loadModule() {

    const src = fs.readFileSync(path.join(import.meta.dirname, 'autoOpen.js'), 'utf8');
    const sandbox = { console };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    return sandbox.window.PL.autoOpen;

}

test('plannedRuns caps a fixed count at what the balance can afford', () => {

    const PL_auto = loadModule();

    // Asked for 10, can only afford 4 at 5 tokens each with 23 tokens.
    assert.equal(PL_auto.plannedRuns(10, 23, 5, null), 4);

});

test('plannedRuns runs the full requested count when affordable', () => {

    const PL_auto = loadModule();

    assert.equal(PL_auto.plannedRuns(3, 100, 5, null), 3);

});

test('ALL IN spends the whole balance, rounding down', () => {

    const PL_auto = loadModule();

    assert.equal(PL_auto.plannedRuns('all', 23, 5, null), 4);
    assert.equal(PL_auto.plannedRuns('all', 25, 5, null), 5);
    assert.equal(PL_auto.plannedRuns('all', 4, 5, null), 0);

});

test('a rotating pack\'s stock caps the run even with tokens and count to spare', () => {

    const PL_auto = loadModule();

    assert.equal(PL_auto.plannedRuns('all', 1000, 5, 3), 3);
    assert.equal(PL_auto.plannedRuns(10, 1000, 5, 3), 3);

});

test('never returns a negative count for a pack that cannot be afforded at all', () => {

    const PL_auto = loadModule();

    assert.equal(PL_auto.plannedRuns(5, 2, 5, null), 0);
    assert.equal(PL_auto.plannedRuns('all', 2, 5, null), 0);

});

test('a requested count of 0 or less plans nothing', () => {

    const PL_auto = loadModule();

    assert.equal(PL_auto.plannedRuns(0, 100, 5, null), 0);
    assert.equal(PL_auto.plannedRuns(-1, 100, 5, null), 0);

});
