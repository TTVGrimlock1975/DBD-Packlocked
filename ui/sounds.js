window.PL = window.PL || {};

PL.sounds = (function () {

    const click = new Audio("sounds/click.wav");
    const packRip = new Audio("sounds/pack-rip.wav");
    const cardFlip = new Audio("sounds/card-flip.wav");

    click.volume = 0.35;
    packRip.volume = 0.70;
    cardFlip.volume = 0.50;

    function play(sound) {

        sound.currentTime = 0;

        const promise = sound.play();

        if (promise) {
            promise.catch(function () {
                // Ignore browser autoplay restrictions.
            });
        }

    }

    function clickSound() {
        play(click);
    }

    function packRipSound() {
        play(packRip);
    }

    function cardFlipSound() {
        play(cardFlip);
    }

    return {
        click: clickSound,
        packRip: packRipSound,
        cardFlip: cardFlipSound
    };

}());
