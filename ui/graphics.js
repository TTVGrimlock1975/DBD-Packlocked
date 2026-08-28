/* Reduced Effects.
 *
 * A switch that takes the page off the expensive rendering paths, for players
 * whose machine cannot afford them — most often because something else is
 * already using the GPU, streaming being the usual culprit.
 *
 * The setting is not an accessibility control and is not a second
 * prefers-reduced-motion. That media query answers "does this person want
 * motion", which is a preference the OS already knows; this answers "can this
 * machine afford to paint that", which nothing can know but the player. They
 * overlap in what they switch off, and the stylesheet deliberately reuses the
 * same rules for both (see the end of spectacle.css), but they are asked for
 * different reasons and a machine that struggles is not a person who is
 * motion-sensitive.
 *
 * What it actually buys is in that stylesheet block. The short version: the
 * costly layers stay painted and stop animating. Nothing disappears.
 */

window.PL = window.PL || {};

PL.graphics = (function () {

    /* Deliberately not a save key, for the same reason volume is not: the
       setting describes the machine sitting in front of the game, not the
       collection. It survives switching slots, and isSaveKey() in transfer.js
       matches anything starting with "save", so this stays out of export and
       import — carrying it across would push one player's hardware limits
       onto another's. */
    var REDUCED_KEY = "plReducedEffects";

    var reduced = false;

    /* On <html> rather than <body> because this file runs from <head>, before
       a <body> exists to put it on. See the load order note below. */
    function apply() {

        document.documentElement.classList.toggle("plReduced", reduced);

    }

    function isReduced() {

        return reduced;

    }

    function setReduced(value) {

        reduced = !!value;

        localStorage.setItem(REDUCED_KEY, reduced ? "1" : "0");

        apply();

    }

    /* Runs on load rather than waiting for an init() call from script.js, the
       way every other module here is started.
     *
     * That inconsistency is the whole point of the file. script.js is the last
     * script on the page and everything else is loaded just above it, at the
     * bottom of <body> — by the time any of it runs the browser has already
     * laid out and painted the page once, fog and filters and all. A player
     * who turned this on because that first paint is what hurts would eat it
     * on every single load before the setting could apply.
     *
     * So this one file is loaded in <head>, ahead of the stylesheets, and sets
     * the class before there is anything to paint. It can afford to be there
     * because it touches nothing but localStorage and documentElement: no DOM
     * to wait for, no other module to be ready. The obvious tidy — moving it
     * down with its siblings and calling PL.graphics.init() alongside
     * PL.sounds.init() — silently gives back the flash it exists to prevent.
     */
    reduced = localStorage.getItem(REDUCED_KEY) === "1";

    apply();

    return {
    isReduced: isReduced,
    setReduced: setReduced
};

}());
