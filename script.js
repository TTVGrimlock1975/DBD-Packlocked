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
    addons: []
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

const cardResult = document.getElementById("packAnimation");
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

let dailyShop = [];

let packOpening = false;

const statsButton =
    document.getElementById("statsButton");

const statsModal =
    document.getElementById("statsModal");

const closeStats =
    document.getElementById("closeStats");

const statsList =
    document.getElementById("statsList");

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

    if (event.target === statsModal) {

        statsModal.style.display = "none";

    }

});

window.addEventListener("click", function (event) {

    if (event.target === saveSlotsModal) {

        saveSlotsModal.style.display = "none";

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

        tokenPopup.innerHTML =
            (amount >= 0 ? "+" : "") + amount + PL.icons.get("blood", 30);

        tokenPopup.classList.remove("show");
        void tokenPopup.offsetWidth;
        tokenPopup.classList.add("show");

        saveCurrentGame();
        

    });

});


const RARITY_RANK = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };

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

        const sellValue = card.foil
            ? 20
            : (card.rarity === "Epic" || card.rarity === "Legendary")
                ? 2
                : 1;

        return PL.card.render(card, {
            count: card.amount,
            foil: card.foil,
            actions: [
                {
                    label: "Equip",
                    onclick: "equipCardByIndex(" + index + ")"
                },
                {
                    label: "Sell +" + sellValue + PL.icons.get("blood", 13),
                    onclick: "sellCardByIndex(" + index + ")"
                }
            ]
        });

    }).join("");

}




function equipCardByIndex(index) {

    const card = visibleInventory()[index];

    if (card) {

        equipCard(card);

    }

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

    localStorage.setItem(
        getSaveKey("shopReset"),
        now + (24 * 60 * 60 * 1000)
    );

    updateShopDisplay();

}

