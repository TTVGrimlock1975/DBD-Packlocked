/* Moving a save between browsers, machines, or origins.
 *
 * localStorage is per-origin, so a save made on a local copy and one made on
 * the hosted build are invisible to each other. This carries them across, and
 * doubles as the only real backup available to anyone playing on the hosted
 * build — clearing browser data currently takes everything with it.
 */

window.PL = window.PL || {};

PL.transfer = (function () {

    var FORMAT = 1;

    /* Only the game's own keys travel. An import writes nothing else, so a
       pasted blob cannot drop arbitrary keys into storage. */
    function isSaveKey(key) {

        return key.indexOf("save") === 0 || key === "currentSave";

    }

    function collect() {

        var out = {};

        for (var i = 0; i < localStorage.length; i++) {

            var key = localStorage.key(i);

            if (key && isSaveKey(key) && key.indexOf("backup_v1_") !== 0) {

                out[key] = localStorage.getItem(key);

            }

        }

        return out;

    }

    function note(message, ok) {

        var el = document.getElementById("transferNote");

        el.textContent = message;
        el.className = "plTransfer__note" + (ok === false ? " plTransfer__note--bad" : "");

    }

    function box() {

        return document.getElementById("transferBox");

    }

    function exportSave() {

        var keys = collect();
        var count = Object.keys(keys).length;

        if (count === 0) {

            note("Nothing to export yet — play a little first.", false);
            return;

        }

        var payload = JSON.stringify({
            packlocked: FORMAT,
            exportedAt: Date.now(),
            keys: keys
        });

        var field = box();

        field.value = payload;
        field.classList.remove("hidden");
        field.select();

        document.getElementById("applyImport").classList.add("hidden");

        /* The clipboard API needs a secure context. Both localhost and the
           hosted build qualify, but the textarea is left on screen either way
           so there is always a manual path. */
        if (navigator.clipboard && navigator.clipboard.writeText) {

            navigator.clipboard.writeText(payload).then(function () {

                note("Copied to clipboard — " + count + " keys. Paste it into Import on the other site.");

            }, function () {

                note("Select the text above and copy it — " + count + " keys.");

            });

        } else {

            note("Select the text above and copy it — " + count + " keys.");

        }

    }

    function beginImport() {

        var field = box();

        field.value = "";
        field.placeholder = "Paste your exported save here, then press Apply Import.";
        field.classList.remove("hidden");
        field.focus();

        document.getElementById("applyImport").classList.remove("hidden");

        note("Your current save is snapshotted before anything is overwritten.");

    }

    function applyImport() {

        var raw = box().value.trim();

        if (!raw) {

            note("Nothing pasted yet.", false);
            return;

        }

        var parsed;

        try {

            parsed = JSON.parse(raw);

        } catch (e) {

            note("That does not look like an exported save.", false);
            return;

        }

        /* Accepts both the exported envelope and a bare key/value map, so a
           save lifted straight out of the console still imports. */
        var keys = (parsed && parsed.keys) ? parsed.keys : parsed;

        if (!keys || typeof keys !== "object" || Array.isArray(keys)) {

            note("That does not look like an exported save.", false);
            return;

        }

        var incoming = Object.keys(keys).filter(function (key) {

            return isSaveKey(key) && typeof keys[key] === "string";

        });

        if (incoming.length === 0) {

            note("No save data found in that.", false);
            return;

        }

        /* Snapshot before overwriting, so an import is always reversible. */
        var existing = collect();

        Object.keys(existing).forEach(function (key) {

            localStorage.setItem("preimport_" + key, existing[key]);

        });

        incoming.forEach(function (key) {

            localStorage.setItem(key, keys[key]);

        });

        note("Imported " + incoming.length + " keys. Reloading…");

        setTimeout(function () {

            location.reload();

        }, 700);

    }

    function init() {

        document.getElementById("exportSave").addEventListener("click", exportSave);
        document.getElementById("importSave").addEventListener("click", beginImport);
        document.getElementById("applyImport").addEventListener("click", applyImport);

    }

    return {
        init: init,
        exportSave: exportSave,
        applyImport: applyImport
    };

}());
