window.PL = window.PL || {};

PL.sounds = (function () {

    const click = new Audio("sounds/click.wav");
    const packRip = new Audio("sounds/pack-rip.wav");
    const cardFlip = new Audio("sounds/card-flip.wav");

    click.volume = 0.35;
    packRip.volume = 0.03;
    cardFlip.volume = 1.0;

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

    const sound = new Audio("sounds/card-flip.wav");

    sound.volume = 0.50;

    sound.play().catch(function () {
        // Ignore browser playback restrictions.
    });

}

    return {
        click: clickSound,
        packRip: packRipSound,
        cardFlip: cardFlipSound
    };

}());
