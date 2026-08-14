/* Shared card face.
 *
 * Every card in the game renders through this — inventory, shop, collection,
 * loadout and pack reveal — so the card is changed in one place instead of
 * five. Returns an HTML string, matching the innerHTML idiom used throughout
 * script.js.
 *
 * The anatomy is a trading card: a 5:7 face, a rarity-rimmed gem holding the
 * art, and a nameplate under a rule. The colours are this project's own —
 * the rarity palette, gold accents and Arial already used everywhere else.
 */

window.PL = window.PL || {};

PL.card = (function () {

    function rarityClass(rarity) {

        return String(rarity || "common").toLowerCase();

    }

    /* Shrink the nameplate so a long name stays on one line and every card's
       plate is the same height. "Teamwork: Collective Stealth" at 27
       characters is the worst case in the pool. */
    function nameFit(name) {

        var n = String(name || "").length;

        if (n <= 14) return 1;
        if (n <= 18) return 0.88;
        if (n <= 22) return 0.78;
        if (n <= 27) return 0.68;

        return 0.6;

    }

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

    var poolIndex = null;

    /* Inventory, loadout and shop entries are stored with only name, rarity,
       type, amount and foil — and every save written before this release has
       exactly that shape. Artwork therefore has to be looked up from the pool
       by name rather than read off the stored object, which also means old
       saves gain art without being touched. */
    function fromPool(name) {

        if (!poolIndex) {

            poolIndex = {};

            if (typeof gameData !== "undefined") {

                []
                    .concat(gameData.perks || [], gameData.items || [], gameData.addons || [])
                    .forEach(function (entry) {
                        poolIndex[entry.name] = entry;
                    });

            }

        }

        return poolIndex[name] || null;

    }

    function render(card, opts) {

        opts = opts || {};

        var locked = !!opts.locked;
var foil = !!opts.foil;

/* Foil variants share the same foil system, but Entity Touched needs its
   own visual treatment so the rare 1-in-500 version can be distinguished
   from the standard rainbow foil without creating a second card renderer. */
var foilVariant = opts.foilVariant || (card.foilVariant || "standard");

        /* Prefer what the caller passed, fall back to the pool. */
        var source = fromPool(card.name) || {};
        var icon = card.icon || source.icon || null;
        var realName = card.realName || source.realName || null;

        var classes = ["plCard", rarityClass(card.rarity)];

if (foil) classes.push("plCard--foil");


if (foil && foilVariant === "entityTouched") {
    classes.push("plCard--entityTouched");
}
        if (locked) classes.push("plCard--locked");
        if (opts.size === "sm") classes.push("plCard--sm");

        /* A diamond covers half the area of the square bounding it, so matching
           the two by bounding box would leave items looking twice as heavy as a
           perk beside them. Items get the smaller square instead. */
        var isPerk = card.type === "Perk";

        var gemClasses = "plCard__gem" + (isPerk ? " plCard__gem--diamond" : "");

        var art = icon
            ? '<img class="plCard__img" src="' + escapeHtml(icon) + '" alt="" loading="lazy">'
            : "";

        var count = (opts.count && opts.count > 1)
            ? '<span class="plCard__count">x' + opts.count + "</span>"
            : "";

        /* Only shown where exactly one real Dead by Daylight card matches this
           slot. Where several do, naming one would be a guess. */
        var realNameHtml = (!locked && realName)
            ? '<div class="plCard__real">' + escapeHtml(realName) + "</div>"
            : "";

        /* The 1-in-500 is named on the plate rather than left to look like an
           ordinary foil with a different colour. Only the label changes:
           foilVariant stays "entityTouched" because that string is written
           into every save on disk, and renaming it would orphan every card
           already pulled. */
        var foilTag = (foil && !locked)
            ? '<b class="plCard__foil">' +
                (foilVariant === "entityTouched" ? "Cursed" : "Foil") +
              "</b>"
            : "";

        var jokerAbility =
            card.name === "The Joker" &&
            opts.size !== "sm" &&
            !locked
            ? '<div class="plCard__ability">' +
            '<b>SACRIFICE INSURANCE</b>' +
            /* Kept short on purpose: the plate cannot shrink, so every extra
               wrapped line here is taken straight out of the art well. The
               heading already says when it applies. */
            '<span>Protects your other equipped cards.</span>' +
          '</div>'
        : "";

        /* The holographic layers only exist on a foil, so an ordinary card
           carries no extra elements and no extra compositing. */
        var holo = (foil && !locked)
            ? '<span class="plCard__holo"></span><span class="plCard__glare"></span>'
            : "";

        var buttons = "";

        if (opts.actions && opts.actions.length) {

            buttons = '<div class="cardButtons">' +
                opts.actions.map(function (action) {

                    if (action.disabled) {

                        return "<button disabled>" + action.label + "</button>";

                    }

                    return '<button onclick="' + action.onclick + '">' +
                        action.label +
                        "</button>";

                }).join("") +
                "</div>";

        }

        /* Buttons sit outside the face so an actionable card keeps the same
           5:7 shape as a plain one. */
        return '<div class="' + classes.join(" ") + '" ' +
                    'style="--nameFit:' + nameFit(card.name) + '" ' +
                    'title="' + escapeHtml(locked ? "Undiscovered" : card.name) + '">' +

                    '<div class="plCard__face">' +
                        holo +
                        count +
                        '<div class="plCard__set">' +
                            "<span>" + escapeHtml(card.type) + "</span>" +
                            "<span>" + escapeHtml(locked ? "???" : card.rarity) + "</span>" +
                        "</div>" +
                        '<div class="plCard__art">' +
                            '<div class="' + gemClasses + '">' +
                                '<div class="plCard__clip">' +
                                    art +
                                    (locked ? "" : '<span class="plCard__tint"></span>') +
                                "</div>" +
                            "</div>" +
                        "</div>" +
                        '<div class="plCard__plate">' +
                            '<div class="plCard__name">' +
                                (locked ? "???" : escapeHtml(card.name)) +
                            "</div>" +
                            '<div class="plCard__rarity">' +
                                escapeHtml(locked ? "Undiscovered" : card.rarity) +
                                foilTag +
                                "</div>" +
                                realNameHtml +
                                jokerAbility +
                        "</div>" +
                        (opts.actionLabel
                            ? '<span class="plCard__verb">' + escapeHtml(opts.actionLabel) + "</span>"
                            : "") +
                    "</div>" +

                    buttons +
                "</div>";

    }

    /* Just the artwork, for the loadout slots. They are far too small for a
       full card face, but they still want the icon. */
    function art(card, className) {

        var source = fromPool(card.name) || {};
        var icon = card.icon || source.icon;

        if (!icon) {

            return '<span class="loadoutArt loadoutArt--none ' + (className || "") + '"></span>';

        }

        return '<img class="' + (className || "") +
            (card.type === "Perk" ? " loadoutArt--diamond" : "") +
            '" src="' + escapeHtml(icon) + '" alt="" loading="lazy">';

    }

    return {
        render: render,
        art: art,
        rarityClass: rarityClass,
        nameFit: nameFit
    };

}());
