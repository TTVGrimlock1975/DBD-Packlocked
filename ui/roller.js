/* The loadout roller.
 *
 * Packlocked's whole premise is that you may only run what you pulled, so the
 * question before every match is "what am I allowed to bring?". Answering it by
 * hand means scrolling an inventory of two hundred cards. This deals a legal
 * build instead, and lets you keep the slots you like and roll the rest.
 *
 * The rules are The Ace's rules, deliberately. That generator already decided
 * what a randomly dealt loadout looks like in this game -- four distinct perks,
 * no Specials, add-ons that match the item -- and a second answer to the same
 * question would only be a second thing to keep in step. The difference is
 * where the cards come from: The Ace conjures them out of the whole pool, this
 * draws only from cards you own.
 *
 * Pure, and takes its randomness as an argument, so a roll can be replayed
 * exactly in a test rather than guessed at.
 */

window.PL = window.PL || {};

PL.roller = (function () {

    /* Not perks in any real sense: four of the five are "Use" cards that never
       reach a loadout slot through equipCard at all, and the Joker is sacrifice
       insurance -- a card you decide to bring, not one you want handed to you
       by a dice roll. The Ace's own generator skips the same five, and so does
       Jack's. */
    var SPECIALS = ["The Joker", "The Queen", "The King", "The Ace", "Jack (Of All Trades)"];

    function isSpecial(card) {

        return SPECIALS.indexOf(card.name) !== -1;

    }

    function draw(pool, rng) {

        return pool[Math.floor(rng() * pool.length)];

    }

    function names(list) {

        return list.map(function (c) { return c.name; });

    }

    /* Draws without replacement. Every slot in a loadout has to hold a
       different card, which is the one rule equipCard enforces on both the
       perk and the add-on branch. */
    function fill(chosen, pool, want, rng) {

        var taken = names(chosen);
        var out = chosen.slice();

        while (out.length < want) {

            var available = pool.filter(function (card) {
                return taken.indexOf(card.name) === -1;
            });

            if (!available.length) {
                break;
            }

            var pick = draw(available, rng);

            out.push(pick);
            taken.push(pick.name);

        }

        return out;

    }

    /**
     * owned -- { perks, items, addons }, each an array of pool entries the
     *          player owns and has not already got equipped. Pool entries
     *          rather than inventory rows, because only the pool carries the
     *          category an add-on has to match.
     * kept  -- { perks, item, addons }, the slots being held across the roll.
     * rng   -- returns [0,1). Injected so a roll can be replayed.
     *
     * Returns the whole finished loadout, kept cards included, plus notes
     * explaining any slot it could not fill.
     */
    function roll(owned, kept, rng) {

        rng = rng || Math.random;
        kept = kept || {};

        var keptPerks = kept.perks || [];
        var keptAddons = kept.addons || [];
        var notes = [];

        var perks = fill(
            keptPerks,
            (owned.perks || []).filter(function (card) {
                return !isSpecial(card);
            }),
            4,
            rng
        );

        if (perks.length < 4) {
            notes.push(
                perks.length === 0
                    ? "No perks owned yet"
                    : "Only " + perks.length + " perks to draw from"
            );
        }

        /* A held add-on decides the item rather than the other way round. The
           alternative -- rolling the item freely and then dropping the add-on
           the player explicitly asked to keep -- breaks the one promise a lock
           makes. */
        var constraint = kept.item
            ? kept.item.category
            : keptAddons.length ? keptAddons[0].category : null;

        var itemPool = (owned.items || []).filter(function (card) {
            return constraint === null || card.category === constraint;
        });

        var item = kept.item || (itemPool.length ? draw(itemPool, rng) : null);

        if (!item) {
            notes.push(
                constraint
                    ? "No " + constraint + " owned to match the held add-on"
                    : "No items owned yet"
            );
        }

        /* No item means no add-ons. Two Flashlight add-ons and nothing to put
           them on is not a loadout anyone can take into a match. */
        var addonPool = item
            ? (owned.addons || []).filter(function (card) {
                return card.category === item.category;
            })
            : [];

        var addons = item
            ? fill(keptAddons, addonPool, 2, rng)
            : [];

        if (item && addons.length < 2) {
            notes.push(
                addons.length === 0
                    ? "No " + item.category + " add-ons owned"
                    : "Only one " + item.category + " add-on owned"
            );
        }

        return {
            perks: perks,
            item: item,
            addons: addons,
            notes: notes
        };

    }

    /* Reports what a roll actually dealt, for the line under the button. Built
       from the result rather than from what was asked for, so it cannot claim a
       slot got filled when it did not. */
    function summarise(result) {

        if (result.notes.length) {
            return result.notes.join(" · ");
        }

        return result.perks.length + " perks · " +
            (result.item ? result.item.category || result.item.name : "no item") +
            (result.addons.length ? " · " + result.addons.length + " add-ons" : "");

    }

    return {
        specials: SPECIALS,
        isSpecial: isSpecial,
        roll: roll,
        summarise: summarise
    };

}());
