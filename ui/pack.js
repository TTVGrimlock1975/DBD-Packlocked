/* Opening a pack.
 *
 * You drag the seal off a sealed booster rather than watching it play out: the
 * pack resists, gives at the end of the pull, and the cards land. Quick Open is
 * there for anyone who would rather not drag.
 *
 * Replaces the earlier sequence where the wrapper split in half on a timer.
 */

window.PL = window.PL || {};

PL.pack = (function () {

    /* How far the seal has to travel, in px, before the pack gives. */
    var TEAR_DISTANCE = 130;

    /* Burst and embers, between the seal coming off and the cards landing. */
    var BURST_MS = 620;

    /* Gap between one card landing and the next. Drives both the CSS
       animation-delay and the flip sounds, so the two cannot drift apart. */
    var DEAL_MS = 130;

    /* How long a face-down card takes to turn over. Must match the .plBack--gone
       transition, or the back is torn away mid-turn. */
    var FLIP_MS = 420;

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");

    }

    /* Back-of-pack copy, in the spirit of a real booster. */
    var FINE = {
        Basic: "Perks · Sealed",
        Entity: "Perks · No commons",
        Item: "Items & add-ons"
    };

    /* Foil resists, then gives. A linear drag feels like sliding a panel. */
    function resistance(raw) {

        return Math.pow(raw, 1.7);

    }

    function embers() {

        var out = "";

        for (var i = 0; i < 8; i++) {

            out += '<i style="--i:' + i + '"></i>';

        }

        return out;

    }

    function open(packType, cards, onCommit) {

        var stage = document.getElementById("packAnimation");
        var tier = String(packType).toLowerCase();

        stage.innerHTML =
            '<div class="plOpen" data-tier="' + tier + '">' +

                '<div class="plOpen__quick">' +
                    '<button type="button" class="plQuick">Quick Open</button>' +
                    '<span class="plOpen__hint">or drag the seal left</span>' +
                "</div>" +

                '<div class="plBooster" style="--plTear:0">' +
                    PL.panels.wrapper(packType, cards.length, FINE[packType] || "") +
                    '<span class="plBooster__flood"></span>' +
                    '<span class="plBooster__seam"></span>' +
                "</div>" +

                '<span class="plBurst"></span>' +
                '<span class="plParts">' + embers() + "</span>" +

            "</div>";

        var open = stage.querySelector(".plOpen");
        var booster = stage.querySelector(".plBooster");
        var quick = stage.querySelector(".plQuick");

        var dragFrom = null;
        var torn = false;

        function setTear(value) {

            booster.style.setProperty("--plTear", value);

        }

        /* `manual` is the whole difference between the two ways in. Quick Open
           is the fast path and lands every card face up, the way it always has.
           Tearing the seal yourself is the deliberate one, so the cards land
           face down and you turn them over one at a time. */
        function finishTear(manual) {

            if (torn) {

                return;

            }

            torn = true;
            PL.sounds.packRip();
            dragFrom = null;

            setTear(1);
            booster.classList.add("plBooster--opening");
            open.classList.add("plOpen--burst");

            setTimeout(function () {

                reveal(packType, cards, onCommit, manual);

            }, BURST_MS);

        }

        quick.addEventListener("click", function () {

            finishTear(false);

        });

        booster.addEventListener("pointerdown", function (event) {

            if (torn) {

                return;

            }

            dragFrom = event.clientX;
            booster.setPointerCapture(event.pointerId);
            booster.classList.add("plBooster--opening");

        });

        booster.addEventListener("pointermove", function (event) {

            if (dragFrom === null) {

                return;

            }

            /* Drag left: the tear notch is on the right edge, so the pack opens
               the way it is built to open. */
            var raw = (dragFrom - event.clientX) / TEAR_DISTANCE;

            raw = Math.min(1, Math.max(0, raw));

            if (raw >= 1) {

                finishTear(true);
                return;

            }

            setTear(resistance(raw));

        });

        function release() {

            if (dragFrom === null || torn) {

                return;

            }

            /* Let go early and it springs back sealed. */
            dragFrom = null;
            setTear(0);
            booster.classList.remove("plBooster--opening");

        }

        booster.addEventListener("pointerup", release);
        booster.addEventListener("pointercancel", release);

    }

    function reveal(packType, cards, onCommit, manual) {

        var stage = document.getElementById("packAnimation");

        /* An empty pack should not strand the player on a dead stage, and the
           reduce below has no initial value so it would throw outright. */
        if (!cards.length) {

            stage.innerHTML = "";
            onCommit();
            return;

        }

        var best = cards.reduce(function (a, b) {

        var order = ["Common", "Rare", "Epic", "Legendary"];

        var aScore =
        (a.foil ? 1000 : 0) +
        order.indexOf(a.rarity);

        var bScore =
        (b.foil ? 1000 : 0) +
        order.indexOf(b.rarity);

        return bScore > aScore ? b : a;

});

        stage.innerHTML =
            '<div class="plReveal">' +
                '<p class="plReveal__head">' +
                    packType + " Pack — " + cards.length + " pulled" +
                "</p>" +
                '<div class="plReveal__cards">' +
                    cards.map(function (card, i) {

                        /* The back covers the real card rather than replacing
                           it, so the card itself still drives the layout and
                           nothing depends on hardcoding its height. */
                        var back = manual
                            ? '<button type="button" class="plBack" data-card="' + i + '"' +
                                  ' aria-label="Turn over card ' + (i + 1) + '">' +
                                  '<span class="plBack__mark">Packlocked</span>' +
                                  '<span class="plBack__rule"></span>' +
                                  '<span class="plBack__tier">' + escapeHtml(packType) + "</span>" +
                              "</button>"
                            : "";

                        return '<div class="plReveal__card' +
                            (manual ? " plReveal__card--down" : "") + '" ' +
                            'style="animation-delay:' + (manual ? 0 : i * DEAL_MS) + 'ms">' +
                            PL.card.render(card, { foil: card.foil }) +
                            back +
                        "</div>";

                    }).join("") +
                "</div>" +
                '<div class="plReveal__actions">' +
                    '<button type="button" class="plContinue">' +
                        (manual ? "Flip Next" : "Continue") +
                    "</button>" +
                "</div>" +
            "</div>";

        /* A Legendary earns the screen shake the app already had. Held back in
           manual mode until that card is actually turned, since firing it while
           everything is still face down gives the surprise away. */
        /* Plays the shared celebration cue for special cards. Legendary cards also
   retain their existing screen flash and shake. */
function celebrate(card) {

    if (card.rarity !== "Legendary" && !card.foil) {
    return;
}

    if (card.rarity !== "Legendary") {

        return;
    }

    stage.classList.add("legendaryScreenFlash");
    stage.classList.add("legendaryScreenShake");

    setTimeout(function () {
        stage.classList.remove("legendaryScreenFlash");
        stage.classList.remove("legendaryScreenShake");

    }, 900);

}

        var flips = [];

        if (manual) {

            wireManualFlips(stage, cards, celebrate);

        } else {

            celebrate(best);

            /* One flip per card, landing with it. Scheduled here rather than
               from inside the map above, which only builds markup. The handles
               are kept so clicking through early does not leave sounds firing
               at an empty stage. */
            flips = cards.map(function (card, i) {

                return setTimeout(PL.sounds.cardFlip, i * DEAL_MS);

            });

        }

        /* Banked on tear, not on flip: turning the cards over is presentation,
           so closing the tab halfway through never costs anyone a pull. */
        onCommit();

        stage.querySelector(".plContinue").addEventListener("click", function () {

            /* In manual mode the button turns the next card until there are
               none left; wireManualFlips swaps it back to closing the stage. */
            if (stage.querySelector(".plBack")) {

                return;

            }

            flips.forEach(clearTimeout);

            stage.innerHTML = "";

        });

    }

    /* Face-down cards: click one to turn it, or press the button to turn the
       next. Both do exactly the same thing, so the button is just a bigger
       target for anyone who would rather not aim at each card. */
    function wireManualFlips(stage, cards, celebrate) {

        var action = stage.querySelector(".plContinue");

        function flip(back) {

            if (!back || back.disabled) {

                return;

            }

            var index = Number(back.getAttribute("data-card"));

            /* Disabled first: a double-click would otherwise fire the sound and
               the Legendary shake twice for one card. */
            back.disabled = true;
            back.classList.add("plBack--gone");

            PL.sounds.cardFlip();

            celebrate(cards[index]);

            /* Removed only once the turn has played out, so the card underneath
               is not revealed before the back has finished moving. */
            setTimeout(function () {

                var holder = back.parentNode;

                if (holder) {

                    holder.classList.remove("plReveal__card--down");

                }

                back.remove();

                if (!stage.querySelector(".plBack")) {

                    action.textContent = "Continue";

                }

            }, FLIP_MS);

        }

        stage.querySelector(".plReveal__cards").addEventListener("click", function (event) {

            flip(event.target.closest(".plBack"));

        });

        action.addEventListener("click", function () {

            flip(stage.querySelector(".plBack:not([disabled])"));

        });

    }

    return { open: open };

}());
