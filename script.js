let currentSave =
    Number(localStorage.getItem("currentSave")) || 1;

function getSaveKey(key) {

    return `save${currentSave}_${key}`;

}

let tokens = 0;



let inventory = [];

let collection = [];

let foilCollection = [];

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

const pack =
    document.getElementById("pack");

const rewardRows =
    document.querySelectorAll(".rewardRow");
console.log("Reward rows found:", rewardRows.length);

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

const cardRevealArea =
    document.getElementById("cardRevealArea");
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

tokenGuideButton.addEventListener("click", function () {

    tokenGuide.style.display = "flex";

});
console.log("Attaching guide listener");
guideButton.addEventListener("click", function () {

    console.log("Guide button clicked");

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

    localStorage.setItem(
        "stats",
        JSON.stringify(stats)
    );

    tokens = 0;

    // Make today's shop purchasable again
    dailyShop.forEach(card => {
        card.purchased = false;
    });

    

    tokenDisplay.textContent = tokens;

    updateInventoryDisplay();
    updateCollectionCounter();
    updateLoadoutDisplay();
    updateShopDisplay();
    

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
rewardRows.forEach(function (row) {

    row.addEventListener("click", function () {

        const amount = Number(row.dataset.tokens);

        tokens += amount;

        tokenDisplay.textContent = tokens;

        

        tokenPopup.textContent =
            (amount >= 0 ? "+" : "") + amount + " 🩸";

        tokenPopup.classList.remove("show");
        void tokenPopup.offsetWidth;
        tokenPopup.classList.add("show");

        saveCurrentGame();
        

    });

});


function updateInventoryDisplay() {

    if (inventory.length === 0) {

        inventoryDisplay.innerHTML = "Empty";
        return;

    }

    let cardsToShow = inventory;

    if (currentInventoryTab === "perk") {

        cardsToShow =
            inventory.filter(card =>
                card.type === "Perk"
            );

    } else {

        cardsToShow =
            inventory.filter(card =>
                card.type === "Item" ||
                card.type === "Addon"
            );

    }

    cardsToShow = cardsToShow.filter(card =>
        card.name
            .toLowerCase()
            .includes(inventorySearchText)
    );

    cardsToShow.forEach((card, index) => {
        card.displayIndex = index;
    });

    inventoryDisplay.innerHTML = cardsToShow.map(card => 
        `
       <div class="card ${card.rarity.toLowerCase()} ${card.foil ? "foil" : ""}">

    <strong>${card.foil ? "✨ " : ""}${card.name}</strong>

<div class="cardInfo">
    ${currentInventoryTab === "perk"
            ? `${card.rarity} • x${card.amount}`
            : `${card.type} • ${card.rarity} • x${card.amount}`
    }
</div>

    <div class="cardButtons">

    <button onclick="equipCardByIndex(${card.displayIndex})">
        Equip
    </button>

    <button onclick="sellCardByIndex(${card.displayIndex})">
        Sell (+${card.foil
            ? 20
            : (card.rarity === "Epic" || card.rarity === "Legendary")
                ? 2
                : 1
        } 🩸)
    </button>

</div>

</div>
        `
    ).join("");

}


function equipCardByIndex(index) {

    const cards = currentInventoryTab === "perk"
        ? inventory.filter(card => card.type === "Perk")
        : inventory.filter(card =>
            card.type === "Item" ||
            card.type === "Addon"
        );

    const filtered = cards.filter(card =>
        card.name.toLowerCase().includes(inventorySearchText)
    );

    equipCard(filtered[index].name);

}

function sellCardByIndex(index) {

    const cards = currentInventoryTab === "perk"
        ? inventory.filter(card => card.type === "Perk")
        : inventory.filter(card =>
            card.type === "Item" ||
            card.type === "Addon"
        );

    const filtered = cards.filter(card =>
        card.name.toLowerCase().includes(inventorySearchText)
    );

    sellCard(filtered[index].name);

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
        <div class="statIcon">📦</div>
        <div class="statLabel">Packs Opened</div>
        <div class="statValue">${stats.packsOpened}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">✨</div>
        <div class="statLabel">Foils Pulled</div>
        <div class="statValue">${stats.foilsPulled}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">🏃</div>
        <div class="statLabel">Escapes</div>
        <div class="statValue">${stats.escapes}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">☠</div>
        <div class="statLabel">Sacrifices</div>
        <div class="statValue">${stats.sacrifices}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">📈</div>
        <div class="statLabel">Escape Rate</div>
        <div class="statValue">${escapeRate}%</div>
    </div>

    <div class="statCard">
        <div class="statIcon">📚</div>
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
    ${currentSave === 1 ? "✓ Current" : ""}
</button>

<br><br>

<button class="saveSlotButton" onclick="selectSave(2)">
    Save Slot 2
    ${currentSave === 2 ? "✓ Current" : ""}
</button>

<br><br>

<button class="saveSlotButton" onclick="selectSave(3)">
    Save Slot 3
    ${currentSave === 3 ? "✓ Current" : ""}
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

    if (now < shopReset && dailyShop.length === 3) {

        updateShopDisplay();
        return;

    }

    const pool = gameData.perks.filter(card =>
        card.rarity === "Epic" ||
        card.rarity === "Legendary"
    );

    dailyShop = [];

    while (dailyShop.length < 3) {

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

    tokenShop.innerHTML = dailyShop.map((card, index) => `

<div class="card ${card.rarity.toLowerCase()}">

<strong>${card.name}</strong><br>

${card.type}<br>

${card.rarity}<br><br>

${card.purchased
            ? "<button disabled>Sold Out</button>"
            : `<button onclick="buyShopCard(${index})">
        ${card.rarity === "Legendary" ? 20 : 15} 🩸
      </button>`
        }

</div>

`).join("");

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

    

    let existingCard = inventory.find(c =>
        c.name === card.name &&
        c.foil === false
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
            continue;

        }

        slot.className = "slot " + perk.rarity.toLowerCase();

        slot.innerHTML = `
            <div class="loadoutCard">
                <span>${perk.name}</span>
                <button class="unequipButton">✖</button>
            </div>
        `;

        slot.querySelector(".unequipButton").onclick = function (event) {

            event.stopPropagation();

            unequipPerk(i);

        };

    }


    // ---------- ITEM ----------

    if (!loadout.item) {

        itemSlot.className = "slot";
        itemSlot.textContent = "Empty";

    } else {

        itemSlot.className =
            "slot " +
            loadout.item.rarity.toLowerCase();

        itemSlot.innerHTML = `
            <div class="loadoutCard">
                <span>${loadout.item.name}</span>
                <button class="unequipButton">✖</button>
            </div>
        `;

        itemSlot.querySelector(".unequipButton").onclick = function (event) {

            event.stopPropagation();

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
            continue;

        }

        slot.className =
            "slot " +
            addon.rarity.toLowerCase();

        slot.innerHTML = `
            <div class="loadoutCard">
                <span>${addon.name}</span>
                <button class="unequipButton">✖</button>
            </div>
        `;

        slot.querySelector(".unequipButton").onclick = function (event) {

            event.stopPropagation();

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

        const inventoryCard = inventory.find(i => i.name === card.name);

        const amount = inventoryCard ? inventoryCard.amount : 0;

        return `

<div class="card ${
            discovered
                ? card.rarity.toLowerCase() + (isFoil ? " foil" : "")
                : "locked"
}">

<strong>${
            discovered
                ? (isFoil ? "✨ " : "✔ ") + card.name
                : "?????"
}</strong>

    ${discovered ? card.type : "Undiscovered"}<br>

    ${discovered ? card.rarity : ""}<br>

    ${discovered ? `Owned: x${amount}` : ""}

</div>

        `;

    }).join("");

}

function equipCard(cardName) {

    let card = inventory.find(card => card.name === cardName);

    if (!card) {
        return;
    }

    if (card.type === "Perk") {

        if (loadout.perks.length >= 4) {
            alert("Your perk loadout is full!");
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
            inventory = inventory.filter(c => c.name !== card.name);
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
            inventory = inventory.filter(c => c.name !== card.name);
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
            inventory = inventory.filter(c => c.name !== card.name);
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
function sellCard(cardName) {

    let card = inventory.find(card => card.name === cardName);

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

        inventory = inventory.filter(c => c.name !== cardName);

    }

    tokenDisplay.textContent = tokens;

    updateInventoryDisplay();

    saveCurrentGame();

}



removeTokenButton.addEventListener("click", function () {

    if (tokens > 0) {
        tokens--;
    }

    tokenDisplay.textContent = tokens;

    saveCurrentGame();

});




function getRandomRarity() {

    let roll = Math.random() * 100;

    if (roll < 60) {
        return "Common";
    }

    if (roll < 85) {
        return "Rare";
    }

    if (roll < 97) {
        return "Epic";
    }

    return "Legendary";

}

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

}

function getRarityClass(card) {

    if (card.includes("Common")) {
        return "common";
    }

    if (card.includes("Rare")) {
        return "rare";
    }

    if (card.includes("Epic")) {
        return "epic";
    }

    if (card.includes("Legendary")) {
        return "legendary";
    }

}

function getTotalCards() {

    return (
        gameData.perks.length +
        gameData.items.length +
        gameData.addons.length
    );

}

function openPack(cost, amount, packType) {
    stats.packsOpened++;

    
    console.log("Opening:", packType);
    console.log(pack.className);
    if (packOpening) {
        return;
    }
    if (tokens < cost) {

        alert("Not enough Blood Tokens!");
        return;

    }

    packOpening = true;


    tokens -= cost;

    // Clear any previous pack animation
    cardRevealArea.innerHTML = "";

    pack.className = "pack";
    pack.classList.add("drop");
    console.log("Hiding pack");
    pack.classList.remove("hidden");

    cardRevealArea.innerHTML = "";

    const packTop = document.getElementById("packTop");

    packTop.classList.remove("opening");

    document.getElementById("packSmoke").classList.remove("smoke");

    void packTop.offsetWidth;
   
    setTimeout(function () {

        pack.classList.add("shake");

    }, 700);

    tokenDisplay.textContent = tokens;

    


    let pulls = [];
    let pulledCards = [];
    console.log(gameData.perks);
    console.log("Perk count:", gameData.perks.length);


    for (let i = 0; i < amount; i++) {

        let rarity = getPackRarity(packType);

        console.log("Rolled:", rarity);

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


        let pulledCard = randomCard.name + " (" + randomCard.rarity + " - " + randomCard.type + ")";

        pulls.push(pulledCard);


        pulledCards.push({
            name: randomCard.name,
            rarity: randomCard.rarity,
            type: randomCard.type,
            foil: isFoil
        });

    }


    
    document
        .getElementById("packSmoke")
        .classList.add("smoke");

    setTimeout(function () {

        pack.classList.remove("shake");

        pack.classList.add("flash");

    }, 500);

    setTimeout(function () {

        document
            .getElementById("packTop")
            .classList
            .add("opening");

    }, 1000);

    setTimeout(function () {

        pack.classList.add("hidden");

        revealCards(
            pulls,
            pulledCards,
            packType
        );

    }, 1700);

}

function openItemPack() {

    if (packOpening) return;

    if (tokens < 5) {

        alert("Not enough Blood Tokens!");
        return;

    }

    tokens -= 5;

    tokenDisplay.textContent = tokens;
    

    const pulls = [];
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

        pulls.push(
            randomCard.name +
            " (" +
            randomCard.rarity +
            " - " +
            randomCard.type +
            ")"
        );

        pulledCards.push({
            name: randomCard.name,
            rarity: randomCard.rarity,
            type: randomCard.type,
            foil: isFoil
        });

    }

    revealCards(
        pulls,
        pulledCards,
        "Item"
    );

}
function revealCards(pulls, pulledCards, packType) {

    cardRevealArea.innerHTML =
        "<h3>" + packType + " Pack Opened!</h3>";

    let index = 0;

    function revealNextCard() {

        if (index >= pulls.length) {

            cardRevealArea.innerHTML =
                "<h3>" + packType + " Pack Results</h3>";

            pulls.forEach(function (card) {

                cardRevealArea.innerHTML +=
                    "<div class='card " + getRarityClass(card) + "'>" +
                    card +
                    "</div>";

            });
            packOpening = false;
            return;
        }

        let card = pulls[index];
        const revealedCard = pulledCards[index];

        // Create a face-down card
        let container = document.createElement("div");
        container.className = "cardContainer risingCard";

        container.innerHTML =
            `
<div class="cardInner">

    <div class="cardBack">
        🂠
    </div>

    <div class="cardFront">
        <div class="card ${getRarityClass(card)} ${revealedCard.foil ? "foil" : ""} ${getRevealAnimation(card)}">
            ${card}
        </div>
    </div>

</div>
`;

        cardRevealArea.innerHTML =
            "<h3>" + packType + " Pack Opened!</h3>";

        cardRevealArea.appendChild(container);

        let inner = container.querySelector(".cardInner");

        const frontCard = container.querySelector(".card");

        container.style.cursor = "pointer";

        
        
        container.addEventListener("click", function reveal() {

            inner.classList.add("flipped");
            if (revealedCard.foil) {

                frontCard.classList.add("foilReveal");

            }

            let existingCard = inventory.find(card =>
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

            

            updateInventoryDisplay();
            updateCollectionCounter();
            saveCurrentGame();

            if (card.includes("Legendary")) {

                inner.classList.add("legendaryImpact");

            }

            container.classList.remove(getRevealAnimation(card));

            // Force the browser to recognize the removal
            void frontCard.offsetWidth;

            container.classList.add(getRevealAnimation(card));

            if (card.includes("Legendary")) {

                inner.classList.add("legendaryImpact");
                inner.classList.add("legendaryBurst");

                packAnimation.classList.add("legendaryScreenFlash");
                packAnimation.classList.add("legendaryScreenShake");

                setTimeout(function () {

                    inner.classList.remove("legendaryImpact");
                    inner.classList.remove("legendaryBurst");

                    packAnimation.classList.remove("legendaryScreenFlash");
                    packAnimation.classList.remove("legendaryScreenShake");

                }, 900);

            }

            container.removeEventListener("click", reveal);

            if (revealedCard.foil) {

                setTimeout(revealNextCard, 1400);

            } else if (card.includes("Legendary")) {

                setTimeout(revealNextCard, 1400);

            } else {

                setTimeout(revealNextCard, 700);

            }

            index++;

        });

    }

    revealNextCard();

}

function getRevealAnimation(card) {

    if (card.includes("Legendary"))
        return "legendaryReveal";

    if (card.includes("Epic"))
        return "epicReveal";

    if (card.includes("Rare"))
        return "rareReveal";

    return "commonReveal";

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

sacrificedButton.addEventListener("click", function () {

    const confirmed = confirm(
        "Are you sure you want to sacrifice your loadout?\n\nAll equipped perks, items, and add-ons will be permanently destroyed."
    );

    if (!confirmed) {
        return;
    }
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

migrateOldSave();

loadCurrentGame();

generateDailyShop();

updateShopTimer();

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
function loadCurrentGame() {

    tokens =
        Number(localStorage.getItem(getSaveKey("tokens"))) || 0;

    inventory =
        JSON.parse(localStorage.getItem(getSaveKey("inventory"))) || [];

    collection =
        JSON.parse(localStorage.getItem(getSaveKey("collection"))) || [];

    foilCollection =
        JSON.parse(localStorage.getItem(getSaveKey("foilCollection"))) || [];

    const savedLoadout = JSON.parse(
        localStorage.getItem(getSaveKey("loadout"))
    );

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

    stats =
        JSON.parse(localStorage.getItem(getSaveKey("stats"))) || {
            escapes: 0,
            sacrifices: 0,
            packsOpened: 0,
            foilsPulled: 0
        };

    dailyShop =
        JSON.parse(localStorage.getItem(getSaveKey("dailyShop"))) || [];

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

    const shopReset =
        localStorage.getItem(getSaveKey("shopReset"));

    if (shopReset !== null) {

        localStorage.setItem(
            getSaveKey("shopReset"),
            shopReset
        );

    }

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