/* Foil cards.
 *
 * A real foil is not a moving stripe — it is a prismatic layer whose colour
 * depends on the angle you hold it at. So the card tilts toward the pointer and
 * the holographic layer shifts with it, which is the part that sells it.
 *
 * Handlers are bound once on the document rather than per card, because the
 * inventory re-renders its whole grid on every search keystroke, sort, filter,
 * sell and equip — binding per card would leak listeners on every pass.
 */

window.PL = window.PL || {};

PL.foil = (function () {

    /* Degrees of tilt at the very edge of the card. Past about 12 the card
       reads as falling over rather than catching light. */
    var MAX_TILT = 9;

    var reduced = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function faceOf(target) {

        if (!target || !target.closest) {

            return null;

        }

        var card = target.closest(".plCard--foil");

        return card ? card.querySelector(".plCard__face") : null;

    }

    function track(event) {

        var face = faceOf(event.target);

        if (!face) {

            return;

        }

        var box = face.getBoundingClientRect();

        if (!box.width || !box.height) {

            return;

        }

        var x = (event.clientX - box.left) / box.width;
        var y = (event.clientY - box.top) / box.height;

        face.style.setProperty("--fx", (x * 100).toFixed(2) + "%");
        face.style.setProperty("--fy", (y * 100).toFixed(2) + "%");

        if (!reduced) {

            face.style.setProperty("--rx", ((0.5 - y) * MAX_TILT).toFixed(2) + "deg");
            face.style.setProperty("--ry", ((x - 0.5) * MAX_TILT).toFixed(2) + "deg");

        }

        face.classList.add("plCard__face--live");

    }

    function release(event) {

        var face = faceOf(event.target);

        if (!face) {

            return;

        }

        face.classList.remove("plCard__face--live");
        face.style.removeProperty("--rx");
        face.style.removeProperty("--ry");

    }

    function init() {

        /* Passive: these only ever read pointer position, so they must never
           hold up scrolling. */
        document.addEventListener("pointermove", track, { passive: true });
        document.addEventListener("pointerleave", release, true);
        document.addEventListener("pointercancel", release, true);

        /* A touch ends without a leave event, so the tilt would stick. */
        document.addEventListener("pointerup", release, { passive: true });

    }

    return { init: init };

}());
