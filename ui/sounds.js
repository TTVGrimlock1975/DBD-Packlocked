/* Sound effects.
 *
 * Three cues, all optional: the interface stays usable with audio blocked or
 * muted, so every play is fire-and-forget and failures are swallowed. Browsers
 * refuse audio until the page has been interacted with, which makes a rejected
 * play() an expected outcome rather than an error.
 *
 * Volume is two numbers multiplied together. MIX is the balance between the
 * three cues, which differ wildly because the source files do; master is the
 * player's slider. At master 1 the game sounds exactly as it always has, so
 * turning the control down scales the whole mix instead of flattening it.
 */

window.PL = window.PL || {};

PL.sounds = (function () {

    /* The balance, tuned against the current audio files. Change these to
       rebalance the cues against each other — not the files themselves. */
    var MIX = {
    click: 0.75,
    packRip: 0.03,
    cardFlip: 0.5,
    specialReveal: 0.5
};

    /* Deliberately not a save key. Volume belongs to the device, not the save:
       it survives switching slots, and isSaveKey() in transfer.js matches
       anything starting with "save", so this stays out of export and import. */
    var VOLUME_KEY = "plVolume";
    var MUTED_KEY = "plMuted";

    var master = 1;
    var muted = false;

    /* Click and rip are one-at-a-time, so a single element each is enough and
       rewinding it is cheaper than building a new one per press. */
    var click = new Audio("sounds/click.wav");
    var packRip = new Audio("sounds/pack-rip.wav");
    var specialReveal = new Audio("sounds/special-reveal.wav");

    function level(name) {

        return muted ? 0 : MIX[name] * master;

    }

    function play(sound, name) {

        var volume = level(name);

        /* Silent is silent — no point starting playback to hear nothing. */
        if (volume <= 0) {

            return;

        }

        sound.volume = volume;
        sound.currentTime = 0;

        var promise = sound.play();

        if (promise) {

            promise.catch(function () {
                /* Autoplay blocked, or no output device. Not worth reporting. */
            });

        }

    }

    function clickSound() {

        play(click, "click");

    }

    function packRipSound() {

        play(packRip, "packRip");

    }

    /* Plays the shared celebration cue for Legendary, Standard Foil, and
   Entity Touched reveals. */
    function specialRevealSound() {

        play(specialReveal, "specialReveal");

    }

    /* Reveal flips are staggered while the clip runs longer than the gap, so the
       sounds have to overlap. A shared element cannot — rewinding it would cut
       off the flip still playing — so each flip gets its own. The file is in
       cache by then, so this costs nothing to fetch. */
    function cardFlipSound() {

        var volume = level("cardFlip");

        if (volume <= 0) {

            return;

        }

        var sound = new Audio("sounds/card-flip.wav");

        sound.volume = volume;

        sound.play().catch(function () {
            /* As above. */
        });

    }

    function getVolume() {

        return master;

    }

    /* Takes 0–1. Anything outside that, or not a number, is ignored rather than
       silently muting the game. */
    function setVolume(value) {

        var next = Number(value);

        if (!isFinite(next)) {

            return;

        }

        master = Math.min(1, Math.max(0, next));

        localStorage.setItem(VOLUME_KEY, String(master));

    }

    function isMuted() {

        return muted;

    }

    function setMuted(value) {

        muted = !!value;

        localStorage.setItem(MUTED_KEY, muted ? "1" : "0");

    }

    /* Plays the click at the current level, so dragging the slider is audible
       without having to go and press something. */
    function preview() {

        clickSound();

    }

    function init() {

        var savedVolume = localStorage.getItem(VOLUME_KEY);

        /* Number(null) is 0, so a missing key would start the game silent.
           Absent means full, which is how it behaved before there was a slider. */
        var parsed = savedVolume === null ? NaN : Number(savedVolume);

        master = (isFinite(parsed) && parsed >= 0 && parsed <= 1) ? parsed : 1;

        muted = localStorage.getItem(MUTED_KEY) === "1";

    }

    return {
    click: clickSound,
    packRip: packRipSound,
    cardFlip: cardFlipSound,
    specialReveal: specialRevealSound,
    getVolume: getVolume,
    setVolume: setVolume,
    isMuted: isMuted,
    setMuted: setMuted,
    preview: preview,
    init: init
};

}());
