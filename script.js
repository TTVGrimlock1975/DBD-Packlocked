let currentSave =
    Number(localStorage.getItem("currentSave")) || 1;

function getSaveKey(key) {

    return `save${currentSave}_${key}`;

}

let tokens = 0;



let inventory = [];

let collection = [];

let foilCollection = [];

/* Stored under its own save key rather than folded into an existing one, so a
   save written by an older build simply has no history and starts empty, and
   an older build reading a newer save ignores the extra key entirely. */
let pullHistory = [];

const PULL_HISTORY_LIMIT = 50;

let loadout = {
    perks: [],
    item: null,
    addons: [],
    aceLocked: false
};


let stats = {
    escapes: 0,
    sacrifices: 0,
    packsOpened: 0,
    foilsPulled: 0
};

const tokenDisplay = document.getElementById("tokens");

const removeTokenButton = document.getElementById("removeToken");

const basicPackButton = document.getElementById("basicPack");
const entityPackButton = document.getElementById("entityPack");
const itemPackButton =
    document.getElementById("itemPack");

const inventoryDisplay = document.getElementById("inventory");
const collectionCounter =
    document.getElementById("collectionCounter");
const perkSlots = [
    document.getElementById("perk1"),
    document.getElementById("perk2"),
    document.getElementById("perk3"),
    document.getElementById("perk4")
];

const itemSlot = document.getElementById("itemSlot");

const addonSlots = [
    document.getElementById("addon1"),
    document.getElementById("addon2")
];

const escapedButton = document.getElementById("escapedButton");
const sacrificedButton = document.getElementById("sacrificedButton");


const packAnimation = document.getElementById("packAnimation");

const tokenGuideButton = document.getElementById("tokenGuideButton");
const tokenGuide = document.getElementById("tokenGuide");
const closeGuide = document.getElementById("closeGuide");
const guideButton = document.getElementById("guideButton");
const guideModal = document.getElementById("guideModal");
const closeGuideModal = document.getElementById("closeGuideModal");


const collectionModal = document.getElementById("collectionModal");
const closeCollection = document.getElementById("closeCollection");
const collectionProgress =
    document.getElementById("collectionProgress");
const collectionList =
    document.getElementById("collectionList");

const collectionTabs =
    document.querySelectorAll(".collectionTab");

const resetInventoryButton =
    document.getElementById("resetInventory");

const rewardRows =
    document.querySelectorAll(".rewardRow");

const inventoryTabs =
    document.querySelectorAll(".inventoryTab");

let currentInventoryTab = "perk";

const tokenPopup =
    document.getElementById("tokenPopup");

const tokenShop =
    document.getElementById("tokenShop");

const shopTimer =
    document.getElementById("shopTimer");

const kingUpgradeModal =
    document.getElementById("kingUpgradeModal");

const closeKingUpgrade =
    document.getElementById("closeKingUpgrade");

const kingUpgradeList =
    document.getElementById("kingUpgradeList");

const kingUpgradeResult =
    document.getElementById("kingUpgradeResult");

closeKingUpgrade.addEventListener(
    "click",
    function () {

        kingUpgradeModal.style.display = "none";

    }
);

let dailyShop = [];

/* Rotating Pack Shop: these definitions describe every special pack that can
   appear in the two rotating slots. Rarity restrictions are hard filters,
   while "basic" uses the same rarity odds as the existing Basic Pack. */
const ROTATING_PACKS = [
    {
        id: "fiftyFifty",
        name: "50/50 Pack",
        description: "1 card · Common or Legendary",
        cost: 10,
        cards: 1,
        rarityMode: "fiftyFifty"
    },
    {
        id: "trash",
        name: "Trash Pack",
        description: "6 cards · Commons only",
        cost: 7,
        cards: 6,
        rarityMode: "common"
    },
    {
        id: "duplicator",
        name: "Duplicator Pack",
        description: "3 cards · Same card three times",
        cost: 5,
        cards: 3,
        rarityMode: "basic",
        duplicate: true
    },
    {
        id: "lucky",
        name: "Lucky Pack",
        description: "3 cards · Epic or Legendary",
        cost: 20,
        cards: 3,
        rarityMode: "lucky"
    },
    {
        id: "rustyEquipment",
        name: "Rusty Equipment Pack",
        description: "4 cards · Common Items & Add-ons",
        cost: 7,
        cards: 4,
        rarityMode: "common",
        equipment: true
    },
    {
        id: "heavy",
        name: "Heavy Pack",
        description: "3 cards · 50% better foil odds",
        cost: 12,
        cards: 3,
        rarityMode: "basic",
        heavy: true
    },
    {
    id: "joker",
    name: "Faces & Aces",
    description: "1 card · Special",
    cost: 10,
    cards: 1,
    rarityMode: "joker",
    joker: true
    }
];

/* Generates two unique rotating packs and gives each one 1-3 purchases of
   stock. The generated shop persists until its two-hour timer expires. */
function generateRotatingPackShop() {

    const now = Date.now();

    const shopReset =
        Number(
            localStorage.getItem(
                getSaveKey("rotatingPackShopReset")
            )
        ) || 0;

    if (
        now < shopReset &&
        rotatingPackShop.length === 2
    ) {
        updateRotatingPackShopDisplay();
        return;
    }

    const available = ROTATING_PACKS.slice();

    rotatingPackShop = [];

    while (rotatingPackShop.length < 2) {

        const index =
            Math.floor(Math.random() * available.length);

        const pack = available.splice(index, 1)[0];

        rotatingPackShop.push({
            id: pack.id,
            stock: Math.floor(Math.random() * 3) + 1
        });

    }

    localStorage.setItem(
        getSaveKey("rotatingPackShop"),
        JSON.stringify(rotatingPackShop)
    );

    localStorage.setItem(
        getSaveKey("rotatingPackShopReset"),
        now + (2 * 60 * 60 * 1000)
    );

    updateRotatingPackShopDisplay();

}

function updateRotatingPackShopDisplay() {

    const container =
        document.getElementById("rotatingPackList");

    if (!container) {
        return;
    }

    container.innerHTML = rotatingPackShop.map(function (entry) {

        const pack = ROTATING_PACKS.find(
            candidate => candidate.id === entry.id
        );

        if (!pack) {
            return "";
        }

        const soldOut = entry.stock <= 0;

        return `
            <div class="rotatingPack${soldOut ? " rotatingPack--soldOut" : ""}">

                <div class="rotatingPack__name">
                    ${pack.name}
                </div>

                <div class="rotatingPack__details">
                    ${pack.description}
                </div>

                <div class="rotatingPack__stock">
                    ${soldOut ? "Sold Out" : entry.stock + " in stock"}
                </div>

                <div class="rotatingPack__buy">

                    <span class="rotatingPack__price">
                        ${pack.cost}${PL.icons.get("blood", 13)}
                    </span>

                    <button
                        type="button"
                        ${soldOut || tokens < pack.cost ? "disabled" : ""}
                        onclick="buyRotatingPack('${pack.id}')">
                        ${soldOut ? "Sold Out" : "Open Pack"}
                    </button>

                </div>

            </div>
        `;

    }).join("");

}

function updateRotatingPackTimer() {

    const timer =
        document.getElementById("rotatingPackTimer");

    if (!timer) {
        return;
    }

    const shopReset =
        Number(
            localStorage.getItem(
                getSaveKey("rotatingPackShopReset")
            )
        ) || 0;

    const remaining =
        shopReset - Date.now();

    if (remaining <= 0) {

        timer.textContent = "Refreshing...";

        generateRotatingPackShop();

        return;

    }

    const hours =
        Math.floor(
            remaining / (1000 * 60 * 60)
        );

    const minutes =
        Math.floor(
            (remaining % (1000 * 60 * 60)) /
            (1000 * 60)
        );

    const seconds =
        Math.floor(
            (remaining % (1000 * 60)) /
            1000
        );

    timer.textContent =
        `Restocks in ${hours}h ${minutes}m ${seconds}s`;

}

let rotatingPackShop = [];

let packOpening = false;

const statsButton =
    document.getElementById("statsButton");

const statsModal =
    document.getElementById("statsModal");

const closeStats =
    document.getElementById("closeStats");

const statsList =
    document.getElementById("statsList");

const soundButton =
    document.getElementById("soundButton");

const soundModal =
    document.getElementById("soundModal");

const closeSound =
    document.getElementById("closeSound");

const volumeSlider =
    document.getElementById("volumeSlider");

