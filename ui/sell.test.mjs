import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function loadSellModule() {

    const src = fs.readFileSync(path.join(import.meta.dirname, 'sell.js'), 'utf8');
    const sandbox = { console };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    return sandbox.window.PL.sell;

}

test('valueOf pays the standard ladder: 1 for Common/Rare, 2 for Epic/Legendary', () => {

    const PL_sell = loadSellModule();

    assert.equal(PL_sell.valueOf({ rarity: 'Common' }), 1);
    assert.equal(PL_sell.valueOf({ rarity: 'Rare' }), 1);
    assert.equal(PL_sell.valueOf({ rarity: 'Epic' }), 2);
    assert.equal(PL_sell.valueOf({ rarity: 'Legendary' }), 2);

});

test('valueOf pays 20 for any foil, regardless of rarity', () => {

    const PL_sell = loadSellModule();

    assert.equal(PL_sell.valueOf({ rarity: 'Common', foil: true }), 20);
    assert.equal(PL_sell.valueOf({ rarity: 'Legendary', foil: true }), 20);

});

test('valueOf pays 50 for Entity Touched, overriding the plain foil rate', () => {

    const PL_sell = loadSellModule();

    assert.equal(PL_sell.valueOf({ rarity: 'Common', foil: true, foilVariant: 'entityTouched' }), 50);

});

test('isUnsellable is true for exactly the five Special cards', () => {

    const PL_sell = loadSellModule();

    assert.equal(PL_sell.isUnsellable({ name: 'The Joker' }), true);
    assert.equal(PL_sell.isUnsellable({ name: 'The Queen' }), true);
    assert.equal(PL_sell.isUnsellable({ name: 'The King' }), true);
    assert.equal(PL_sell.isUnsellable({ name: 'The Ace' }), true);
    assert.equal(PL_sell.isUnsellable({ name: 'Jack (Of All Trades)' }), true);
    assert.equal(PL_sell.isUnsellable({ name: 'Meg Thomas' }), false);

});

test('isLastCopy is true at amount 1, false with spares to sell', () => {

    const PL_sell = loadSellModule();

    assert.equal(PL_sell.isLastCopy({ name: 'Meg Thomas', amount: 1 }), true);
    assert.equal(PL_sell.isLastCopy({ name: 'Meg Thomas', amount: 2 }), false);
    assert.equal(PL_sell.isLastCopy({ name: 'Meg Thomas', amount: 0 }), true, 'a missing amount should never read as safe to sell');

});

test('canSell is false for a Special at any amount, and false for anyone\'s last copy', () => {

    const PL_sell = loadSellModule();

    assert.equal(PL_sell.canSell({ name: 'The Joker', amount: 5 }), false, 'Specials are never sellable regardless of spares');
    assert.equal(PL_sell.canSell({ name: 'Meg Thomas', amount: 1 }), false, 'the last copy of anything is protected');
    assert.equal(PL_sell.canSell({ name: 'Meg Thomas', amount: 2 }), true, 'a spare copy is sellable');

});

test('duplicatesIn keeps one of each row and totals the rest', () => {

    const PL_sell = loadSellModule();
    const shardYield = () => 1; // stubbed; PL.forge owns the real ladder

    const rows = [
        { name: 'Meg Thomas', rarity: 'Common', amount: 5 },
        { name: 'Nea Karlsson', rarity: 'Epic', amount: 1 } // no spares -- untouched
    ];

    const result = PL_sell.duplicatesIn(rows, shardYield);

    assert.equal(result.items.length, 1, 'only the row with spares should appear');
    assert.equal(result.items[0].count, 4, 'keeps 1 of 5, sells the other 4');
    assert.equal(result.totalCards, 4);
    assert.equal(result.totalTokens, 4); // 4 spares * 1 token (Common)

});

test('duplicatesIn never counts a Special card, even if it somehow has spares', () => {

    const PL_sell = loadSellModule();
    const shardYield = () => 1;

    const rows = [{ name: 'The Joker', rarity: 'Special', amount: 3 }];

    const result = PL_sell.duplicatesIn(rows, shardYield);

    assert.equal(result.items.length, 0);
    assert.equal(result.totalCards, 0);
    assert.equal(result.totalTokens, 0);

});

test('duplicatesIn sums shards through the caller-supplied shard-yield function', () => {

    const PL_sell = loadSellModule();
    const shardYield = (card) => card.rarity === 'Legendary' ? 5 : 1;

    const rows = [{ name: 'A Legendary Perk', rarity: 'Legendary', amount: 3 }];

    const result = PL_sell.duplicatesIn(rows, shardYield);

    assert.equal(result.totalCards, 2);
    assert.equal(result.totalShards, 10); // 2 spares * 5 shards

});
