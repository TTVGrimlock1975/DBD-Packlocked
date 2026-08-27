/* Dev-only: a perk tier list, grouped by rarity.
 *
 * Not part of the game — nothing in the normal UI links here. Load it by
 * appending ?tierlist to the URL, e.g. index.html?tierlist. The point is
 * eyeballing a rarity rework across the whole pool at once, the way a
 * spreadsheet of before/after rarities cannot: every perk rendered as the
 * actual card it will be pulled as, grouped under the tier it landed in.
 *
 * Reuses PL.card.render (the one face every card in the game already shares)
 * and the existing .modal chrome, so this is markup and grouping only — no
 * new card rendering, no new modal mechanics.
 */

window.PL = window.PL || {};

PL.tierlist = (function () {

    /* Rarest first, so the smaller, more scrutinised groups sit at the top
       rather than requiring a scroll past Common to reach them. Special is
       left out on purpose -- the five Specials are not part of the rarity
       rework this exists to check, and forcing them into a tier column
       beside "Legendary" would misrepresent them as one. */
    var TIERS = ["Legendary", "Epic", "Rare", "Common"];

    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    }

    function section(tier, perks) {

        var cards = perks
            .filter(function (perk) { return perk.rarity === tier; })
            .slice()
            .sort(function (a, b) { return a.name.localeCompare(b.name); });

        var grid = cards.map(function (card) {
            return PL.card.render(card);
        }).join("");

        return '<section class="tierSection">' +
                   '<h3 class="tierSection__head ' + tier.toLowerCase() + '">' +
                       escapeHtml(tier) +
                       '<b class="tierSection__count">' + cards.length + '</b>' +
                   '</h3>' +
                   '<div class="tierSection__grid">' + grid + '</div>' +
               '</section>';

    }

    function build() {

        var perks = (typeof gameData !== "undefined" && gameData.perks) || [];

        var modal = document.getElementById("tierlistModal");

        if (!modal) {

            modal = document.createElement("div");
            modal.id = "tierlistModal";
            modal.className = "modal";

            document.body.appendChild(modal);

        }

        modal.innerHTML =
            '<div class="modalContent">' +
                '<header class="modalHead">' +
                    '<button type="button" class="modalClose" aria-label="Close">&times;</button>' +
                    '<p class="plEyebrow">Dev Only</p>' +
                    '<h2>Perk Tier List</h2>' +
                '</header>' +
                TIERS.map(function (tier) { return section(tier, perks); }).join("") +
            '</div>';

        modal.querySelector(".modalClose").addEventListener("click", function () {
            closeModal(modal);
        });

        openModal(modal);

    }

    /* The URL flag is the entire trigger, checked once at script load --
       same convention as tools/dev-fill-save.js, just automatic instead of
       pasted into the console. Placed after script.js in index.html so
       openModal/closeModal and gameData already exist by the time this runs. */
    if (new URLSearchParams(location.search).has("tierlist")) {
        build();
    }

    return { build: build };

}());