function updateShopDisplay() {

    tokenShop.innerHTML = dailyShop.map((card, index) => {

        const price = card.rarity === "Legendary" ? 20 : 15;

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

    const cost = card.rarity === "Legendary" ? 20 : 15;

    if (tokens < cost) {
        alert("Not enough Blood Tokens!");
        return;
    }

    tokens -= cost;

    tokenDisplay.textContent = tokens;

    updatePackButtons();

    

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
            actionLabel: "Unequip"
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
            actionLabel: "Unequip"
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
            actionLabel: "Unequip"
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

        const isFoil =
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
            foil: isFoil,
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

        /* Four different perks, the way a real loadout works. A duplicate is
           matched on name alone, so holding a foil and a plain copy of the same
           perk still only gets you one slot. */
        if (loadout.perks.some(equipped => equipped.name === card.name)) {
            alert("That perk is already equipped!");
            return;
        }

        loadout.perks.push({
            name: card.name,
            rarity: card.rarity,
            type: card.type,
            foil: card.foil
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

    if (card.type === "Item") {

        if (loadout.item) {
            alert("You already have an item equipped!");
            return;
        }

        loadout.item = {
            name: card.name,
            rarity: card.rarity,
            type: card.type,
            foil: card.foil
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
            foil: card.foil
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

    const perk = loadout.perks[index];

    if (!perk) return;

    let existing = inventory.find(card =>
        card.name === perk.name &&
        card.foil === perk.foil
    );

    if (existing) {

        existing.amount++;

    } else {

        inventory.push({
            name: perk.name,
            rarity: perk.rarity,
            type: perk.type,
            amount: 1,
            foil: perk.foil
        });

    }

    loadout.perks.splice(index, 1);

    

    updateInventoryDisplay();
    updateLoadoutDisplay();

    saveCurrentGame();

}

function unequipItem() {

    if (!loadout.item) return;

    let existing = inventory.find(card =>
        card.name === loadout.item.name &&
        card.foil === loadout.item.foil
    );

    if (existing) {

        existing.amount++;

    } else {

        inventory.push({
            name: loadout.item.name,
            rarity: loadout.item.rarity,
            type: loadout.item.type,
            amount: 1,
            foil: loadout.item.foil
        });

    }

    loadout.item = null;

    updateInventoryDisplay();
    updateLoadoutDisplay();

    saveCurrentGame();

}

function unequipAddon(index) {

    const addon = loadout.addons[index];

    if (!addon) return;

    let existing = inventory.find(card =>
        card.name === addon.name &&
        card.foil === addon.foil
    );

    if (existing) {

        existing.amount++;

    } else {

        inventory.push({
            name: addon.name,
            rarity: addon.rarity,
            type: addon.type,
            amount: 1,
            foil: addon.foil
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

    card.amount--;

    if (card.foil) {

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

    updateInventoryDisplay();

    saveCurrentGame();

}



removeTokenButton.addEventListener("click", function () {

    if (tokens > 0) {
        tokens--;
    }

    tokenDisplay.textContent = tokens;

    updatePackButtons();

    saveCurrentGame();

});




function getPackRarity(packType) {

    let roll = Math.random() * 100;


    if (packType === "Basic") {

        if (roll < 55) return "Common";
        if (roll < 87) return "Rare";
        if (roll < 98) return "Epic";
        return "Legendary";

    }


    if (packType === "Entity") {

        if (roll < 40) return "Rare";
        if (roll < 85) return "Epic";
        return "Legendary";

    }


    if (packType === "Iridescent") {

        if (roll < 20) return "Epic";
        return "Legendary";

    }

    /* An unknown pack type used to fall through as undefined, which matched no
       card and quietly produced an empty pack. */
    return "Common";

}

function getTotalCards() {

    return (
        gameData.perks.length +
        gameData.items.length +
        gameData.addons.length
    );

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
        let isFoil = Math.random() < 0.005;
        if (!collection.includes(randomCard.name)) {

            collection.push(randomCard.name);

            

        }

        if (isFoil && !foilCollection.includes(randomCard.name)) {
            stats.foilsPulled++;

           
            foilCollection.push(randomCard.name);

            

        }


        pulledCards.push({
            name: randomCard.name,
            rarity: randomCard.rarity,
            type: randomCard.type,
            foil: isFoil
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

        let rarity;

        const roll = Math.random() * 100;

        if (roll < 60) {

            rarity = "Common";

        } else if (roll < 90) {

            rarity = "Rare";

        } else if (roll < 99) {

            rarity = "Epic";

        } else {

            rarity = "Legendary";

        }

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

        const isFoil = Math.random() < 0.005;

        if (!collection.includes(randomCard.name)) {

            collection.push(randomCard.name);

            

        }

        if (isFoil && !foilCollection.includes(randomCard.name)) {
            stats.foilsPulled++;

            
            foilCollection.push(randomCard.name);

            
        }

        pulledCards.push({
            name: randomCard.name,
            rarity: randomCard.rarity,
            type: randomCard.type,
            foil: isFoil
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
            card.foil === revealedCard.foil
        );

        if (existingCard) {

            existingCard.amount++;

        } else {

            inventory.push({
                name: revealedCard.name,
                rarity: revealedCard.rarity,
                type: revealedCard.type,
                amount: 1,
                foil: revealedCard.foil
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
        ...loadout.perks,
        ...(loadout.item ? [loadout.item] : []),
        ...loadout.addons
    ];

    cardsToReturn.forEach(card => {

        let existingCard = inventory.find(c =>
            c.name === card.name &&
            c.foil === card.foil
        );

        if (existingCard) {
            existingCard.amount++;
        } else {
            inventory.push({
                name: card.name,
                rarity: card.rarity,
                type: card.type,
                amount: 1,
                foil: card.foil
            });
            
        }

    });

    loadout = {
        perks: [],
        item: null,
        addons: []
    };

    

    updateInventoryDisplay();
    updateLoadoutDisplay();

    saveCurrentGame();

});

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

        sacrificedButton.textContent = "Destroy " + equipped + "?";
        sacrificedButton.classList.add("plBtnConfirm");
        document.getElementById("sacrificeNote").classList.remove("hidden");

        sacrificeTimer = setTimeout(disarmSacrifice, 4000);

        return;

    }

    disarmSacrifice();

    stats.sacrifices++;

    
    loadout = {
        perks: [],
        item: null,
        addons: []
    };

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

backupSavesOnce();

migrateOldSave();

loadCurrentGame();

updatePackButtons();

generateDailyShop();

updateShopTimer();

PL.panels.pulls();

setInterval(updateShopTimer, 1000);

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

    if (dailyShop.length === 0) {

        generateDailyShop();

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
