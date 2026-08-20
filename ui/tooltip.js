/* Perk descriptions on hover.
 *
 * Two halves with a hard seam between them. `parse` turns the description
 * markup into HTML and touches nothing else — no DOM, no state — so it can be
 * run over all 173 descriptions outside a browser. Everything below it is the
 * hover layer: one panel, one delegated listener, and the arithmetic to keep
 * the panel on screen.
 *
 * The markup is Dead by Daylight's own, as the wiki writes it:
 *
 *   **bold**      a value or a duration
 *   _italic_      flavour, and the closing quote
 *   _**italic**_  the perk naming itself
 *   {Status}      a Status Effect
 *   -  /  --      a clause, and a clause under a clause
 */

window.PL = window.PL || {};

PL.tooltip = (function () {

    /* Dead by Daylight's status colours, pulled toward this app's palette.
       The stylesheet's first rule is that rarity owns the only saturated
       colour in the interface; thirteen effects in the game's own greens and
       reds would set up a second colour system competing with the cards. Muted
       to a common chroma they read as one family — the pill does the work of
       saying "status effect", and the hue only separates one from another.

       Colour and glyph in one table rather than two side by side, which would
       drift the first time one gained an entry the other did not. Six of these
       spellings the current description set never writes; they are kept
       because the set is generated outside this repo and may start writing
       them, and they borrow the glyph of the effect they are a synonym for. */
    var STATUS = {
        "Haste": { c: "#5E8C56", i: "st-haste" },
        "Hindered": { c: "#A8654B", i: "st-hindered" },
        "Exhausted": { c: "#A8823F", i: "st-exhausted" },
        "Endurance": { c: "#4E8A92", i: "st-endurance" },
        "Broken": { c: "#A24A44", i: "st-broken" },
        "Exposed": { c: "#B09141", i: "st-exposed" },
        "Haemorrhage": { c: "#9C5A55", i: "st-haemorrhage" },
        "Hemorrhage": { c: "#9C5A55", i: "st-haemorrhage" },
        "Mangled": { c: "#7D6A5F", i: "st-mangled" },
        "Blindness": { c: "#6B7780", i: "st-blindness" },
        "Oblivious": { c: "#8A6B96", i: "st-oblivious" },
        "Undetectable": { c: "#61707A", i: "st-elusive" },
        "Cursed": { c: "#8A5F96", i: "st-cursed" },
        "Deep Wound": { c: "#A24A44", i: "st-deepwound" },
        "Bleeding": { c: "#9C5A55", i: "st-haemorrhage" },
        "Madness": { c: "#8A6B96", i: "st-cursed" },
        "Incapacitated": { c: "#A8654B", i: "st-hindered" },
        "Blessed": { c: "#5E8C56", i: "st-endurance" },
        "Elusive": { c: "#5C8A83", i: "st-elusive" }
    };

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

    /* Order matters. The self-reference form is a superset of both italic and
       bold, so it has to be offered first or it is eaten a piece at a time. */
    var INLINE = /_\*\*([^*]+)\*\*_|\*\*([^*]+)\*\*|_([^_]+)_|\{([^}]+)\}/g;

    /* Recursive, and separated from the escaping so it can be: the source
       nests these freely — `_The Killer can only be **obsessed** ..._` is an
       italic clause with a bold inside it. A single non-recursive pass emits
       the outer tag and leaves the inner asterisks sitting in the text.

       It terminates because every call strips its own delimiters, so the
       string handed down is always shorter than the one matched. Escaping
       happens once, on the way in, or the nested calls would turn `&amp;`
       into `&amp;amp;`. */
    function markup(escaped) {

        return escaped.replace(
            INLINE,
            function (match, self, bold, italic, status) {

                if (self !== undefined) {
                    return '<i class="plTip__self">' + markup(self) + "</i>";
                }

                if (bold !== undefined) {
                    return '<b class="plTip__v">' + markup(bold) + "</b>";
                }

                if (italic !== undefined) {
                    return '<i class="plTip__i">' + markup(italic) + "</i>";
                }

                /* A status this table does not know still has to read as
                   words. Dropping it would quietly delete part of a sentence,
                   and leaving the braces in would show the markup. */
                if (!STATUS[status]) {
                    return status;
                }

                var effect = STATUS[status];

                /* Asked for rather than required: parse is meant to run over
                   the whole description set outside a browser, and the glyph
                   is the one part of a pill that needs the icon table. Without
                   it the pill is exactly the pill this had before. */
                var glyph = (typeof PL !== "undefined" && PL.icons)
                    ? PL.icons.get(effect.i, 13)
                    : "";

                return '<span class="plTip__st" style="--st:' + effect.c + '">' +
                    glyph + status +
                "</span>";

            }
        );

    }

    function inline(text) {

        return markup(escapeHtml(text));

    }

    /* Line by line rather than paragraph by paragraph. The source is not
       consistent about whether a clause is separated by one newline or two,
       so splitting on blank lines alone left some bullets stranded mid-
       paragraph with their dash showing. */
    function parse(text) {

        var lines = String(text === null || text === undefined ? "" : text).split("\n");

        var out = "";
        var para = [];
        var list = "";

        function flushPara() {

            if (!para.length) {
                return;
            }

            /* Marked up as one string and broken afterwards, rather than a
               line at a time. The flavour quote on 16 of the 173 perks opens
               its italic on one line and closes it on the next, and marking
               up each line alone left both underscores sitting in the text
               with nothing to pair against — "_"You can take a beating." on
               Dead Hard, and fifteen more like it.

               The newline survives markup as ordinary text, so turning it
               into a break here puts the lines back exactly where they were. */
            out += '<p class="plTip__p">' +
                inline(para.join("\n")).replace(/\n/g, "<br>") +
            "</p>";

            para = [];

        }

        function flushList() {

            if (!list) {
                return;
            }

            out += '<ul class="plTip__ul">' + list + "</ul>";
            list = "";

        }

        lines.forEach(function (raw) {

            var line = raw.replace(/\s+$/, "");

            if (!line) {
                flushPara();
                flushList();
                return;
            }

            var bullet = /^(--?)(.*)$/.exec(line);

            if (bullet) {

                flushPara();

                list += '<li class="plTip__li' +
                    (bullet[1] === "--" ? " plTip__li--sub" : "") + '">' +
                    inline(bullet[2]) +
                "</li>";

                return;

            }

            flushList();
            para.push(line);

        });

        flushPara();
        flushList();

        return out;

    }

    // ── The hover layer ───────────────────────────────────────────────────

    /* How long the pointer has to rest on a card. Long enough that dragging
       across a full inventory does not strobe a panel per card, short enough
       that deliberately stopping on one feels immediate. */
    var OPEN_DELAY = 110;

    /* Clear of the card, and clear of the viewport edge. */
    var GAP = 12;
    var MARGIN = 10;

    var panel = null;
    var openFor = null;
    var timer = null;

    function descriptions() {

        return typeof perkDescriptions === "undefined" ? {} : perkDescriptions;

    }

    function build() {

        if (panel) {
            return panel;
        }

        panel = document.createElement("div");
        panel.className = "plTip";
        panel.setAttribute("role", "tooltip");
        panel.hidden = true;

        document.body.appendChild(panel);

        return panel;

    }

    function clamp(value, low, high) {
        return Math.max(low, Math.min(value, high));
    }

    /* Beside a card, under a row.

       A card is about as wide as the panel, so there is a side to sit on and
       the card stays visible either way. A log line is the whole width of its
       panel: neither side fits, and the old fallback centred it, which put it
       squarely on top of the line being pointed at and its neighbours.

       So a row anchors to the pointer instead — the one part of a row-width
       anchor that says where the reader is actually looking — and opens below
       the line, or above it when there is no room below. Measured after the
       content is in, since the height depends on what is in it.

       Asked as "is this a card" rather than "is this wider than the panel":
       narrow the window far enough and a log row is narrower than the panel
       while still being a row, which put the measured version right back on
       top of the line it came from. */
    function place(anchor, point) {

        var rect = anchor.getBoundingClientRect();
        var box = panel.getBoundingClientRect();

        var maxLeft = window.innerWidth - MARGIN - box.width;
        var maxTop = window.innerHeight - MARGIN - box.height;

        var isCard = anchor.classList && anchor.classList.contains("plCard");

        var left;
        var top;

        if (!isCard && point) {

            left = point.x - box.width / 2;

            var below = rect.bottom + GAP;
            var above = rect.top - GAP - box.height;

            if (below <= maxTop) {

                top = below;

            } else if (above >= MARGIN) {

                top = above;

            } else {

                /* Taller than the room on either side, which happens in a
                   short window. Take the roomier side and let the clamp trim
                   it: pinned to an edge it still starts clear of the line,
                   where picking the cramped side would sit on top of it. */
                top = (window.innerHeight - rect.bottom) > rect.top
                    ? maxTop
                    : MARGIN;

            }

        } else {

            left = rect.right + GAP;

            if (left > maxLeft) {

                left = rect.left - GAP - box.width;

            }

            /* Neither side fits — centre it and let the clamp do the rest. */
            if (left < MARGIN) {
                left = (window.innerWidth - box.width) / 2;
            }

            top = rect.top + (rect.height - box.height) / 2;

        }

        panel.style.left = Math.round(clamp(left, MARGIN, Math.max(MARGIN, maxLeft))) + "px";
        panel.style.top = Math.round(clamp(top, MARGIN, Math.max(MARGIN, maxTop))) + "px";

    }

    /* Two things hover now, so the panel takes finished markup and stops
       knowing which one asked. The callers below decide what goes in it. */
    function show(anchor, content, point) {

        build();

        panel.className = "plTip" + (content.wide ? " plTip--wide" : "");

        panel.innerHTML =
            '<div class="plTip__head">' + content.head + "</div>" +
            '<div class="plTip__body">' + content.body + "</div>";

        panel.hidden = false;
        openFor = anchor;

        place(anchor, point);

    }

    /* Everything in the pack, at the size the reveal uses. The art and the
       real name are not stored on the entry: PL.card.render looks both up from
       the pool by name, so a save holds one line per card rather than a second
       copy of the card list. */
    function packContent(index) {

        var log = (typeof eventLog === "undefined") ? [] : eventLog;
        var entry = log[index];

        if (!entry || !entry.cards || !entry.cards.length) {
            return null;
        }

        var cards = entry.cards.map(function (card) {

            return PL.card.render(card, {
                size: "sm",
                foil: card.foil,
                foilVariant: card.foilVariant
            });

        }).join("");

        return {
            wide: true,
            head: escapeHtml(entry.pack) + " \u00B7 " + entry.cards.length +
                (entry.cards.length === 1 ? " card" : " cards"),
            body: '<div class="plTip__cards">' + cards + "</div>"
        };

    }

    function perkContent(name) {

        var text = descriptions()[name];

        return text
            ? { head: escapeHtml(name), body: parse(text) }
            : null;

    }

    function contentFor(anchor) {

        var pack = anchor.getAttribute("data-pack");

        return pack === null
            ? perkContent(anchor.getAttribute("data-perk"))
            : packContent(Number(pack));

    }

    function hide() {

        clearTimeout(timer);
        timer = null;
        openFor = null;

        if (panel) {
            panel.hidden = true;
        }

    }

    function cardFrom(node) {

        if (!node || typeof node.closest !== "function") {
            return null;
        }

        /* Any element, not only a card. The activity log names cards too, and
           a pack line offers the whole handful rather than one name. */
        return node.closest("[data-perk], [data-pack]");

    }

    function wire() {

        /* Hover only. A card already answers a tap with equip or sell, and a
           panel fighting that is worse than no panel. */
        if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) {
            return;
        }

        document.addEventListener("pointerover", function (event) {

            var anchor = cardFrom(event.target);

            if (!anchor || anchor === openFor) {
                return;
            }

            var content = contentFor(anchor);

            if (!content) {
                return;
            }

            clearTimeout(timer);

            /* Read now rather than inside the timer: the event is pooled and
               the pointer has usually moved on by the time this fires. */
            var point = { x: event.clientX, y: event.clientY };

            timer = setTimeout(function () {

                show(anchor, content, point);

            }, OPEN_DELAY);

        });

        document.addEventListener("pointerout", function (event) {

            var card = cardFrom(event.target);

            if (!card) {
                return;
            }

            /* Moving between two children of the same card is not leaving it. */
            if (cardFrom(event.relatedTarget) === card) {
                return;
            }

            hide();

        });

        document.addEventListener("keydown", function (event) {

            if (event.key === "Escape") {
                hide();
            }

        });

        /* The panel is positioned against a rect that scrolling invalidates,
           so it follows the card off screen rather than hanging in place. */
        window.addEventListener("scroll", hide, { passive: true, capture: true });

    }

    return { parse: parse, wire: wire };

}());
