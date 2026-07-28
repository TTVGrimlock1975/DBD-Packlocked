let tokens = Number(localStorage.getItem("tokens")) || 0;
let inventory = JSON.parse(localStorage.getItem("inventory")) || [];
let collection = JSON.parse(localStorage.getItem("collection")) || [];
let loadout = {
    perks: [],
    item: null,
    addons: []
};

const tokenDisplay = document.getElementById("tokens");

const removeTokenButton = document.getElementById("removeToken");

const basicPackButton = document.getElementById("basicPack");
const entityPackButton = document.getElementById("entityPack");
const iridescentPackButton = document.getElementById("iridescentPack");
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

const tokenPopup =
    document.getElementById("tokenPopup");

const tokenShop =
    document.getElementById("tokenShop");

const shopTimer =
    document.getElementById("shopTimer");

let dailyShop =
    JSON.parse(localStorage.getItem("dailyShop")) || [];


const cardRevealArea =
    document.getElementById("cardRevealArea");
let packOpening = false;

tokenGuideButton.addEventListener("click", function () {

    tokenGuide.style.display = "flex";

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

    tokens = 0;

    // Make today's shop purchasable again
    dailyShop.forEach(card => {
        card.purchased = false;
    });

    localStorage.setItem("inventory", JSON.stringify(inventory));
    localStorage.setItem("collection", JSON.stringify(collection));
    localStorage.setItem("tokens", tokens);
    localStorage.setItem("dailyShop", JSON.stringify(dailyShop));

    tokenDisplay.textContent = tokens;

    updateInventoryDisplay();
    updateCollectionCounter();
    updateLoadoutDisplay();
    updateShopDisplay();

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

window.addEventListener("click", function (event) {
    if (event.target === collectionModal) {
        collectionModal.style.display = "none";
    }
});

window.addEventListener("click", function (e) {

    if (e.target === tokenGuide) {

        tokenGuide.style.display = "none";

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

rewardRows.forEach(function (row) {

    row.addEventListener("click", function () {

        const amount = Number(row.dataset.tokens);

        tokens += amount;

        tokenDisplay.textContent = tokens;

        localStorage.setItem("tokens", tokens);

        tokenPopup.textContent =
            (amount >= 0 ? "+" : "") + amount + " 🩸";

        tokenPopup.classList.remove("show");
        void tokenPopup.offsetWidth;
        tokenPopup.classList.add("show");
        

    });

});


function updateInventoryDisplay() {

    if (inventory.length === 0) {

        inventoryDisplay.innerHTML = "Empty";
        return;

    }

    inventoryDisplay.innerHTML = inventory.map(card => 
        `
       <div class="card ${card.rarity.toLowerCase()} ${card.foil ? "foil" : ""}">

    <strong>${card.foil ? "✨ " : ""}${card.name}</strong>
    ${card.type}<br>
    ${card.rarity}<br>
    x${card.amount}

    <div class="cardButtons">

        <button onclick="equipCard('${card.name}')">
            Equip
        </button>

        <button onclick="sellCard('${card.name}')">
            Sell (+${card.foil ? 20 : 1} 🩸)
        </button>

    </div>

</div>
        `
    ).join("");

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

function generateDailyShop() {

    const now = Date.now();

    const shopReset =
        Number(localStorage.getItem("shopReset")) || 0;

    if (now < shopReset && dailyShop.length === 3) {

        updateShopDisplay();
        return;

    }

    const pool = [
        ...gameData.perks,
        ...gameData.items,
        ...gameData.addons
    ].filter(card =>
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
        "dailyShop",
        JSON.stringify(dailyShop)
    );

    localStorage.setItem(
        "shopReset",
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
        Number(localStorage.getItem("shopReset")) || 0;

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

    localStorage.setItem("tokens", tokens);

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

    localStorage.setItem(
        "inventory",
        JSON.stringify(inventory)
    );

    localStorage.setItem(
        "dailyShop",
        JSON.stringify(dailyShop)
    );

    updateInventoryDisplay();
    updateCollectionCounter();
    updateShopDisplay();

}
tokenDisplay.textContent = tokens;

function updateLoadoutDisplay() {

    for (let i = 0; i < 4; i++) {

        if (loadout.perks[i]) {
            perkSlots[i].textContent = loadout.perks[i].name;
        } else {
            perkSlots[i].textContent = "Empty";
        }

    }

    if (loadout.item) {
        itemSlot.textContent = loadout.item.name;
    } else {
        itemSlot.textContent = "Empty";
    }

    for (let i = 0; i < 2; i++) {

        if (loadout.addons[i]) {
            addonSlots[i].textContent = loadout.addons[i].name;
        } else {
            addonSlots[i].textContent = "Empty";
        }

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

    collectionList.innerHTML = cards.map(card => {

        const inventoryCard = inventory.find(i => i.name === card.name);

        const owned = !!inventoryCard;

        const amount = inventoryCard ? inventoryCard.amount : 0;

        return `
<div class="card ${owned ? card.rarity.toLowerCase() : "locked"}">

    <strong>${owned ? "✔ " + card.name : "?????"}</strong><br>

    ${owned ? card.type : "Undiscovered"}<br>

    ${owned ? card.rarity : ""}<br>

    ${owned ? `Owned: x${amount}` : ""}

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

        localStorage.setItem("inventory", JSON.stringify(inventory));

        updateInventoryDisplay();
        updateLoadoutDisplay();

    }

    if (card.type === "Item") {

        if (loadout.item) {
            alert("You already have an item equipped!");
            return;
        }

        loadout.item = {
            name: card.name,
            rarity: card.rarity,
            type: card.type
        };

        card.amount--;

        if (card.amount <= 0) {
            inventory = inventory.filter(c => c.name !== card.name);
        }

        localStorage.setItem("inventory", JSON.stringify(inventory));

        updateInventoryDisplay();
        updateLoadoutDisplay();

    }

    if (card.type === "Addon") {

        if (loadout.addons.length >= 2) {
            alert("Your add-on slots are full!");
            return;
        }

        loadout.addons.push({
            name: card.name,
            rarity: card.rarity,
            type: card.type
        });

        card.amount--;

        if (card.amount <= 0) {
            inventory = inventory.filter(c => c.name !== card.name);
        }

        localStorage.setItem("inventory", JSON.stringify(inventory));

        updateInventoryDisplay();
        updateLoadoutDisplay();

    }

}

function sellCard(cardName) {

    let card = inventory.find(card => card.name === cardName);

    if (!card) return;

    card.amount--;

    tokens += card.foil ? 20 : 1;

    if (card.amount <= 0) {

        inventory = inventory.filter(c => c.name !== cardName);

    }

    tokenDisplay.textContent = tokens;

    localStorage.setItem("tokens", tokens);
    localStorage.setItem("inventory", JSON.stringify(inventory));

    updateInventoryDisplay();

}



removeTokenButton.addEventListener("click", function () {

    if (tokens > 0) {
        tokens--;
    }

    tokenDisplay.textContent = tokens;

    localStorage.setItem("tokens", tokens);

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
    console.log("Hiding pack");
    pack.classList.remove("hidden");
    
    switch (packType) {

        case "Basic":
            pack.classList.add("basic");
            break;

        case "Entity":
            pack.classList.add("entity");
            break;

        case "Iridescent":
            pack.classList.add("iridescent");
            break;

    }
    pack.classList.add("shake");

    tokenDisplay.textContent = tokens;

    localStorage.setItem("tokens", tokens);


    let pulls = [];
    let pulledCards = [];
    console.log(gameData.perks);
    console.log("Perk count:", gameData.perks.length);


    for (let i = 0; i < amount; i++) {

        let rarity = getPackRarity(packType);

        console.log("Rolled:", rarity);

        let cardPool = [
            ...gameData.perks,
            ...gameData.items,
            ...gameData.addons
        ];

        let possibleCards = cardPool.filter(
            card => card.rarity === rarity
        );

        if (possibleCards.length === 0) {
            console.warn("No cards found for rarity:", rarity);
            continue;
        }


        let randomCard = possibleCards[Math.floor(Math.random() * possibleCards.length)];
        if (!collection.includes(randomCard.name)) {

            collection.push(randomCard.name);

            localStorage.setItem(
                "collection",
                JSON.stringify(collection)
            );

        }
        let isFoil = Math.random() < 0.005;



        let pulledCard = randomCard.name + " (" + randomCard.rarity + " - " + randomCard.type + ")";

        pulls.push(pulledCard);


        pulledCards.push({
            name: randomCard.name,
            rarity: randomCard.rarity,
            type: randomCard.type,
            foil: isFoil
        });

    }


    


    setTimeout(function () {

        pack.classList.remove("shake");

        pack.classList.add("flash");

    }, 500);

    setTimeout(function () {

        pack.classList.add("hidden");

        revealCards(pulls, pulledCards, packType);

        

    }, 1000);

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

        // Create a face-down card
        let container = document.createElement("div");
        container.className = "cardContainer";

        container.innerHTML =
            `
<div class="cardInner">

    <div class="cardBack">
        🂠
    </div>

    <div class="cardFront">
        <div class="card ${getRarityClass(card)} ${getRevealAnimation(card)}">
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
            const revealedCard = pulledCards[index];

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

            localStorage.setItem("inventory", JSON.stringify(inventory));

            updateInventoryDisplay();
            updateCollectionCounter();
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

            if (card.includes("Legendary")) {
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

    let cardsToReturn = [
        ...loadout.perks,
        ...(loadout.item ? [loadout.item] : []),
        ...loadout.addons
    ];

    cardsToReturn.forEach(card => {

        let existingCard = inventory.find(c => c.name === card.name);

        if (existingCard) {
            existingCard.amount++;
        } else {
            inventory.push({
                name: card.name,
                rarity: card.rarity,
                type: card.type,
                amount: 1
            });
        }

    });

    loadout = {
        perks: [],
        item: null,
        addons: []
    };

    localStorage.setItem("inventory", JSON.stringify(inventory));

    updateInventoryDisplay();
    updateLoadoutDisplay();

});

sacrificedButton.addEventListener("click", function () {

    loadout = {
        perks: [],
        item: null,
        addons: []
    };

    updateLoadoutDisplay();

});

basicPackButton.addEventListener("click", function () {

    openPack(5, 2, "Basic");

});


entityPackButton.addEventListener("click", function () {

    openPack(10, 2, "Entity");

});


iridescentPackButton.addEventListener("click", function () {

    openPack(15, 1, "Iridescent");

});

updateLoadoutDisplay();
updateInventoryDisplay();
updateCollectionCounter();
generateDailyShop();
updateShopTimer();

setInterval(updateShopTimer, 1000);