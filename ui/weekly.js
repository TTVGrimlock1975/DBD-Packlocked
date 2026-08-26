/* Weekly challenges.
 *
 * The token faucet is otherwise a flat checklist: the same objectives are worth
 * the same amount forever, so after a fortnight you tick the same four rows
 * without reading them. Three rotating goals a week give the week a shape, and
 * push you at parts of the game you would otherwise never touch — nobody forges
 * a card or strikes a bargain unprompted the first time.
 *
 * Everything here is derived rather than counted twice. Progress is the
 * difference between a lifetime total now and the same total when the week
 * began, so no challenge needs its own counter wired into the place the thing
 * happens. Add a lifetime stat and it can be a challenge; there is no second
 * bookkeeping path to keep in step.
 *
 * The week's three are chosen from the week number itself, so they are stable
 * across reloads and save slots without being stored, and reopening the panel
 * never reshuffles them.
 *
 * Pure: week ids, selection, progress and markup all come from arguments.
 */

window.PL = window.PL || {};

PL.weekly = (function () {

    var WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    var HOW_MANY = 3;

    /* Every metric here is a lifetime total the game already keeps. The target
       is what a week of ordinary play should just about reach, so the set reads
       as "play the game" rather than as a second job. */
    var CATALOG = [
        { id: "packs",    metric: "packsOpened",   target: 10, reward: 15,
          label: "Open 10 packs" },
        { id: "escape",   metric: "escapes",       target: 5,  reward: 15,
          label: "Escape 5 trials" },
        { id: "discover", metric: "discovered",    target: 8,  reward: 20,
          label: "Discover 8 new cards" },
        { id: "foil",     metric: "foilsPulled",   target: 1,  reward: 25,
          label: "Pull a foil" },
        { id: "sell",     metric: "sold",          target: 15, reward: 12,
          label: "Sell 15 spare cards" },
        { id: "forge",    metric: "forged",        target: 2,  reward: 20,
          label: "Forge 2 cards" },
        { id: "bargain",  metric: "bargainsWon",   target: 3,  reward: 22,
          label: "Honour 3 bargains" },
        { id: "sets",     metric: "setsCompleted", target: 1,  reward: 25,
          label: "Complete a character set" }
    ];

    /* One glyph per challenge, from the interface's own set. Declared here
       rather than inside the markup so a new challenge names its icon in the
       same place it names its metric and its reward — there is no second list
       to remember to update.

       Each is the mark the rest of the app already uses for that part of the
       game, so a row is recognisable before its label is read: the pack shelf's
       crate, the Escaped button's door, the inventory's magnifier. Forge and
       bargain have no button of their own to borrow from, so they take the
       nearest true reading — pieces being arranged, and a throw of the dice. */
    var ICONS = {
        packs:    "pack",
        escape:   "escaped",
        discover: "search",
        foil:     "foil",
        sell:     "shop",
        forge:    "loadout",
        bargain:  "dice",
        sets:     "collection"
    };

    /* Which week a moment falls in. The epoch was a Thursday, so weeks turn over
       on Thursday — which happens to be when DBD's own store rotates, and is as
       good a boundary as any. */
    function weekOf(now) {

        return Math.floor((now || 0) / WEEK_MS);

    }

    function endOf(week) {

        return (week + 1) * WEEK_MS;

    }

    /* An integer avalanche hash (the murmur3 finaliser). A plain multiply-and-
       modulo was the first attempt and it was measurably bad: consecutive weeks
       stayed correlated through it, and two hundred weeks dealt only seventeen
       distinct sets out of the fifty-six the catalogue can make. This mixes
       every input bit into every output bit, so week 41 and week 42 are as
       unrelated as any two numbers. */
    function hash(n) {

        var x = n | 0;

        x = Math.imul(x ^ (x >>> 16), 2246822507);
        x = Math.imul(x ^ (x >>> 13), 3266489909);

        return (x ^ (x >>> 16)) >>> 0;

    }

    /* Deterministic, so the same week always deals the same three challenges
       without any of them being written into the save. */
    function pick(week) {

        var pool = CATALOG.slice();
        var out = [];

        for (var i = 0; i < HOW_MANY && pool.length; i++) {

            /* A fresh hash per draw rather than one seed walked forward, so the
               three picks do not inherit each other's correlation. */
            out.push(pool.splice(hash(week * 31 + i) % pool.length, 1)[0]);

        }

        /* Stable order within the week, so the panel does not reshuffle itself
           between renders. */
        return out.sort(function (a, b) {
            return a.id.localeCompare(b.id);
        });

    }

    /* One challenge's standing. Progress can only ever be what has happened
       since the baseline, so a metric that somehow went backwards reads as zero
       rather than as a negative bar. */
    function standing(entry, metrics, baseline, claimed) {

        var now = Number((metrics || {})[entry.metric]) || 0;
        var was = Number((baseline || {})[entry.metric]) || 0;
        var done = Math.max(0, now - was);

        return {
            id: entry.id,
            label: entry.label,
            reward: entry.reward,
            target: entry.target,
            done: Math.min(done, entry.target),
            raw: done,
            complete: done >= entry.target,
            claimed: (claimed || []).indexOf(entry.id) !== -1
        };

    }

    function board(week, metrics, baseline, claimed) {

        return pick(week).map(function (entry) {
            return standing(entry, metrics, baseline, claimed);
        });

    }

    /* The one place claimability is decided, so a button and its handler cannot
       disagree. */
    function claimable(week, id, metrics, baseline, claimed) {

        var row = board(week, metrics, baseline, claimed).filter(function (r) {
            return r.id === id;
        })[0];

        return row && row.complete && !row.claimed ? row : null;

    }

    function readyCount(week, metrics, baseline, claimed) {

        return board(week, metrics, baseline, claimed).filter(function (r) {
            return r.complete && !r.claimed;
        }).length;

    }

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

    /* Coarse on purpose. To the hour is enough to plan around, and a ticking
       second counter would need a timer running for a deadline nobody is racing
       to the minute. */
    function remaining(week, now) {

        var left = endOf(week) - now;

        if (left <= 0) {
            return "resetting";
        }

        var hours = Math.floor(left / (60 * 60 * 1000));

        if (hours >= 24) {
            var days = Math.floor(hours / 24);
            return days + (days === 1 ? " day left" : " days left");
        }

        return hours + (hours === 1 ? " hour left" : " hours left");

    }

    /* True when the week is inside its last day. The clock is the only thing in
       the panel that changes on its own, so it is the only thing allowed to
       raise its voice — and only once the deadline is close enough to act on. */
    function urgent(week, now) {

        var left = endOf(week) - now;

        return left > 0 && left <= 24 * 60 * 60 * 1000;

    }

    /* How many ticks to draw, and how many of them are lit.
     *
     * Every metric behind a challenge counts discrete events — packs opened,
     * trials escaped, cards sold — so the track counts in the same units rather
     * than smearing them into a percentage. Ten is the cap because past that the
     * ticks are thinner than the gaps between them; a target of fifteen draws
     * ten ticks worth one and a half each, which still reads as "most of the
     * way" without pretending to be countable.
     *
     * The two clamps are the point of the function. Rounding alone would light
     * the last tick at 14 of 15 and light none at 1 of 15, so a full track would
     * stop meaning "done" and an empty one would stop meaning "not started" —
     * the two readings the track exists to give.
     */
    function segments(row) {

        var cap = Math.min(row.target || 1, 10);
        var lit;

        if (row.complete) {
            return { cap: cap, lit: cap };
        }

        lit = row.target ? Math.round((row.done / row.target) * cap) : 0;

        if (lit >= cap) {
            lit = cap - 1;
        }

        if (lit === 0 && row.done > 0) {
            lit = 1;
        }

        return { cap: cap, lit: lit };

    }

    function trackMarkup(row) {

        var seg = segments(row);
        var out = "";

        for (var i = 0; i < seg.cap; i++) {
            out += '<i' + (i < seg.lit ? ' class="is-on"' : "") + "></i>";
        }

        /* Decorative: the fraction beside it already says the same thing in
           text, and a screen reader counting ten empty ticks helps nobody. */
        return '<div class="plWk__track" aria-hidden="true">' + out + "</div>";

    }

    function icon(name, size) {

        return (window.PL && PL.icons) ? PL.icons.get(name, size) : "";

    }

    /* The prize, written the way every other payout in the app is written: the
       number and the Bloodpoint mark, never a bare figure. */
    function price(amount, size) {

        return amount + icon("blood", size || 12);

    }

    function rowMarkup(row) {

        var action = row.claimed
            ? '<span class="plWk__done">' + icon("check", 13) + "Claimed</span>"
            : row.complete
                ? '<button type="button" class="plWk__claim" data-weekly="' +
                    escapeHtml(row.id) + '">Claim ' + price(row.reward, 13) + "</button>"
                : '<span class="plWk__reward">' + price(row.reward) + "</span>";

        return '<div class="plWk' +
                (row.claimed ? " plWk--claimed" : row.complete ? " plWk--ready" : "") + '">' +
                '<span class="plWk__plate">' + icon(ICONS[row.id] || "goal", 21) + "</span>" +
                '<div class="plWk__body">' +
                    '<div class="plWk__line">' +
                        '<span class="plWk__label">' + escapeHtml(row.label) + "</span>" +
                        '<span class="plWk__count">' + row.done + " / " + row.target + "</span>" +
                    "</div>" +
                    trackMarkup(row) +
                "</div>" +
                '<div class="plWk__act">' + action + "</div>" +
            "</div>";

    }

    /* The strip above the rows. It answers "which week, how long left, how much
       of it have I taken" before a single challenge is read — which is the whole
       question the panel is opened to ask.

       The week number is on show rather than kept internal: the rotation is
       derived from it, so a player comparing sets with someone else has the one
       number that explains why they differ. */
    function headMarkup(week, rows, now) {

        var claimed = rows.filter(function (r) { return r.claimed; }).length;
        var pct = rows.length ? (claimed / rows.length) * 100 : 0;

        return '<div class="plWk__head">' +
                '<div class="plWk__headTop">' +
                    '<span class="plWk__stamp">Week ' + week + "</span>" +
                    '<span class="plWk__clock' +
                        (urgent(week, now) ? " plWk__clock--soon" : "") + '">' +
                        escapeHtml(remaining(week, now)) +
                    "</span>" +
                "</div>" +
                '<div class="plWk__headBar">' +
                    '<div class="plWk__weekBar' + (claimed === rows.length ? " is-full" : "") +
                        '"><i style="width:' + pct + '%"></i></div>' +
                    '<span class="plWk__tally">' + claimed + " of " + rows.length +
                        " claimed</span>" +
                "</div>" +
            "</div>";

    }

    function render(week, metrics, baseline, claimed, now) {

        var rows = board(week, metrics, baseline, claimed);
        var left = rows.filter(function (r) { return !r.claimed; }).length;

        return headMarkup(week, rows, now) +
            (left
                ? '<p class="plWk__intro">Progress counts from the moment the ' +
                  "week turned over. Three new challenges arrive with the next one.</p>"
                : '<p class="plWk__intro plWk__intro--done">' + icon("check", 14) +
                  "Every challenge claimed. A fresh set arrives when the week turns.</p>") +
            rows.map(rowMarkup).join("");

    }

    return {
        weekMs: WEEK_MS,
        catalog: CATALOG,
        howMany: HOW_MANY,
        weekOf: weekOf,
        endOf: endOf,
        pick: pick,
        board: board,
        claimable: claimable,
        readyCount: readyCount,
        remaining: remaining,
        render: render
    };

}());
