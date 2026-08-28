/* Sound effects.
 *
 * All optional: the interface stays usable with audio blocked or muted, so
 * every play is fire-and-forget and failures are swallowed. Browsers refuse
 * audio until the page has been interacted with, which makes a rejected
 * play() an expected outcome rather than an error.
 *
 * Volume is two numbers multiplied together. MIX is the balance between the
 * cues, which differ wildly because the source files do; master is the
 * player's slider. At master 1 the game sounds exactly as it always has, so
 * turning the control down scales the whole mix instead of flattening it.
 *
 * The eight cues below confirm/error/sell/select/toggle/modalOpen/
 * modalClose/milestoneComplete are Kenney's Interface Sounds pack (CC0.
 * sounds/KENNEY-LICENSE.txt), picked for the moments that used to share the
 * one flat click every button on the page makes: claiming a reward, selling
 * a card, winning or losing a bargain, equipping, flipping a toggle, opening
 * or closing a modal. milestoneComplete is reserved for the one moment nothing
 * else is -- a save reaching 100% -- rather than sharing a cue with an
 * ordinary claim.
 */

window.PL = window.PL || {};

PL.sounds = (function () {

    /* The balance, tuned against the current audio files. Change these to
       rebalance the cues against each other, not the files themselves. */
    var MIX = {
    click: 0.75,
    packRip: 0.03,
    cardFlip: 0.5,
    specialReveal: 0.5,
    confirm: 0.5,
    error: 0.5,
    sell: 0.5,
    select: 0.5,
    toggle: 0.5,
    modalOpen: 0.4,
    modalClose: 0.5,
    milestoneComplete: 0.6
};

    /* Which slider each cue answers to. The split is by what the sound is
       telling you about rather than by where the file came from: everything
       you did to the interface in one group, everything a pack did to you in
       the other. milestoneComplete sits with the interface despite being a
       celebration, because it fires on a save reaching 100% rather than on
       anything a pack does.

       Every cue in MIX above has to appear here exactly once. A cue missing
       from this map would play at channel 1 no matter where the sliders are,
       which is silent to notice and confusing to debug. */
    var CHANNEL_OF = {
    click: "interface",
    confirm: "interface",
    error: "interface",
    sell: "interface",
    select: "interface",
    toggle: "interface",
    modalOpen: "interface",
    modalClose: "interface",
    milestoneComplete: "interface",
    packRip: "packs",
    cardFlip: "packs",
    specialReveal: "packs"
};

    /* Deliberately not save keys. Volume belongs to the device, not the save:
       it survives switching slots, and isSaveKey() in transfer.js matches
       anything starting with "save", so this stays out of export and import. */
    var VOLUME_KEY = "plVolume";
    var MUTED_KEY = "plMuted";

    var CHANNEL_KEY = {
    interface: "plVolInterface",
    packs: "plVolPacks"
};

    var master = 1;
    var muted = false;

    /* Both start full, so a player who had a volume set before the sliders
       existed hears exactly what they heard yesterday. */
    var channels = {
    interface: 1,
    packs: 1
};

    /* One-at-a-time cues, so a single element each is enough and rewinding it
       is cheaper than building a new one per play. cardFlip is the one
       exception -- see cardFlipSound below. */
    var click = new Audio("sounds/click.wav");
    var packRip = new Audio("sounds/pack-rip.wav");
    var specialReveal = new Audio("sounds/special-reveal.wav");
    var confirm = new Audio("sounds/confirm.wav");
    var error = new Audio("sounds/error.wav");
    var sell = new Audio("sounds/sell.wav");
    var select = new Audio("sounds/select.wav");
    var toggle = new Audio("sounds/toggle.wav");
    var modalOpen = new Audio("sounds/modal-open.wav");
    var modalClose = new Audio("sounds/modal-close.wav");
    var milestoneComplete = new Audio("sounds/milestone-complete.wav");

    /* Three numbers multiplied together. MIX is the balance between the cues,
       fixed here; the channel is the slider for the group the cue belongs to;
       master is the slider over both. A cue with no channel falls back to 1
       rather than 0, so a cue added to MIX and forgotten here still plays. */
    function level(name) {

        if (muted) {

            return 0;

        }

        var channel = CHANNEL_OF[name];

        return MIX[name] * (channel ? channels[channel] : 1) * master;

    }

    function getChannel(name) {

        return channels[name];

    }

    /* Takes 0-1, same as setVolume. Anything outside that, or not a number, or
       not a channel we have, is ignored rather than silently muting a group. */
    function setChannel(name, value) {

        if (!CHANNEL_KEY[name]) {

            return;

        }

        var next = Number(value);

        if (!isFinite(next)) {

            return;

        }

        channels[name] = Math.min(1, Math.max(0, next));

        localStorage.setItem(CHANNEL_KEY[name], String(channels[name]));

    }

    function play(sound, name) {

        var volume = level(name);

        /* Silent is silent. No point starting playback to hear nothing. */
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

    function confirmSound() {

        play(confirm, "confirm");

    }

    function errorSound() {

        play(error, "error");

    }

    function sellSound() {

        play(sell, "sell");

    }

    function selectSound() {

        play(select, "select");

    }

    function toggleSound() {

        play(toggle, "toggle");

    }

    function modalOpenSound() {

        play(modalOpen, "modalOpen");

    }

    function modalCloseSound() {

        play(modalClose, "modalClose");

    }

    /* The one moment a plain claim isn't: the save itself hitting 100%. */
    function milestoneCompleteSound() {

        play(milestoneComplete, "milestoneComplete");

    }

    /* Reveal flips are staggered while the clip runs longer than the gap, so the
       sounds have to overlap. A shared element cannot, rewinding it would cut
       off the flip still playing, so each flip gets its own. The file is in
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

        /* Same rule as the master above, for the same reason: absent or
           unreadable means full. A channel that defaulted to 0 would leave a
           group of cues silent with no way to tell why. */
        Object.keys(CHANNEL_KEY).forEach(function (name) {

            var saved = localStorage.getItem(CHANNEL_KEY[name]);
            var value = saved === null || saved === "" ? NaN : Number(saved);

            channels[name] = (isFinite(value) && value >= 0 && value <= 1) ? value : 1;

        });

    }

    return {
    click: clickSound,
    packRip: packRipSound,
    cardFlip: cardFlipSound,
    specialReveal: specialRevealSound,
    confirm: confirmSound,
    error: errorSound,
    sell: sellSound,
    select: selectSound,
    toggle: toggleSound,
    modalOpen: modalOpenSound,
    modalClose: modalCloseSound,
    milestoneComplete: milestoneCompleteSound,
    getVolume: getVolume,
    setVolume: setVolume,
    getChannel: getChannel,
    setChannel: setChannel,
    isMuted: isMuted,
    setMuted: setMuted,
    preview: preview,
    /* Exposed so the volume arithmetic can be asserted on directly rather than
       inferred from whether something sounded right. See sounds.test.mjs. */
    volumeFor: level,
    init: init
};

}());
