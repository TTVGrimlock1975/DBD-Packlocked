/* Which perks a save is actually playing with.
 *
 * Packlocked assumes you own the whole roster, and most people do not. A run
 * scoped to the survivors you have actually bought is a different, tighter
 * game: fewer perks in the pool, a smaller collection to finish, and no packs
 * full of cards you could never use in a real trial. The Shrine of Secrets
 * complicates it, because it sells single perks off survivors you do not own,
 * so ownership is a survivor list plus a handful of loose perks.
 *
 * Everything here is pure and takes characterData as an argument. Nothing
 * reaches for gameData, localStorage or the DOM, which is what lets the whole
 * thing be tested against a three-survivor fixture rather than the real 54.
 *
 * The state is deliberately small and JSON-shaped, because it is saved per
 * slot and travels inside an export:
 *
 *   { survivors: ["Feng Min", ...], perks: ["Lithe", ...] }
 *
 * survivors are ticked wholesale and bring their three perks each. perks are
 * the Shrine ones, ticked on their own. A perk in both is still just in.
 *
 * Two things are never optional, and both matter for the empty case. General
 * perks belong to nobody: DBD hands them to every survivor from the start, so
 * they are in whatever the roster says. The Specials are not perks in any real
 * sense, they are this game's own cards. Between them a save with every
 * survivor unticked is still playable rather than an empty shelf.
 */

window.PL = window.PL || {};

PL.roster = (function () {

    function names(list) {

        return Array.isArray(list) ? list : [];

    }

    /* A state that has never been set, or one that arrived malformed, means
       the whole roster rather than none of it. This is the difference between
       an old save opening exactly as it always has and an old save opening
       with fourteen cards in it. */
    function survivorsIn(state, data) {

        if (!state || !Array.isArray(state.survivors)) {

            return data.roster.map(function (entry) { return entry.name; });

        }

        return state.survivors;

    }

    function defaultFor(data) {

        return {
            survivors: data.roster.map(function (entry) { return entry.name; }),
            perks: []
        };

    }

    /* The whole point of the module: the set of perk names this roster can
       roll, count and forge. Order is not meaningful, and duplicates are
       collapsed, so a perk owned twice over (via its survivor and on its own)
       appears once. */
    function perkNamesFor(state, data) {

        var owned = {};

        var ticked = survivorsIn(state, data);

        data.roster.forEach(function (entry) {

            if (ticked.indexOf(entry.name) === -1) {

                return;

            }

            entry.perks.forEach(function (perk) { owned[perk] = true; });

        });

        /* Filtered against the real pool rather than trusted, so a stale name
           in a save (a perk renamed since, a hand-edited import) cannot put a
           card into the roster that the game has no data for. */
        var pool = {};

        data.roster.forEach(function (entry) {
            entry.perks.forEach(function (perk) { pool[perk] = true; });
        });

        names(state && state.perks).forEach(function (perk) {

            if (pool[perk]) {

                owned[perk] = true;

            }

        });

        names(data.general).forEach(function (perk) { owned[perk] = true; });
        names(data.special).forEach(function (perk) { owned[perk] = true; });

        return Object.keys(owned);

    }

    function survivorOf(perkName, data) {

        var found = null;

        data.roster.forEach(function (entry) {

            if (!found && entry.perks.indexOf(perkName) !== -1) {

                found = entry.name;

            }

        });

        return found;

    }

    /* What unticking this survivor would actually take out of the roster.
       Not simply their three perks: one of them may have been bought from the
       Shrine and ticked on its own, in which case it stays and is not part of
       what the player is about to be asked to sell or swap. */
    function perksLeavingWith(survivorName, state, data) {

        var entry = null;

        data.roster.forEach(function (row) {

            if (row.name === survivorName) {

                entry = row;

            }

        });

        if (!entry) {

            return [];

        }

        var kept = names(state && state.perks);

        return entry.perks.filter(function (perk) {

            return kept.indexOf(perk) === -1;

        });

    }

    /* Both toggles copy rather than mutate. The caller holds the old state
       while it works out what a change would cost (which perks leave, which
       milestones move), and a toggle that edited in place would have already
       destroyed the answer by the time it was asked. */
    function withSurvivor(state, survivorName, on) {

        var current = survivorsIn(state, { roster: [] });
        var next = current.filter(function (n) { return n !== survivorName; });

        if (on) {

            next.push(survivorName);

        }

        return {
            survivors: next,
            perks: names(state && state.perks).slice()
        };

    }

    function withPerk(state, perkName, on) {

        var current = names(state && state.perks);
        var next = current.filter(function (n) { return n !== perkName; });

        if (on) {

            next.push(perkName);

        }

        return {
            survivors: names(state && state.survivors).slice(),
            perks: next
        };

    }

    /* For the panel's own readout: how much of the game this save is playing
       with, in both currencies the player thinks in. */
    function countsFor(state, data) {

        var pool = {};

        data.roster.forEach(function (entry) {
            entry.perks.forEach(function (perk) { pool[perk] = true; });
        });

        names(data.general).forEach(function (perk) { pool[perk] = true; });
        names(data.special).forEach(function (perk) { pool[perk] = true; });

        return {
            survivors: survivorsIn(state, data).length,
            survivorTotal: data.roster.length,
            perks: perkNamesFor(state, data).length,
            perkTotal: Object.keys(pool).length
        };

    }

    return {
    defaultFor: defaultFor,
    perkNamesFor: perkNamesFor,
    survivorOf: survivorOf,
    perksLeavingWith: perksLeavingWith,
    withSurvivor: withSurvivor,
    withPerk: withPerk,
    countsFor: countsFor
};

}());
