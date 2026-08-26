/* The Entity's Bargain.
 *
 * Every other way to earn tokens in this game pays out after the fact: you play
 * a trial, then tick what you managed. A bargain runs the other way round. You
 * name terms and stake tokens on them before you queue, and the stake is gone
 * the moment you strike it. Deliver and it comes back multiplied; fail and the
 * Entity keeps it.
 *
 * What makes this more than a coin flip is that the terms are about your
 * loadout, and the loadout is real data. "Escape carrying no perks" is checked
 * against what was actually equipped when the trial resolved, not against what
 * the player says they did. The escape itself is still their own word -- the
 * same honour system the reward rows have always run on -- but the hard half of
 * every term is verified.
 *
 * Pure. Terms are predicates over a loadout snapshot and a result, so settling
 * a bargain is a function call rather than a walk through the live game state.
 */

window.PL = window.PL || {};

PL.bargain = (function () {

    function perksOf(loadout) {

        return (loadout && loadout.perks) || [];

    }

    /* Ordered by what they ask of you, which is also the order they pay. The
       multiplier is the whole stake returned, not the profit on top of it: a
       five token stake at four times comes back as twenty. */
    var TERMS = [
        {
            id: "escape",
            name: "First Blood",
            terms: "Escape the trial.",
            multiplier: 1.5,
            test: function (loadout, result) {
                return result === "escaped";
            }
        },
        {
            id: "noItem",
            name: "Empty Handed",
            terms: "Escape carrying no item.",
            multiplier: 2,
            test: function (loadout, result) {
                return result === "escaped" && !(loadout && loadout.item);
            }
        },
        {
            id: "lean",
            name: "Travelling Light",
            terms: "Escape with two perks or fewer.",
            multiplier: 2.5,
            test: function (loadout, result) {
                return result === "escaped" && perksOf(loadout).length <= 2;
            }
        },
        {
            id: "commons",
            name: "Common Blood",
            terms: "Escape with perks, none above Common.",
            multiplier: 3,
            /* At least one, deliberately. "Nothing above Common" is trivially
               true of an empty loadout, and without the floor this would just
               be Bare Hands paying less. */
            test: function (loadout, result) {
                var perks = perksOf(loadout);
                return result === "escaped" &&
                    perks.length > 0 &&
                    perks.every(function (p) { return p.rarity === "Common"; });
            }
        },
        {
            id: "noPerks",
            name: "Bare Hands",
            terms: "Escape with no perks at all.",
            multiplier: 4,
            test: function (loadout, result) {
                return result === "escaped" && perksOf(loadout).length === 0;
            }
        }
    ];

    var MIN_STAKE = 5;
    var STAKE_STEP = 5;
    var MAX_STAKE = 100;

    function termById(id) {

        return TERMS.filter(function (t) { return t.id === id; })[0] || null;

    }

    /* Rounded down, so the house never pays a fraction of a token it cannot
       actually hand over. */
    function payout(stake, term) {

        return term ? Math.floor(stake * term.multiplier) : 0;

    }

    /* Clamped against the balance as well as the ceiling, so a stake can never
       be struck for tokens the player does not have. */
    function clampStake(stake, balance) {

        var top = Math.min(MAX_STAKE, balance);

        if (top < MIN_STAKE) {
            return 0;
        }

        return Math.max(MIN_STAKE, Math.min(top, stake));

    }

    function canStrike(termId, stake, balance) {

        var term = termById(termId);

        return !!term &&
            stake >= MIN_STAKE &&
            stake <= balance &&
            stake === clampStake(stake, balance);

    }

    /**
     * bargain -- { termId, stake } as struck.
     * loadout -- what was equipped when the trial resolved.
     * result  -- "escaped" or "sacrificed".
     *
     * Returns the verdict, or null when there was no bargain to settle.
     */
    function settle(bargain, loadout, result) {

        if (!bargain) {
            return null;
        }

        var term = termById(bargain.termId);

        if (!term) {

            /* A term that no longer exists cannot be judged, so the stake goes
               back rather than being quietly kept. Only reachable if a save
               outlives a change to the table above. */
            return {
                term: null,
                won: false,
                refunded: true,
                payout: bargain.stake
            };

        }

        var won = !!term.test(loadout, result);

        return {
            term: term,
            won: won,
            refunded: false,
            payout: won ? payout(bargain.stake, term) : 0
        };

    }

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

    /* What you put up, and what comes back. One line, said the same way in all
       three of the panel's states — offered, struck, judged — so a bargain
       reads as a single sentence from one end to the other rather than three
       unrelated readouts.

       `tone` is what the second figure means: "return" for money not yours
       yet, "none" for a stake the Entity kept, "flat" for one handed back. */
    function figures(stake, returns, tone, caps) {

        return '<span class="plDeal__figures">' +
                '<span class="plDeal__fig plDeal__fig--stake">' + stake + "</span>" +
                '<span class="plDeal__arrow" aria-hidden="true">&rarr;</span>' +
                '<span class="plDeal__fig plDeal__fig--' + tone + '">' +
                    returns +
                "</span>" +
                (caps
                    ? '<span class="plDeal__cap">Stake</span>' +
                      "<span></span>" +
                      '<span class="plDeal__cap">Returns</span>'
                    : "") +
            "</span>";

    }

    /* Kept in the panel rather than thrown as a popup: a lost stake deserves to
       sit on screen and be read, not flash past. It reuses the figures line
       above deliberately — the verdict is not new information beside the
       wager, it is that same wager with the second number filled in. */
    function verdict(result) {

        if (!result) {
            return "";
        }

        var tone = result.refunded
            ? "void"
            : (result.won ? "won" : "lost");

        var said = result.refunded
            ? " could not be judged"
            : (result.won ? " honoured" : " broken");

        var fig = result.refunded
            ? "flat"
            : (result.won ? "return" : "none");

        return '<div class="plDeal__verdict plDeal__verdict--' + tone + '">' +
                '<span class="plDeal__verdictName">' +
                    escapeHtml(result.name) + said +
                "</span>" +
                figures(result.staked, result.payout, fig, false) +
            "</div>";

    }

    function picker(pickId, stake, balance, result) {

        var term = termById(pickId) || TERMS[0];
        var affordable = canStrike(term.id, stake, balance);
        var ceiling = Math.min(MAX_STAKE, balance);

        /* The floor is a Basic Pack. Below it there is nothing worth staking,
           and saying so beats a stepper that will not move. */
        var poor = balance < MIN_STAKE;

        /* A rung carries its own terms. They used to live in a single line
           under the whole row, which rewrote itself on every press and left you
           reading one term in two places. */
        var ladder = TERMS.map(function (t) {

            var on = t.id === term.id;

            return '<button type="button" class="plDeal__rung' +
                (on ? " plDeal__rung--on" : "") +
                '" data-term="' + t.id + '" aria-pressed="' + on + '">' +
                    '<span class="plDeal__rungName">' + escapeHtml(t.name) + "</span>" +
                    '<span class="plDeal__rungMult">&times;' + t.multiplier + "</span>" +
                    '<span class="plDeal__rungReads">' + escapeHtml(t.terms) + "</span>" +
                "</button>";

        }).join("");

        /* Both ends of the stepper are disabled at their limits rather than
           left live and inert. The clamp already refused to move past them; a
           button that looks pressable and does nothing just makes you press it
           twice to find that out. */
        var offer = poor
            ? '<span class="plDeal__floor">' + MIN_STAKE +
                " tokens needed to strike a bargain</span>"
            : '<div class="plDeal__deal">' +
                    '<button type="button" class="plDeal__step" data-stake="-1"' +
                        ' aria-label="Lower the stake"' +
                        (stake <= MIN_STAKE ? " disabled" : "") +
                        ">&minus;</button>" +
                    figures(stake, payout(stake, term), "return", true) +
                    '<button type="button" class="plDeal__step" data-stake="1"' +
                        ' aria-label="Raise the stake"' +
                        (stake >= ceiling ? " disabled" : "") +
                        ">+</button>" +
                "</div>" +
                '<button type="button" class="plDeal__strike" id="strikeBargain"' +
                    (affordable ? "" : " disabled") + ">Strike the Bargain</button>";

        return '<div class="plDeal__head">' +
                '<span class="plDeal__label">The Entity’s Bargain</span>' +
            "</div>" +
            verdict(result) +
            '<div class="plDeal__ladder">' + ladder + "</div>" +
            offer +
            '<span class="plDeal__hint">Struck before the trial. ' +
                "Settled by how it ends.</span>";

    }

    function pending(open) {

        var term = termById(open.termId);

        return '<div class="plDeal__head">' +
                '<span class="plDeal__label">Bargain Struck</span>' +
            "</div>" +
            '<div class="plDeal__sealed">' +
                '<span class="plDeal__rungName">' +
                    escapeHtml(term ? term.name : "Unknown terms") + "</span>" +
                '<span class="plDeal__rungReads">' +
                    escapeHtml(term ? term.terms : "These terms are no longer offered.") +
                "</span>" +
                figures(open.stake, payout(open.stake, term), "return", false) +
            "</div>" +
            '<span class="plDeal__hint">Settles the moment you record the trial.</span>';

    }

    return {
        render: { picker: picker, pending: pending },
        terms: TERMS,
        minStake: MIN_STAKE,
        stakeStep: STAKE_STEP,
        maxStake: MAX_STAKE,
        termById: termById,
        payout: payout,
        clampStake: clampStake,
        canStrike: canStrike,
        settle: settle
    };

}());
