/* How many packs one Auto Open run actually gets to make.
 *
 * "Open 10" and "ALL IN" are both a request, not a promise -- the balance or
 * a rotating pack's stock can cap either one below what was asked for. The
 * loop that spends real tokens and the picker that shows the player what
 * they are about to commit to both need the same answer, so it lives here
 * once rather than being worked out twice and risking disagreement.
 *
 * Pure. Takes the numbers it needs rather than reading tokens/stock off the
 * game state itself, so a run can be planned without anything having to be
 * bought yet.
 */

window.PL = window.PL || {};

PL.autoOpen = (function () {

    /* `requested` is a positive count, or the string "all" for spend-the-
       whole-balance. `stock` is a rotating pack's remaining count, or
       null/undefined for a shelf pack, which never runs out. */
    function plannedRuns(requested, tokens, cost, stock) {

        if (!cost || cost <= 0) {
            return 0;
        }

        const affordable = Math.floor(tokens / cost);
        const cap = (stock === null || stock === undefined)
            ? affordable
            : Math.min(affordable, stock);

        if (requested === "all") {
            return Math.max(0, cap);
        }

        return Math.max(0, Math.min(requested, cap));

    }

    return { plannedRuns: plannedRuns };

}());