const volumeValue =
    document.getElementById("volumeValue");

const muteToggle =
    document.getElementById("muteToggle");

const muteLabel =
    document.getElementById("muteLabel");

const saveSlotsButton =
    document.getElementById("saveSlotsButton");

const saveSlotsModal =
    document.getElementById("saveSlotsModal");

const closeSaveSlots =
    document.getElementById("closeSaveSlots");

const saveSlotsList =
    document.getElementById("saveSlotsList");

const inventorySearch =
    document.getElementById("inventorySearch");

const collectionSearch =
    document.getElementById("collectionSearch");

let inventorySearchText = "";

let collectionSearchText = "";

document.addEventListener("click", function (event) {

    const clickable = event.target.closest(
        "button, .rewardRow, .plWrap, .plTab, .collectionTab, .inventoryTab, .invChip"
    );

    if (!clickable) {
        return;
    }

    PL.sounds.click();

});

tokenGuideButton.addEventListener("click", function () {

    tokenGuide.style.display = "flex";

});
guideButton.addEventListener("click", function () {


    guideModal.style.display = "flex";

});

resetInventoryButton.addEventListener("click", function () {

    const confirmed = confirm(
        "Are you sure?\n\nThis will permanently reset your Packlocked progress."
    );

    if (!confirmed) {
        return;
    }


    inventory = [];
    collection = [];
    foilCollection = [];
    pullHistory = [];


    loadout = {
        perks: [],
        item: null,
        addons: []
    };

    stats = {

        escapes: 0,
        sacrifices: 0,
        packsOpened: 0,
        foilsPulled: 0

    };

    // A reset save is a new save, so it starts with the same grant one gets.
    tokens = 5;

    // Make today's shop purchasable again
    dailyShop.forEach(card => {
        card.purchased = false;
    });



    tokenDisplay.textContent = tokens;

    updateInventoryDisplay();
    updateCollectionCounter();
    updateLoadoutDisplay();
    updateShopDisplay();
    PL.panels.pulls();


    saveCurrentGame();

    alert("Save reset successfully.");

});
collectionCounter.addEventListener("click", function () {

    collectionModal.style.display = "flex";

    collectionTabs.forEach(t =>
        t.classList.remove("active")
    );

    collectionTabs[0].classList.add("active");

    showCollection("perk");

});

closeCollection.addEventListener("click", function () {
    collectionModal.style.display = "none";
});

closeGuide.addEventListener("click", function () {

    tokenGuide.style.display = "none";

});
closeGuideModal.addEventListener("click", function () {

    guideModal.style.display = "none";

});

statsButton.addEventListener("click", function () {

    updateStatsDisplay();

    statsModal.style.display = "flex";

});

closeStats.addEventListener("click", function () {

    statsModal.style.display = "none";

});

/* Redraws the panel from PL.sounds rather than from the controls themselves,
   so the two can never drift apart. */
function updateSoundDisplay() {

    const percent = Math.round(PL.sounds.getVolume() * 100);
    const muted = PL.sounds.isMuted();

    volumeSlider.value = percent;
    volumeValue.textContent = percent + "%";

    muteLabel.textContent = muted ? "Unmute" : "Mute";
    muteToggle.classList.toggle("is-muted", muted);
    muteToggle.firstElementChild.innerHTML =
        PL.icons.get(muted ? "muted" : "sound", 18);

    /* A muted game should not look adjustable. */
    volumeSlider.disabled = muted;

}

soundButton.addEventListener("click", function () {

    updateSoundDisplay();

    soundModal.style.display = "flex";

});

closeSound.addEventListener("click", function () {

    soundModal.style.display = "none";

});

/* Dragging updates the number as it moves; the sample plays on release only,
   so a slow drag does not stutter a click on every pixel. */
volumeSlider.addEventListener("input", function () {

    PL.sounds.setVolume(Number(volumeSlider.value) / 100);

    volumeValue.textContent = volumeSlider.value + "%";

});

volumeSlider.addEventListener("change", function () {

    PL.sounds.preview();

});

muteToggle.addEventListener("click", function () {

    PL.sounds.setMuted(!PL.sounds.isMuted());

    updateSoundDisplay();

    /* Only on the way back on — a confirming click when unmuting, silence when
       muting, which is the point. */
    if (!PL.sounds.isMuted()) {

        PL.sounds.preview();

    }

});

saveSlotsButton.addEventListener("click", function () {

    updateSaveSlots();

    saveSlotsModal.style.display = "flex";

});

closeSaveSlots.addEventListener("click", function () {

    saveSlotsModal.style.display = "none";

});

window.addEventListener("click", function (event) {
    if (event.target === collectionModal) {
        collectionModal.style.display = "none";
    }
});

window.addEventListener("click", function (event) {

    if (event.target === kingUpgradeModal) {

        kingUpgradeModal.style.display = "none";

    }

});

window.addEventListener("click", function (event) {

    if (event.target === statsModal) {

        statsModal.style.display = "none";

    }

});

window.addEventListener("click", function (event) {

    if (event.target === saveSlotsModal) {

        saveSlotsModal.style.display = "none";

    }

});

window.addEventListener("click", function (event) {

    if (event.target === soundModal) {

        soundModal.style.display = "none";

    }

});

window.addEventListener("click", function (e) {

    if (e.target === tokenGuide) {

        tokenGuide.style.display = "none";

    }

});

window.addEventListener("click", function (e) {

    if (e.target === guideModal) {

        guideModal.style.display = "none";

    }

});


collectionTabs.forEach(tab => {

    tab.addEventListener("click", function () {

        collectionTabs.forEach(t =>
            t.classList.remove("active")
        );

        tab.classList.add("active");

        showCollection(tab.dataset.type);

    });

});

inventoryTabs.forEach(tab => {

    tab.addEventListener("click", function () {

        inventoryTabs.forEach(t =>
            t.classList.remove("active")
        );

        tab.classList.add("active");

        currentInventoryTab =
            tab.dataset.type;

        updateInventoryDisplay();

    });

});

document.querySelectorAll(".invChip").forEach(chip => {

    chip.addEventListener("click", function () {

        document.querySelectorAll(".invChip").forEach(c =>
            c.classList.remove("active")
        );

        chip.classList.add("active");

        inventoryRarity = chip.dataset.rarity;

        updateInventoryDisplay();

    });

});

document.getElementById("inventorySort")
    .addEventListener("change", function () {

        inventorySort = this.value;

        updateInventoryDisplay();

    });

inventorySearch.addEventListener("input", function () {

    inventorySearchText =
        this.value.toLowerCase();

    updateInventoryDisplay();

});

collectionSearch.addEventListener("input", function () {

    collectionSearchText =
        this.value.toLowerCase();

    showCollection(
        document.querySelector(".collectionTab.active").dataset.type
    );

});

function updatePackButtons() {

    const packCosts = {
        basic: 5,
        item: 5,
        entity: 10
    };

    document.querySelectorAll(".plWrap").forEach(function (button) {

        const tier = button.dataset.tier;
        const cost = packCosts[tier];

        if (cost === undefined) {
            return;
        }

        button.disabled = tokens < cost;

    });

}
rewardRows.forEach(function (row) {

    row.addEventListener("click", function () {

        const amount = Number(row.dataset.tokens);

        tokens += amount;

        tokenDisplay.textContent = tokens;

        updatePackButtons();
        updateRotatingPackShopDisplay();

        tokenPopup.innerHTML =
            (amount >= 0 ? "+" : "") + amount + PL.icons.get("blood", 30);

        tokenPopup.classList.remove("show");
        void tokenPopup.offsetWidth;
        tokenPopup.classList.add("show");

        saveCurrentGame();
        

    });

});


/* Special ranks above Legendary: the Joker is the only card carrying it and it
   is rarer than anything else in the pool. Any rarity missing from this map
   sorts as NaN, which falls through to the name comparison silently rather
   than erroring — so a new rarity has to be added here as well as to the
   filter chips. */
const RARITY_RANK = { Common: 0, Rare: 1, Epic: 2, Legendary: 3, Special: 4 };

const KING_UPGRADE_RARITY = {
    Common: "Rare",
    Rare: "Epic",
    Epic: "Legendary"
};

let inventorySort = "recent";
let inventoryRarity = "all";

/**
 * The rows the inventory is currently showing, in display order.
 *
 * Equip and Sell act on a position in this list, so they must derive it the
 * same way the grid did — previously each rebuilt the filter itself, and any
 * change to sorting would have made a click hit the wrong card.
 */
