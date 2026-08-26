/* Collection completion rewards.
 *
 * Owning every card is the point of the game, but the back half of a 209 card
 * collection is where duplicates start eating whole packs -- so the payouts
 * climb steeply rather than evenly. The last milestone is worth thirty times
 * the first, because by then a pack is far likelier to hand back a card you
 * already own than one you don't.
 *
 * Rewards are claimed rather than granted on the spot. A threshold is usually
 * crossed mid pack-opening, behind an animation, and a reward that lands while
 * cards are still turning over is a reward the player never sees. Waiting on
 * the track also means nothing earned before this feature existed was lost:
 * an old save simply arrives with everything unclaimed.
 *
 * Kept pure. Every function takes the counts it needs, so none of this has to
 * know how the collection is stored or what a token is.
 */

window.PL = window.PL || {};

PL.rewards = (function () {

    /* Percentages rather than card counts, so adding cards to data/cards.js
       re-spaces the whole track instead of stranding the last milestone below
       a total it can no longer reach. */
    var MILESTONES = [
        { pct: 10, tokens: 5 },
        { pct: 20, tokens: 8 },
        { pct: 30, tokens: 12 },
        { pct: 40, tokens: 18 },
        { pct: 50, tokens: 25 },
        { pct: 60, tokens: 35 },
        { pct: 70, tokens: 50 },
        { pct: 80, tokens: 70 },
        { pct: 90, tokens: 100 },
        { pct: 100, tokens: 150 }
    ];

    /* Rounded up, so 100% means the whole collection and not one card short
       of it. */
    function thresholdFor(pct, total) {

        return Math.ceil(total * pct / 100);

    }

    /* The one place the three states are decided, so the track, the badge and
       the claim handler cannot disagree about whether something is claimable. */
    function statusFor(found, total, claimed) {

        var owned = claimed || [];

        return MILESTONES.map(function (m) {

            var need = thresholdFor(m.pct, total);
            var reached = found >= need;
            var taken = owned.indexOf(m.pct) !== -1;

            return {
                pct: m.pct,
                tokens: m.tokens,
                need: need,
                reached: reached,
                state: taken
                    ? "claimed"
                    : reached ? "ready" : "locked"
            };

        });

    }

    /* Drives the banner. Counting reached rather than claimed is deliberate:
       the announcement belongs to crossing the line, not to collecting on it. */
    function reachedCount(found, total) {

        return MILESTONES.filter(function (m) {
            return found >= thresholdFor(m.pct, total);
        }).length;

    }

    function readyCount(found, total, claimed) {

        return statusFor(found, total, claimed).filter(function (m) {
            return m.state === "ready";
        }).length;

    }

    /* Looks up a milestone by the percentage a claim button carries, and
       reports whether it is actually claimable. The handler trusts this rather
       than the button's own class, because a stale render is a free payout. */
    function claimable(pct, found, total, claimed) {

        var match = statusFor(found, total, claimed).filter(function (m) {
            return m.pct === Number(pct);
        })[0];

        return match && match.state === "ready" ? match : null;

    }

    function nodeMarkup(m) {

        var body;
        var sub;

        if (m.state === "claimed") {

            body = PL.icons.get("check", 16);
            sub = "Claimed";

        } else {

            body = "+" + m.tokens + PL.icons.get("blood", 12);
            sub = m.state === "ready"
                ? "Claim"
                : m.need + " cards";

        }

        return '<button type="button" ' +
            'class="plTrack__node plTrack__node--' + m.state + '" ' +
            'data-pct="' + m.pct + '"' +
            (m.state === "ready" ? "" : " disabled") + ">" +
                '<span class="plTrack__pct">' + m.pct + "%</span>" +
                '<span class="plTrack__val">' + body + "</span>" +
                '<span class="plTrack__sub">' + sub + "</span>" +
            "</button>";

    }

    /* Rebuilt whole on every collection change. Ten nodes is small enough that
       diffing them would cost more to read than it saves to run. */
    function render(node, found, total, claimed) {

        if (!node) {
            return;
        }

        var rows = statusFor(found, total, claimed);
        var ready = rows.filter(function (m) {
            return m.state === "ready";
        }).length;

        var pct = total ? (found / total) * 100 : 0;

        node.innerHTML =
            '<div class="plTrack__head">' +
                '<span class="plTrack__label">' +
                    PL.icons.get("award", 14) + "Completion Rewards" +
                "</span>" +
                '<span class="plTrack__ready">' +
                    (ready > 0
                        ? ready + " ready to claim"
                        : "Next reward at " + nextLabel(rows, found)) +
                "</span>" +
            "</div>" +
            '<div class="plTrack__bar"><i style="width:' + pct + '%"></i></div>' +
            '<div class="plTrack__nodes">' +
                rows.map(nodeMarkup).join("") +
            "</div>";

    }

    /* The whole track completed is the one case with no "next", and saying so
       reads better than an empty hint where a target used to be. */
    function nextLabel(rows, found) {

        var next = rows.filter(function (m) {
            return !m.reached;
        })[0];

        return next
            ? (next.need - found) + " more cards"
            : "Collection complete";

    }

    return {
        list: MILESTONES,
        thresholdFor: thresholdFor,
        statusFor: statusFor,
        reachedCount: reachedCount,
        readyCount: readyCount,
        claimable: claimable,
        render: render
    };

}());
