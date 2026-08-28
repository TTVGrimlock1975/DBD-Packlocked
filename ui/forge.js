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
 * Forging is expensive on purpose. A hundred and fifty or more spare copies of
 * a rarity buy one chosen card of that same rarity, and the rate climbs with
 * the tier, so forging is a decision about the one card you most want rather
 * than a faster way to open packs.
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

    /* A hundred and fifty spares of a rarity for a Common, rising to two
       hundred for a Legendary.
     *
     * This sat at twenty-five spares, rising to thirty-two, until a sim of the
     * actual pull odds showed what that meant in practice: finishing one
     * specific three-card set (a character's teachables, the thing a player
     * actually chases) took a median of 31 packs with forge in the loop
     * against 86 without it, and the worst-case player -- the one truly bad
     * luck is supposed to punish -- was rescued at 45 packs against the 185
     * pure RNG would have made them sit through. Forge was not a last resort
     * at that price, it was the way the game was played the moment a player
     * had sold enough spares, which is to say almost immediately, since every
     * spare pays shards whether the player is chasing anything or not.
     *
     * At this price the same sim's median lands on 84 packs -- back in line
     * with RNG alone -- while the worst-case player still finishes at 100
     * rather than 185. That is what "last resort" means in numbers: forging
     * barely helps the player already having a normal run, and meaningfully
     * helps the one who is not.
     *
     * Still climbing rather than flat, for the reason it always did: a Common
     * you are missing is a genuine gap and forging should still help close it,
     * while a Legendary on demand would hollow the packs out, so it costs more
     * per card than any tier below it.
     *
     * Written as spares-per-card times YIELD rather than four standalone shard
     * totals, so the number this comment describes is the actual number in
     * the code, and a rebalance only ever has to move one of these two
     * numbers instead of guessing a new total that keeps the same shape. */
    var SPARES_PER_CARD = {
        Common: 150,
        Rare: 150,
        Epic: 180,
        Legendary: 200
    };

    var COST = {};

    Object.keys(YIELD).forEach(function (rarity) {
        COST[rarity] = SPARES_PER_CARD[rarity] * YIELD[rarity];
    });

    /* A foil is a rarer pull than the card under it, so grinding one gives back
       more than the plain copy would. Entity Cursed is the 1-in-500, and sells
       for 50 tokens; nobody should ever grind one, but if they insist, an
       Entity Cursed Legendary -- the best case, since the multiplier applies
       to whatever rarity it happened to land on -- is worth a twenty-fifth of
       a forged Legendary now that forging costs what it does above. Anything
       below that rarity is worth far less. */
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

        if (card.foilVariant === "entityCursed") {
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