function visibleInventory() {

    let rows = inventory.filter(card =>
        currentInventoryTab === "perk"
            ? card.type === "Perk"
            : card.type === "Item" || card.type === "Addon"
    );

    if (inventoryRarity !== "all") {

        rows = rows.filter(card => card.rarity === inventoryRarity);

    }

    if (inventorySearchText) {

        rows = rows.filter(card =>
            card.name.toLowerCase().includes(inventorySearchText)
        );

    }

    // Sorted on a copy: reordering `inventory` itself would rewrite the save.
    rows = rows.slice();

    if (inventorySort === "rarity") {

        rows.sort((a, b) =>
            (RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]) ||
            a.name.localeCompare(b.name)
        );

    } else if (inventorySort === "name") {

        rows.sort((a, b) => a.name.localeCompare(b.name));

    } else if (inventorySort === "count") {

        rows.sort((a, b) =>
            ((b.amount || 1) - (a.amount || 1)) ||
            a.name.localeCompare(b.name)
        );

    }
    // "recent" keeps inventory order, which is the order cards were pulled.

    return rows;

}

function updateInventoryDisplay() {

    const rows = visibleInventory();

    const counter = document.getElementById("inventoryCount");

    if (counter) {

        const total = rows.reduce((n, c) => n + (c.amount || 1), 0);

        counter.textContent = rows.length
            ? rows.length + (rows.length === 1 ? " card" : " cards") +
              (total !== rows.length ? " · " + total + " with duplicates" : "")
            : "";

    }

    if (rows.length === 0) {

        inventoryDisplay.innerHTML = inventory.length
            ? '<p class="plEmpty">Nothing matches that. Try a different search or filter.</p>'
            : '<p class="plEmpty">No cards yet. Open a pack to start your collection.</p>';

        return;

    }

    inventoryDisplay.innerHTML = rows.map((card, index) => {

        // Entity Touched foils are the ultra-rare 1-in-500 foil variant and sell for 50 Blood Tokens.
const sellValue = card.foilVariant === "entityTouched"
    ? 50
    : card.foil
        ? 20
        : (card.rarity === "Epic" || card.rarity === "Legendary")
            ? 2
            : 1;

        /* The Joker is sacrifice insurance, so selling it would quietly strip
           the protection the player is relying on. It keeps a disabled button
           rather than losing the row, so its face stays the same height as
           every other card in the grid. Same applied to two new cards. */
        const unsellable =
            card.name === "The Joker" ||
            card.name === "The Queen" ||
            card.name === "The King" ||
            card.name === "The Ace";

const sellAction = unsellable
    ? {
        label: "Can't Sell",
        onclick: "",
        disabled: true
    }
    : {
        label: "Sell +" + sellValue + PL.icons.get("blood", 13),
        onclick: "sellCardByIndex(" + index + ")"
    };

        const primaryAction =
    card.name === "The King"
        ? {
            label: "Use",
            onclick: "useKingByIndex(" + index + ")"
        }
        : card.name === "The Ace"
            ? {
                label: "Use",
                onclick: "useAceByIndex(" + index + ")"
            }
            : {
                label: "Equip",
                onclick: "equipCardByIndex(" + index + ")"
            };

return PL.card.render(card, {
    count: card.amount,
    foil: card.foil,
    foilVariant: card.foilVariant,
    actions: [
        primaryAction,
        sellAction
    ]
});

    }).join("");

}




function equipCardByIndex(index) {

    if (loadout.aceLocked) {
    return;
}

    const card = visibleInventory()[index];

    if (card) {

        equipCard(card);

    }

}

function useKingByIndex(index) {

    const card = visibleInventory()[index];

    if (!card || card.name !== "The King") {
        return;
    }

    openKingUpgradeModal(card);

}

function useAceByIndex(index) {

    const card = visibleInventory()[index];

    if (!card || card.name !== "The Ace") {
        return;
    }

    if (
        loadout.perks.length > 0 ||
        loadout.item ||
        loadout.addons.length > 0
    ) {

        alert(
            "Your loadout must be completely empty before using The Ace."
        );

        return;
    }

    const generatedPerks = [];
    const generatedAddons = [];

    // Generate four random perks.
    for (let i = 0; i < 4; i++) {

        const perkPool = gameData.perks.filter(
            perk => perk.type === "Perk" &&
                    perk.name !== "The Joker" &&
                    perk.name !== "The Queen" &&
                    perk.name !== "The King" &&
                    perk.name !== "The Ace"
        );

        const perk =
            perkPool[
                Math.floor(Math.random() * perkPool.length)
            ];

        const foilResult = rollFoilVariant();

        generatedPerks.push({
            name: perk.name,
            rarity: perk.rarity,
            type: perk.type,
            foil: foilResult.foil,
            foilVariant: foilResult.foilVariant,
            aceGenerated: true
        });

    }

    // Generate a random item.
    const itemPool = gameData.items;

    const item =
        itemPool[
            Math.floor(Math.random() * itemPool.length)
        ];

    const itemFoil = rollFoilVariant();

    const generatedItem = {
        name: item.name,
        rarity: item.rarity,
        type: item.type,
        category: item.category,
        foil: itemFoil.foil,
        foilVariant: itemFoil.foilVariant,
        aceGenerated: true
    };

    // Generate two random addons compatible with the item.
    const addonPool = gameData.addons.filter(
        addon => addon.category === item.category
    );

    for (let i = 0; i < 2; i++) {

        const addon =
            addonPool[
                Math.floor(Math.random() * addonPool.length)
            ];

        const addonFoil = rollFoilVariant();

        generatedAddons.push({
            name: addon.name,
            rarity: addon.rarity,
            type: addon.type,
            category: addon.category,
            foil: addonFoil.foil,
            foilVariant: addonFoil.foilVariant,
            aceGenerated: true
        });

    }

    // Consume The Ace.
    card.amount--;

    if (card.amount <= 0) {

        inventory = inventory.filter(
            inventoryCard => inventoryCard !== card
        );

    }

    // Put the generated cards directly into the loadout.
    loadout.perks = generatedPerks;
    loadout.item = generatedItem;
    loadout.addons = generatedAddons;

    // Mark the entire loadout as Ace-generated and locked.
    loadout.aceLocked = true;

    updateInventoryDisplay();
    updateLoadoutDisplay();

    saveCurrentGame();

}

function openKingUpgradeModal(kingCard) {

    const eligibleCards = inventory.filter(card =>
        card.name !== "The King" &&
        KING_UPGRADE_RARITY[card.rarity]
    );

    if (eligibleCards.length === 0) {

        alert(
            "You don't have any Common, Rare, or Epic cards to upgrade."
        );

        return;
    }

    const searchInput = document.createElement("input");

searchInput.type = "text";
searchInput.placeholder = "🔍 Search perks...";
searchInput.className = "kingUpgradeSearch";

kingUpgradeList.parentNode.insertBefore(
    searchInput,
    kingUpgradeList
);

    function renderKingUpgradeCards(cards) {

    kingUpgradeList.innerHTML = cards.map(function (card, index) {

        const nextRarity =
            KING_UPGRADE_RARITY[card.rarity];

        return `
            <div class="kingUpgradeOption">

                <div class="kingUpgradeCard">
                    ${PL.card.render(card, {
                        count: card.amount,
                        foil: card.foil,
                        foilVariant: card.foilVariant,
                        size: "sm"
                    })}
                </div>

                <div class="kingUpgradeInfo">
                    <strong>${card.name}</strong>
                    <span>
                        ${card.rarity} → ${nextRarity}
                    </span>

                    <button
                        type="button"
                        onclick="upgradeCardWithKing(${index})">
                        Upgrade
                    </button>
                </div>

            </div>
        `;

        }).join("");

}

    kingUpgradeModal.style.display = "flex";

}

renderKingUpgradeCards(eligibleCards);

searchInput.addEventListener("input", function () {

    const searchText =
        searchInput.value.trim().toLowerCase();

    const filteredCards = eligibleCards.filter(card =>
        card.name.toLowerCase().includes(searchText)
    );

    renderKingUpgradeCards(filteredCards);

});

