/* Character sets.
 *
 * A percentage is a poor thing to chase. "40% collected" is not a goal anyone
 * can picture, and it never gets closer in a way that feels like anything.
 * DBD players do not think in percentages either. They think in characters,
 * and every survivor in the game teaches exactly three perks.
 *
 * So the collection gets a second reading of itself: fifty-four small sets of
 * three, each one nameable and each one finishable. "One more for Feng Min" is
 * a goal. "40%" is a number.
 *
 * Two categories sit outside the roster and both are real rather than gaps.
 * The sixteen General perks belong to every survivor from the start, so they
 * belong to nobody here. The four Specials are not perks in any ordinary sense.
 * Both are shown, neither can be completed, and the headline counts only the
 * sets that can.
 *
 * Pure: everything takes the collection as an argument and returns data or
 * markup, so none of it needs to know how a save is stored.
 */

window.PL = window.PL || {};

PL.characters = (function () {

    /* Enough to forge better than a Common, so finishing a set moves you
       measurably toward the next card you actually want. Paid in shards rather
       than tokens deliberately: a set is a collection achievement, and shards
       are the collection's own currency. */
    var SET_REWARD = 15;

    function has(owned, name) {

        return (owned || []).indexOf(name) !== -1;

    }

    /* Referenced bare, not through window. data/characters.js declares its
       table with const, and a top-level const in a classic script lands in the
       global lexical environment rather than on window -- so window.characterData
       is undefined even when the file has loaded. gameData is read the same way
       everywhere else in this project for the same reason. */
    function roster() {

        return (typeof characterData !== "undefined" && characterData.roster) || [];

    }

    function categories() {

        return typeof characterData !== "undefined"
            ? characterData
            : { general: [], special: [] };

    }

    /* One entry per survivor, with the perks split into the ones you have and
       the ones you do not. */
    function sets(owned) {

        return roster().map(function (entry) {

            var found = entry.perks.filter(function (p) {
                return has(owned, p);
            });

            return {
                name: entry.name,
                portrait: entry.portrait || null,
                perks: entry.perks,
                found: found.length,
                total: entry.perks.length,
                /* Only a full three counts. A survivor whose third perk this
                   game does not carry can never complete, and pretending
                   two-of-two is a finished set would put a reward behind a
                   door with nothing on the other side. */
                complete: found.length === entry.perks.length && entry.perks.length === 3
            };

        });

    }

    function completable() {

        return roster().filter(function (e) { return e.perks.length === 3; }).length;

    }

    function completeCount(owned) {

        return sets(owned).filter(function (s) { return s.complete; }).length;

    }

    /* Which sets finished since the last time rewards were handed out. Compared
       against a list of names rather than a count, so a set cannot pay twice
       and a save that gains a perk out of order still settles correctly. */
    function newlyComplete(owned, granted) {

        var already = granted || [];

        return sets(owned)
            .filter(function (s) {
                return s.complete && already.indexOf(s.name) === -1;
            })
            .map(function (s) { return s.name; });

    }

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

    /* Closest to done first, finished last. The useful question a list like
       this answers is "what can I finish next", and alphabetical buries that
       under fifty rows of nothing in particular. */
    function ordered(owned) {

        return sets(owned).slice().sort(function (a, b) {

            if (a.complete !== b.complete) {
                return a.complete ? 1 : -1;
            }

            if (a.found !== b.found) {
                return b.found - a.found;
            }

            return a.name.localeCompare(b.name);

        });

    }

    /* name → card, for the artwork. Built once on first use and then kept,
       the same lazy index ui/card.js keeps for the same reason: this runs over
       fifty-four rows of three perks and a scan of the pool per perk would be
       a hundred and sixty passes for a picture. */
    var poolIndex = null;

    function fromPool(name) {

        if (!poolIndex) {

            poolIndex = {};

            if (typeof gameData !== "undefined") {

                (gameData.perks || []).forEach(function (entry) {
                    poolIndex[entry.name] = entry;
                });

            }

        }

        return poolIndex[name] || null;

    }

    /* One perk, as its own icon.
     *
     * The name used to be the whole chip. Three names to a row and fifty-four
     * rows is a wall of small text that has to be read word by word, when the
     * icons are the thing a player already recognises at a glance. They are
     * what the game itself puts in the loadout.
     *
     * Owned perks carry data-perk, which is what ui/tooltip.js binds to, so
     * the full description is a hover away and nothing is lost by dropping the
     * label. A missing perk gets its name in a plain title instead: ui/card.js
     * holds that an undiscovered card must not give its effect away, and a set
     * you have not finished is exactly that. The name is already on show here,
     * so only the effect stays behind. */
    function pipMarkup(perk, isOwned) {

        var card = fromPool(perk);
        var described =
            isOwned &&
            typeof perkDescriptions !== "undefined" &&
            !!perkDescriptions[perk];

        /* The card's own gem, markup and all. Dead by Daylight bakes a violet
           diamond into every perk icon it ships, so the raw art says "Very
           Rare" no matter what this game rates the card -- and draining that
           violet and re-tinting it in the rarity colour is exactly what
           .plCard__img and .plCard__tint already do on the card face. Reused
           rather than reimplemented: there should be one answer to what colour
           a perk is, not two that can drift apart. */
        /* Divs, exactly as ui/card.js writes them. Neither .plCard__gem nor
           .plCard__clip sets a display of its own, on a card they are block
           because they are divs, and nothing in their rules says so. Written
           as spans in here they were inline, their width and height were
           ignored, and the diamond collapsed. */
        var art = card && card.icon
            ? '<div class="plCard__gem plCard__gem--diamond">' +
                    '<div class="plCard__clip">' +
                        '<img class="plCard__img" src="' + escapeHtml(card.icon) +
                            '" alt="" loading="lazy">' +
                        '<span class="plCard__tint"></span>' +
                    "</div>" +
              "</div>"
            : '<div class="plSet__bare" aria-hidden="true"></div>';

        /* Rarity rides on the pip, which is where --c is set, exactly as it
           rides on .plCard for a full card face. */
        var rarity = card
            ? " " + String(card.rarity || "common").toLowerCase()
            : "";

        return '<div class="plSet__pip' + rarity +
            (isOwned ? " plSet__pip--on" : "") + '" ' +
            (described
                ? 'data-perk="' + escapeHtml(perk) + '"'
                : 'title="' + escapeHtml(perk) + '"') +
            ">" + art +
                '<span class="srOnly">' + escapeHtml(perk) +
                    (isOwned ? "" : " · not collected") +
                "</span>" +
            "</div>";

    }

    function pipsMarkup(names, owned) {

        return '<div class="plSet__pips">' +
            names.map(function (perk) {
                return pipMarkup(perk, has(owned, perk));
            }).join("") +
        "</div>";

    }

    /* Initials, for a survivor the source has no picture of. Two letters off a
       merged name gives the pair rather than one of them. */
    function initials(name) {

        return String(name)
            .split(/[\s&]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(function (word) { return word.charAt(0); })
            .join("");

    }

    function faceMarkup(set) {

        return set.portrait
            ? '<img class="plSet__face" src="' + escapeHtml(set.portrait) +
                '" alt="" loading="lazy">'
            : '<span class="plSet__face plSet__face--none" aria-hidden="true">' +
                escapeHtml(initials(set.name)) +
              "</span>";

    }

    function rowMarkup(set, owned) {

        return '<div class="plSet' + (set.complete ? " plSet--done" : "") + '">' +
                faceMarkup(set) +
                '<div class="plSet__head">' +
                    '<span class="plSet__name">' + escapeHtml(set.name) + "</span>" +
                    '<span class="plSet__count">' +
                        (set.complete
                            ? PL.icons.get("check", 13)
                            : set.found + "/" + set.total) +
                    "</span>" +
                "</div>" +
                pipsMarkup(set.perks, owned) +
            "</div>";

    }

    /* The two categories that are not sets. Shown so the roster's numbers add
       up against the collection's, rather than leaving the player to wonder
       where the missing twenty perks went.
     *
     * They get the same icons as a survivor row. There is nothing to complete
     * here, but "which of the sixteen do I not have" is still a question, and
     * it was one this card used to answer with a bare fraction. */
    function asideMarkup(names, title, blurb, owned) {

        if (!names || !names.length) {
            return "";
        }

        var found = names.filter(function (n) { return has(owned, n); }).length;

        return '<div class="plSet plSet--aside">' +
                '<div class="plSet__head">' +
                    '<span class="plSet__name">' + escapeHtml(title) + "</span>" +
                    '<span class="plSet__count">' + found + "/" + names.length + "</span>" +
                "</div>" +
                '<p class="plSet__blurb">' + escapeHtml(blurb) + "</p>" +
                pipsMarkup(names, owned) +
            "</div>";

    }

    /* The collection's search box is shared, so it has to mean something here
       too. Matching the perk names as well as the survivor's own means looking
       up "Lithe" finds Feng Min, which is the question this tab exists to
       answer in the first place. */
    function matches(set, text) {

        if (!text) {
            return true;
        }

        return set.name.toLowerCase().indexOf(text) !== -1 ||
            set.perks.some(function (p) {
                return p.toLowerCase().indexOf(text) !== -1;
            });

    }

    function render(owned, search) {

        var text = String(search || "").toLowerCase();
        var all = sets(owned);
        var done = all.filter(function (s) { return s.complete; }).length;
        var possible = completable();

        var data = categories();

        var rows = ordered(owned).filter(function (s) {
            return matches(s, text);
        });

        return '<div class="plSets__head">' +
                '<span class="plSets__score">' + done + " / " + possible + "</span>" +
                '<span class="plSets__label">character sets complete</span>' +
                '<span class="plSets__hint">Each survivor teaches three perks · ' +
                    SET_REWARD + " shards a set</span>" +
            "</div>" +
            '<div class="plSets">' +
                (rows.length
                    ? rows.map(function (s) { return rowMarkup(s, owned); }).join("")
                    : '<p class="plSet__blurb">No survivor matches that.</p>') +
                /* The two asides describe the whole pool, not the search, so a
                   filtered list drops them rather than showing counts that no
                   longer answer what was typed. */
                (text ? "" :
                    asideMarkup(data.general, "General",
                        "Taught to every survivor from the start, so they belong to no one.",
                        owned) +
                    asideMarkup(data.special, "Specials",
                        "The Joker, Queen, King and Ace answer to nobody.", owned)) +
            "</div>";

    }

    return {
        reward: SET_REWARD,
        sets: sets,
        completable: completable,
        completeCount: completeCount,
        newlyComplete: newlyComplete,
        ordered: ordered,
        render: render
    };

}());
