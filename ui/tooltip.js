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
       saying "status effect", and the hue only separates one from another. */
    var STATUS = {
        "Haste": "#5E8C56",
        "Hindered": "#A8654B",
        "Exhausted": "#A8823F",
        "Endurance": "#4E8A92",
        "Broken": "#A24A44",
        "Exposed": "#B09141",
        "Haemorrhage": "#9C5A55",
        "Hemorrhage": "#9C5A55",
        "Mangled": "#7D6A5F",
        "Blindness": "#6B7780",
        "Oblivious": "#8A6B96",
        "Undetectable": "#61707A",
        "Cursed": "#8A5F96",
        "Deep Wound": "#A24A44",
        "Bleeding": "#9C5A55",
        "Madness": "#8A6B96",
        "Incapacitated": "#A8654B",
        "Blessed": "#5E8C56",
        "Elusive": "#5C8A83"
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

                return '<span class="plTip__st" style="--st:' + STATUS[status] + '">' +
                    status +
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

            out += '<p class="plTip__p">' + para.map(inline).join("<br>") + "</p>";
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

    /* Right of the card by preference, left when the right would overflow, and
       nudged vertically rather than allowed off the top or bottom. Measured
       after the content is in, since the height depends on the description. */
    function place(card) {

        var rect = card.getBoundingClientRect();
        var box = panel.getBoundingClientRect();

        var left = rect.right + GAP;

        if (left + box.width > window.innerWidth - MARGIN) {

            left = rect.left - GAP - box.width;

        }

        /* Neither side fits — centre it and let the clamp below do the rest. */
        if (left < MARGIN) {
            left = Math.max(MARGIN, (window.innerWidth - box.width) / 2);
        }

        var top = rect.top + (rect.height - box.height) / 2;

        top = Math.min(top, window.innerHeight - MARGIN - box.height);
        top = Math.max(MARGIN, top);

        panel.style.left = Math.round(left) + "px";
        panel.style.top = Math.round(top) + "px";

    }

    function show(card, name, text) {

        build();

        panel.innerHTML =
            '<div class="plTip__head">' + escapeHtml(name) + "</div>" +
            '<div class="plTip__body">' + parse(text) + "</div>";

        panel.hidden = false;
        openFor = card;

        place(card);

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
           a name is a name wherever it is written. */
        return node.closest("[data-perk]");

    }

    function wire() {

        /* Hover only. A card already answers a tap with equip or sell, and a
           panel fighting that is worse than no panel. */
        if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) {
            return;
        }

        document.addEventListener("pointerover", function (event) {

            var card = cardFrom(event.target);

            if (!card || card === openFor) {
                return;
            }

            var name = card.getAttribute("data-perk");
            var text = descriptions()[name];

            if (!text) {
                return;
            }

            clearTimeout(timer);

            timer = setTimeout(function () {

                show(card, name, text);

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