function upgradeCardWithKing(index) {


    kingUpgradeResult.innerHTML = "";
    kingUpgradeResult.style.display = "none";
    kingUpgradeList.style.display = "grid";

    const eligibleCards = inventory.filter(card =>
        card.name !== "The King" &&
        KING_UPGRADE_RARITY[card.rarity]
    );

    const selectedCard = eligibleCards[index];

    if (!selectedCard) {
        return;
    }

    const nextRarity =
        KING_UPGRADE_RARITY[selectedCard.rarity];

    const possibleUpgrades = gameData[
        selectedCard.type === "Perk"
            ? "perks"
            : selectedCard.type === "Item"
                ? "items"
                : "addons"
    ].filter(card =>
        card.rarity === nextRarity
    );

    if (possibleUpgrades.length === 0) {
        alert("No valid upgrade cards are available.");
        return;
    }

    const upgradedCard =
        possibleUpgrades[
            Math.floor(
                Math.random() * possibleUpgrades.length
            )
        ];

    selectedCard.amount--;

    if (selectedCard.amount <= 0) {

        inventory = inventory.filter(
            card => card !== selectedCard
        );

    }

   const upgradedFoil = selectedCard.foil || false;
const upgradedFoilVariant = selectedCard.foilVariant || null;

const existingUpgrade = inventory.find(card =>
    card.name === upgradedCard.name &&
    card.foil === upgradedFoil &&
    card.foilVariant === upgradedFoilVariant
);

if (existingUpgrade) {

    existingUpgrade.amount++;

} else {

    inventory.push({
        name: upgradedCard.name,
        rarity: upgradedCard.rarity,
        type: upgradedCard.type,
        amount: 1,
        foil: upgradedFoil,
        foilVariant: upgradedFoilVariant
    });

}

    const king = inventory.find(
        card => card.name === "The King"
    );

    if (king) {

        king.amount--;

        if (king.amount <= 0) {

            inventory = inventory.filter(
                card => card !== king
            );

        }

    }

    kingUpgradeList.innerHTML = "";

kingUpgradeResult.innerHTML = `
    <h2>Upgraded!</h2>

    <p>Your card was upgraded to:</p>

    <div class="kingUpgradeResultCard">
        ${PL.card.render(upgradedCard, {
            count: 1,
            foil: upgradedFoil,
            foilVariant: upgradedFoilVariant,
            size: "sm"
        })}
    </div>

    <strong>
        ${upgradedCard.name}
    </strong>

    <span>
        ${upgradedCard.rarity}
    </span>

    <button
        type="button"
        onclick="closeKingUpgradeResult()">
        Close
    </button>
`;

window.closeKingUpgradeResult = function () {
    kingUpgradeResult.style.display = "none";
    kingUpgradeModal.style.display = "none";
};

kingUpgradeResult.style.display = "flex";

updateInventoryDisplay();
updateCollectionCounter();

saveCurrentGame();

}

function sellCardByIndex(index) {

    const card = visibleInventory()[index];

    if (card) {

        sellCard(card);

    }

}
function updateCollectionCounter() {


    const total = getTotalCards();

    const percent = (
        (collection.length / total) * 100
    ).toFixed(1);

    collectionCounter.textContent =
        `Collection: ${collection.length}/${total}`;

    collectionProgress.textContent =
        `${collection.length}/${total} (${percent}%)`;

    // The sidebar shows the same progress broken down by type, so it is kept
    // in step from the one place the counter is already refreshed.
    PL.panels.sidebar();
    PL.panels.shelf();

}

function updateStatsDisplay() {

    const totalMatches =
        stats.escapes + stats.sacrifices;

    const escapeRate =
        totalMatches === 0
            ? 0
            : (
                stats.escapes /
                totalMatches *
                100
            ).toFixed(1);

    statsList.innerHTML = `

<h3 class="statsHeading">Lifetime Progress</h3>

<div class="statsGrid">

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("pack", 26)}</div>
        <div class="statLabel">Packs Opened</div>
        <div class="statValue">${stats.packsOpened}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("foil", 26)}</div>
        <div class="statLabel">Foils Pulled</div>
        <div class="statValue">${stats.foilsPulled}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("escaped", 26)}</div>
        <div class="statLabel">Escapes</div>
        <div class="statValue">${stats.escapes}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("sacrificed", 26)}</div>
        <div class="statLabel">Sacrifices</div>
        <div class="statValue">${stats.sacrifices}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("stats", 26)}</div>
        <div class="statLabel">Escape Rate</div>
        <div class="statValue">${escapeRate}%</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("collection", 26)}</div>
        <div class="statLabel">Collection</div>
        <div class="statValue">${collection.length}/${getTotalCards()}</div>
    </div>

</div>

`;

}

function updateSaveSlots() {

    saveSlotsList.innerHTML = `

<button class="saveSlotButton" onclick="selectSave(1)">
    Save Slot 1
    ${currentSave === 1 ? PL.icons.get("check", 15) + " Current" : ""}
</button>

<br><br>

<button class="saveSlotButton" onclick="selectSave(2)">
    Save Slot 2
    ${currentSave === 2 ? PL.icons.get("check", 15) + " Current" : ""}
</button>

<br><br>

<button class="saveSlotButton" onclick="selectSave(3)">
    Save Slot 3
    ${currentSave === 3 ? PL.icons.get("check", 15) + " Current" : ""}
</button>

`;

}

function generateDailyShop() {

    const now = Date.now();

    const shopReset =
        Number(
            localStorage.getItem(
                getSaveKey("shopReset")
            )
        ) || 0;

    const pool = gameData.perks.filter(card =>
        card.rarity === "Epic" ||
        card.rarity === "Legendary"
    );

    /* Three, unless the pool is somehow smaller — asking for more distinct
       cards than exist would spin in the loop below and hang the tab. */
    const wanted = Math.min(3, pool.length);

    if (now < shopReset && dailyShop.length === wanted) {

        updateShopDisplay();
        return;

    }

    dailyShop = [];

    while (dailyShop.length < wanted) {

        const random =
            pool[Math.floor(Math.random() * pool.length)];

        if (!dailyShop.some(card => card.name === random.name)) {

            dailyShop.push({
                name: random.name,
                rarity: random.rarity,
                type: random.type,
                purchased: false
            });

        }

    }

    localStorage.setItem(
        getSaveKey("dailyShop"),
        JSON.stringify(dailyShop)
    );
// Token Shop rotates every hour so players get a fresh selection more frequently.
    localStorage.setItem(
        getSaveKey("shopReset"),
        now + (1 * 60 * 60 * 1000)
    );

    updateShopDisplay();

}

function updateShopDisplay() {

    tokenShop.innerHTML = dailyShop.map((card, index) => {

        const price = card.rarity === "Legendary" ? 20 : 10;

        return PL.card.render(card, {
            actions: card.purchased
                ? [{ label: "Sold Out", onclick: "", disabled: true }]
                : [{
                    label: price + PL.icons.get("blood", 13),
                    onclick: "buyShopCard(" + index + ")"
                }]
        });

    }).join("");

}

function updateShopTimer() {

    const shopReset =
        Number(
            localStorage.getItem(
                getSaveKey("shopReset")
            )
        ) || 0;

    const remaining = shopReset - Date.now();

    if (remaining <= 0) {

        shopTimer.textContent = "Refreshing...";
        generateDailyShop();
        return;

    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));

    const minutes = Math.floor(
        (remaining % (1000 * 60 * 60)) /
        (1000 * 60)
    );

    const seconds = Math.floor(
        (remaining % (1000 * 60)) /
        1000
    );

    shopTimer.textContent =
        `Restocks in ${hours}h ${minutes}m ${seconds}s`;

}

function buyShopCard(index) {

    const card = dailyShop[index];

    if (card.purchased) return;

    const cost = card.rarity === "Legendary" ? 20 : 10;

    if (tokens < cost) {
        alert("Not enough Blood Tokens!");
        return;
    }

    tokens -= cost;

    tokenDisplay.textContent = tokens;

    updatePackButtons();
    updateRotatingPackShopDisplay();

    

    /* Loosely, so a row saved before `foil` was written lands on the same stack
       instead of starting a second one. */
    let existingCard = inventory.find(c =>
        c.name === card.name &&
        !c.foil
    );

    if (existingCard) {

        existingCard.amount++;

    } else {

        inventory.push({
            name: card.name,
            rarity: card.rarity,
            type: card.type,
            amount: 1,
            foil: false
        });

    }

    card.purchased = true;

   

    updateInventoryDisplay();
    updateCollectionCounter();
    updateShopDisplay();

    saveCurrentGame();

}
tokenDisplay.textContent = tokens;

