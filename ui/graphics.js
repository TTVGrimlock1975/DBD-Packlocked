/* How much the page is allowed to paint.
 *
 * Three levels, for players whose machine cannot afford the full spectacle.
 * Most often because something else is already using the GPU, streaming being
 * the usual culprit.
 *
 *   full      everything moves. What the game has always done.
 *   reduced   the costly layers stay painted and stop animating. Nothing
 *             disappears, which is the contract this level keeps.
 *   minimal   reduced, plus the things that survive it. Here layers may
 *             actually go, and that relaxed contract is the whole difference
 *             between the two.
 *
 * minimal is a superset of reduced rather than a separate track: it sets both
 * classes, so every rule written for plReduced keeps applying and the plMinimal
 * block at the end of spectacle.css only has to say what it adds. Splitting
 * them into two exclusive states would mean maintaining the reduced rules
 * twice, and the second copy would drift.
 *
 * This is not an accessibility control and it is not a second
 * prefers-reduced-motion. That media query answers "does this person want
 * motion", which is a preference the OS already knows; this answers "can this
 * machine afford to paint that", which nothing can know but the player. They
 * overlap in what they switch off, and the stylesheet deliberately reuses the
 * same rules for both, but they are asked for different reasons and a machine
 * that struggles is not a person who is motion-sensitive.
 */

window.PL = window.PL || {};

PL.graphics = (function () {

    /* Deliberately not save keys, for the same reason volume is not: these
       describe the machine sitting in front of the game, not the collection.
       They survive switching slots, and isSaveKey() in transfer.js matches
       anything starting with "save", so they stay out of export and import.
       Carrying them across would push one player's hardware limits onto
       another's. */
    var LEVEL_KEY = "plGraphics";

    /* What the setting was called when it was a checkbox. Read once, on the
       next load after the update, and then cleared. Anyone who had Reduced
       Effects switched on has this key in their browser right now, and
       dropping it would quietly put a struggling machine back on the full
       spectacle without telling them. */
    var LEGACY_KEY = "plReducedEffects";

    var LEVELS = ["full", "reduced", "minimal"];

    /* Which classes each level puts on <html>. minimal repeats plReduced
       rather than relying on the stylesheet to imply it, so the mapping is
       readable here rather than inferred from two files. */
    var CLASSES = {
        full: [],
        reduced: ["plReduced"],
        minimal: ["plReduced", "plMinimal"]
    };

    var level = "full";
    var listeners = [];

    function isLevel(value) {

        return LEVELS.indexOf(value) !== -1;

    }

    /* On <html> rather than <body> because this file runs from <head>, before
       a <body> exists to put it on. See the load order note at the bottom. */
    function apply() {

        var on = CLASSES[level];
        var root = document.documentElement;

        LEVELS.forEach(function (name) {

            CLASSES[name].forEach(function (cls) {

                root.classList.toggle(cls, on.indexOf(cls) !== -1);

            });

        });

    }

    function current() {

        return level;

    }

    function setLevel(next) {

        if (!isLevel(next) || next === level) {

            return;

        }

        level = next;

        localStorage.setItem(LEVEL_KEY, level);

        apply();

        listeners.forEach(function (fn) {

            fn(level);

        });

    }

    /* For the parts of the interface that have to do more than restyle when
       the level changes. ui/foil.js uses this to drop its pointermove
       listener, which no stylesheet can switch off. */
    function onChange(fn) {

        listeners.push(fn);

    }

    function restore() {

        var stored = localStorage.getItem(LEVEL_KEY);

        if (isLevel(stored)) {

            level = stored;
            return;

        }

        /* No usable new key. Fall back to the old boolean if it is there, and
           write the answer forward so this only happens once. An unreadable
           value of either key lands on full, which is what the game did before
           any of this existed. */
        var legacy = localStorage.getItem(LEGACY_KEY);

        if (legacy !== null) {

            level = legacy === "1" ? "reduced" : "full";

            localStorage.setItem(LEVEL_KEY, level);

        }

        /* Cleared whether or not it said yes, so a stale boolean can never
           come back and argue with the level the player has since chosen. */
        localStorage.removeItem(LEGACY_KEY);

    }

    /* Runs on load rather than waiting for an init() call from script.js, the
       way every other module here is started.
     *
     * That inconsistency is the whole point of the file. script.js is the last
     * script on the page and everything else is loaded just above it, at the
     * bottom of <body>. By the time any of it runs, the browser has already
     * laid out and painted the page once, fog and filters and all. A player
     * who turned this on because that first paint is what hurts would eat it
     * on every single load before the setting could apply.
     *
     * So this one file is loaded in <head>, ahead of the stylesheets, and sets
     * the class before there is anything to paint. It can afford to be there
     * because it touches nothing but localStorage and documentElement: no DOM
     * to wait for, no other module to be ready. The obvious tidy, moving it
     * down with its siblings and calling PL.graphics.init() alongside
     * PL.sounds.init(), silently gives back the flash it exists to prevent.
     */
    restore();

    apply();

    return {
    level: current,
    setLevel: setLevel,
    onChange: onChange
};

}());
