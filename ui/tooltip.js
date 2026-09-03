/* Perk descriptions on hover.
 *
 * Two halves with a hard seam between them. `parse` turns the description
 * markup into HTML and touches nothing else, no DOM, no state, so it can be
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
       to a common chroma they read as one family. The pill does the work of
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
        "Undetectable": { c: "#61707A", i: "st-undetectable" },
        "Cursed": { c: "#8A5F96", i: "st-cursed" },
        "Deep Wound": { c: "#A24A44", i: "st-deepwound" },
        "Bleeding": { c: "#9C5A55", i: "st-haemorrhage" },
        "Madness": { c: "#8A6B96", i: "st-madness" },
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
       nests these freely, `_The Killer can only be **obsessed** ..._` is an
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
               with nothing to pair against, "_"You can take a beating." on
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

    /* Perks and items/add-ons come from two different generators -- perk
       descriptions from a script this repo does not own, item/add-on
       descriptions from tools/build-descriptions.mjs, which does -- so they
       land in two separate globals rather than one file trying to own both.
       Merged only here, at the one place anything actually reads them, so a
       card's type never has to be known by the caller: a name either has a
       description somewhere or it does not. */
    function descriptions() {

        return Object.assign(
            {},
            typeof perkDescriptions === "undefined" ? {} : perkDescriptions,
            typeof itemDescriptions === "undefined" ? {} : itemDescriptions
        );

    }

    /* Exposed so ui/card.js can decide whether a card gets a data-perk
       anchor (and so the browser's own title tooltip) without reaching into
       either global itself, or duplicating the merge above. */
    function hasDescription(name) {

        return !!descriptions()[name];

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

       So a row anchors to the pointer instead, the one part of a row-width
       anchor that says where the reader is actually looking, and opens below
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

            /* Neither side fits. Centre it and let the clamp do the rest. */
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

        /* A tip with no head is a bare line of text -- a nav button, a chip.
           It gets the body and nothing else rather than an empty bar. */
        var head = content.head
            ? '<div class="plTip__head">' +
                  (content.flag
                      ? '<span class="plTip__flag" data-rarity="' + content.flag +
                          '">' + content.flag + "</span>"
                      : "") +
                  '<span class="plTip__name">' + content.head + "</span>" +
                  (content.note
                      ? '<span class="plTip__note">Taught by ' + content.note + "</span>"
                      : "") +
              "</div>"
            : "";

        panel.innerHTML = head +
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

    /* Which survivor teaches a perk. characterData lists perks under a
       survivor and the panel wants the other direction, so the index is
       built once on first use rather than walking 54 rosters per hover. */
    var teacherIndex = null;

    function teacherOf(name) {

        if (teacherIndex === null) {

            teacherIndex = {};

            var roster = (typeof characterData === "undefined")
                ? []
                : (characterData.roster || []);

            roster.forEach(function (entry) {

                (entry.perks || []).forEach(function (perk) {
                    teacherIndex[perk] = entry.name;
                });

            });

        }

        return teacherIndex[name] || null;

    }

    var RARITIES = ["common", "rare", "epic", "legendary", "special"];

    /* The rarity is read off the element rather than looked up in the pool.
       The class is already on the card because the face colours itself from
       it, and a second source could disagree with what is on screen -- a
       card upgraded by The King is the case that would catch it out. */
    function rarityOf(anchor) {

        var card = anchor.closest ? anchor.closest(".plCard") : null;

        if (!card) {
            return null;
        }

        for (var i = 0; i < RARITIES.length; i++) {

            if (card.classList.contains(RARITIES[i])) {
                return RARITIES[i];
            }

        }

        return null;

    }

    function perkContent(name, anchor) {

        var text = descriptions()[name];

        if (!text) {
            return null;
        }

        var teacher = teacherOf(name);

        return {
            head: escapeHtml(name),
            flag: anchor ? rarityOf(anchor) : null,
            note: teacher ? escapeHtml(teacher) : null,
            body: parse(text)
        };

    }

    /* A plain element's tip, for everything that is not a card. It runs
       through the same parser, so a **value** or a {Status} reads the same
       in a nav button's tip as it does in a perk's description, and the
       browser's own title tooltip -- unstyled, a second late, and unable to
       carry any of that -- stops being the fallback for half the app. */
    function tipContent(text) {

        return text
            ? { head: null, flag: null, note: null, body: parse(text) }
            : null;

    }

    function contentFor(anchor) {

        var tip = anchor.getAttribute("data-tip");

        if (tip !== null) {
            return tipContent(tip);
        }

        var pack = anchor.getAttribute("data-pack");

        return pack === null
            ? perkContent(anchor.getAttribute("data-perk"), anchor)
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

        /* Any element, not only a card. The activity log names cards too, a
           pack line offers the whole handful rather than one name, and
           data-tip covers everything that used to fall back to the browser's
           own title. */
        return node.closest("[data-perk], [data-pack], [data-tip]");

    }

    function wire() {

        var hoverable = !window.matchMedia ||
            window.matchMedia("(hover: hover)").matches;

        /* Focus is wired on every device, outside the hover test below, and it
           is the only route a keyboard has ever had to any of this. A card is
           reachable by tab because it carries buttons; the panel following the
           focus ring is what makes those descriptions readable without a
           mouse. */
        document.addEventListener("focusin", function (event) {

            var anchor = cardFrom(event.target);

            if (!anchor) {
                return;
            }

            var content = contentFor(anchor);

            if (content) {
                /* No pointer to aim at, so place() falls back to the anchor's
                   own rect -- which it already does for cards. */
                show(anchor, content, null);
            }

        });

        document.addEventListener("focusout", function (event) {

            if (cardFrom(event.target)) {
                hide();
            }

        });

        document.addEventListener("keydown", function (event) {

            if (event.key === "Escape") {
                hide();
            }

        });

        if (!hoverable) {
            wireTouch();
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

        /* The panel is positioned against a rect that scrolling invalidates,
           so a scroll dismisses it rather than leaving it hanging in place.

           With one exception, and it is the one that makes keyboard support
           work at all: tabbing to a card makes the browser scroll that card
           into view, which fires this the same instant focusin opens the
           panel. Hiding there would mean the panel never survived the gesture
           that asked for it. While the anchor still holds focus the panel
           follows it instead; a scroll driven by anything else still
           dismisses. */
        window.addEventListener("scroll", function () {

            if (openFor &&
                openFor.contains &&
                openFor.contains(document.activeElement)) {

                place(openFor, null);
                return;

            }

            hide();

        }, { passive: true, capture: true });

    }

    /* Touch.
     *
     * A tap on a card is already equip or sell, which is why this used to bail
     * out entirely rather than fight it. It does not have to: the panel can
     * take the PRESS and leave the tap alone. Hold still for LONG_PRESS and it
     * opens; the click that would otherwise follow is swallowed once, so the
     * card underneath does not also act on a gesture the player meant as a
     * question rather than a decision.
     *
     * Untested on real hardware -- there is no touch in a headless browser --
     * so the swallow is deliberately narrow: it fires only for a press that
     * actually opened a panel, and resets on the next touch either way.
     */
    function wireTouch() {

        var LONG_PRESS = 380;
        var DRIFT = 10;

        var pressTimer = null;
        var pressPoint = null;
        var opened = false;

        document.addEventListener("touchstart", function (event) {

            var touch = event.touches[0];
            var anchor = cardFrom(event.target);

            opened = false;

            /* Touching anywhere that is not the open anchor dismisses it,
               which is the only way back out without a pointerout. */
            if (anchor !== openFor) {
                hide();
            }

            if (!anchor || !touch) {
                return;
            }

            var content = contentFor(anchor);

            if (!content) {
                return;
            }

            pressPoint = { x: touch.clientX, y: touch.clientY };

            pressTimer = setTimeout(function () {

                opened = true;
                show(anchor, content, pressPoint);

            }, LONG_PRESS);

        }, { passive: true });

        document.addEventListener("touchmove", function (event) {

            var touch = event.touches[0];

            if (pressTimer === null || !touch || !pressPoint) {
                return;
            }

            /* A few pixels is a finger resting. More than that is a scroll,
               and a scroll is not a request to read anything. */
            if (Math.abs(touch.clientX - pressPoint.x) > DRIFT ||
                Math.abs(touch.clientY - pressPoint.y) > DRIFT) {

                clearTimeout(pressTimer);
                pressTimer = null;

            }

        }, { passive: true });

        document.addEventListener("touchend", function () {

            clearTimeout(pressTimer);
            pressTimer = null;

        }, { passive: true });

        /* Capture, so this runs before the card's own click handler rather
           than after it has already equipped something. */
        document.addEventListener("click", function (event) {

            if (!opened) {
                return;
            }

            opened = false;
            event.stopPropagation();
            event.preventDefault();

        }, true);

    }

    return { parse: parse, wire: wire, hasDescription: hasDescription };

}());