function updateLoadoutDisplay() {

    // ---------- PERKS ----------
    for (let i = 0; i < 4; i++) {

        const slot = perkSlots[i];
        const perk = loadout.perks[i];

        if (!perk) {

            slot.className = "slot";
            slot.textContent = "Empty";
            slot.onclick = null;
            continue;

        }

        slot.className = "slot slot--filled";

        slot.innerHTML = PL.card.render(perk, {
    size: "sm",
    foil: perk.foil,
    foilVariant: perk.foilVariant,
    actionLabel: loadout.aceLocked
    ? "Can't Unequip"
    : "Unequip"
});

        slot.onclick = function () {

            unequipPerk(i);

        };

    }


    // ---------- ITEM ----------

    if (!loadout.item) {

        itemSlot.className = "slot";
        itemSlot.textContent = "Empty";
        itemSlot.onclick = null;

    } else {

        itemSlot.className = "slot slot--filled";

        itemSlot.innerHTML = PL.card.render(loadout.item, {
    size: "sm",
    foil: loadout.item.foil,
    foilVariant: loadout.item.foilVariant,
    actionLabel: loadout.aceLocked
    ? "Can't Unequip"
    : "Unequip"
});

        itemSlot.onclick = function () {

            unequipItem();

        };

    }


    // ---------- ADD-ONS ----------

    for (let i = 0; i < 2; i++) {

        const slot = addonSlots[i];
        const addon = loadout.addons[i];

        if (!addon) {

            slot.className = "slot";
            slot.textContent = "Empty";
            slot.onclick = null;
            continue;

        }

        slot.className = "slot slot--filled";

        slot.innerHTML = PL.card.render(addon, {
    size: "sm",
    foil: addon.foil,
    foilVariant: addon.foilVariant,
    actionLabel: loadout.aceLocked
    ? "Can't Unequip"
    : "Unequip"
});

        slot.onclick = function () {

            unequipAddon(i);

        };

    }

}

function showCollection(type) {

    let cards = [];

    if (type === "perk") {
        cards = gameData.perks;
    }

    if (type === "item") {
        cards = gameData.items;
    }

    if (type === "addon") {
        cards = gameData.addons;
    }

    cards = cards.filter(card =>
        card.name
            .toLowerCase()
            .includes(collectionSearchText)
    );

    collectionList.innerHTML = cards.map(card => {

        const discovered = collection.includes(card.name);

        /* Entity Touched is a separate foil variant, so check the inventory first.
   Standard Foil remains controlled by foilCollection for compatibility with
   existing saves and previously discovered foils. */
const entityTouched = inventory.some(row =>
    row.name === card.name &&
    row.foilVariant === "entityTouched" &&
    (row.amount || 0) > 0
);

const isFoil =
    !entityTouched &&
    foilCollection.includes(card.name);

        /* A foil and a plain copy are two rows sharing a name, so the count has
           to add them up. Taking the first match showed only one variant. */
        const amount = inventory.reduce(
            (total, row) =>
                row.name === card.name
                    ? total + (row.amount || 0)
                    : total,
            0
        );

        return PL.card.render(card, {
    locked: !discovered,
    foil: entityTouched || isFoil,
    foilVariant: entityTouched
        ? "entityTouched"
        : "standard",
    count: amount,
    size: "sm"
});

    }).join("");

}

/**
 * Equips one copy. Takes the inventory row itself, for the same reason
 * sellCard does: a foil and a plain copy are two rows sharing a name. A name
 * is still accepted for older callers, and picks the plain copy first so a
 * foil is never equipped by accident.
 */
function equipCard(target) {

    if (loadout.aceLocked) {
    return;
}

    const card = typeof target === "string"
        ? (inventory.find(c => c.name === target && !c.foil) ||
           inventory.find(c => c.name === target))
        : target;

    if (!card) {
        return;
    }

    if (card.type === "Perk") {

    if (loadout.perks.length >= 4) {
        alert("Your perk loadout is full!");
        return;
    }

    if (loadout.perks.some(equipped => equipped.name === card.name)) {
        alert("That perk is already equipped!");
        return;
    }

    loadout.perks.push({
        name: card.name,
        rarity: card.rarity,
        type: card.type,
        foil: card.foil,
        foilVariant: card.foilVariant,
        queenUse: card.name === "The Queen"
    });

    card.amount--;

    if (card.amount <= 0) {
        inventory = inventory.filter(c => c !== card);
    }

    updateInventoryDisplay();
    updateLoadoutDisplay();

    saveCurrentGame();

}

    if (card.type === "Item") {

        if (loadout.item) {
            alert("You already have an item equipped!");
            return;
        }

        loadout.item = {
    name: card.name,
    rarity: card.rarity,
    type: card.type,
    foil: card.foil,
    foilVariant: card.foilVariant
};

        card.amount--;

        if (card.amount <= 0) {
            // This row only — filtering by name also removed the other variant.
            inventory = inventory.filter(c => c !== card);
        }

        

        updateInventoryDisplay();
        updateLoadoutDisplay();

        saveCurrentGame();

    }

    if (card.type === "Addon") {

        if (loadout.addons.length >= 2) {
            alert("Your add-on slots are full!");
            return;
        }

        loadout.addons.push({
    name: card.name,
    rarity: card.rarity,
    type: card.type,
    foil: card.foil,
    foilVariant: card.foilVariant
});

        card.amount--;

        if (card.amount <= 0) {
            // This row only — filtering by name also removed the other variant.
            inventory = inventory.filter(c => c !== card);
        }

        

        updateInventoryDisplay();
        updateLoadoutDisplay();

        saveCurrentGame();

    }

}

function unequipPerk(index) {

    if (loadout.aceLocked) {
    return;
}

    const perk = loadout.perks[index];

    if (!perk) return;

    let existing = inventory.find(card =>
        card.name === perk.name &&
        card.foil === perk.foil &&
        card.foilVariant === perk.foilVariant
    );

    if (existing) {

        existing.amount++;

    } else {

        inventory.push({
            name: perk.name,
            rarity: perk.rarity,
            type: perk.type,
            amount: 1,
            foil: perk.foil,
            foilVariant: perk.foilVariant
        });

    }

    loadout.perks.splice(index, 1);

    updateInventoryDisplay();
    updateLoadoutDisplay();

    saveCurrentGame();

}

function unequipItem() {

    if (loadout.aceLocked) {
    return;
}

    if (!loadout.item) return;

    let existing = inventory.find(card =>
        card.name === loadout.item.name &&
        card.foil === loadout.item.foil &&
        card.foilVariant === loadout.item.foilVariant
    );

    if (existing) {

        existing.amount++;

    } else {

        inventory.push({
            name: loadout.item.name,
            rarity: loadout.item.rarity,
            type: loadout.item.type,
            amount: 1,
            foil: loadout.item.foil,
            foilVariant: loadout.item.foilVariant
        });

    }

    loadout.item = null;

    updateInventoryDisplay();
    updateLoadoutDisplay();
    saveCurrentGame();

}

function unequipAddon(index) {

    if (loadout.aceLocked) {
    return;
}

    const addon = loadout.addons[index];

    if (!addon) return;

    let existing = inventory.find(card =>
        card.name === addon.name &&
        card.foil === addon.foil &&
        card.foilVariant === addon.foilVariant
    );

    if (existing) {

        existing.amount++;

    } else {

        inventory.push({
            name: addon.name,
            rarity: addon.rarity,
            type: addon.type,
            amount: 1,
            foil: addon.foil,
            foilVariant: addon.foilVariant
        });

    }

    loadout.addons.splice(index, 1);

    updateInventoryDisplay();
    updateLoadoutDisplay();

    saveCurrentGame();

}

/**
 * Sells one copy.
 *
 * Takes the inventory row itself. A foil and a plain copy of the same card are
 * two separate rows sharing a name, so anything name-based sold the wrong one
 * and then deleted both. A name is still accepted for older callers, and picks
 * the plain copy first so a foil is never sold by accident.
 */
function sellCard(target) {

    const card = typeof target === "string"
        ? (inventory.find(c => c.name === target && !c.foil) ||
           inventory.find(c => c.name === target))
        : target;

    if (!card) return;

    /* Second lock, behind the disabled button in updateInventoryDisplay.
       sellCard also accepts a bare name, so guarding only the button would
       leave the Joker sellable through the other route. */
    if (
    card.name === "The Joker" ||
    card.name === "The Queen" ||
    card.name === "The King"
) {
    return;
}

    card.amount--;

    if (card.foilVariant === "entityTouched") {

    tokens += 50;

} else if (card.foil) {

    tokens += 20;

} else if (card.rarity === "Epic" || card.rarity === "Legendary") {

    tokens += 2;

} else {

    tokens += 1;

}

    if (card.amount <= 0) {

        // Drop this row only. Filtering by name also took the other variant.
        inventory = inventory.filter(c => c !== card);

    }

    tokenDisplay.textContent = tokens;

    updatePackButtons();
    updateRotatingPackShopDisplay();

    updateInventoryDisplay();

    saveCurrentGame();

}



