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
           Named st-* and kept together: they are read at 12px inside a
           description pill rather than at 18px in a button, so each one is
           a silhouette with as few strokes as will still say the word.

           Two pairs carry the family: Haste and Hindered are the same three
           chevrons mirrored, so the good one and the bad one are told apart
           by direction alone, and Blindness and Oblivious share the struck
           -through treatment because both are a sense being taken away. */

        // Chevrons with the leading one longest, so it reads as travel
        // rather than as a "next" arrow.
        "st-haste": '<path d="M4.5 7.5 8 12l-3.5 4.5"/><path d="M10 7.5 13.5 12 10 16.5"/><path d="M15.5 6.5 20 12l-4.5 5.5"/>',

        // The same three, reversed. Nothing else changes.
        "st-hindered": '<path d="M19.5 7.5 16 12l3.5 4.5"/><path d="M14 7.5 10.5 12l3.5 4.5"/><path d="M8.5 6.5 4 12l4.5 5.5"/>',

        // An hourglass, run out, with the sand pooled in the bottom bulb.
        // Lungs were the first try and they read as a keyhole at 12px.
        "st-exhausted": '<path d="M6.5 3.8h11M6.5 20.2h11"/><path d="M7.8 3.8c0 4 4.2 6.2 4.2 8.2s-4.2 4.2-4.2 8.2"/><path d="M16.2 3.8c0 4-4.2 6.2-4.2 8.2s4.2 4.2 4.2 8.2"/><path d="M9.6 17.6c1.4-1.3 3.4-1.3 4.8 0"/>',

        // A shield, whole. The only status here that is purely good.
        "st-endurance": '<path d="M12 3.6 19 6v6c0 4-3 7-7 8.4C8 19 5 16 5 12V6z"/>',

        // A heart split by a fracture rather than a clean crack, so it does
        // not read as a "favourite" icon with a line through it.
        "st-broken": '<path d="M12 20.2S3.8 15 3.8 9.4a4.3 4.3 0 0 1 8.2-1.8 4.3 4.3 0 0 1 8.2 1.8c0 5.6-8.2 10.8-8.2 10.8z"/><path d="m12 6.6-2 4h4l-2 4.4"/>',

        // Crosshair. The ring is broken at the arms so the marks read as
        // sights rather than as a wheel.
        "st-exposed": '<circle cx="12" cy="12" r="6"/><path d="M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5"/>',

        // Two drops, the second falling behind the first.
        "st-haemorrhage": '<path d="M14.5 4.2s4 4.3 4 6.9a4 4 0 0 1-8 0c0-2.6 4-6.9 4-6.9z"/><path d="M8 13.4s2.6 2.8 2.6 4.5a2.6 2.6 0 0 1-5.2 0c0-1.7 2.6-4.5 2.6-4.5z"/>',

        // A cut held shut by three stitches. Two of them read as a not-equals
        // sign, so the cut is shorter and the stitches are odd in number.
        "st-deepwound": '<path d="M5.5 12h13"/><path d="m7.6 8.8 2.2 6.4M11.4 8.8l2.2 6.4M15.2 8.8l2.2 6.4"/>',

        // Three tapered slashes, the middle one longest.
        "st-mangled": '<path d="M6 4.5 9.5 19.5"/><path d="M12 3.5 15.5 20.5"/><path d="M18 5.5 20 18.5"/>',

        // Eye, struck through.
        "st-blindness": '<path d="M2.8 12S6.6 6.2 12 6.2 21.2 12 21.2 12 17.4 17.8 12 17.8 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.4"/><path d="M4 20 20 4"/>',

        // Bell, struck through: the sense taken is hearing.
        "st-oblivious": '<path d="M17.5 16.5h-11c1.2-1.2 1.8-2.6 1.8-4.2V10a3.7 3.7 0 0 1 7.4 0v2.3c0 1.6.6 3 1.8 4.2z"/><path d="M10.4 19.2a1.9 1.9 0 0 0 3.2 0"/><path d="M4 20 20 4"/>',

        // A five-pointed star inside a ring, the shape a hex totem carries.
        "st-cursed": '<circle cx="12" cy="12" r="8.2"/><path d="m12 6.4 1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.2-3.7 2.2.8-4.2L6 10.8l4.2-.5z"/>',

        // A ring half drawn and half dashed away. Footprints were the first
        // try and they lost at 12px: a print needs a sole, a heel and toes to
        // read as one, and three shapes that small collapse into a smudge.
        // A shape that is only half there survives any size.
        "st-elusive": '<path d="M12 3.8a8.2 8.2 0 0 1 0 16.4"/><path d="M8.8 4.5a8.2 8.2 0 0 0-3 2.6"/><path d="M3.9 10.3a8.2 8.2 0 0 0 .3 4.3"/><path d="M6.6 18.1a8.2 8.2 0 0 0 3.5 1.9"/>'

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
