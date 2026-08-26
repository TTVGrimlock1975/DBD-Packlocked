/* Iridescent Shards: the duplicate problem, attacked from the supply side.
 *
 * The completion track pays you for progress, which compensates for duplicates
 * without doing anything about them. This is the other half. Every spare copy
 * you sell now also yields shards, and shards forge one specific card you are
 * missing -- so the pile of cards you already own becomes the thing that closes
 * the gaps luck left behind.
 *
 * Two deliberate limits:
 *
 * Forging is expensive on purpose. Roughly ten spare copies of a rarity buy one
 * chosen card of that same rarity, which makes forging a decision about the one
 * card you most want rather than a faster way to open packs.
 *
 * Specials cannot be forged at all. The Joker, Queen, King and Ace are not
 * collection gaps in the ordinary sense -- they are consumable power with their
 * own pack -- and a shard mill that printed Kings on demand would turn a catch
 * up mechanic into an exploit. They cannot be sold either, so they never feed
 * the mill in the first place.
 *
 * Pure, and takes its randomness as an argument, so a pity swap can be replayed
 * exactly in a test.
 */

window.PL = window.PL || {};

PL.forge = (function () {

    /* What one spare copy grinds down to. The ladder matches the sell payout's
       shape rather than its numbers: rarity is what a duplicate costs you in
       luck, so rarity is what it should give back. */
    var YIELD = {
        Common: 1,
        Rare: 2,
        Epic: 3,
        Legendary: 5
    };

    /* Roughly ten spares of a rarity for one chosen card of it, held steady
       across the ladder so no tier is the efficient one to farm. */
    var COST = {
        Common: 10,
        Rare: 18,
        Epic: 30,
        Legendary: 50
    };

    /* A foil is a rarer pull than the card under it, so grinding one gives back
       more than the plain copy would. Entity Touched is the 1-in-500, and sells
       for 50 tokens; nobody should ever grind one, but if they insist it is
       worth most of a forged Legendary. */
    var FOIL_MULTIPLIER = 3;
    var ENTITY_MULTIPLIER = 8;

    /* Packs opened with nothing new in them before the next one is made to
       carry a card you do not own. Eight is about three thousand tokens' worth
       of bad luck at Basic Pack prices -- long enough that the guarantee stays
       a safety net rather than the way the game is played. */
    var PITY_PACKS = 8;

    function shardYield(card) {

        if (!card) {
            return 0;
        }

        var base = YIELD[card.rarity] || 0;

        if (card.foilVariant === "entityTouched") {
            return base * ENTITY_MULTIPLIER;
        }

        if (card.foil) {
            return base * FOIL_MULTIPLIER;
        }

        return base;

    }

    /* null rather than Infinity for the unforgeable, so a caller that forgets
       to check gets a visible absence instead of a button quietly priced beyond
       every balance. */
    function costOf(rarity) {

        return Object.prototype.hasOwnProperty.call(COST, rarity)
            ? COST[rarity]
            : null;

    }

    function isForgeable(card) {

        return !!card && costOf(card.rarity) !== null;

    }

    /* The one place the answer is decided, so the button's disabled state and
       the handler's guard cannot drift apart. */
    function canForge(card, shards, owned) {

        var cost = card ? costOf(card.rarity) : null;

        return cost !== null &&
            (owned || []).indexOf(card.name) === -1 &&
            shards >= cost;

    }

    /**
     * Chooses the pity swap for a pack that came up empty.
     *
     * pulled -- the cards the pack rolled, none of them new.
     * unowned -- pool entries the player does not have yet.
     *
     * Returns { indexes, card } naming the slots to overwrite and what to put
     * in them, or null when there is nothing to give.
     */
    function pitySwap(pulled, unowned, rng) {

        rng = rng || Math.random;

        if (!pulled || !pulled.length || !unowned || !unowned.length) {
            return null;
        }

        /* A Special in the pack is not a disappointing pull, and swapping one
           out would take away the rarest thing the pack could have contained. */
        var swappable = pulled
            .map(function (card, i) { return { card: card, i: i }; })
            .filter(function (entry) { return isForgeable(entry.card); });

        if (!swappable.length) {
            return null;
        }

        var target = swappable[Math.floor(rng() * swappable.length)];

        /* Same rarity first, so the guarantee hands back a card the pack could
           genuinely have rolled rather than quietly upgrading the pull. Only if
           that rarity is already complete does it widen. */
        var sameRarity = unowned.filter(function (card) {
            return card.rarity === target.card.rarity && isForgeable(card);
        });

        var pool = sameRarity.length
            ? sameRarity
            : unowned.filter(isForgeable);

        if (!pool.length) {
            return null;
        }

        var replacement = pool[Math.floor(rng() * pool.length)];

        /* The Duplicator Pack's whole premise is the same card three times, so
           swapping one of the three would leave it contradicting its own
           description. When every card in the pack shares a name, they all go. */
        var oneName = pulled.every(function (card) {
            return card.name === pulled[0].name;
        });

        var indexes = oneName
            ? pulled.map(function (card, i) { return i; })
            : [target.i];

        return { indexes: indexes, card: replacement };

    }

    return {
        yields: YIELD,
        costs: COST,
        pityPacks: PITY_PACKS,
        shardYield: shardYield,
        costOf: costOf,
        isForgeable: isForgeable,
        canForge: canForge,
        pitySwap: pitySwap
    };

}());
