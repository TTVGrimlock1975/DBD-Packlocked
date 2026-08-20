/* Line icons, replacing the emoji the interface used to lean on.
 *
 * Emoji render differently on every platform, sit off the text baseline, and
 * carry their own colour, so they never matched anything around them. These are
 * inline SVG on currentColor: one weight, one grid, and they take the colour of
 * whatever they sit in.
 *
 * Markup asks for one with data-icon="name"; JS-built markup calls PL.icons.get.
 */

window.PL = window.PL || {};

PL.icons = (function () {

    /* 24x24 grid, 1.75 stroke, round caps. Bodies only — the wrapper below
       supplies the svg element so every icon is identical in setup. */
    var PATHS = {

        blood: '<path d="M12 3.2s6.2 6.6 6.2 10.6a6.2 6.2 0 0 1-12.4 0C5.8 9.8 12 3.2 12 3.2z" fill="currentColor" stroke="none"/>',

        award: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/><path d="M12 4v2.6M12 17.4V20M4 12h2.6M17.4 12H20"/>',

        collection: '<path d="M12 3.5 3.5 8l8.5 4.5L20.5 8 12 3.5z"/><path d="M3.5 12.5 12 17l8.5-4.5"/><path d="M3.5 16.5 12 21l8.5-4.5"/>',

        stats: '<path d="M4 20V10M9.3 20V5M14.7 20v-7M20 20V8"/>',

        save: '<path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h10l4 4v10.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5z"/><path d="M8 4v5h7"/><rect x="8" y="13" width="8" height="6" rx="1"/>',

        rules: '<path d="M4.5 5A1.5 1.5 0 0 1 6 3.5h5.5v17H6A1.5 1.5 0 0 1 4.5 19z"/><path d="M19.5 5A1.5 1.5 0 0 0 18 3.5h-6.5v17H18a1.5 1.5 0 0 0 1.5-1.5z"/>',

        search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.5 4.5"/>',

        escaped: '<path d="M14 3.5H6.5A1.5 1.5 0 0 0 5 5v14a1.5 1.5 0 0 0 1.5 1.5H14"/><path d="M11.5 12H21"/><path d="m17.5 8.5 3.5 3.5-3.5 3.5"/>',

        sacrificed: '<path d="M12 3.5c-4.4 0-7.5 3-7.5 7 0 2.4 1.2 4 2.7 5v2.4a1.6 1.6 0 0 0 1.6 1.6h6.4a1.6 1.6 0 0 0 1.6-1.6V15.5c1.5-1 2.7-2.6 2.7-5 0-4-3.1-7-7.5-7z"/><circle cx="9.3" cy="10.7" r="1.6"/><circle cx="14.7" cy="10.7" r="1.6"/>',

        pack: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4"/><path d="M12 11.5v9"/>',

        exportSave: '<path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 3.5v11"/><path d="m8 10.5 4 4 4-4"/>',

        importSave: '<path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 14.5v-11"/><path d="m8 7.5 4-4 4 4"/>',

        check: '<path d="m5 12.5 4.5 4.5L19 7"/>',

        foil: '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 11 10.1 9z" fill="currentColor" stroke="none"/>',

        minus: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12h7"/>',

        reset: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',

        sound: '<path d="M4 9.4h3.3L12 5.5v13l-4.7-3.9H4z"/><path d="M15.7 9.4a3.9 3.9 0 0 1 0 5.2"/><path d="M18.3 6.8a7.5 7.5 0 0 1 0 10.4"/>',

        muted: '<path d="M4 9.4h3.3L12 5.5v13l-4.7-3.9H4z"/><path d="m16 9.8 4.5 4.4M20.5 9.8 16 14.2"/>',

        github: '<path fill="currentColor" stroke="none" d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>',

        /* ── Status effects ──────────────────────────────────────────────
           Named st-* and kept together: each is the silhouette of the effect's
           own icon in Dead by Daylight, redrawn on this grid at this stroke
           rather than shipped as the game's art.

           Two reasons for redrawing rather than dropping the files in beside
           the card art. The real icons are detailed colour plates meant for
           the HUD at 64px and they turn to mush at the 12px a description pill
           gives them; and they carry their own colour, where the whole point
           of this table is that an icon takes the colour of whatever it sits
           in — here, the pill's own.

           Three of the game's icons are the same standing figure with
           different marking: Endurance is bare, Deep Wound is bandaged,
           Undetectable is striped. They are drawn that way here too, so what
           tells them apart at a glance is the marking, not the body. */

        // A winged shoe, heel first, the wing trailing off the back.
        "st-haste": '<path d="M9.4 18.2h7.4a1.7 1.7 0 0 0 .5-3.3l-3.4-1.2a3.2 3.2 0 0 1-1.9-1.8l-.9-2.2-4 1.4z"/><path d="M8.6 10.8 2.8 8.4M8.2 14.2l-5.6-.6M9 17.4l-5.2 1.8"/>',

        // A ball and chain: the weight, two links, and the open cuff.
        "st-hindered": '<circle cx="15.6" cy="6.8" r="4.2"/><path d="m12.4 9.8-1.5 1.5M10.1 12.1l-1.5 1.5"/><path d="M8.1 15.2a3.2 3.2 0 1 0-.4 4.6"/>',

        // A heart, hollow. The game marks being spent with the organ that
        // gives out, not with an hourglass.
        "st-exhausted": '<path d="M12 20.2S4 15.1 4 9.6a4.2 4.2 0 0 1 8-1.9 4.2 4.2 0 0 1 8 1.9c0 5.5-8 10.6-8 10.6z"/>',

        // The survivor, standing and unmarked. Deep Wound and Undetectable
        // are this same body with something added.
        "st-endurance": '<circle cx="12" cy="5.6" r="2.8"/><path d="M5.4 20.4v-1.7c0-3.2 3-5.3 6.6-5.3s6.6 2.1 6.6 5.3v1.7"/>',

        // A medical cross struck out: healing refused.
        "st-broken": '<circle cx="12" cy="12" r="8.2"/><path d="M12 9.4v5.2M9.4 12h5.2"/><path d="M6.2 6.2 17.8 17.8"/>',

        // A skull, front on. The same one the sacrifice icon already draws,
        // so the two agree wherever they are seen together.
        "st-exposed": '<path d="M12 3.5c-4.4 0-7.5 3-7.5 7 0 2.4 1.2 4 2.7 5v2.4a1.6 1.6 0 0 0 1.6 1.6h6.4a1.6 1.6 0 0 0 1.6-1.6V15.5c1.5-1 2.7-2.6 2.7-5 0-4-3.1-7-7.5-7z"/><circle cx="9.3" cy="10.7" r="1.6"/><circle cx="14.7" cy="10.7" r="1.6"/>',

        // One drop, not two. The game's is a single fat bead.
        "st-haemorrhage": '<path d="M12 3.4s5.7 6.1 5.7 9.7a5.7 5.7 0 0 1-11.4 0C6.3 9.5 12 3.4 12 3.4z"/>',

        // The same body, bandaged across the chest.
        "st-deepwound": '<circle cx="12" cy="5.6" r="2.8"/><path d="M5.4 20.4v-1.7c0-3.2 3-5.3 6.6-5.3s6.6 2.1 6.6 5.3v1.7"/><path d="m6.4 16.2 11.2 3.1"/>',

        // A bone, snapped, the two halves pulling apart.
        "st-mangled": '<circle cx="5.6" cy="7" r="2.1"/><circle cx="8.2" cy="4.6" r="2.1"/><path d="m7.4 8.6 3 3"/><circle cx="18.4" cy="17" r="2.1"/><circle cx="15.8" cy="19.4" r="2.1"/><path d="m16.6 15.4-3-3"/>',

        // An open eye. The game does not strike it through - Blindness is
        // the loss of the aura, not of the eye.
        "st-blindness": '<path d="M2.8 12S6.6 6.2 12 6.2 21.2 12 21.2 12 17.4 17.8 12 17.8 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.4"/>',

        // The hand alone. The game lays it over a face, but a circle with
        // fingers on top reads as a crown at pill size, and the hand is the
        // half of that picture carrying the meaning.
        "st-oblivious": '<path d="M7 13a5 5 0 0 1 10 0v3.8a3.6 3.6 0 0 1-3.6 3.6h-2.8A3.6 3.6 0 0 1 7 16.8z"/><path d="M9.3 10.4V6.6M12 9.8V4.8M14.7 10.4V6.6"/>',

        // A skull hung in the A-frame of a hex totem.
        "st-cursed": '<path d="M12 3.6 5.2 20.4M12 3.6l6.8 16.8"/><path d="M8.2 14h7.6"/><circle cx="12" cy="10.6" r="2.9"/><circle cx="11" cy="10.4" r=".75" fill="currentColor" stroke="none"/><circle cx="13" cy="10.4" r=".75" fill="currentColor" stroke="none"/>',

        // The same body again, striped: there, but not readable.
        "st-elusive": '<circle cx="12" cy="5.6" r="2.8"/><path d="M5.4 20.4v-1.7c0-3.2 3-5.3 6.6-5.3s6.6 2.1 6.6 5.3v1.7"/><path d="m6 16.6 11.4-2.2M6.1 19.2l11.6-2.3"/>'

    };

    function get(name, size) {

        var body = PATHS[name];

        if (!body) {

            return "";

        }

        // The per-icon class lets one icon keep its own colour wherever it is
        // used — a blood token stays red even inside a button.
        return '<svg class="ic ic--' + name + '" viewBox="0 0 24 24" width="' + (size || 18) + '" ' +
            'height="' + (size || 18) + '" fill="none" stroke="currentColor" ' +
            'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ' +
            'aria-hidden="true" focusable="false">' + body + "</svg>";

    }

    /* Fills every data-icon placeholder in the markup. */
    function hydrate(root) {

        var nodes = (root || document).querySelectorAll("[data-icon]");

        for (var i = 0; i < nodes.length; i++) {

            var node = nodes[i];
            var size = node.getAttribute("data-icon-size");

            node.innerHTML = get(node.getAttribute("data-icon"), size ? Number(size) : 18);
            node.classList.add("icWrap");

        }

    }

    return { get: get, hydrate: hydrate };

}());
