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

    /* Which slot the import writes into. Defaults to the one being played, and
       the picker re-syncs to that every time Import is pressed. */
    var target = null;

    /* Only the game's own keys travel. An import writes nothing else, so a
       pasted blob cannot drop arbitrary keys into storage. */
    function isSaveKey(key) {

        return key.indexOf("save") === 0 || key === "currentSave";

    }

    /* save3_inventory -> { slot: 3, field: "inventory" }, and null for anything
       that is not a slot key. currentSave deliberately fails here: it records
       which slot is being played, which is a property of this browser rather
       than of the save, and carrying it would let an import silently move the
       player to a different slot. */
    function splitKey(key) {

        var match = /^save(\d+)_(.+)$/.exec(key);

        if (!match) {
            return null;
        }

        return { slot: Number(match[1]), field: match[2] };

    }

    function activeSlot() {

        return Number(localStorage.getItem("currentSave")) || 1;

    }

    /* One slot's keys, not the whole of storage. Previously this swept every
       key beginning with "save", which is all three slots — so an export
       carried saves the player never meant to share and an import overwrote
       two they were not looking at. */
    function collect(slot) {

        var out = {};

        for (var i = 0; i < localStorage.length; i++) {

            var key = localStorage.key(i);

            if (!key || key.indexOf("backup_v1_") === 0) {
                continue;
            }

            var parts = splitKey(key);

            if (parts && parts.slot === slot) {

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

        var slot = activeSlot();
        var keys = collect(slot);
        var count = Object.keys(keys).length;

        if (count === 0) {

            note("Save " + slot + " is empty — play a little first.", false);
            return;

        }

        var payload = JSON.stringify({
            packlocked: FORMAT,
            exportedAt: Date.now(),
            /* Recorded so the import can say where it came from. It does not
               decide where it lands — the picker does. */
            slot: slot,
            keys: keys
        });

        var field = box();

        field.value = payload;
        field.classList.remove("hidden");
        field.select();

        document.getElementById("applyImport").classList.add("hidden");
        document.getElementById("importTarget").classList.add("hidden");

        /* The clipboard API needs a secure context. Both localhost and the
           hosted build qualify, but the textarea is left on screen either way
           so there is always a manual path. */
        var tail = "Save " + slot + " only — your other slots are not included.";

        if (navigator.clipboard && navigator.clipboard.writeText) {

            navigator.clipboard.writeText(payload).then(function () {

                note("Copied to clipboard — " + count + " keys. " + tail);

            }, function () {

                note("Select the text above and copy it — " + count + " keys. " + tail);

            });

        } else {

            note("Select the text above and copy it — " + count + " keys. " + tail);

        }

    }

    /* The picker. Selection is held in `target` rather than read back out of
       the DOM, so the write path never depends on which button happens to
       carry a class. */
    function setTarget(slot) {

        target = slot;

        document.querySelectorAll(".plTransfer__slot").forEach(function (button) {

            button.classList.toggle(
                "active",
                Number(button.dataset.slot) === slot
            );

        });

    }

    function beginImport() {

        var field = box();

        field.value = "";
        field.placeholder = "Paste your exported save here, then press Apply Import.";
        field.classList.remove("hidden");
        field.focus();

        document.getElementById("applyImport").classList.remove("hidden");
        document.getElementById("importTarget").classList.remove("hidden");

        /* Starts on the slot in play, so pressing straight through does the
           least surprising thing. */
        setTarget(activeSlot());

        note("Pick the slot to import into. Only that slot is touched, and it is snapshotted first.");

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

        var slot = target || activeSlot();

        /* Rewrite every incoming key onto the chosen slot. A blob exported from
           save1 imported into save3 arrives as save3_*, so the destination is
           the picker's choice and never the exporter's. currentSave is dropped
           by splitKey, so an import cannot move which slot is being played.

           Keyed by destination, which also collapses a blob that somehow
           carries more than one slot down to a single set rather than writing
           whichever came last. */
        var writes = {};

        Object.keys(keys).forEach(function (key) {

            if (typeof keys[key] !== "string") {
                return;
            }

            var parts = splitKey(key);

            if (!parts) {
                return;
            }

            writes["save" + slot + "_" + parts.field] = keys[key];

        });

        var incoming = Object.keys(writes);

        if (incoming.length === 0) {

            note("No save data found in that.", false);
            return;

        }

        /* Every value this game writes is either a number or the output of
           JSON.stringify, so all of them must parse. Checked before anything is
           written: a value that does not parse would throw on the next load and
           leave the game half-started, with no way back through the UI. */
        var damaged = incoming.filter(function (key) {

            try {

                JSON.parse(writes[key]);
                return false;

            } catch (e) {

                return true;

            }

        });

        if (damaged.length) {

            note("That save is damaged — " + damaged[0] + " is not readable.", false);
            return;

        }

        /* Snapshot before overwriting, so an import is always reversible.
           Written once and never replaced: a second import used to overwrite
           this with the state the first import had already left behind, so the
           player's own save — the only one worth getting back to — was lost. */
        var existing = collect(slot);

        Object.keys(existing).forEach(function (key) {

            var backup = "preimport_" + key;

            if (localStorage.getItem(backup) === null) {

                localStorage.setItem(backup, existing[key]);

            }

        });

        incoming.forEach(function (key) {

            localStorage.setItem(key, writes[key]);

        });

        var from = (parsed && parsed.slot) ? " from Save " + parsed.slot : "";

        note("Imported " + incoming.length + " keys" + from +
            " into Save " + slot + ". Reloading…");

        setTimeout(function () {

            location.reload();

        }, 700);

    }

    function init() {

        document.getElementById("exportSave").addEventListener("click", exportSave);
        document.getElementById("importSave").addEventListener("click", beginImport);
        document.getElementById("applyImport").addEventListener("click", applyImport);

        document.querySelectorAll(".plTransfer__slot").forEach(function (button) {

            button.addEventListener("click", function () {

                setTarget(Number(button.dataset.slot));

                note("Importing into Save " + target + ". Nothing else is touched.");

            });

        });

    }

    return {
        init: init,
        exportSave: exportSave,
        applyImport: applyImport
    };

}());
