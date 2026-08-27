/* Dev-only: fill the current save with every card in the pool.
 *
 * Not part of the game. Load it from the browser console:
 *
 *     fetch('/tools/dev-fill-save.js').then(r => r.text()).then(eval)
 *
 * It backs the current save up first, then writes one of every card into the
 * inventory, marks the whole collection discovered, and refreshes the UI.
 *
 *     devFillSave.restore()   put the save back exactly as it was
 *     devFillSave.backup()    take another snapshot by hand
 *
 * The arrays are mutated in place rather than reassigned: script.js declares
 * them with `let` at top level, so they live in the global lexical scope and
 * are not properties of window — `inventory.length = 0` works where
 * `window.inventory = []` silently would not.
 */

(function () {

    var KEYS = [
        "tokens", "inventory", "collection", "foilCollection", "jackBuildsSeen",
        "collectionMilestones",
        "history", "stats", "loadout", "dailyShop", "shopReset",
        "rotatingPackShop", "rotatingPackShopReset"
    ];

    var BACKUP_KEY = "devFillSave_backup";

    function saveKey(key) {
        return "save" + currentSave + "_" + key;
    }

    /* Everything the game can drop. offerings is in gameData but empty today;
       concatenating it anyway means this keeps working if it fills up. */
    function pool() {
        return [].concat(
            gameData.perks || [],
            gameData.items || [],
            gameData.addons || [],
            gameData.offerings || []
        );
    }

    function backup() {

        var snapshot = { save: currentSave, taken: new Date().toISOString(), data: {} };

        KEYS.forEach(function (key) {
            snapshot.data[key] = localStorage.getItem(saveKey(key));
        });

        localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshot));

        console.log(
            "%c[dev-fill-save] backed up save " + currentSave,
            "color:#D2564A;font-weight:bold"
        );

        return snapshot;

    }

    function restore() {

        var raw = localStorage.getItem(BACKUP_KEY);

        if (!raw) {
            console.warn("[dev-fill-save] no backup found — nothing to restore.");
            return false;
        }

        var snapshot = JSON.parse(raw);

        if (snapshot.save !== currentSave) {
            console.warn(
                "[dev-fill-save] backup is for save " + snapshot.save +
                " but you are on save " + currentSave + ". Switch slots first."
            );
            return false;
        }

        KEYS.forEach(function (key) {

            var value = snapshot.data[key];

            if (value === null) {
                localStorage.removeItem(saveKey(key));
            } else {
                localStorage.setItem(saveKey(key), value);
            }

        });

        console.log(
            "%c[dev-fill-save] restored save " + currentSave +
            " (taken " + snapshot.taken + ") — reloading",
            "color:#D2564A;font-weight:bold"
        );

        location.reload();

        return true;

    }

    function fill(options) {

        options = options || {};

        backup();

        var cards = pool();

        inventory.length = 0;
        collection.length = 0;
        foilCollection.length = 0;

        cards.forEach(function (card, i) {

            /* Spread the states across the pool so one screen shows a normal
               card, a foil, an Entity Touched foil, and the x2+ count badge
               without needing a hand-built list. */
            var isFoil = (i % 7 === 0);
            var isEntity = (i % 23 === 0);

            inventory.push({
                name: card.name,
                rarity: card.rarity,
                type: card.type,
                amount: 1 + (i % 4),
                foil: isFoil,
                foilVariant: isEntity ? "entityTouched" : "standard"
            });

            collection.push(card.name);

            if (isFoil) {
                foilCollection.push(card.name);
            }

        });

        if (typeof options.tokens === "number") {
            tokens = options.tokens;
        }

        saveCurrentGame();

        if (typeof updateInventoryDisplay === "function") updateInventoryDisplay();
        if (typeof updateCollectionCounter === "function") updateCollectionCounter();
        if (typeof updateStatsDisplay === "function") updateStatsDisplay();
        if (typeof updatePackButtons === "function") updatePackButtons();

        var byRarity = {};

        cards.forEach(function (card) {
            byRarity[card.rarity] = (byRarity[card.rarity] || 0) + 1;
        });

        console.log(
            "%c[dev-fill-save] filled save " + currentSave + " with " +
            cards.length + " cards",
            "color:#D2564A;font-weight:bold"
        );
        console.table(byRarity);
        console.log("Run devFillSave.restore() to put your old save back.");

        return cards.length;

    }

    window.devFillSave = {
        fill: fill,
        backup: backup,
        restore: restore,
        pool: pool
    };

    /* Loading the file is the instruction to run it. */
    fill();

}());
