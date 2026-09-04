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

    /* 24x24 grid, 1.75 stroke, round caps. Bodies only. The wrapper below
       supplies the svg element so every icon is identical in setup. */
    /* Icons that are artwork rather than line drawings.
     *
     * Everything in PATHS below is a stroke on currentColor, which is what
     * lets one glyph sit in a red pill and a gold button and belong to both.
     * The Bloodpoint is the exception: it is the game's own mark, painted,
     * cracked and lit from the upper left, and no path traced from it would
     * still be that mark. It carries its own colour and always has.
     *
     * Small mercy that it is a triangle -- at 12px beside a number the cracks
     * go, but the silhouette is still unmistakably the thing DBD pays you in,
     * which the generic coin never was.
     *
     * RASTER is checked before PATHS, so the drawn coin still in PATHS.blood
     * is the fallback rather than a leftover: delete the line below and the
     * vector comes straight back, currentColor and all.
     */
    /* Icons that are the game's own art, worn as a MASK rather than drawn
       as an image.

       This is the third kind, and it exists because the other two each give
       up something. A path on currentColor takes every state the interface
       throws at it but can only ever be an approximation of a hook. A raster
       is the real thing and answers nothing -- the Bloodpoint below could
       not even follow its own label on hover until brightness() was bolted
       on.

       A mask is both. The alpha channel of the game's PNG cuts the shape,
       background-color paints it currentColor, and from the stylesheet's
       point of view it behaves exactly like a path: it inherits colour, it
       lights on hover, it dims when disabled.

       Checked before RASTER and PATHS, so a name listed here wins. */
    var MASK = {
        escaped: "images/ui/exit-gates.webp",
        sacrificed: "images/ui/hook.webp"
    };

    var RASTER = {

        /* The Status Effects, as the game draws them.

           These were traced glyphs until now, and tracing them was always
           the compromise: a Status Effect is not a shape, it is a specific
           painted disc a player already knows on sight -- the winged boot,
           the crossed medkit, the Entity's triangle. Reading one in a perk
           description should be the same act as reading it off the HUD
           mid-trial.

           Placed as images rather than worn as masks like the hook and the
           gate, and the difference is what the alpha holds. Those two are a
           silhouette on transparency, so an alpha mask IS the shape. These
           carry their own disc, so their alpha is the whole circle: masked,
           every one would come out a solid coloured dot. The pill around
           them already carries the colour.

           The traced versions stay in PATHS below, unreachable while these
           exist, on the same terms as the drawn Bloodpoint: delete a line
           here and the drawing comes straight back. */
        "st-haste": "images/ui/status/haste.webp",
        "st-hindered": "images/ui/status/hindered.webp",
        "st-exhausted": "images/ui/status/exhausted.webp",
        "st-endurance": "images/ui/status/endurance.webp",
        "st-broken": "images/ui/status/broken.webp",
        "st-exposed": "images/ui/status/exposed.webp",
        "st-haemorrhage": "images/ui/status/haemorrhage.webp",
        "st-mangled": "images/ui/status/mangled.webp",
        "st-blindness": "images/ui/status/blindness.webp",
        "st-oblivious": "images/ui/status/oblivious.webp",
        "st-undetectable": "images/ui/status/undetectable.webp",
        "st-cursed": "images/ui/status/cursed.webp",
        "st-deepwound": "images/ui/status/deepwound.webp",
        "st-madness": "images/ui/status/madness.webp",
        "st-blessed": "images/ui/status/blessed.webp",
        "st-incapacitated": "images/ui/status/incapacitated.webp",
        "st-elusive": "images/ui/status/elusive.webp",

        blood: "images/ui/bloodpoints.webp",

        /* The Iridescent Shard, for exactly the reason the Bloodpoint above is
           here: it is the game's own mark, a chunk of violet crystal lit from
           inside by a red core, and nothing traced in flat strokes is that
           mark. The first attempt at this was a drawn splinter, which read as
           a generic gem and told the player nothing about which currency they
           were looking at.

           Padded square before conversion, unlike the Bloodpoint. get() writes
           width and height from one number, so the source's 441x462 would have
           been squashed about 5% at every size it is drawn. */
        shard: "images/ui/iridescent-shard.webp"
    };

    var PATHS = {

        /* A coin, not a drop. This is what the currency looks like in hand,
           and "Blood Tokens" names a coin the game mints, not the fluid
           itself. The drop stays, stamped small on the face rather than
           filling the whole shape, so what it is made of is still legible at
           a glance. Ring and drop both close shapes, so the wrapper's default
           fill:none has to be turned back on per-path rather than assumed. */
        blood: '<circle cx="12" cy="12" r="8.3" fill="none" stroke="currentColor" stroke-width="1.7"/>' +
            '<path d="M12 7.6s3.3 3.75 3.3 5.9a3.3 3.3 0 0 1-6.6 0c0-2.15 3.3-5.9 3.3-5.9z" fill="currentColor" stroke="none"/>',

        award: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/><path d="M12 4v2.6M12 17.4V20M4 12h2.6M17.4 12H20"/>',

        /* Two cards, one behind the other. The stacked-planes mark this
           replaces is what every design tool uses for layers, and this is a
           game about collecting cards -- the collection should look like
           the thing being collected. */
        collection: '<path d="M7.5 8.5h9v11h-9z"/><path d="M10 8.5V5.5h9v11h-2.5"/>',

        /* A die mid-throw. Tilted, because a square die reads as a checkbox at
           18px and the whole point of the button is that the result is not
           chosen. Pips are filled while the body is stroked, which is what
           keeps them from closing up into a blob at small sizes. */
        /* A perk diamond inside a re-roll arc: this button deals a fresh
           legal build out of what you own, and the mark says both halves of
           that -- the thing being dealt, and the dealing again.

           A die said only the second half, in the vocabulary of a board game
           rather than this one. It was also the last rounded corner in the
           set, carrying rx 2.6 into a run of square-cut icons.

           The arc and its head are `reset`'s, unchanged. The first attempt
           drew its own and put the head where the arc did not end, so the two
           collided into a blob at every size -- an arrowhead only reads as one
           when it sits on the terminus of the line it belongs to. Borrowing a
           mark that already works also means these two turn the same way. */
        dice: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/><path d="M12 9.5 14.5 12 12 14.5 9.5 12z"/>' +
            '<circle cx="9.2" cy="9.9" r="1.15" fill="currentColor" stroke="none"/>' +
            '<circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none"/>' +
            '<circle cx="14.8" cy="14.1" r="1.15" fill="currentColor" stroke="none"/>',

        /* Shackle open at the top when unlocked is the usual pairing, but both
           states have to hold at 13px inside a card corner, so the difference
           is the body fill instead: a locked slot reads solid. Drawn from
           y:6 to y:18 rather than hugging the bottom of the grid, so the
           glyph's own weight -- not just its 24x24 box -- sits centered in
           whatever square button wraps it. */
        lock: '<rect x="5" y="8.5" width="14" height="9.5" rx="1.6"/>' +
            '<path d="M8.2 8.5V6a3.8 3.8 0 0 1 7.6 0v2.5"/>',

        stats: '<path d="M4 20V10M9.3 20V5M14.7 20v-7M20 20V8"/>',

        /* Three slots in a frame, which is what this button opens.

           A floppy disk was here first and was the one genuinely wrong mark
           in the set -- an object no player of this game has ever handled. A
           chest replaced it and was thematically right but needed explaining:
           at 16px a lidded box is a box. The literal reading wins, because
           the thing being named is not a save FILE, it is a rack of parallel
           runs, and three stacked slots say that without a metaphor. */
        save: '<path d="M4 4.5h16v15H4z"/><path d="M4 9.5h16"/><path d="M4 14.5h16"/>',

        /* An open book, and the closed Tome tried here is worth recording as
           a failure. A bound volume with an emblem on the cover is what DBD
           keeps its lore in, and drawn in outline at this weight it is a
           rectangle with a line down it and a diamond floating inside --
           which reads as a door, and sits two entries from `escaped`, which
           is also a door.

           Curved pages give it a silhouette nothing else here has. */
        rules: '<path d="M12 7.5v11.5"/>' +
            '<path d="M12 7.5C9.7 5.9 6.8 5.4 4 5.9v11.5c2.8-.5 5.7 0 8 1.6"/>' +
            '<path d="M12 7.5c2.3-1.6 5.2-2.1 8-1.6v11.5c-2.8-.5-5.7 0-8 1.6"/>',

        search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 4.5 4.5"/>',

        /* The Exit Gate, not a generic door with an arrow through it.

           This and `sacrificed` below are the two ways a trial ends and they
           are drawn beside each other on the result screen, so they are the
           pair most worth spending real Dead by Daylight imagery on: you
           leave through the gate or you go on the hook. A door-and-arrow and
           a skull said the same thing in the vocabulary of a settings menu.

           Gate frame plus a path leaving through it. Three strokes, which is
           what survives at the 13px this renders at in a match result. */
        escaped: '<path d="M4.5 20.5V7h15v13.5"/><path d="M8.5 14h7"/><path d="m13 11.5 2.5 2.5-2.5 2.5"/>',

        /* The Hook. The single most recognisable object in the game, and the
           thing this word actually names -- a skull is what a generic icon set
           reaches for when it means death, and DBD does not mean death here,
           it means the hook.

           A post, a base, and the curl. The curl carries past its own
           half-circle and comes back DOWN beside the post, which is what a
           real hook does and what separates this from `goal` -- a flag is
           also a post with something at its top right, and at 13px the two
           read as the same mark unless the hook closes on itself. */
        sacrificed: '<path d="M8 20.5h8"/><path d="M12 20.5V7"/><path d="M12 7h4a3.5 3.5 0 0 1 0 7"/>',

        /* Still the carton, and the Bloodweb node that was tried here is worth
           recording as a failure rather than quietly dropped.

           The metaphor was exact -- the Bloodweb is where a DBD player spends
           blood to unlock cards, which is what a pack is -- and the diamond
           rhymed with the perk gems inside. It still does not work. A node on
           spokes reads as a sparkle at 13px, the size this draws at beside a
           pack price, and a thicker node with shorter spokes only makes a
           thicker sparkle. The shape needs the web around it to mean anything,
           and there is no room for a web.

           Which is the rule the rest of this set follows: a DBD motif is worth
           taking only where it survives 13px. The hook and the gate do. This
           does not. */
        pack: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4"/><path d="M12 11.5v9"/>',

        exportSave: '<path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 3.5v11"/><path d="m8 10.5 4 4 4-4"/>',

        importSave: '<path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/><path d="M12 14.5v-11"/><path d="m8 7.5 4-4 4 4"/>',

        check: '<path d="m5 12.5 4.5 4.5L19 7"/>',

        foil: '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.4l-1.9-5.6L4.5 11 10.1 9z" fill="currentColor" stroke="none"/>',

        minus: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12h7"/>',

        /* Bare strokes, no ring around them. This one sits inside the ghost
           diamond of an empty loadout slot, which supplies the enclosure. A
           circle in there would be a shape inside a shape inside a shape. */
        plus: '<path d="M12 6.5v11M6.5 12h11"/>',

        /* The wordmark's mark, and the one entry here that is not a line icon.
           A brand mark has to look the same wherever it lands, so this one
           names its own colours rather than taking currentColor: gild edge,
           blood body, and the keyhole cut in the page's own black. It lives
           here anyway so there is still one place to look for a symbol.

           The keyhole is a round head over a flared base, drawn as two shapes
           that overlap and union. Drawn as one continuous outline it loses the
           pinch where the head meets the flare and reads as a tombstone. The
           gild rim is a fattened copy underneath rather than a stroke, because
           a stroke traces the seam between the two shapes straight through the
           middle of the silhouette. */
        brand:
            '<path d="M12 1.9 22.1 12 12 22.1 1.9 12Z" fill="#8E2B22" stroke="#C8A44B" stroke-width="1.6"/>' +
            '<path d="M12 1.9 6.6 7.3 12 12.7 17.4 7.3Z" fill="#ffffff" stroke="none" opacity=".08"/>' +
            '<path d="M6.6 7.3 12 1.9 17.4 7.3" fill="none" stroke="#C8A44B" stroke-width=".7" opacity=".5"/>' +
            '<g fill="#C8A44B" stroke="#C8A44B" stroke-width="1.5" stroke-linejoin="round">' +
                '<circle cx="12" cy="9.7" r="2.75"/>' +
                '<path d="M12 10.9 15 17.9H9z"/>' +
            '</g>' +
            '<g fill="#0E0D0C" stroke="none">' +
                '<circle cx="12" cy="9.7" r="2.75"/>' +
                '<path d="M12 10.9 15 17.9H9z"/>' +
            '</g>',

        /* The top bar's overflow. Filled rather than stroked: at 18px three
           1.75-stroke rings read as mush. */
        more: '<circle cx="5.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>' +
              '<circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/>' +
              '<circle cx="18.5" cy="12" r="1.7" fill="currentColor" stroke="none"/>',

        reset: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v4.5h-4.5"/>',

        sound: '<path d="M4 9.4h3.3L12 5.5v13l-4.7-3.9H4z"/><path d="M15.7 9.4a3.9 3.9 0 0 1 0 5.2"/><path d="M18.3 6.8a7.5 7.5 0 0 1 0 10.4"/>',

        muted: '<path d="M4 9.4h3.3L12 5.5v13l-4.7-3.9H4z"/><path d="m16 9.8 4.5 4.4M20.5 9.8 16 14.2"/>',

        github: '<path fill="currentColor" stroke="none" d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/>',

        /* ── Guide ──────────────────────────────────────────
           The guide names five parts of the app that have no button of their
           own to borrow an icon from, so they are drawn here: the run of
           steps, what you keep, what you take in, what the shop sells, and
           what you are playing towards. */

        // A list with a marker against each line.
        steps: '<path d="M4.4 6.4h.01M4.4 12h.01M4.4 17.6h.01"/><path d="M8.8 6.4h10.8M8.8 12h10.8M8.8 17.6h10.8"/>',

        // A crate with its lid banded across the top.
        inventory: '<path d="M3.4 8.6h17.2v10.3a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6z"/><rect x="2.6" y="4.2" width="18.8" height="4.4" rx="1.2"/><path d="M9.8 12.4h4.4"/>',

        // Four slots stood on their corners, the way the game stands a perk.
        /* Four perk diamonds, arranged in a diamond rather than a 2x2.

           That is how Dead by Daylight lays a build out, and how a build
           draws one on its cards -- one at the top, one either side, one
           below. The grid version was four diamonds; this is a loadout. */
        loadout: '<path d="M12 2.5 15 5.5 12 8.5 9 5.5z"/><path d="M5.5 9 8.5 12 5.5 15 2.5 12z"/><path d="M18.5 9 21.5 12 18.5 15 15.5 12z"/><path d="M12 15.5 15 18.5 12 21.5 9 18.5z"/>',

        // A price tag, hole and all.
        shop: '<path d="M11.3 3.6H19a1.4 1.4 0 0 1 1.4 1.4v7.7a1.4 1.4 0 0 1-.41 1l-7.88 7.88a1.4 1.4 0 0 1-1.98 0l-7.3-7.3a1.4 1.4 0 0 1 0-1.98l7.88-7.88a1.4 1.4 0 0 1 1-.41z"/><circle cx="16.1" cy="7.9" r="1.5"/>',

        // A flag planted at the end of the run.
        /* Progress and Weekly used to share one icon, which was the real
           problem: they are not the same thing. One is how much of the
           collection exists, the other is what resets on Monday.

           Progress is a perk diamond filling up. The shape is already this
           app's own -- every card wears it -- and a diamond half-filled
           reads as a fraction of something completed without needing a
           number beside it. The generator tried here first was a better
           metaphor and a worse mark: at 14px it read as a filing cabinet. */
        progress: '<path d="M12 3 21 12 12 21 3 12z"/>' +
            '<path d="M4 13h16l-8 8z" fill="currentColor" stroke="none"/>',

        /* Weekly gets the calendar, and this is the one place in the set
           where the generic mark is the right answer. Dead by Daylight has
           no weekly-reset iconography to borrow -- its Archives run on a
           rift and a tome, neither of which says "Monday" -- and inventing
           a horror motif for a date would cost recognition to buy nothing.
           Squared off to sit with the rest. */
        weekly: '<path d="M4.5 6.5h15v13h-15z"/><path d="M4.5 11h15"/><path d="M9 3.5v5"/><path d="M15 3.5v5"/>',

        /* ── Status effects ──────────────────────────────────────────────
           Named st-* and kept together: each is the silhouette of the effect's
           own icon in Dead by Daylight, redrawn on this grid at this stroke
           rather than shipped as the game's art.

           Two reasons for redrawing rather than dropping the files in beside
           the card art. The real icons are detailed colour plates meant for
           the HUD at 64px and they turn to mush at the 12px a description pill
           gives them; and they carry their own colour, where the whole point
           of this table is that an icon takes the colour of whatever it sits
           in. Here, the pill's own.

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

        // The survivor, standing. The one of the three that keeps the body:
        // the other two now carry their own marking instead.
        "st-endurance": '<circle cx="12" cy="5.6" r="2.8"/><path d="M5.4 20.4v-1.7c0-3.2 3-5.3 6.6-5.3s6.6 2.1 6.6 5.3v1.7"/>',

        // The same standing figure as Endurance, struck through with the
        // stripe the comment above always meant it to carry. A killer gone
        // quiet reads as the same body, marked rather than replaced. Used to
        // borrow Elusive's icon, which is a different status with nothing in
        // common but both being stealth-adjacent.
        "st-undetectable": '<circle cx="12" cy="5.6" r="2.8"/><path d="M5.4 20.4v-1.7c0-3.2 3-5.3 6.6-5.3s6.6 2.1 6.6 5.3v1.7"/><path d="M7.4 13.6h4.4M13.4 15.7h4.6M6.3 17.9h5.4M13 20h4.6"/>',

        // A screen gone to static. Madness is the game's own tiered effect,
        // more interference as it climbs, so broken, staggered bands read as
        // the idea at any single tier rather than committing to one of three.
        "st-madness": '<rect x="4" y="5.5" width="16" height="13" rx="1.4"/><path d="M6.4 9h5.4M13.4 9h4.2M6.4 12h3M11 12h7M6.4 15h8.4M16.6 15h1.8"/>',

        // A medical cross struck out: healing refused.
        "st-broken": '<circle cx="12" cy="12" r="8.2"/><path d="M12 9.4v5.2M9.4 12h5.2"/><path d="M6.2 6.2 17.8 17.8"/>',

        // A skull, front on. The same one the sacrifice icon already draws,
        // so the two agree wherever they are seen together.
        "st-exposed": '<path d="M12 3.5c-4.4 0-7.5 3-7.5 7 0 2.4 1.2 4 2.7 5v2.4a1.6 1.6 0 0 0 1.6 1.6h6.4a1.6 1.6 0 0 0 1.6-1.6V15.5c1.5-1 2.7-2.6 2.7-5 0-4-3.1-7-7.5-7z"/><circle cx="9.3" cy="10.7" r="1.6"/><circle cx="14.7" cy="10.7" r="1.6"/>',

        // One drop, not two. The game's is a single fat bead.
        "st-haemorrhage": '<path d="M12 3.4s5.7 6.1 5.7 9.7a5.7 5.7 0 0 1-11.4 0C6.3 9.5 12 3.4 12 3.4z"/>',

        // A dressing, not a body wearing one. The game draws a figure with
        // wrapping across the chest, but Endurance and Undetectable are that
        // same figure with their own marking, and at 13px three identical
        // silhouettes cannot be told apart by what is drawn inside them. The
        // wrapping is what makes this one itself, so the wrapping is the mark.
        "st-deepwound": '<rect x="4.4" y="7.6" width="15.2" height="8.8" rx="4.4"/><path d="M9.6 8.2 7 15.8M14.4 8.2 11.8 15.8"/>',

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

        // The striping alone, for the same reason: it is the whole of what
        // separated this from the plain figure, and at pill size it had to
        // carry the mark rather than decorate it.
        "st-elusive": '<path d="M8.6 4.4 4.2 12M13.2 4.6 5.6 17.8M17 6.6 8.2 20M19.4 11.2l-6.6 9.2"/>'

    };

    function get(name, size) {

        var masked = MASK[name];

        if (masked) {

            /* Optically sized down, and not arbitrarily. A filled silhouette
               carries far more weight per pixel than a 1.9px outline, so a
               mask given the same box as the drawn icons beside it reads as
               the largest thing in the row. 0.94 lands the default 18 on 17
               and a 16px heading on 15, which is where they stop shouting.

               Applied here rather than at the call sites so a caller keeps
               asking for the size it wants and this stays one number to
               change. */
            var s = Math.round((size || 18) * 0.94);

            /* The mask URL goes straight into the style attribute rather
               than through a custom property, and that is deliberate. A
               relative url() inside a custom property does not resolve
               against the document -- Chrome resolves it against the
               stylesheet that substitutes the variable, which would turn
               this into css/images/ui/... and silently mask everything to
               nothing. ui/characters.js carries the same scar. */
            return '<span class="ic ic--' + name + ' ic--mask" ' +
                'aria-hidden="true" style="width:' + s + 'px;height:' + s + 'px;' +
                '-webkit-mask-image:url(&quot;' + masked + '&quot;);' +
                'mask-image:url(&quot;' + masked + '&quot;)"></span>';

        }

        var src = RASTER[name];

        if (src) {

            /* Same class pair and the same box as the vector branch, so the
               layout rules in chrome.css (.ic, button .ic) do not have to know
               which kind of icon they got. */
            /* Not loading="lazy", and the attribute would earn nothing on
               either kind of raster here. The two currencies are interface
               chrome on screen the moment their container is, so deferring
               them buys nothing and costs a visible pop the first time a
               price or a token count paints. The Status Effects defer
               themselves: they are written into a tooltip that does not
               exist until a hover builds it, so none of the seventeen is
               fetched until a description naming one is read.

               decoding="async" stays for both. It keeps the decode off the
               critical path without delaying the fetch. */
            return '<img class="ic ic--' + name + '" src="' + src + '" ' +
                'width="' + (size || 18) + '" height="' + (size || 18) + '" ' +
                'alt="" aria-hidden="true" decoding="async">';

        }

        var body = PATHS[name];

        if (!body) {

            return "";

        }

        // The per-icon class lets one icon keep its own colour wherever it is
        // used. A blood token stays red even inside a button.
        /* Angular, not rounded, and a deliberate break from where the rest of
           the chrome came from.

           This file shipped its first thirty icons at stroke-width 1.75 with
           round caps and round joins, which is the same generic line set half
           the web uses. There was nothing of this game in it. A drawn glyph is
           not especially Dead by Daylight whatever it depicts; the game feel
           in an interface comes from its art, not its icons.

           The game's own interface is the opposite: square-cut, mitred, and
           heavier than this. chrome.css has said as much since the day it set
           --rc to 0 -- "the game's own UI is angular" -- and the icons were
           the last part of the interface still rounding its corners.

           miterlimit is the one guard needed. An acute join left to mitre
           freely grows a spike far past the stroke; at 2 anything sharper
           than about 60 degrees falls back to a bevel, which is what keeps
           the arrowheads and the flag from growing needles. */
        return '<svg class="ic ic--' + name + '" viewBox="0 0 24 24" width="' + (size || 18) + '" ' +
            'height="' + (size || 18) + '" fill="none" stroke="currentColor" ' +
            'stroke-width="1.9" stroke-linecap="butt" stroke-linejoin="miter" ' +
            'stroke-miterlimit="2" ' +
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
