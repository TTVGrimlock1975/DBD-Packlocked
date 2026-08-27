/* Selling spares, and knowing which ones are spares.
 *
 * The token ladder used to be written out twice -- once in sellCard, once in
 * the inventory row that builds its own button label -- which is how the two
 * could quietly disagree. Pulled out here so there is exactly one ladder, and
 * anything that needs to know what a card sells for reads it rather than
 * repeating it.
 *
 * duplicatesIn exists for the same reason: "sell every spare, keep one of
 * each" is arithmetic a confirm dialog and the sale itself both have to get
 * right and have to agree on, so it happens once, here, rather than being
 * trusted to match between a preview and the code that actually pays out.
 *
 * canSell is the third thing that used to only be half-true: the per-card
 * Sell button would happily sell a card's last copy, which duplicatesIn
 * never would. See isLastCopy for why that copy is protected now too.
 *
 * Pure. Shard yield is taken as a function rather than imported, so this
 * module does not have to know PL.forge exists to be tested.
 */

window.PL = window.PL || {};

PL.sell = (function () {

    var UNSELLABLE = ["The Joker", "The Queen", "The King", "The Ace", "Jack (Of All Trades)"];

    /* The five Specials are consumable power with their own pack, not a
       collection gap -- selling one would quietly strip whatever it does.
       Matches the guard sellCard has always carried. */
    function isUnsellable(card) {

        return !!card && UNSELLABLE.indexOf(card.name) !== -1;

    }

    /* True at the copy that would take a card's amount to zero.
     *
     * collection marks a card discovered forever the moment it is first
     * pulled -- pity and forge both read that flag, not the inventory, to
     * decide what is still missing -- so a card sold down to none stays
     * "collected" with nothing behind it, and neither safety net will ever
     * offer it again. Nothing else in the game can put it back; the only way
     * back in is a plain, unassisted pull matching that exact card by luck.
     * Protecting the last copy is what keeps that dead end unreachable,
     * rather than trying to teach collection to notice it after the fact. */
    function isLastCopy(card) {

        return !card || (card.amount || 0) <= 1;

    }

    // What the Sell button actually gates on: never a Special, never the
    // last copy of anything else.
    function canSell(card) {

        return !isUnsellable(card) && !isLastCopy(card);

    }

    // Entity Touched sells for 50 Blood Tokens regardless of what it landed
    // on; any other foil pays 20; a plain copy pays by rarity.
    function valueOf(card) {

        if (!card) {
            return 0;
        }

        if (card.foilVariant === "entityTouched") {
            return 50;
        }

        if (card.foil) {
            return 20;
        }

        return (card.rarity === "Epic" || card.rarity === "Legendary") ? 2 : 1;

    }

    /* Given the rows on screen, works out what "sell every spare copy, keep
       one of each" means: which rows have anything to sell, how many of
       each, and what it totals to in both currencies. `shardYield` is
       PL.forge.shardYield in production; passed in rather than reached for,
       so this stays pure. */
    function duplicatesIn(rows, shardYield) {

        var items = [];
        var totalTokens = 0;
        var totalShards = 0;
        var totalCards = 0;

        (rows || []).forEach(function (card) {

            if (isUnsellable(card)) {
                return;
            }

            var spare = (card.amount || 0) - 1;

            if (spare <= 0) {
                return;
            }

            items.push({ card: card, count: spare });
            totalTokens += spare * valueOf(card);
            totalShards += spare * shardYield(card);
            totalCards += spare;

        });

        return {
            items: items,
            totalTokens: totalTokens,
            totalShards: totalShards,
            totalCards: totalCards
        };

    }

    return {
        isUnsellable: isUnsellable,
        isLastCopy: isLastCopy,
        canSell: canSell,
        valueOf: valueOf,
        duplicatesIn: duplicatesIn
    };

}());