removeTokenButton.addEventListener("click", function () {

    if (tokens > 0) {
        tokens--;
    }

    tokenDisplay.textContent = tokens;

    updatePackButtons();
    updateRotatingPackShopDisplay();

    saveCurrentGame();

});




/* The drop rates, in one place. Both the roll below and the odds bar drawn on
   each pack face read this table, so the bar cannot advertise rates the game
   does not actually use — previously the numbers lived in two if-chains and
   the Item pack's set was written out a second time inside openItemPack.
   Ordered commonest first, and each pack's percentages total 100. */
const PACK_ODDS = {
    Basic: [
        ["Common", 55],
        ["Rare", 32],
        ["Epic", 11],
        ["Legendary", 2]
    ],
    Item: [
        ["Common", 60],
        ["Rare", 30],
        ["Epic", 9],
        ["Legendary", 1]
    ],
    Entity: [
        ["Rare", 40],
        ["Epic", 45],
        ["Legendary", 15]
    ],
    Iridescent: [
        ["Epic", 20],
        ["Legendary", 80]
    ]
};

/* The Joker, per card, as a percentage. It is not part of the table above:
   openPack draws a rarity first and this roll then replaces it outright, so
   Special sits on top of the 100% and the other rarities share what is left.
   Item packs are absent on purpose — openItemPack has never rolled it. */
/* Special cards have individual Basic Pack odds. */
const PACK_SPECIAL_CHANCE = {
    Basic: {
        joker: 1 / 100,
        queen: 1 / 50,
        king: 1 / 75,
        ace: 1 / 100
    },
    Entity: {
        joker: 1 / 100,
        queen: 1 / 50,
        king: 1 / 75,
        ace: 1 / 100
    }
};

function getPackRarity(packType) {

    const table = PACK_ODDS[packType];

    /* An unknown pack type used to fall through as undefined, which matched no
       card and quietly produced an empty pack. */
    if (!table) {
        return "Common";
    }

    const roll = Math.random() * 100;

    let ceiling = 0;

    for (const [rarity, chance] of table) {

        ceiling += chance;

        if (roll < ceiling) {
            return rarity;
        }

    }

    /* Only reachable if a table's percentages fall short of 100; the rarest
       entry absorbs the remainder rather than the caller getting undefined. */
    return table[table.length - 1][0];

}

/* Returns a rarity according to the rules of a rotating pack. Restricted
   modes only return allowed rarities, so excluded rarities can never appear. */
function getRotatingPackRarity(pack) {

    if (pack.rarityMode === "common") {
        return "Common";
    }

    if (pack.rarityMode === "fiftyFifty") {
        return Math.random() < 0.5
            ? "Common"
            : "Legendary";
    }
/* Lucky Packs strongly favor Epic cards while still giving better odds for Legendary cards. */
    if (pack.rarityMode === "lucky") {
        return Math.random() < 0.8
            ? "Epic"
            : "Legendary";
    }

    return getPackRarity("Basic");

}

/* Heavy Pack has 50% better foil odds than a normal Basic card. The Entity
   Touched and standard foil probabilities are both increased proportionally. */
function rollRotatingFoilVariant(pack) {

    if (!pack.heavy) {
        return rollFoilVariant();
    }

    const roll = Math.random();

    if (roll < 0.003) {
        return {
            foil: true,
            foilVariant: "entityTouched"
        };
    }

    if (roll < 0.0105) {
        return {
            foil: true,
            foilVariant: "standard"
        };
    }

    return {
        foil: false,
        foilVariant: null
    };

}

function openRotatingPack(pack) {

    const pulledCards = [];

        if (pack.joker) {

    const specialCards = [
    gameData.perks.find(
        card => card.name === "The Joker"
    ),
    gameData.perks.find(
        card => card.name === "The Queen"
    ),
    gameData.perks.find(
        card => card.name === "The King"
    ),
    gameData.perks.find(
        card => card.name === "The Ace"
    )
].filter(Boolean);

    if (specialCards.length !== 4) {
        console.warn("One or more Faces & Aces cards could not be found.");
        packOpening = false;
        return;
    }

    const specialCard =
        specialCards[
            Math.floor(
                Math.random() * specialCards.length
            )
        ];

    if (!collection.includes(specialCard.name)) {
        collection.push(specialCard.name);
    }

    pulledCards.push({
        name: specialCard.name,
        rarity: specialCard.rarity,
        type: specialCard.type,
        foil: false,
        foilVariant: null
    });

    revealCards(
        pulledCards,
        pack.name
    );

    return;
}

    const cardPool = pack.equipment
        ? [
            ...gameData.items,
            ...gameData.addons
        ]
        : [
            ...gameData.perks
        ];

    let duplicatedCard = null;

    if (pack.duplicate) {

        const rarity =
            getRotatingPackRarity(pack);

        const possibleCards =
            cardPool.filter(
                card => card.rarity === rarity
            );

        if (possibleCards.length === 0) {
            console.warn(
                "No cards found for rotating pack:",
                pack.name
            );

            packOpening = false;
            return;
        }

        duplicatedCard =
            possibleCards[
                Math.floor(
                    Math.random() * possibleCards.length
                )
            ];

    }

    for (let i = 0; i < pack.cards; i++) {

        let randomCard;

        if (duplicatedCard) {

            randomCard = duplicatedCard;

        } else {

            const rarity =
                getRotatingPackRarity(pack);

            const possibleCards =
                cardPool.filter(
                    card => card.rarity === rarity
                );

            if (possibleCards.length === 0) {
                console.warn(
                    "No cards found for rotating pack:",
                    pack.name,
                    rarity
                );

                continue;
            }

            randomCard =
                possibleCards[
                    Math.floor(
                        Math.random() * possibleCards.length
                    )
                ];

        }

        const foilResult =
            rollRotatingFoilVariant(pack);

        if (!collection.includes(randomCard.name)) {
            collection.push(randomCard.name);
        }

        if (
            foilResult.foil &&
            !foilCollection.includes(randomCard.name)
        ) {
            stats.foilsPulled++;
            foilCollection.push(randomCard.name);
        }

        pulledCards.push({
            name: randomCard.name,
            rarity: randomCard.rarity,
            type: randomCard.type,
            foil: foilResult.foil,
            foilVariant: foilResult.foilVariant
        });

    }

    if (
        pack.heavy &&
        !pulledCards.some(card => card.foil)
    ) {

        const rarity =
            getRotatingPackRarity(pack);

        const possibleCards =
            cardPool.filter(
                card => card.rarity === rarity
            );

        if (possibleCards.length > 0) {

            const randomCard =
                possibleCards[
                    Math.floor(
                        Math.random() * possibleCards.length
                    )
                ];

            if (!collection.includes(randomCard.name)) {
                collection.push(randomCard.name);
            }

            pulledCards.push({
                name: randomCard.name,
                rarity: randomCard.rarity,
                type: randomCard.type,
                foil: false,
                foilVariant: null
            });

        }

    }

    revealCards(
        pulledCards,
        pack.name
    );

}

function buyRotatingPack(packId) {

    const entry =
        rotatingPackShop.find(
            pack => pack.id === packId
        );

    const pack =
        ROTATING_PACKS.find(
            candidate => candidate.id === packId
        );

    if (!entry || !pack) {
        return;
    }

    if (entry.stock <= 0) {
        return;
    }

    if (packOpening) {
        return;
    }

    if (tokens < pack.cost) {
        alert("Not enough Blood Tokens!");
        return;
    }

    packOpening = true;

    tokens -= pack.cost;
    entry.stock--;

    stats.packsOpened++;

    tokenDisplay.textContent = tokens;

    updatePackButtons();
    updateRotatingPackShopDisplay();

    saveCurrentGame();

    openRotatingPack(pack);

}

function getTotalCards() {

    return (
        gameData.perks.length +
        gameData.items.length +
        gameData.addons.length
    );

}

/* Determines which foil variant a pulled card receives. */
function rollFoilVariant() {

    const roll = Math.random();

    if (roll < 0.002) {
        return {
            foil: true,
            foilVariant: "entityTouched"
        };
    }

    if (roll < 0.007) {
        return {
            foil: true,
            foilVariant: "standard"
        };
    }

    return {
        foil: false,
        foilVariant: null
    };

}

