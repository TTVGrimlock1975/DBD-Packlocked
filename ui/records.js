/* Per-perk records.
 *
 * The game already counts escapes and sacrifices. This splits that number by
 * what you were actually carrying, which is a thing no other Dead by Daylight
 * tool can tell you: it is not "how good is Dead Hard", it is how you have done
 * with the Dead Hard you happened to pull.
 *
 * Kept as a running tally rather than derived from the event log. The log is
 * capped at two hundred entries, so a record read out of it would quietly start
 * forgetting your earliest trials and the rates would drift upward forever.
 *
 * Pure. Takes the tally and a loadout snapshot, returns a new tally.
 */

window.PL = window.PL || {};

PL.records = (function () {

    /* Below this a rate is noise -- one trial with a perk reads as 0% or 100%
       and neither means anything. The row still appears, because "played twice"
       is itself worth seeing, but the rate is withheld until it can be trusted. */
    var MIN_SAMPLE = 5;

    /* Folds one finished trial into the tally. Returns a new object rather than
       mutating, so a caller cannot half-apply a trial and leave the record in a
       state no sequence of matches could have produced. */
    function fold(tally, snapshot, result) {

        var next = {};

        Object.keys(tally || {}).forEach(function (name) {
            next[name] = {
                played: tally[name].played,
                escaped: tally[name].escaped
            };
        });

        var perks = (snapshot && snapshot.perks) || [];
        var escaped = result === "escaped";

        perks.forEach(function (perk) {

            var row = next[perk.name] ||
                (next[perk.name] = { played: 0, escaped: 0 });

            row.played++;

            if (escaped) {
                row.escaped++;
            }

        });

        return next;

    }

    function rate(row) {

        return row.played ? (row.escaped / row.played) * 100 : 0;

    }

    /* Most-played first. The question this table answers is "how am I doing
       with the perks I actually run", and sorting by rate would put a single
       lucky trial above two hundred honest ones. */
    function rows(tally) {

        return Object.keys(tally || {})
            .map(function (name) {
                var row = tally[name];
                return {
                    name: name,
                    played: row.played,
                    escaped: row.escaped,
                    rate: rate(row),
                    /* Enough trials for the percentage to mean something. */
                    trusted: row.played >= MIN_SAMPLE
                };
            })
            .sort(function (a, b) {
                if (a.played !== b.played) {
                    return b.played - a.played;
                }
                return a.name.localeCompare(b.name);
            });

    }

    /* The best and worst perks you have real evidence about. Undefined until
       something clears the sample floor, which is the honest answer early on. */
    function extremes(tally) {

        var trusted = rows(tally).filter(function (r) { return r.trusted; });

        if (trusted.length < 2) {
            return null;
        }

        var byRate = trusted.slice().sort(function (a, b) { return b.rate - a.rate; });

        return { best: byRate[0], worst: byRate[byRate.length - 1] };

    }

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

    function rowMarkup(row) {

        return '<div class="plRec">' +
                '<span class="plRec__name">' + escapeHtml(row.name) + "</span>" +
                '<span class="plRec__bar">' +
                    '<i style="width:' + row.rate.toFixed(1) + '%"></i>' +
                "</span>" +
                '<span class="plRec__rate' + (row.trusted ? "" : " plRec__rate--thin") + '">' +
                    (row.trusted ? row.rate.toFixed(0) + "%" : "&mdash;") +
                "</span>" +
                '<span class="plRec__n">' + row.escaped + "/" + row.played + "</span>" +
            "</div>";

    }

    function render(tally) {

        var all = rows(tally);

        if (!all.length) {
            return '<h3 class="statsHeading">Perk Records</h3>' +
                '<p class="plRec__empty">Record a trial with perks equipped and ' +
                "they will start keeping score here.</p>";
        }

        var top = extremes(tally);

        return '<h3 class="statsHeading">Perk Records</h3>' +
            (top
                ? '<p class="plRec__lead">Best with <b>' + escapeHtml(top.best.name) +
                    "</b> at " + top.best.rate.toFixed(0) + "%, worst with <b>" +
                    escapeHtml(top.worst.name) + "</b> at " +
                    top.worst.rate.toFixed(0) + "%.</p>"
                : '<p class="plRec__lead">Rates appear once a perk has ' +
                    MIN_SAMPLE + " trials behind it.</p>") +
            '<div class="plRecs">' +
                all.map(rowMarkup).join("") +
            "</div>";

    }

    return {
        minSample: MIN_SAMPLE,
        fold: fold,
        rows: rows,
        extremes: extremes,
        render: render
    };

}());
