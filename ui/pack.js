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

        function finishTear() {

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

                reveal(packType, cards, onCommit);

            }, BURST_MS);

        }

        quick.addEventListener("click", finishTear);

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

                finishTear();
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

    function reveal(packType, cards, onCommit) {

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

            return order.indexOf(b.rarity) > order.indexOf(a.rarity) ? b : a;

        });

        stage.innerHTML =
            '<div class="plReveal">' +
                '<p class="plReveal__head">' +
                    packType + " Pack — " + cards.length + " pulled" +
                "</p>" +
                '<div class="plReveal__cards">' +
                    cards.map(function (card, i) {

                        return '<div class="plReveal__card" ' +
                            'style="animation-delay:' + (i * DEAL_MS) + 'ms">' +
                            PL.card.render(card, { foil: card.foil }) +
                        "</div>";

                    }).join("") +
                "</div>" +
                '<div class="plReveal__actions">' +
                    '<button type="button" class="plContinue">Continue</button>' +
                "</div>" +
            "</div>";

        /* A Legendary earns the screen shake the app already had. */
        if (best.rarity === "Legendary") {

            stage.classList.add("legendaryScreenFlash");
            stage.classList.add("legendaryScreenShake");

            setTimeout(function () {

                stage.classList.remove("legendaryScreenFlash");
                stage.classList.remove("legendaryScreenShake");

            }, 900);

        }

        /* One flip per card, landing with it. Scheduled here rather than from
           inside the map above, which only builds markup. The handles are kept
           so clicking through early does not leave sounds firing at an empty
           stage. */
        var flips = cards.map(function (card, i) {

            return setTimeout(PL.sounds.cardFlip, i * DEAL_MS);

        });

        onCommit();

        stage.querySelector(".plContinue").addEventListener("click", function () {

            flips.forEach(clearTimeout);

            stage.innerHTML = "";

        });

    }

    return { open: open };

}());