function openPack(cost, amount, packType) {

    if (packOpening) {
        return;
    }
    if (tokens < cost) {

        alert("Not enough Blood Tokens!");
        return;

    }

    packOpening = true;

    // Counted here rather than on entry, so a blocked or unaffordable attempt
    // no longer inflates the stat.
    stats.packsOpened++;

    tokens -= cost;

    tokenDisplay.textContent = tokens;

    updatePackButtons();

    


    let pulledCards = [];


    for (let i = 0; i < amount; i++) {

        let rarity = getPackRarity(packType);

        const specialOdds = PACK_SPECIAL_CHANCE[packType];

if (specialOdds) {

    const roll = Math.random();

    let specialName = null;

    if (roll < specialOdds.king) {

    specialName = "The King";

} else if (
    roll <
    specialOdds.king +
    specialOdds.queen
) {

    specialName = "The Queen";

} else if (
    roll <
    specialOdds.king +
    specialOdds.queen +
    specialOdds.joker
) {

    specialName = "The Joker";

} else if (
    roll <
    specialOdds.king +
    specialOdds.queen +
    specialOdds.joker +
    specialOdds.ace
) {

    specialName = "The Ace";

}
    if (specialName) {

        const specialCard = gameData.perks.find(
            card => card.name === specialName
        );

        if (specialCard) {

            if (!collection.includes(specialCard.name)) {
                collection.push(specialCard.name);
            }

            pulledCards.push({
                name: specialCard.name,
                rarity: specialCard.rarity,
                type: specialCard.type,
                foil: false,
                foilVariant: null
            });

            continue;

        }

    }

}


        let cardPool = [
            ...gameData.perks,
            
        ];

        let possibleCards = cardPool.filter(
            card => card.rarity === rarity
        );

        if (possibleCards.length === 0) {
            console.warn("No cards found for rarity:", rarity);
            continue;
        }


        let randomCard = possibleCards[Math.floor(Math.random() * possibleCards.length)];
        const foilResult = rollFoilVariant();
        if (!collection.includes(randomCard.name)) {

            collection.push(randomCard.name);

            

        }

        if (foilResult.foil && !foilCollection.includes(randomCard.name)) {
            stats.foilsPulled++;

           
            foilCollection.push(randomCard.name);

            

        }


        pulledCards.push({
    name: randomCard.name,
    rarity: randomCard.rarity,
    type: randomCard.type,
    foil: foilResult.foil,
    foilVariant: foilResult.foilVariant
});

    }


    
    revealCards(pulledCards, packType);

}

function openItemPack() {

    if (packOpening) return;

    if (tokens < 5) {

        alert("Not enough Blood Tokens!");
        return;

    }

    packOpening = true;

    // Counted here rather than on entry, so a blocked or unaffordable attempt
    // no longer inflates the stat.
    stats.packsOpened++;

    tokens -= 5;

    tokenDisplay.textContent = tokens;

    updatePackButtons();


    const pulledCards = [];

    for (let i = 0; i < 2; i++) {

        /* Was a second copy of the Item rates written out by hand here, which
           is exactly what let the pack face and the pack disagree. Same
           numbers, now read from PACK_ODDS. */
        const rarity = getPackRarity("Item");

        const pool =
            Math.random() < 0.66
                ? gameData.items
                : gameData.addons;

        const possibleCards =
            pool.filter(card => card.rarity === rarity);

        if (possibleCards.length === 0) {

            i--;
            continue;

        }

        const randomCard =
            possibleCards[
            Math.floor(Math.random() * possibleCards.length)
            ];

        const foilResult = rollFoilVariant();

        if (!collection.includes(randomCard.name)) {

            collection.push(randomCard.name);

            

        }

        if (foilResult.foil && !foilCollection.includes(randomCard.name)) {
            stats.foilsPulled++;

            
            foilCollection.push(randomCard.name);

            
        }

        pulledCards.push({
    name: randomCard.name,
    rarity: randomCard.rarity,
    type: randomCard.type,
    foil: foilResult.foil,
    foilVariant: foilResult.foilVariant
});

    }

    revealCards(pulledCards, "Item");

}
const RARITY_ORDER = ["Common", "Rare", "Epic", "Legendary"];

/* One line per pack, keeping only the best card in it — a log of every single
   card would bury the pull worth remembering. */
function recordPull(packType, pulledCards) {

    if (!pulledCards.length) {

        return;

    }

    const best = pulledCards.reduce(function (a, b) {

        return RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity)
            ? b
            : a;

    });

    pullHistory.unshift({
        at: Date.now(),
        pack: packType,
        count: pulledCards.length,
        bestName: best.name,
        bestRarity: best.rarity
    });

    pullHistory = pullHistory.slice(0, PULL_HISTORY_LIMIT);

    PL.panels.pulls();
    PL.panels.tabCounts();

    // Persisted now rather than waiting for the reveal to be clicked through,
    // so closing the tab mid-animation does not lose the entry.
    saveCurrentGame();

}

function revealCards(pulledCards, packType) {

    recordPull(packType, pulledCards);

    PL.pack.open(packType, pulledCards, function () {

        commitPulledCards(pulledCards);

    });

}

/* Every card in the pack lands at once now, so they are all banked together
   rather than one per click as they were flipped. */
function commitPulledCards(pulledCards) {

    pulledCards.forEach(function (revealedCard) {

        const existingCard = inventory.find(card =>
    card.name === revealedCard.name &&
    card.foil === revealedCard.foil &&
    card.foilVariant === revealedCard.foilVariant
);

        if (existingCard) {

            existingCard.amount++;

        } else {

            inventory.push({
    name: revealedCard.name,
    rarity: revealedCard.rarity,
    type: revealedCard.type,
    amount: 1,
    foil: revealedCard.foil,
    foilVariant: revealedCard.foilVariant
});

        }

    });

    packOpening = false;

    updateInventoryDisplay();
    updateCollectionCounter();
    saveCurrentGame();

}


escapedButton.addEventListener("click", function () {
    stats.escapes++;

    

    let cardsToReturn = [
    ...loadout.perks.filter(
        card => card.name !== "The Queen"
    ),
    ...(loadout.item ? [loadout.item] : []),
    ...loadout.addons
];

    cardsToReturn.forEach(card => {

        let existingCard = inventory.find(c =>
    c.name === card.name &&
    c.foil === card.foil &&
    c.foilVariant === card.foilVariant
);

        if (existingCard) {
            existingCard.amount++;
        } else {
            inventory.push({
                name: card.name,
                rarity: card.rarity,
                type: card.type,
                amount: 1,
                foil: card.foil,
                foilVariant: card.foilVariant
            });
            
        }

    });

    loadout = {
    perks: [],
    item: null,
    addons: [],
    aceLocked: false
};

    

    updateInventoryDisplay();
    updateLoadoutDisplay();

    saveCurrentGame();

});

loadout.aceLocked = false;

let sacrificeArmed = false;
let sacrificeTimer = null;

function equippedCount() {

    return []
        .concat(loadout.perks, [loadout.item], loadout.addons)
        .filter(Boolean)
        .length;

}

function disarmSacrifice() {

    sacrificeArmed = false;

    if (sacrificeTimer) {

        clearTimeout(sacrificeTimer);
        sacrificeTimer = null;

    }

    sacrificedButton.innerHTML = PL.icons.get("sacrificed") + "Sacrificed";
    sacrificedButton.classList.remove("plBtnConfirm");
    document.getElementById("sacrificeNote").classList.add("hidden");

}

/* Sacrificing destroys the equipped cards for good and the button sits right
   beside Escaped, so it asks once inline rather than through a browser dialog.
   Reverts on its own if you walk away. */
