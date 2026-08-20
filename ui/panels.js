/* Sidebar, tab strip, pack shelf and pull log.
 *
 * These read the game state that lives in script.js. Classic scripts share one
 * global scope, so the references resolve without passing state around.
 */

window.PL = window.PL || {};

PL.panels = (function () {

    /* A gold ramp rather than three unrelated hues. Rarity is the only
       saturated colour in the interface, so these step down in strength
       instead of competing with the cards. */
    var SPLIT = [
        { key: "Perk", label: "Perks", pool: "perks", color: "#C8A44B" },
        { key: "Item", label: "Items", pool: "items", color: "#8F7331" },
        { key: "Addon", label: "Add-ons", pool: "addons", color: "#5E4C21" }
    ];

    /* Costs and counts must match what openPack and openItemPack actually do,
       or the shelf advertises a pack the game does not sell. */
    var PACKS = {
        basicPack: { tier: "Basic", cost: 5, count: 3, fine: "Perks · Sealed" },
        entityPack: { tier: "Entity", cost: 10, count: 2, fine: "Perks · No commons" },
        itemPack: { tier: "Item", cost: 5, count: 2, fine: "Items & add-ons" }
    };

    function el(id) {
        return document.getElementById(id);
    }

    function ownedTotal() {

        return inventory.reduce(function (n, c) {
            return n + (c.amount || 1);
        }, 0);

    }

    function spareTotal() {

        return inventory.reduce(function (n, c) {
            return n + Math.max(0, (c.amount || 1) - 1);
        }, 0);

    }

    /* Owning every card is the point of the game, so progress leads the panel. */
    function sidebar() {

        var found = 0;
        var total = 0;
        var rows = "";

        SPLIT.forEach(function (t) {

            var pool = gameData[t.pool] || [];

            var owned = pool.filter(function (card) {
                return collection.indexOf(card.name) !== -1;
            }).length;

            found += owned;
            total += pool.length;

            var pct = pool.length ? (owned / pool.length) * 100 : 0;

            rows += '<div class="plSplit__row">' +
                '<span class="plSplit__k">' + t.label + "</span>" +
                '<span class="plSplit__bar">' +
                    '<i style="width:' + pct + "%;background:" + t.color + '"></i>' +
                "</span>" +
                '<span class="plSplit__n">' + owned + "/" + pool.length + "</span>" +
            "</div>";

        });

        var pct = total ? Math.round((found / total) * 100) : 0;

        el("collectionFound").textContent = found;
        el("collectionTotal").textContent = "/ " + total;
        el("collectionPct").textContent = pct + "%";
        el("collectionBar").style.width = pct + "%";
        el("collectionSplit").innerHTML = rows;

        var spares = spareTotal();

        el("plMinor").innerHTML =
            '<div class="plMinor__c">' +
                '<span class="plMinor__k">Cards Owned</span>' +
                '<span class="plMinor__v">' + ownedTotal() + "</span>" +
                '<span class="plMinor__sub">' +
                    (spares > 0 ? "<b>" + spares + "</b> spare to sell" : "No spares") +
                "</span>" +
            "</div>" +
            '<div class="plMinor__c' + (stats.foilsPulled > 0 ? " plMinor__c--foil" : "") + '">' +
                '<span class="plMinor__k">Foils Pulled</span>' +
                '<span class="plMinor__v">' + (stats.foilsPulled || 0) + "</span>" +
                '<span class="plMinor__sub">1 in 200 a card</span>' +
            "</div>";

        tabCounts();

    }

    /* The drop rates, drawn from the same table getPackRarity rolls against,
       so the bar cannot claim odds the pack does not use.

       PACK_ODDS is declared in script.js, which loads after this file. That is
       fine because nothing calls this until render time, long after both have
       run — but the guard means a missing table draws nothing instead of
       throwing and taking the whole shelf with it.

       The percentages live in the title rather than on the face: at 178px wide
       four labels would be unreadable, and the split is legible from the bar
       alone. */
    /* The true rates for a tier, Special included.

       PACK_ODDS totals 100 on its own, but openPack draws a rarity and then
       replaces it outright on the Joker roll — so Special is not a slice of
       that 100, it sits on top of it and the rest share the remainder. Showing
       the table's raw numbers beside a 1% Special would over-state every other
       rarity, so they are scaled here. */
    function oddsFor(tier) {

        var table = (typeof PACK_ODDS !== "undefined") ? PACK_ODDS[tier] : null;

        if (!table || !table.length) {
            return null;
        }

       var special = 0;

if (
    typeof PACK_SPECIAL_CHANCE !== "undefined" &&
    PACK_SPECIAL_CHANCE[tier]
) {

    var specialOdds = PACK_SPECIAL_CHANCE[tier];

    Object.keys(specialOdds).forEach(function (key) {

        special += specialOdds[key] * 100;

    });

}

        var scale = (100 - special) / 100;

        var rows = table.map(function (entry) {
            return { rarity: entry[0], pct: entry[1] * scale };
        });

        if (special > 0) {
            rows.push({ rarity: "Special", pct: special });
        }

        return rows;

    }

    /* One decimal only where it earns one, so 2% does not render as 2.0%. */
    function pctText(n) {

        var rounded = Math.round(n * 10) / 10;

        return rounded + "%";

    }

    /* The bar, plus the panel that slides up over it on hover.

       The panel lives inside .plWrap__body deliberately: both .plWrap and the
       body are overflow:hidden, so anything positioned outside the pack would
       be clipped rather than float above it. Sliding up from under the bottom
       edge turns that clipping into the effect. */
    function oddsBar(tier) {

        var rows = oddsFor(tier);

        if (!rows) {
            return "";
        }

        var segments = rows.map(function (row) {

            /* flex-grow carries the weight, so the segments always fill the
               bar exactly and no width has to be worked out here. */
            return '<i class="plOdds__seg plOdds__seg--' +
                row.rarity.toLowerCase() +
                '" style="flex-grow:' + row.pct + '"></i>';

        }).join("");

        /* Rarest first: the number anyone actually came to read is the one at
           the bottom of the table, so it leads. */
        var listed = rows.slice().reverse().map(function (row) {

            return '<span class="plOdds__row">' +
                '<i class="plOdds__dot plOdds__dot--' + row.rarity.toLowerCase() + '"></i>' +
                '<span class="plOdds__name">' + row.rarity + "</span>" +
                '<b class="plOdds__pct">' + pctText(row.pct) + "</b>" +
            "</span>";

        }).join("");

        return '<span class="plOdds">' + segments + "</span>" +
            '<span class="plOdds__pop">' +
                '<span class="plOdds__head">Drop rates</span>' +
                listed +
            "</span>";

    }

    /* The sealed wrapper. Shared by every pack on the shelf so the one you pick
       is visibly the one that tears. */
    function wrapper(tier, count, fine) {

        return '<span class="plWrap__crimp plWrap__crimp--t"><i class="plWrap__peg"></i></span>' +
            '<span class="plWrap__notch"></span>' +
            '<span class="plWrap__body">' +
                '<span class="plWrap__mark">Packlocked</span>' +
                '<span class="plWrap__tier">' + tier + "</span>" +
                '<span class="plWrap__rule"></span>' +
                '<span class="plWrap__burst">' + count +
                    "<small>" + (count === 1 ? "card" : "cards") + "</small>" +
                "</span>" +
                '<span class="plWrap__fine">' + fine + "</span>" +
                oddsBar(tier) +
            "</span>" +
            '<span class="plWrap__crimp plWrap__crimp--b"></span>';

    }

    function shelf() {

        Object.keys(PACKS).forEach(function (id) {

            var pack = PACKS[id];
            var button = el(id);

            if (!button) return;

            var afford = tokens >= pack.cost;

            button.innerHTML = wrapper(pack.tier, pack.count, pack.fine);
            button.disabled = !afford;
            button.title = afford
                ? "Open a " + pack.tier + " pack"
                : "Not enough Blood Tokens";

            var buy = button.parentNode.querySelector('[data-buy="' + id + '"]');

            if (!buy) {

                buy = document.createElement("div");
                buy.className = "plPick__buy";
                buy.setAttribute("data-buy", id);
                button.parentNode.insertBefore(buy, button.nextSibling);

            }

            buy.innerHTML =
                '<span class="plPick__cost">' + pack.cost + PL.icons.get("blood", 13) + "</span>" +
                '<span class="plPick__state">' +
                    (afford ? "Ready" : "Short " + (pack.cost - tokens)) +
                "</span>";

        });

    }

    function tabCounts() {

        var invCount = el("tabInvCount");
        var shopCount = el("tabShopCount");
        var pullCount = el("tabPullCount");

        if (invCount) invCount.textContent = ownedTotal() + " cards";

        if (shopCount) {

            var left = dailyShop.filter(function (c) {
                return !c.purchased;
            }).length;

            shopCount.textContent = left + " for sale";

        }

        if (pullCount) pullCount.textContent = eventLog.length + " logged";

    }

    function setTab(name) {

        var tabs = document.querySelectorAll(".plTab");

        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle("active", tabs[i].dataset.tab === name);
        }

        var panels = document.querySelectorAll(".plTabPanel");

        for (var j = 0; j < panels.length; j++) {
            panels[j].classList.toggle("hidden", panels[j].dataset.panel !== name);
        }

    }

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

    /* Relative inside today, a clock time before it. The day rules carry the
       date, so a line only has to say where in its own day it sat. */
    function stamp(at) {

        var then = new Date(at);
        var now = new Date();

        if (dayOf(then) !== dayOf(now)) {

            return pad(then.getHours()) + ":" + pad(then.getMinutes());

        }

        var s = Math.max(0, Math.floor((now.getTime() - at) / 1000));

        if (s < 60) {
            return "now";
        }

        var m = Math.floor(s / 60);

        return m < 60
            ? m + "m"
            : Math.floor(m / 60) + "h";

    }

    function pad(n) {
        return n < 10 ? "0" + n : String(n);
    }

    /* Compared by calendar parts rather than by subtracting a day, which lands
       an hour out either side of a clock change. */
    function dayOf(date) {
        return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
    }

    var MONTHS = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    function dayLabel(at) {

        var then = new Date(at);
        var today = new Date();

        if (dayOf(then) === dayOf(today)) {
            return "today";
        }

        var yesterday = new Date(today.getTime());
        yesterday.setDate(today.getDate() - 1);

        if (dayOf(then) === dayOf(yesterday)) {
            return "yesterday";
        }

        return then.getDate() + " " + MONTHS[then.getMonth()];

    }

    /* A foil is a property of the card, not of the pack it arrived in, so it
       marks the name rather than taking a column of its own. */
    function foilMark(on) {
        return on ? ' <i class="plLog__foil">\u2726</i>' : "";
    }

    function signed(n) {
        return (n >= 0 ? "+" : "\u2212") + Math.abs(n);
    }

    /* One formatter per kind, and nothing outside this table knows what a kind
       is: adding one means a logEvent call at the site and an entry here.

       Each returns the three variable columns — what it happened to, the
       number or context behind it, and a rarity if the thing has one. An entry
       written before the log covered anything but packs carries no kind at
       all, which is what the fallback below reads. */
    var KINDS = {

        pack: function (r) {

            var meta = r.pack + " \u00D7" + r.count;

            return {
                tag: "pack",
                card: r.bestName,
                main: escapeHtml(r.bestName) + foilMark(r.foil),
                plain: r.bestName,
                meta: r.cost ? meta + " \u00B7 " + signed(-r.cost) : meta,
                rarity: r.bestRarity
            };

        },

        buy: function (r) {

            return {
                tag: "buy",
                card: r.name,
                main: escapeHtml(r.name),
                plain: r.name,
                meta: signed(r.amount),
                rarity: r.rarity
            };

        },

        sell: function (r) {

            return {
                tag: "sell",
                card: r.name,
                main: escapeHtml(r.name) + foilMark(r.foil),
                plain: r.name,
                meta: signed(r.amount),
                rarity: r.rarity
            };

        },

        king: function (r) {

            return {
                tag: "king",
                card: r.name,
                main: escapeHtml(r.from) + " \u2192 " +
                      escapeHtml(r.name) + foilMark(r.foil),
                plain: r.from + " to " + r.name,
                meta: "upgrade",
                rarity: r.rarity
            };

        },

        queen: function (r) {

            return {
                tag: "queen",
                card: r.name,
                main: escapeHtml(r.name),
                plain: r.name,
                meta: "borrowed",
                rarity: r.rarity
            };

        },

        ace: function (r) {

            return {
                tag: "ace",
                card: r.name,
                main: escapeHtml(r.name) + foilMark(r.foil),
                plain: r.name,
                meta: "loadout \u00B7 " + r.count + " cards",
                rarity: r.rarity
            };

        },

        trial: function (r) {

            var meta;

            if (r.result === "Escaped") {

                meta = r.count + " kept";

            } else if (r.joker) {

                meta = "Joker saved " + r.count;

            } else {

                meta = r.count + " lost";

            }

            return {
                tag: "trial",
                main: escapeHtml(r.result),
                plain: r.result,
                meta: meta,
                rarity: null
            };

        },

        token: function (r) {

            var reasons = (r.reasons || []).join(", ");

            if (r.more) {

                reasons += " +" + r.more + " more";

            }

            return {
                tag: "earn",
                main: escapeHtml(reasons || "Reward"),
                plain: reasons,
                meta: signed(r.amount),
                rarity: null
            };

        },

        xfer: function (r) {

            return {
                tag: "xfer",
                main: "Imported",
                plain: "Imported",
                meta: (r.from ? "save " + r.from + " " : "") +
                      "\u2192 save " + r.slot,
                rarity: null
            };

        }

    };

    function line(r, index) {

        var shape = (KINDS[r.kind] || KINDS.pack)(r);
        var rarity = shape.rarity ? String(shape.rarity) : "";

        /* Only the top two rarities take weight. Marking every line would
           leave nothing marked, and a Legendary is the one entry worth
           spotting from across the panel. */
        var lift =
            rarity === "Legendary" || rarity === "Epic"
                ? " plLog__line--lift " + rarity.toLowerCase()
                : "";

        /* The same attribute the cards use, so hovering a name in the log
           opens the same description panel. Never both at once: the browser's
           own tooltip would draw over ours, which is the rule ui/card.js
           already follows. */
        var described =
            shape.card &&
            typeof perkDescriptions !== "undefined" &&
            !!perkDescriptions[shape.card];

        var label;

        /* A pack opens its own contents instead, because what else was in it
           is the question the line raises. Packs logged before the contents
           were recorded have none, and fall back to the description of the
           card they are named by. */
        if (r.cards && r.cards.length) {

            label = 'data-pack="' + index + '"';

        } else if (described) {

            label = 'data-perk="' + escapeHtml(shape.card) + '"';

        } else {

            label = 'title="' + escapeHtml(shape.plain) + '"';

        }

        return '<div class="plLog__line' + lift + '">' +
            '<span class="plLog__when">' + stamp(r.at) + "</span>" +
            '<span class="plLog__kind">' + shape.tag + "</span>" +
            '<span class="plLog__main" ' + label + ">" + shape.main + "</span>" +
            '<span class="plLog__meta">' + shape.meta + "</span>" +
            '<span class="plLog__rar ' + rarity.toLowerCase() + '">' +
                rarity +
            "</span>" +
        "</div>";

    }

    /* The log is read newest first, so the tab is repainted on a timer while
       it is open. Without it "now" stays "now" until the next pull, which is
       exactly the stretch where the reader is watching it. */
    var ticking = null;

    function tick() {

        if (ticking) {
            return;
        }

        ticking = setInterval(function () {

            var panel = document.querySelector('.plTabPanel[data-panel="pulls"]');

            if (panel && !panel.classList.contains("hidden")) {

                pulls();

            }

        }, 60000);

    }

    /* An activity log, so it reads as one: fixed columns, newest first, a rule
       between days, and a live caret at the end. */
    function pulls() {

        var body;

        if (eventLog.length === 0) {

            body = '<p class="plLog__idle">' +
                '<span class="plLog__prompt">&gt;</span> awaiting first pack' +
                '<i class="plLog__caret"></i>' +
            "</p>";

        } else {

            var day = null;

            body = eventLog.map(function (r, i) {

                var label = dayLabel(r.at);
                var rule = "";

                if (label !== day) {

                    day = label;

                    rule = '<div class="plLog__day"><span>' +
                        label + "</span></div>";

                }

                return rule + line(r, i);

            }).join("") +
            '<p class="plLog__idle">' +
                '<span class="plLog__prompt">&gt;</span>' +
                '<i class="plLog__caret"></i>' +
            "</p>";

        }

        el("pullLog").innerHTML =
            '<div class="plLog">' +
                '<div class="plLog__bar">' +
                    "<span>activity.log</span>" +
                    "<span>" + eventLog.length +
                        (eventLog.length === 1 ? " entry" : " entries") +
                    "</span>" +
                "</div>" +
                '<div class="plLog__body">' + body + "</div>" +
            "</div>";

        tick();

    }

    return {
        sidebar: sidebar,
        shelf: shelf,
        wrapper: wrapper,
        setTab: setTab,
        tabCounts: tabCounts,
        pulls: pulls
    };

}());