sacrificedButton.addEventListener("click", function () {

    const equipped = equippedCount();

    if (equipped === 0) {

        return;

    }

    if (!sacrificeArmed) {

        sacrificeArmed = true;

        const hasJoker = loadout.perks.some(
    perk => perk.name === "The Joker"
);

        sacrificedButton.textContent = hasJoker
            ? "Use The Joker?"
            : "Destroy " + equipped + "?";
        sacrificedButton.classList.add("plBtnConfirm");
        document.getElementById("sacrificeNote").classList.remove("hidden");

        sacrificeTimer = setTimeout(disarmSacrifice, 4000);

        return;

    }

    disarmSacrifice();

    stats.sacrifices++;

const joker = loadout.perks.find(
    perk => perk.name === "The Joker"
);

if (joker) {

    const savedCards = [
        ...loadout.perks.filter(
            perk => perk.name !== "The Joker"
        ),
        ...(loadout.item ? [loadout.item] : []),
        ...loadout.addons
    ];

    savedCards.forEach(card => {

        const existingCard = inventory.find(existing =>
            existing.name === card.name &&
            existing.foil === card.foil &&
            existing.foilVariant === card.foilVariant
        );

        if (existingCard) {

            existingCard.amount++;

        } else {

            inventory.push({
                name: card.name,
                rarity: card.rarity,
                type: card.type,
                amount: 1,
                foil: card.foil,
                foilVariant: card.foilVariant
            });

        }

    });

}

loadout = {
    perks: [],
    item: null,
    addons: [],
    aceLocked: false
};

updateInventoryDisplay();
updateLoadoutDisplay();
saveCurrentGame();

});

basicPackButton.addEventListener("click", function () {

    openPack(5, 3, "Basic");

});


entityPackButton.addEventListener("click", function () {

    openPack(10, 2, "Entity");

});


itemPackButton.addEventListener("click", function () {

    openItemPack();

});

document.querySelectorAll(".plTab").forEach(function (button) {

    button.addEventListener("click", function () {

        PL.panels.setTab(button.dataset.tab);

    });

});

document.getElementById("collectionButton")
    .addEventListener("click", function () {

        showCollection("perk");
        collectionModal.style.display = "flex";

    });

PL.icons.hydrate();

PL.foil.init();

PL.transfer.init();

/* Before the first click can play anything, so a saved level applies to the
   very first sound rather than the second. */
PL.sounds.init();

backupSavesOnce();

migrateOldSave();

loadCurrentGame();

updatePackButtons();

generateDailyShop();
generateRotatingPackShop();

updateShopTimer();
updateRotatingPackTimer();

PL.panels.pulls();

setInterval(updateShopTimer, 1000);
setInterval(updateRotatingPackTimer, 1000);

function selectSave(slot) {

    if (slot === currentSave) {

        saveSlotsModal.style.display = "none";
        return;

    }

    // Save the current slot before leaving it
    saveCurrentGame();

    // Switch slots
    currentSave = slot;

    localStorage.setItem(
        "currentSave",
        currentSave
    );

    // Load the new slot
    loadCurrentGame();

    // Update Save Slot window
    updateSaveSlots();

    // Refresh shop for the new slot
    generateDailyShop();
    updateShopTimer();

    saveSlotsModal.style.display = "none";

}
/* Reads one save key. A slot damaged by a bad import or by hand-editing used to
   throw out of loadCurrentGame and leave the game half-started; falling back
   costs that one key instead of the whole slot. */
function readSave(key, fallback) {

    const raw = localStorage.getItem(getSaveKey(key));

    if (raw === null) {

        return fallback;

    }

    try {

        const value = JSON.parse(raw);

        return value === null ? fallback : value;

    } catch (e) {

        console.warn("Unreadable save key, using default:", key);

        return fallback;

    }

}

function loadCurrentGame() {

    /* A pack left sealed when the slot changed would otherwise strand this
       flag set, and every later pack would refuse to open with no message. */
    packOpening = false;

    tokens =
        Number(localStorage.getItem(getSaveKey("tokens"))) || 0;

    inventory = readSave("inventory", []);

    collection = readSave("collection", []);

    foilCollection = readSave("foilCollection", []);

    pullHistory = readSave("history", []);

    const savedLoadout = readSave("loadout", null);

    if (
        !savedLoadout ||
        !Array.isArray(savedLoadout.perks) ||
        !Array.isArray(savedLoadout.addons)
    ) {

        loadout = {
            perks: [],
            item: null,
            addons: []
        };

    } else {

        loadout = savedLoadout;

    }

    /* Normalised field by field rather than with a `|| default` on the whole
       object. migrateOldSave writes "{}" for a new player, which is truthy, so
       the old fallback never ran and every counter came back undefined — which
       in turn defeated the "new save gets 5 tokens" check below and left a
       fresh player unable to afford a single pack. */
    const savedStats = readSave("stats", {});

    stats = {
        escapes: savedStats.escapes || 0,
        sacrifices: savedStats.sacrifices || 0,
        packsOpened: savedStats.packsOpened || 0,
        foilsPulled: savedStats.foilsPulled || 0
    };

    dailyShop = readSave("dailyShop", []);

    rotatingPackShop =
    readSave("rotatingPackShop", []);
    
    if (dailyShop.length === 0) {

        generateDailyShop();

    }

    if (rotatingPackShop.length !== 2) {

    generateRotatingPackShop();

} else {

    updateRotatingPackShopDisplay();

}

    if (
        tokens === 0 &&
        inventory.length === 0 &&
        collection.length === 0 &&
        stats.packsOpened === 0
    ) {

        tokens = 5;

        saveCurrentGame();

    }

    tokenDisplay.textContent = tokens;

    updatePackButtons();

    updateInventoryDisplay();
    updateCollectionCounter();
    updateLoadoutDisplay();
    updateShopDisplay();

}

function saveCurrentGame() {

    localStorage.setItem(
        getSaveKey("tokens"),
        tokens
    );

    localStorage.setItem(
        getSaveKey("inventory"),
        JSON.stringify(inventory)
    );

    localStorage.setItem(
        getSaveKey("collection"),
        JSON.stringify(collection)
    );

    localStorage.setItem(
        getSaveKey("foilCollection"),
        JSON.stringify(foilCollection)
    );

    localStorage.setItem(
        getSaveKey("history"),
        JSON.stringify(pullHistory)
    );

    localStorage.setItem(
        getSaveKey("stats"),
        JSON.stringify(stats)
    );

    localStorage.setItem(
        getSaveKey("loadout"),
        JSON.stringify(loadout)
    );

    localStorage.setItem(
        getSaveKey("dailyShop"),
        JSON.stringify(dailyShop)
    );

    localStorage.setItem(
    getSaveKey("rotatingPackShop"),
    JSON.stringify(rotatingPackShop)
);

localStorage.setItem(
    getSaveKey("rotatingPackShopReset"),
    localStorage.getItem(
        getSaveKey("rotatingPackShopReset")
    ) || "0"
);

    /* shopReset is written by generateDailyShop and read back untouched, so
       there is nothing to save here. */

}

/**
 * One-time snapshot of every save slot, taken before the rebuilt UI writes
 * anything. No card was renamed in this release so saves should survive on
 * their own, but the layout and format changes are broad enough to want a way
 * back. Written once and never overwritten, so a later bug cannot clobber the
 * copy it would need to be recovered from.
 */
function backupSavesOnce() {

    if (localStorage.getItem("packlocked_backup_v1_done")) {

        return;

    }

    const keys = [];

    for (let i = 0; i < localStorage.length; i++) {

        const key = localStorage.key(i);

        if (
            key &&
            key.indexOf("save") === 0 &&
            key.indexOf("backup_v1_") !== 0
        ) {

            keys.push(key);

        }

    }

    // Collected first, because writing while iterating localStorage by index
    // shifts the very keys being walked.
    keys.forEach(function (key) {

        localStorage.setItem(
            "backup_v1_" + key,
            localStorage.getItem(key)
        );

    });

    localStorage.setItem("packlocked_backup_v1_done", "1");

}

function migrateOldSave() {

    if (localStorage.getItem("save1_inventory")) {

        return;

    }

    localStorage.setItem(
        "save1_tokens",
        localStorage.getItem("tokens") || "0"
    );

    localStorage.setItem(
        "save1_inventory",
        localStorage.getItem("inventory") || "[]"
    );

    localStorage.setItem(
        "save1_collection",
        localStorage.getItem("collection") || "[]"
    );

    localStorage.setItem(
        "save1_foilCollection",
        localStorage.getItem("foilCollection") || "[]"
    );

    localStorage.setItem(
        "save1_stats",
        localStorage.getItem("stats") || "{}"
    );

    localStorage.setItem(
        "save1_dailyShop",
        localStorage.getItem("dailyShop") || "[]"
    );

    localStorage.setItem(
        "save1_loadout",
        localStorage.getItem("loadout") ||
        JSON.stringify({
            perks: [],
            item: null,
            addons: []
        })
    );

    localStorage.setItem(
        "save1_shopReset",
        localStorage.getItem("shopReset") || "0"
    );

}
