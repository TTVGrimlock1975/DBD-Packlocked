let currentSave =
    Number(localStorage.getItem("currentSave")) || 1;

function getSaveKey(key) {

    return `save${currentSave}_${key}`;

}

/* Every modal in the app used to set style.display itself, at 32 different
   call sites — which meant a modal was only ever as loud as whoever
   remembered to add the sound at its own call site, and a modal added later
   would silently open in silence until someone noticed. Routed through here
   instead, once, so the sound is a property of opening or closing a modal at
   all rather than a property of any one place that does it. */
function openModal(modal) {

    modal.style.display = "flex";
    PL.sounds.modalOpen();

}

function closeModal(modal) {

    modal.style.display = "none";
    PL.sounds.modalClose();

}

let tokens = 0;



let inventory = [];

let collection = [];

let foilCollection = [];

/* Every JACK_BUILDS name Jack has ever dealt, at least once. Same shape and
   same reason as foilCollection: a name list rather than rows, since all it
   answers is "have I seen this one," not how many or which copy. Read by
   the Lifetime Progress panel as a completion count against JACK_BUILDS. */
let jackBuildsSeen = [];

/* Which completion milestones have been collected on, as percentages. What is
   *reached* is not stored: that is always derivable from collection.length, and
   a second stored copy of it could only ever drift out of step with the first.

   lastReachedCount is the banner's memory. updateCollectionCounter runs on far
   more than just a new card -- every sell, every save load, every tab switch --
   so without somewhere to remember how many lines had already been crossed, the
   announcement would fire again on all of them. */
/* Ground out of spare copies, spent forging a specific missing card. Its own
   balance rather than a second use for Blood Tokens: shards only ever come from
   duplicates and only ever go into the collection, so the pack economy is left
   exactly as it was. */
/* The open bargain, as { termId, stake }, or null when none is struck. The
   stake has already left the balance by the time this exists -- see
   strikeBargain -- so this is a claim on the Entity rather than an escrow. */
let bargain = null;

/* Which term the picker is sitting on, and for how much. Not saved: this is
   the state of a form nobody has committed to yet. */
let bargainPick = null;
let bargainStake = 0;

/* The last verdict, kept only so the panel can show what just happened where
   the picker used to be. */
let bargainResult = null;

let shards = 0;

/* Packs opened in a row with nothing new in them. Reset by any discovery, from
   any source, because the counter is measuring the player's luck rather than
   any one pack's behaviour. */
let packsSinceNew = 0;

/* What collection.length was when the last pack finished. Comparing against it
   is how a pack reports whether it held anything new without every pack type
   having to say so itself -- collection only ever grows, and only on discovery. */
let collectionAtLastPack = 0;

/* Which character sets have already paid out, by survivor name. Names rather
   than a count, so a set cannot be rewarded twice and the record stays readable
   in a save file. */
/* Escapes and trials per perk, as { "Perk Name": { played, escaped } }.
   Kept as a running tally rather than derived from eventLog, which is capped at
   two hundred entries and would silently start forgetting the earliest trials. */
/* The current week's standing: which week it is, the lifetime totals as they
   stood when it began, and which of its three have been claimed. The three
   challenges themselves are not stored — they are derived from the week number,
   so they cannot drift out of step with what the panel shows. */
let weekly = { week: 0, baseline: {}, claimed: [] };

let perkRecord = {};

let completedSets = [];

let claimedMilestones = [];

/* Which loadout slots the roller must leave alone. Positional, and deliberately
   not saved: a lock says "keep this one while I roll again", which is a thought
   that lasts about ten seconds. Restoring it days later would be restoring an
   intention the player no longer has. */
let rollLocks = {
    perks: [false, false, false, false],
    item: false,
    addons: [false, false]
};

let lastReachedCount = 0;

/* Stored under its own save key rather than folded into an existing one, so a
   save written by an older build simply has no history and starts empty, and
   an older build reading a newer save ignores the extra key entirely. */
let eventLog = [];

/* Eight kinds of entry fill fifty lines inside a single session, which is
   short enough to lose the morning by the evening. */
const EVENT_LOG_LIMIT = 200;

/* Reward clicks are the most frequent thing anyone does here, and one line
   each would bury every pull sitting between them. Awards landing inside this
   window merge into a single running line instead. */
const TOKEN_MERGE_MS = 10 * 60 * 1000;

let loadout = {
    perks: [],
    item: null,
    addons: [],
    aceLocked: false,
    /* Which Special dealt this loadout, so the "finish the match first" copy
       names the actual card instead of assuming it was always the Ace. Reset
       everywhere aceLocked itself resets -- the two never carry different
       lifetimes. */
    lockedBy: null
};


let stats = {
    escapes: 0,
    sacrifices: 0,
    packsOpened: 0,
    foilsPulled: 0,
    sold: 0,
    forged: 0,
    bargainsWon: 0,
    /* How many of foilsPulled were specifically Entity Touched, the rarest
       pull in the game. foilsPulled never distinguished a variant from any
       other foil, so this rode along uncounted until now. */
    entityTouchedPulled: 0,
    /* Signed: positive is a run of wins, negative a run of losses, 0 is
       either a fresh save or the last bargain being refunded (a term that no
       longer exists), which breaks neither kind of streak. bargainBestStreak
       only ever tracks the win side -- a loss streak has nothing worth
       bragging about. */
    bargainStreak: 0,
    bargainBestStreak: 0
};

const tokenDisplay = document.getElementById("tokens");

const removeTokenButton = document.getElementById("removeToken");

const basicPackButton = document.getElementById("basicPack");
const entityPackButton = document.getElementById("entityPack");
const itemPackButton =
    document.getElementById("itemPack");

const inventoryDisplay = document.getElementById("inventory");
/* Null on the main screen. The toolbar used to carry a "Collection: 37/209"
   next to Sort, which restated the sidebar's Progress block -- same two
   numbers, minus the bar and the percentage -- and sat in a row otherwise
   made entirely of controls that filter. The figure stayed; the third copy
   of it went. Kept as a lookup because the element is still allowed to
   exist, and everything below checks before it reaches for it. */
const collectionCounter =
    document.getElementById("collectionCounter");
const perkSlots = [
    document.getElementById("perk1"),
    document.getElementById("perk2"),
    document.getElementById("perk3"),
    document.getElementById("perk4")
];

const itemSlot = document.getElementById("itemSlot");

const rollLoadoutButton =
    document.getElementById("rollLoadout");

const rollNote =
    document.getElementById("rollNote");

const holdAllButton = document.getElementById("holdAllButton");
const clearHoldsButton = document.getElementById("clearHoldsButton");

const bargainPanel = document.getElementById("bargainPanel");

const weeklyModal = document.getElementById("weeklyModal");
const weeklyList = document.getElementById("weeklyList");
const weeklyBadge = document.getElementById("weeklyBadge");

const shardDisplay = document.getElementById("shards");

const pityNote = document.getElementById("pityNote");

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

const collectionRewards =
    document.getElementById("collectionRewards");

const collectionBadge =
    document.getElementById("collectionBadge");

const collectionTabs =
    document.querySelectorAll(".collectionTab");

const collectionFilters =
    document.getElementById("collectionFilters");

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

const kingUpgradeSearch =
    document.getElementById("kingUpgradeSearch");

const kingUpgradeMeta =
    document.getElementById("kingUpgradeMeta");

const queenBorrowSearch =
    document.getElementById("queenBorrowSearch");

const queenBorrowMeta =
    document.getElementById("queenBorrowMeta");

closeKingUpgrade.addEventListener(
    "click",
    function () {

        closeModal(kingUpgradeModal);

    }
);

const queenBorrowModal =
    document.getElementById("queenBorrowModal");

const closeQueenBorrow =
    document.getElementById("closeQueenBorrow");

const queenBorrowList =
    document.getElementById("queenBorrowList");

const queenBorrowResult =
    document.getElementById("queenBorrowResult");

closeQueenBorrow.addEventListener(
    "click",
    function () {

        closeModal(queenBorrowModal);

    }
);

/* Escape closes whichever modal is open. One handler rather than one per
   modal: they all carry .modal, only one is ever up, and a dismiss that
   answers only the mouse is half a dismiss. */
document.addEventListener("keydown", function (event) {

    if (event.key !== "Escape") {
        return;
    }

    document.querySelectorAll(".modal").forEach(function (modal) {

        if (modal.style.display === "flex") {
            modal.style.display = "none";
        }

    });

});

let dailyShop = [];

/* How long a rotation lasts, and how much of its tail counts as running out.
   The drain bar divides by the first and the panel turns red on the second, so
   both have to be the numbers the shop is actually generated against.

   The urgent window is deliberately absolute rather than a share of the
   rotation: it answers "is there still time to earn the tokens", which does not
   get shorter just because the rotation did. */
const ROTATION_MS = 1 * 60 * 60 * 1000;
const ROTATION_URGENT_MS = 10 * 60 * 1000;

/* Rotating Pack Shop: these definitions describe every special pack that can
   appear in the two rotating slots. Rarity restrictions are hard filters,
   while "basic" uses the same rarity odds as the existing Basic Pack.

   Costs scale with the shelf: floor-tier packs (commons in the pool
   somewhere) moved 2x, same as Basic and Item, and no-common/guaranteed-rare
   packs moved 1.5x, same as Entity. Kept as two multipliers rather than one
   across the board so a pack that already cost the same as Entity still does,
   and a pack priced off Basic still is -- a flat scalar everywhere would have
   held every number's ratio to its neighbours except that one. */
const ROTATING_PACKS = [
    {
        id: "fiftyFifty",
        name: "50/50 Pack",
        description: "1 card · Common or Legendary",
        cost: 15,
        cards: 1,
        rarityMode: "fiftyFifty"
    },
    {
        id: "trash",
        name: "Trash Pack",
        description: "6 cards · Commons only",
        cost: 14,
        cards: 6,
        rarityMode: "common"
    },
    {
        id: "duplicator",
        name: "Duplicator Pack",
        description: "3 cards · Same card three times",
        cost: 10,
        cards: 3,
        rarityMode: "basic",
        duplicate: true
    },
    {
        id: "lucky",
        name: "Lucky Pack",
        description: "3 cards · Epic or Legendary",
        cost: 30,
        cards: 3,
        rarityMode: "lucky"
    },
    {
        id: "rustyEquipment",
        name: "Rusty Equipment Pack",
        description: "4 cards · Common Items & Add-ons",
        cost: 14,
        cards: 4,
        rarityMode: "common",
        equipment: true
    },
    /* Lucky Pack's mirror for equipment. Rusty Equipment is the only other
       equipment-flavoured pack and it never rolls above Common, so a player
       done chasing common items and add-ons had no targeted pack of their
       own to reach for -- only the shelf Item Pack's mostly-Common odds.
       Same rarityMode as Lucky, same equipment flag as Rusty: the pool
       selection in openRotatingPack already handles both independently, so
       this is the two existing ideas combined rather than a new one. */
    {
        id: "fineEquipment",
        name: "Fine Equipment Pack",
        description: "3 cards · Epic or Legendary Items & Add-ons",
        cost: 30,
        cards: 3,
        rarityMode: "lucky",
        equipment: true
    },
    {
        id: "heavy",
        name: "Heavy Pack",
        description: "3 cards · 50% better foil odds",
        cost: 24,
        cards: 3,
        rarityMode: "basic",
        heavy: true
    },
    {
    id: "joker",
    name: "Faces & Aces",
    description: "1 card · Special",
    cost: 15,
    cards: 1,
    rarityMode: "joker",
    joker: true
    }
];

/* Generates two unique rotating packs and gives each one 1-3 purchases of
   stock. The generated shop persists until its rotation timer expires. */
function generateRotatingPackShop() {

    const now = Date.now();

    let shopReset =
        Number(
            localStorage.getItem(
                getSaveKey("rotatingPackShopReset")
            )
        ) || 0;

    /* A save written while rotations were longer carries a deadline further out
       than a rotation now lasts. Left alone the drain bar would sit pinned at
       full until it came back into range and the shop would read as stuck. The
       deadline is pulled in rather than the packs rerolled: whatever stock the
       player has already paid attention to stays theirs. */
    if (shopReset - now > ROTATION_MS) {

        shopReset = now + ROTATION_MS;

        localStorage.setItem(
            getSaveKey("rotatingPackShopReset"),
            shopReset
        );

    }

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

        const stock = Math.floor(Math.random() * 3) + 1;

        rotatingPackShop.push({
            id: pack.id,
            stock: stock,
            /* The pips have to know what the roll started at, and stock is
               decremented in place as the packs are bought. Without this a
               pack worn down to its last copy is indistinguishable from one
               that only ever had the one. */
            max: stock
        });

    }

    localStorage.setItem(
        getSaveKey("rotatingPackShop"),
        JSON.stringify(rotatingPackShop)
    );

    localStorage.setItem(
        getSaveKey("rotatingPackShopReset"),
        now + ROTATION_MS
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

        const short = pack.cost - tokens;

        /* Saves written before the pips existed carry no max, so the row falls
           back to drawing what is left rather than drawing nothing at all. */
        const max = entry.max || entry.stock;

        let pips = "";

        for (let i = 0; i < max; i++) {

            pips +=
                '<i class="rp__pip' +
                (i < entry.stock ? " rp__pip--on" : "") +
                '"></i>';

        }

        /* Sold out swaps the button for the stamp rather than leaving a dead
           button sitting beside a label that already said the same thing. */
        const action = soldOut
            ? '<span class="rp__stamp">Sold Out</span>'
            : `<button
                    type="button"
                    class="rp__buy${short > 0 ? " rp__buy--short" : ""}"
                    ${short > 0 ? "disabled" : ""}
                    onclick="buyRotatingPack('${pack.id}')">
                    ${short > 0 ? "Short " + short : "Open"}
                </button>`;

        return `
            <div class="rp__pack${soldOut ? " rp__pack--out" : ""}"
                 data-pack="${pack.id}">

                <div class="rp__top">

                    <span class="rp__name">
                        ${pack.name}
                    </span>

                    <span class="rp__cost">
                        ${pack.cost}${PL.icons.get("blood", 12)}
                    </span>

                </div>

                <p class="rp__desc">
                    ${pack.description}
                </p>

                <div class="rp__foot">

                    <span class="rp__stock"
                          title="${entry.stock} of ${max} remaining">
                        ${pips}
                        <span class="rp__left">
                            ${soldOut ? "none left" : entry.stock + " left"}
                        </span>
                    </span>

                    ${action}

                </div>

            </div>
        `;

    }).join("");

}

function updateRotatingPackTimer() {

    const timer =
        document.getElementById("rotatingPackTimer");

    const drain =
        document.getElementById("rotatingPackDrain");

    const panel =
        document.getElementById("rotatingPackShop");

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

        timer.textContent = "Restocking";

        if (drain) {
            drain.style.width = "0%";
        }

        generateRotatingPackShop();

        return;

    }

    const total = Math.floor(remaining / 1000);

    const hours = Math.floor(total / 3600);

    const minutes = Math.floor((total % 3600) / 60);

    const seconds = total % 60;

    /* Seconds only once they matter. At an hour the rotation barely reaches the
       hours branch, but the format is written against ROTATION_MS rather than
       against one particular length of it, so changing the rotation again does
       not leave the clock reading "0h 8m 41s". */
    timer.textContent =
        hours > 0
            ? `${hours}h ${minutes}m`
            : `${minutes}m ${String(seconds).padStart(2, "0")}s`;

    if (drain) {

        /* A save restored from a longer rotation would otherwise overflow the
           track rather than simply reading as full. */
        drain.style.width =
            Math.min(100, (remaining / ROTATION_MS) * 100) + "%";

    }

    if (panel) {

        panel.classList.toggle(
            "rp--urgent",
            remaining <= ROTATION_URGENT_MS
        );

    }

}

let rotatingPackShop = [];

let packOpening = false;

/* Auto Open.
 *
 * autoOpenMode is the toggle: off, buttons buy one pack the way they always
 * have. On, clicking a pack opens the picker below instead of buying, and
 * confirming it there hands off to the loop.
 *
 * autoOpenTarget is which pack the picker is currently showing -- set the
 * moment a pack is clicked while the toggle is on, read when Start or ALL IN
 * is pressed. autoOpenRun is only non-null while the loop is actually
 * spending tokens; its presence is what autoOpenStop and the toggle button's
 * own label read to know a run is in flight. */
let autoOpenMode = false;
let autoOpenTarget = null;
let autoOpenCount = 1;
let autoOpenRun = null;

const autoOpenToggle = document.getElementById("autoOpenToggle");
const autoOpenModal = document.getElementById("autoOpenModal");
const closeAutoOpen = document.getElementById("closeAutoOpen");
const autoOpenPackName = document.getElementById("autoOpenPackName");
const autoOpenAfford = document.getElementById("autoOpenAfford");
const autoOpenCountLabel = document.getElementById("autoOpenCount");

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

/* "all", "missing" or "forge". The search box answers "where is this card";
   these answer the two questions people actually bring to a collection screen
   -- what do I still not have, and what can I do something about right now.
   Both were already one predicate away from data the screen had in hand. */
let collectionFilter = "all";

/* Characters rather than Perks. The collection's job is to hand you something
   to chase, and "one more for Feng Min" is a goal in a way that a wall of a
   hundred and eighty card faces is not. The argument is made in full at the
   top of ui/characters.js; this is the line that acts on it. */
const COLLECTION_HOME = "character";

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
if (!localStorage.getItem("packlockedRulesSeen")) {

    openModal(guideModal);

    localStorage.setItem("packlockedRulesSeen", "true");

}
guideButton.addEventListener("click", function () {


    openModal(guideModal);

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
    jackBuildsSeen = [];
    eventLog = [];

    /* Wiped with the collection it was earned against. Left standing, the track
       would show ten milestones claimed on a save holding no cards, and every
       one of them would be unclaimable for the rest of that save's life. */
    claimedMilestones = [];
    completedSets = [];
    perkRecord = {};

    /* Rebaselined rather than blanked: the totals it measures against were just
       zeroed too, and a baseline left at the old numbers would read every
       challenge as instantly complete. */
    weekly = { week: 0, baseline: {}, claimed: [] };

    shards = 0;
    packsSinceNew = 0;
    collectionAtLastPack = 0;

    /* Struck against a balance that no longer exists. Cleared rather than left
       to settle, which would pay out of a fresh save's starting grant. */
    bargain = null;
    bargainResult = null;


    loadout = {
        perks: [],
        item: null,
        addons: []
    };

    stats = {

        escapes: 0,
        sacrifices: 0,
        packsOpened: 0,
        foilsPulled: 0,
        sold: 0,
        forged: 0,
        bargainsWon: 0,
        entityTouchedPulled: 0,
        bargainStreak: 0,
        bargainBestStreak: 0

    };

    // A reset save is a new save, so it starts with the same grant one gets.
    tokens = 10;

    // Make today's shop purchasable again
    dailyShop.forEach(card => {
        card.purchased = false;
    });

    /* And the rotating shop with it, which a reset used to walk straight past
       — a pack bought before the reset stayed sold out afterwards, on a save
       that no longer had the cards it paid for.

       The stock comes back; the rotation does not restart. Which two packs are
       on offer and how long they last is a clock the whole app reads, not
       progress this save earned, so resetting has no business winding it back.
       Same treatment the daily shop above gets.

       `max` postdates the first saves that had a rotating shop, so an entry
       without one restocks to a single copy rather than to nothing. */
    rotatingPackShop.forEach(entry => {
        entry.stock = entry.max || 1;
    });

    /* The wipe clears the balance, the shards and any open bargain, and none of
       the repaints below touch those. Without these two the panel kept showing
       a bargain struck against a save that no longer exists. */
    refreshTokenDisplays();
    updateShardDisplay();

    updateInventoryDisplay();
    updateCollectionCounter();
    updateLoadoutDisplay();
    updateShopDisplay();
    updateRotatingPackShopDisplay();
    PL.panels.pulls();


    saveCurrentGame();

    alert("Save reset successfully.");

});
if (collectionCounter) collectionCounter.addEventListener("click", function () {

    openCollection();

});

closeCollection.addEventListener("click", function () {
    closeModal(collectionModal);
});

closeGuide.addEventListener("click", function () {

    tokenGuide.style.display = "none";

});
closeGuideModal.addEventListener("click", function () {

    closeModal(guideModal);

});

statsButton.addEventListener("click", function () {

    updateStatsDisplay();

    openModal(statsModal);

});

closeStats.addEventListener("click", function () {

    closeModal(statsModal);

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

    openModal(soundModal);

});

closeSound.addEventListener("click", function () {

    closeModal(soundModal);

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

    openModal(saveSlotsModal);

});

closeSaveSlots.addEventListener("click", function () {

    closeModal(saveSlotsModal);

});

window.addEventListener("click", function (event) {
    if (event.target === collectionModal) {
        closeModal(collectionModal);
    }
});

window.addEventListener("click", function (event) {

    if (event.target === kingUpgradeModal) {

        closeModal(kingUpgradeModal);

    }

    if (event.target === queenBorrowModal) {

        closeModal(queenBorrowModal);

    }

});

window.addEventListener("click", function (event) {

    if (event.target === statsModal) {

        closeModal(statsModal);

    }

});

window.addEventListener("click", function (event) {

    if (event.target === saveSlotsModal) {

        closeModal(saveSlotsModal);

    }

});

window.addEventListener("click", function (event) {

    if (event.target === soundModal) {

        closeModal(soundModal);

    }

});

window.addEventListener("click", function (e) {

    if (e.target === tokenGuide) {

        tokenGuide.style.display = "none";

    }

});

window.addEventListener("click", function (e) {

    if (e.target === guideModal) {

        closeModal(guideModal);

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

document.getElementById("sellDuplicatesButton")
    .addEventListener("click", sellDuplicates);

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

/* Everything on screen that reads the token balance, refreshed together.
 *
 * This used to be listed by hand at each of the eleven places tokens change,
 * and the list had already drifted: opening a pack left the rotating shop still
 * advertising how many more tokens it needed, because that site called
 * updatePackButtons alone, and resetting a save refreshed neither. Adding the
 * bargain panel -- which quotes the balance too -- would have meant getting the
 * same list right in eleven places again.
 *
 * One function instead, so whatever depends on the balance next is wired up
 * once rather than nearly everywhere.
 */
function refreshTokenDisplays() {

    tokenDisplay.textContent = tokens;

    updatePackButtons();
    updateRotatingPackShopDisplay();
    updateBargainPanel();
    updateWeeklyPanel();

}

function updatePackButtons() {

    const packCosts = {
        basic: 10,
        item: 10,
        entity: 15
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
/* One place for the popup's restart dance. Dropping the class, forcing a
   reflow and adding it back is what lets the same element animate twice in a
   row; three copies of that would be three chances to get it subtly wrong.

   The modifier is toggled rather than added, so a milestone banner cannot
   leave its larger styling behind on the next ordinary +N. */
function showTokenPopup(html, milestone) {

    tokenPopup.classList.remove("show");
    void tokenPopup.offsetWidth;

    tokenPopup.innerHTML = html;

    tokenPopup.classList.toggle(
        "tokenPopup--milestone",
        milestone === true
    );

    tokenPopup.classList.add("show");

}

rewardRows.forEach(function (row) {

    row.addEventListener("click", function () {

        const amount = Number(row.dataset.tokens);

        tokens += amount;

        var reason = row.querySelector("span");

        logEvent("token", {
            amount: amount,
            reasons: [reason ? reason.textContent.trim() : "Reward"]
        });

        refreshTokenDisplays();

        showTokenPopup(
            (amount >= 0 ? "+" : "") + amount + PL.icons.get("blood", 30),
            false
        );

        // The panel quotes the balance, so it moves when the balance does.
        updateBargainPanel();

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

/* The cards a King would promote this one into. There are no Legendary items
   in the pool, so an Epic item has nowhere to go — offering it and only then
   alerting "No valid upgrade cards are available" spends the player a click
   for nothing. The picker and the upgrade itself both read this, so the two
   lists cannot drift: openKingUpgradeModal hands upgradeCardWithKing an index
   into the eligible list, and an index is only meaningful while both sides
   filter identically. */
function kingUpgradePool(card) {

    const nextRarity = KING_UPGRADE_RARITY[card.rarity];

    if (!nextRarity) {
        return [];
    }

    return gameData[
        card.type === "Perk"
            ? "perks"
            : card.type === "Item"
                ? "items"
                : "addons"
    ].filter(
        entry => entry.rarity === nextRarity
    );

}

/* The one definition of "this card can be fed to the King". */
function kingEligibleCards() {

    return inventory.filter(card =>
        card.name !== "The King" &&
        KING_UPGRADE_RARITY[card.rarity] &&
        kingUpgradePool(card).length > 0
    );

}

/* Rarity, not recency. The reveal screen has already shown you what came out
   of the pack and the pull log keeps the running history, so the inventory is
   not the place that answers "what did I just get" -- it answers "what do I
   have", which is a question about worth. It also resets to this on every
   load, since the choice is never saved, so this default is what almost
   everybody sees almost always. */
let inventorySort = "rarity";
let inventoryRarity = "all";

/**
 * The rows the inventory is currently showing, in display order.
 *
 * Equip and Sell act on a position in this list, so they must derive it the
 * same way the grid did — previously each rebuilt the filter itself, and any
 * change to sorting would have made a click hit the wrong card.
 */
/**
 * Everything the current tab and search allow, before the rarity chips get a
 * say.
 *
 * Split out because the chips tally against this rather than against the
 * finished list. Counting the final rows instead would zero all five other
 * rarities the moment you picked one, which turns a legend into a dead end.
 */
function inventoryScope() {

    let rows = inventory.filter(card =>
        currentInventoryTab === "perk"
            ? card.type === "Perk"
            : card.type === "Item" || card.type === "Addon"
    );

    if (inventorySearchText) {

        rows = rows.filter(card =>
            card.name.toLowerCase().includes(inventorySearchText)
        );

    }

    return rows;

}

function visibleInventory() {

    let rows = inventoryScope();

    if (inventoryRarity !== "all") {

        rows = rows.filter(card => card.rarity === inventoryRarity);

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

    } else if (inventorySort === "recent") {

        /* Cards are appended as they are pulled, so raw inventory order is
           oldest first -- the exact opposite of the "Newest first" this option
           has always called itself. Reversing the copy makes the label true.
           Safe on `rows` because it is already a slice; reversing `inventory`
           itself would rewrite the save. */
        rows.reverse();

    }

    return rows;

}

/* The inventory with nothing in it.
 *
 * It was one grey sentence adrift in a panel several hundred pixels tall,
 * which reads as a page that failed to load rather than as a state. It gets
 * the same ghost diamond an empty loadout slot carries, so a hole where a card
 * should be says the same thing in both places.
 */
function emptyState(head, body, icon) {

    return '<div class="plEmpty">' +
        '<span class="plEmpty__mark" aria-hidden="true">' +
            PL.icons.get(icon, 20) +
        "</span>" +
        '<p class="plEmpty__head">' + head + "</p>" +
        '<p class="plEmpty__body">' + body + "</p>" +
    "</div>";

}

/* An empty loadout slot: the ghost diamond comes from CSS, this is what sits
 * inside it. PL.icons.get rather than a data-icon placeholder, because
 * PL.icons.hydrate only runs over the markup once at startup and slots are
 * rewritten every time the loadout changes.
 */
function emptySlotMark(label) {

    return '<span class="slot__mark" aria-hidden="true">' +
        PL.icons.get("plus", 15) +
    "</span>" +
    '<span class="srOnly">Empty ' + label + " slot</span>";

}

/**
 * Writes each rarity's share into its own chip.
 *
 * The row was six identical buttons that only said what they filtered. It can
 * say what you have instead, which is the question the panel exists to answer
 * -- and in this game rarity IS the shape of a collection, so the filter row
 * and the legend and the distribution are one control rather than three.
 *
 * Tallied against inventoryScope(), so the numbers hold still when a chip is
 * picked instead of collapsing to one non-zero figure.
 */
function updateRarityTallies() {

    const scope = inventoryScope();
    const chips = document.querySelectorAll("#invRarity .invChip");

    chips.forEach(chip => {

        const rarity = chip.dataset.rarity;

        const n = rarity === "all"
            ? scope.length
            : scope.filter(card => card.rarity === rarity).length;

        const slot = chip.querySelector(".invChip__n");

        if (slot) slot.textContent = n;

        /* A rarity you hold none of stays legible and stays clickable -- it is
           still a true answer about the collection -- but it stops looking
           like it has something behind it. */
        chip.classList.toggle("invChip--empty", n === 0);

    });

}

function updateInventoryDisplay() {

    const rows = visibleInventory();

    updateRarityTallies();

    /* Disabled rather than hidden, same reasoning as the pack shelf buttons:
       a control that vanishes the moment it would do nothing is harder to
       find again than one that is just greyed out. */
    const sellDuplicatesButton = document.getElementById("sellDuplicatesButton");

    if (sellDuplicatesButton) {

        sellDuplicatesButton.disabled =
            PL.sell.duplicatesIn(rows, PL.forge.shardYield).totalCards === 0;

    }

    const counter = document.getElementById("inventoryCount");

    if (counter) {

        /* Only speaks when something is being hidden. Unfiltered it used to
           read "36 cards - 40 with duplicates", which restated the tab above
           it ("40 cards") and the All chip beside it, and it did so in the
           one spot on the row with nothing to align to. Narrow the list and
           the sentence has a job again: how much of it you are being shown. */
        const narrowed =
            inventoryRarity !== "all" || Boolean(inventorySearchText);

        counter.textContent = narrowed
            ? rows.length + " of " + inventoryScope().length + " shown"
            : "";

    }

    if (rows.length === 0) {

        /* Two different problems, so two different marks: a search that found
           nothing, against a collection that has nothing in it yet. */
        inventoryDisplay.innerHTML = inventory.length
            ? emptyState(
                "Nothing matches",
                "No card answers to that search or filter.",
                "search"
            )
            : emptyState(
                "Nothing collected",
                "Open a pack and it starts here.",
                "pack"
            );

        return;

    }

    inventoryDisplay.innerHTML = rows.map((card, index) => {

        const sellValue = PL.sell.valueOf(card);

        /* The Joker is sacrifice insurance, so selling it would quietly strip
           the protection the player is relying on. It keeps a disabled button
           rather than losing the row, so its face stays the same height as
           every other card in the grid. Same applied to two new cards.

           A last copy gets its own disabled label rather than sharing
           "Can't Sell" -- a Special reads as "this card type", a last copy
           reads as "this one card", and the two are worth telling apart so
           the button says why, not just that. */
        const sellAction = PL.sell.isUnsellable(card)
            ? {
                label: "Can't Sell",
                onclick: "",
                disabled: true
            }
            : PL.sell.isLastCopy(card, inventory)
                ? {
                    label: "Last Copy",
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
            : card.name === "The Queen"
            ? {
                label: "Use",
                onclick: "useQueenByIndex(" + index + ")"
            }
            : card.name === "Jack (Of All Trades)"
                ? {
                    label: "Use",
                    onclick: "useJackByIndex(" + index + ")"
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

/* The perks The Queen can lend: everything in the pool the player does not
   already hold. Specials are excluded — lending a Joker would hand out
   sacrifice insurance for free, and lending a Queen would recurse. */
function queenBorrowablePerks() {

    return gameData.perks.filter(perk =>
        perk.rarity !== "Special" &&
        !inventory.some(card => card.name === perk.name)
    );

}

function useQueenByIndex(index) {

    const card = visibleInventory()[index];

    if (!card || card.name !== "The Queen") {
        return;
    }

    if (loadout.aceLocked) {

        alert(
            (loadout.lockedBy || "The Ace") + " decides this loadout. Finish the match first."
        );

        return;
    }

    if (loadout.perks.length >= 4) {
        alert("Your perk loadout is full!");
        return;
    }

    const borrowable = queenBorrowablePerks();

    if (borrowable.length === 0) {

        alert(
            "You already own every perk — The Queen has nothing to lend."
        );

        return;
    }

    openQueenBorrowModal();

}

function openQueenBorrowModal() {

    queenBorrowResult.innerHTML = "";
    queenBorrowResult.style.display = "none";
    queenBorrowList.style.display = "grid";

    openModal(queenBorrowModal);

    wirePicker(queenBorrowList, borrowPerkWithQueen);

    wirePickerSearch(
        queenBorrowSearch,
        queenBorrowMeta,
        queenBorrowablePerks,
        function (shown) {

            pickerTiles(queenBorrowList, queenBorrowablePerks(), shown, function (perk) {
                return '<i class="' + perk.rarity.toLowerCase() + '">' + perk.rarity + "</i>";
            });

        }
    );

}

function borrowPerkWithQueen(perkIndex) {

    const perk = queenBorrowablePerks()[perkIndex];

    if (!perk) {
        return;
    }

    if (loadout.perks.length >= 4) {
        alert("Your perk loadout is full!");
        return;
    }

    const queen = inventory.find(
        card => card.name === "The Queen"
    );

    if (!queen) {
        return;
    }

    /* queenBorrowed is what keeps this a loan. Both match-resolution handlers
       bank loadout.perks back into the inventory, and this perk was never
       owned — without the flag, one Queen would permanently add a card the
       player never pulled. It is deliberately kept out of `collection` too:
       borrowing a perk is not discovering it. */
    loadout.perks.push({
        name: perk.name,
        rarity: perk.rarity,
        type: perk.type,
        foil: false,
        foilVariant: null,
        queenBorrowed: true
    });

    queen.amount--;

    if (queen.amount <= 0) {

        inventory = inventory.filter(
            card => card !== queen
        );

    }

    queenBorrowList.innerHTML = "";

    queenBorrowResult.innerHTML =
        "<h2>Borrowed!</h2>" +
        "<p>The Queen lends you:</p>" +
        '<div class="kingUpgradeResultCard">' +
            PL.card.render(perk, { size: "sm" }) +
        "</div>" +
        "<strong>" + perk.name + "</strong>" +
        "<span>Yours until this match ends.</span>" +
        '<button type="button" onclick="closeQueenBorrowResult()">Close</button>';

    queenBorrowResult.style.display = "flex";

    updateInventoryDisplay();
    updateLoadoutDisplay();

    logEvent("queen", {
        name: perk.name,
        rarity: perk.rarity
    });

}

window.closeQueenBorrowResult = function () {

    queenBorrowResult.style.display = "none";
    closeModal(queenBorrowModal);

};

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

    /* Built once, then drawn from without replacement. Rebuilding the whole
       pool each pass and picking blind dealt the same perk twice about one
       Ace in twenty, and equipCard rejects a duplicate perk everywhere else
       in the game — the Ace should not be the one route around that rule.
       The add-on loop below does the same, for the same reason. */
    const acePerkPool = gameData.perks.filter(
        perk => perk.type === "Perk" &&
                perk.name !== "The Joker" &&
                perk.name !== "The Queen" &&
                perk.name !== "The King" &&
                perk.name !== "The Ace" &&
                perk.name !== "Jack (Of All Trades)"
    );

    // Generate four random perks.
    for (let i = 0; i < 4; i++) {

        const perkPool = acePerkPool.filter(
            perk => !generatedPerks.some(
                chosen => chosen.name === perk.name
            )
        );

        if (perkPool.length === 0) {
            break;
        }

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

    /* Drawn without replacement, matching the perk loop and the guard in
       equipCard. The Ace pushes straight into the loadout rather than going
       through equipCard, so the rule has to be repeated here. Every category
       carries five add-ons, so both slots always fill. */
    for (let i = 0; i < 2; i++) {

        const available = addonPool.filter(
            entry => !generatedAddons.some(
                chosen => chosen.name === entry.name
            )
        );

        if (available.length === 0) {
            break;
        }

        const addon =
            available[
                Math.floor(Math.random() * available.length)
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
    loadout.lockedBy = "The Ace";

    updateInventoryDisplay();
    updateLoadoutDisplay();

    /* One line for the whole roll, named by its best card. Six lines for one
       click would read as six things happening. */
    const generated = generatedPerks
        .concat(generatedItem ? [generatedItem] : [])
        .concat(generatedAddons);

    if (generated.length) {

        const aceBest = bestOf(generated);

        logEvent("ace", {
            name: aceBest.name,
            rarity: aceBest.rarity,
            foil: !!aceBest.foil,
            count: generated.length
        });

    } else {

        saveCurrentGame();

    }

}

/* Real, named four-perk builds rather than a random draw -- the difference
   between Jack and the Ace. The first fourteen are hand-picked; the rest pull
   their four perks from DBD's own Bodyguard challenge build pool, renamed to
   match the hand-picked group's style rather than kept as the challenge's own
   labels. Names are checked against the perk pool by tools/build-cards.mjs's
   own generation step failing loudly if one of these ever stops existing, so
   a future rename anywhere upstream cannot leave Jack quietly dealing a card
   nobody can equip. */
const JACK_BUILDS = [
    { name: "Stealth Support", perks: ["A Place For Us", "Bite the Bullet", "Do No Harm", "Empathic Connection"] },
    { name: "Wiggle Free",     perks: ["Power Struggle", "Flip-Flop", "Plot Twist", "Unbreakable"] },
    { name: "Hook Guard",      perks: ["Desperate Measures", "Babysitter", "Borrowed Time", "Come And Get Me!"] },
    { name: "Boon Keeper",     perks: ["Boon: Steadfast", "Boon: Illumination", "Stake Out", "Corrective Action"] },
    { name: "Boon Support",    perks: ["Boon: Exponential", "We're Gonna Live Forever", "Empathy", "Kindred"] },
    { name: "Second Wind",     perks: ["Conviction", "Soul Guard", "Botany Knowledge", "Empathic Connection"] },
    { name: "Sabotage",        perks: ["Saboteur", "Background Player", "Light-Footed", "Breakout"] },
    { name: "Gen Rush",        perks: ["Quick Gambit", "Salvation's Cry", "Iron Will", "Moment Of Glory"] },
    { name: "Trapper's Bane",  perks: ["Apocalyptic Ingenuity", "Any Means Necessary", "Chemical Trap", "Wide Open Throttle"] },
    { name: "Info Gatherer",   perks: ["Kindred", "Open-Handed", "Bond", "Wiretap"] },
    { name: "Support Squad",   perks: ["Corrective Action", "Vigil", "Leader", "Open-Handed"] },
    { name: "Clutch Play",     perks: ["Resilience", "This Is Not Happening", "Desperate Measures", "Iron Will"] },
    { name: "Skill Master",    perks: ["Potential Energy", "Boon: Steadfast", "Hyperfocus", "Stake Out"] },
    { name: "Solo Survivor",   perks: ["No Mither", "Invocation: Weaving Spiders", "Resilience", "Head On"] },

    // Perks pulled from DBD's own Bodyguard challenge build pool; names above are ours.
    { name: "Selfless Aid",       perks: ["We're Gonna Live Forever", "Shoulder The Burden", "Botany Knowledge", "Duty Of Care"] },
    { name: "Flash Save",         perks: ["Flashbang", "Background Player", "Champion of Light", "Bond"] },
    { name: "Blinding Rescue",    perks: ["Flashbang", "Cross Examination", "Bond", "Champion of Light"] },
    { name: "Beam Guard",         perks: ["Background Player", "Champion of Light", "Bond", "Vigil"] },
    { name: "Quick Beam",         perks: ["Cross Examination", "Champion of Light", "Light-Footed", "Background Player"] },
    { name: "Wild Card",          perks: ["No Mither", "Self-Care", "Plot Twist", "Finesse"] },
    { name: "Down But Not Out",   perks: ["Last Stand", "Iron Will", "Background Player", "Resilience"] },
    { name: "Combat Medic",       perks: ["Botany Knowledge", "Empathic Connection", "Desperate Measures", "Do No Harm"] },
    { name: "Hook Breaker",       perks: ["Saboteur", "Breakout", "Background Player", "Bond"] },
    { name: "Chain Breaker",      perks: ["Saboteur", "Breakout", "Background Player", "Resilience"] },
    { name: "Rescue Ready",       perks: ["Shoulder The Burden", "We'll Make It", "Babysitter", "Reassurance"] },
    { name: "Forever Bonded",     perks: ["We're Gonna Live Forever", "Resilience", "For the People", "Bond"] },
    { name: "Endless Fight",      perks: ["We're Gonna Live Forever", "Made For This", "Resilience", "Botany Knowledge"] }
];

function useJackByIndex(index) {

    const card = visibleInventory()[index];

    if (!card || card.name !== "Jack (Of All Trades)") {
        return;
    }

    if (
        loadout.perks.length > 0 ||
        loadout.item ||
        loadout.addons.length > 0
    ) {

        alert(
            "Your loadout must be completely empty before using Jack."
        );

        return;
    }

    const build = JACK_BUILDS[
        Math.floor(Math.random() * JACK_BUILDS.length)
    ];

    // Logged the moment it's dealt, win or lose the trial after -- the
    // Lifetime Progress panel is tracking builds seen, not builds kept.
    if (!jackBuildsSeen.includes(build.name)) {
        jackBuildsSeen.push(build.name);
    }

    /* Missing from the pool would mean equipCard's own perk-name lookups have
       nothing to render — caught here, loudly, rather than dealing a card
       that shows as a blank slot for the rest of the trial. */
    const generatedPerks = build.perks.map(function (name) {

        const perk = gameData.perks.find(function (p) { return p.name === name; });

        if (!perk) {
            throw new Error("Jack build references an unknown perk: " + name);
        }

        const foilResult = rollFoilVariant();

        return {
            name: perk.name,
            rarity: perk.rarity,
            type: perk.type,
            foil: foilResult.foil,
            foilVariant: foilResult.foilVariant,
            aceGenerated: true
        };

    });

    // Consume Jack.
    card.amount--;

    if (card.amount <= 0) {

        inventory = inventory.filter(
            inventoryCard => inventoryCard !== card
        );

    }

    // Deal the build straight into the loadout -- perks only, same as the list it came from.
    loadout.perks = generatedPerks;

    /* Same flag The Ace sets, and the same reason: escape with this build to
       earn it, die without a Joker and it goes back to whatever it was
       before. The whole loadout locks, item and add-ons included, exactly
       like a loadout the Ace dealt -- Jack asks for it empty up front for the
       same reason. */
    loadout.aceLocked = true;
    loadout.lockedBy = "Jack";

    updateInventoryDisplay();
    updateLoadoutDisplay();

    const jackBest = bestOf(generatedPerks);

    logEvent("jack", {
        name: jackBest.name,
        rarity: jackBest.rarity,
        count: generatedPerks.length,
        build: build.name
    });

}

/* One picker behind both Special cards.

   The King and the Queen show the same grid over a different list, and they
   were doing it with two copies of a render function and two copies of the
   same search wiring built fresh on every open — which is how the King grew a
   stack of search boxes, and why the Queen needed a function whose whole job
   was removing them again. The box lives in the markup now, so there is only
   ever one and nothing has to clean up after it.

   A tile is the button. Every card in the grid does the same single thing, so
   a button under each one was fourteen copies of the same word taking up the
   room the cards wanted, and the card is the thing the eye is already on. */
function pickerTiles(listEl, all, shown, describe) {

    if (!shown.length) {

        listEl.innerHTML = '<p class="pickEmpty">Nothing matches that.</p>';
        return;

    }

    listEl.innerHTML = shown.map(function (card) {

        /* Indexed against the unfiltered list, so filtering the view never
           moves what a tile points at. */
        return '<div class="pickTile" role="button" tabindex="0" data-pick="' +
                all.indexOf(card) + '">' +

            PL.card.render(card, {
                count: card.amount,
                foil: card.foil,
                foilVariant: card.foilVariant,
                size: "sm"
            }) +

            '<p class="pickTile__line">' + describe(card) + "</p>" +

        "</div>";

    }).join("");

}

/* Wired once per list and left alone. Delegated, so a rebuilt grid keeps
   working without rebinding anything. */
function wirePicker(listEl, onPick) {

    if (listEl.dataset.wired) {
        return;
    }

    listEl.dataset.wired = "1";

    listEl.addEventListener("click", function (event) {

        var tile = event.target.closest("[data-pick]");

        if (tile) {
            onPick(Number(tile.dataset.pick));
        }

    });

    /* A tile says it is a button, so it has to answer like one. */
    listEl.addEventListener("keydown", function (event) {

        if (event.key !== "Enter" && event.key !== " ") {
            return;
        }

        var tile = event.target.closest("[data-pick]");

        if (!tile) {
            return;
        }

        event.preventDefault();
        onPick(Number(tile.dataset.pick));

    });

}

/* The search box and the count beside it, wired once and reset on each open. */
function wirePickerSearch(input, meta, getAll, render) {

    function run() {

        var text = input.value.trim().toLowerCase();

        var shown = getAll().filter(function (card) {
            return card.name.toLowerCase().includes(text);
        });

        render(shown);

        meta.textContent = text
            ? shown.length + " of " + getAll().length
            : getAll().length + (getAll().length === 1 ? " card" : " cards");

    }

    if (!input.dataset.wired) {

        input.dataset.wired = "1";
        input.addEventListener("input", run);

    }

    input.value = "";
    run();

}

function rarityStep(from, to) {

    return '<i class="' + String(from).toLowerCase() + '">' + from + "</i>" +
        '<span class="pickTile__arrow">\u2192</span>' +
        '<i class="' + String(to).toLowerCase() + '">' + to + "</i>";

}

function openKingUpgradeModal(kingCard) {

    const eligibleCards = kingEligibleCards();

    if (eligibleCards.length === 0) {

        alert(
            "You don't have any Common, Rare, or Epic cards to upgrade."
        );

        return;
    }

    openModal(kingUpgradeModal);

    wirePicker(kingUpgradeList, upgradeCardWithKing);

    wirePickerSearch(
        kingUpgradeSearch,
        kingUpgradeMeta,
        kingEligibleCards,
        function (shown) {

            pickerTiles(kingUpgradeList, kingEligibleCards(), shown, function (card) {
                return rarityStep(card.rarity, KING_UPGRADE_RARITY[card.rarity]);
            });

        }
    );

}

function upgradeCardWithKing(cardIndex) {


    kingUpgradeResult.innerHTML = "";
    kingUpgradeResult.style.display = "none";
    kingUpgradeList.style.display = "grid";

   const eligibleCards = kingEligibleCards();

const selectedCard = eligibleCards[cardIndex];

    if (!selectedCard) {
        return;
    }

    const possibleUpgrades = kingUpgradePool(selectedCard);

    /* kingEligibleCards already dropped anything with an empty pool, so this
       only fires if the card data changes under a save. */
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
    closeModal(kingUpgradeModal);
};

kingUpgradeResult.style.display = "flex";

updateInventoryDisplay();
updateCollectionCounter();

logEvent("king", {
    from: selectedCard.name,
    name: upgradedCard.name,
    rarity: upgradedCard.rarity,
    foil: upgradedFoil
});

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

    if (collectionCounter) {

        collectionCounter.textContent =
            `Collection: ${collection.length}/${total}`;

    }

    collectionProgress.textContent =
        `${collection.length}/${total} (${percent}%)`;

    refreshCollectionTabs();

    // The sidebar shows the same progress broken down by type, so it is kept
    // in step from the one place the counter is already refreshed.
    PL.panels.sidebar();
    PL.panels.shelf();

    /* Same reasoning for character sets and the reward track: every route that
       can discover a card already ends up here, so this is the only place that
       has to know either might have completed. */
    grantCompletedSets();
    updateCollectionRewards();
    updateWeeklyPanel();

}

/* Redraws the track, keeps the nav badge honest, and announces a crossing.
   Announcing from here rather than from the pack-opening code means a card
   found any other way -- the shop, the King's upgrade, a Special -- counts
   exactly the same. */
/* Sets pay automatically rather than waiting to be claimed. The completion
   track already asks the player to come and collect; a second thing to remember
   to press would be admin, not a reward. */
function grantCompletedSets() {

    const finished = PL.characters.newlyComplete(collection, completedSets);

    if (!finished.length) {
        return;
    }

    completedSets = completedSets.concat(finished);

    shards += finished.length * PL.characters.reward;

    finished.forEach(function (name) {
        logEvent("set", {
            name: name,
            amount: PL.characters.reward
        });
    });

    updateShardDisplay();

    /* Named rather than counted when it is a single set, because the name is
       the whole reason this reads better than a percentage. The mark beside it
       is the shard being paid out, not the collection this popup is about --
       every other payout here leads with its own currency, and a stack of
       boxes never told the player what they'd actually earned. */
    showTokenPopup(
        PL.icons.get("shard", 30) +
        '<span class="tokenPopup__ms">' +
            (finished.length === 1
                ? escapeForPopup(finished[0])
                : finished.length + " SETS COMPLETE") +
            "<small>+" + (finished.length * PL.characters.reward) +
                " iridescent shards</small>" +
        "</span>",
        true
    );

}

/* The popup takes HTML, and a survivor's name is data. Nothing in the roster
   contains markup today, but the roster is generated from another project. */
function escapeForPopup(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}

function updateCollectionRewards() {

    const total = getTotalCards();
    const found = collection.length;

    PL.rewards.render(
        collectionRewards,
        found,
        total,
        claimedMilestones
    );

    const ready =
        PL.rewards.readyCount(found, total, claimedMilestones);

    /* Without this, a player who never opens the Collection modal never finds
       out the track is there at all. */
    if (collectionBadge) {

        collectionBadge.textContent = ready;
        collectionBadge.hidden = ready === 0;

    }

    const reached = PL.rewards.reachedCount(found, total);

    if (reached > lastReachedCount) {

        /* The highest of them, because a single load can bring several across
           at once and a stack of banners says less than the best one does. */
        announceMilestone(PL.rewards.list[reached - 1].pct);

    }

    lastReachedCount = reached;

}

/* Announces, but does not pay. The tokens wait on the track, so a threshold
   crossed behind a pack-opening animation is still there when the cards stop
   turning over. */
function announceMilestone(pct) {

    /* Collection, not award -- this is a percentage of the card collection
       crossed, and the nav button for that collection already wears this
       mark. The bullseye stays where it means something: Award Tokens and
       Completion Rewards, neither of which this popup is. */
    showTokenPopup(
        PL.icons.get("collection", 34) +
        '<span class="tokenPopup__ms">' +
            pct + "% COLLECTED" +
            "<small>Reward ready to claim</small>" +
        "</span>",
        true
    );

}

function claimMilestone(pct) {

    /* Re-decided against the live collection rather than trusted from the
       button that was clicked. A track rendered before a save slot changed
       under it would otherwise be a free payout. */
    const milestone = PL.rewards.claimable(
        pct,
        collection.length,
        getTotalCards(),
        claimedMilestones
    );

    if (!milestone) {
        return;
    }

    claimedMilestones.push(milestone.pct);

    // The 100% claim is the one moment nothing else in the game is.
    if (milestone.pct === 100) {
        PL.sounds.milestoneComplete();
    } else {
        PL.sounds.confirm();
    }

    tokens += milestone.tokens;

    logEvent("token", {
        amount: milestone.tokens,
        reasons: [milestone.pct + "% Collection Reward"]
    });

    showTokenPopup(
        "+" + milestone.tokens + PL.icons.get("blood", 30),
        false
    );

    refreshTokenDisplays();

    // Repaints the node as claimed and drops the badge by one.
    updateCollectionCounter();

    saveCurrentGame();

}

/* The lifetime totals every challenge is measured against. One place, so a new
   challenge only needs a metric added here and a row in the catalogue. */
function weeklyMetrics() {

    return {
        packsOpened: stats.packsOpened,
        escapes: stats.escapes,
        foilsPulled: stats.foilsPulled,
        sold: stats.sold,
        forged: stats.forged,
        bargainsWon: stats.bargainsWon,
        discovered: collection.length,
        setsCompleted: completedSets.length
    };

}

/* Rolls the week over when the clock has passed it. Called before anything
   reads the board, so the panel can never show last week's challenges scored
   against this week's totals. */
function rollWeek() {

    const current = PL.weekly.weekOf(Date.now());

    if (weekly.week === current) {
        return false;
    }

    weekly = {
        week: current,
        baseline: weeklyMetrics(),
        claimed: []
    };

    return true;

}

function updateWeeklyPanel() {

    if (rollWeek()) {
        saveCurrentGame();
    }

    const ready = PL.weekly.readyCount(
        weekly.week, weeklyMetrics(), weekly.baseline, weekly.claimed
    );

    if (weeklyBadge) {
        weeklyBadge.textContent = ready;
        weeklyBadge.hidden = ready === 0;
    }

    if (weeklyList) {
        weeklyList.innerHTML = PL.weekly.render(
            weekly.week, weeklyMetrics(), weekly.baseline, weekly.claimed, Date.now()
        );
    }

}

function claimWeekly(id) {

    rollWeek();

    /* Re-decided against live totals rather than trusted from the button. The
       panel can sit open while a pack is opened behind it. */
    const row = PL.weekly.claimable(
        weekly.week, id, weeklyMetrics(), weekly.baseline, weekly.claimed
    );

    if (!row) {
        return;
    }

    weekly.claimed = weekly.claimed.concat(row.id);

    PL.sounds.confirm();

    tokens += row.reward;

    logEvent("token", {
        amount: row.reward,
        reasons: [row.label]
    });

    showTokenPopup(
        "+" + row.reward + PL.icons.get("blood", 30),
        false
    );

    refreshTokenDisplays();
    updateWeeklyPanel();

    saveCurrentGame();

}

function recordTrial(result, snapshot) {

    perkRecord = PL.records.fold(perkRecord, snapshot, result);

    /* A trial with no bargain on it touches neither funnel above, so the escape
       count would sit stale on the board until something else moved. */
    updateWeeklyPanel();

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

    // Signed streak read back as which side it's on, not a bare number that
    // reads as a win count either way.
    const bargainStreakLabel =
        stats.bargainStreak > 0
            ? stats.bargainStreak + " Won"
            : stats.bargainStreak < 0
                ? Math.abs(stats.bargainStreak) + " Lost"
                : "None yet";

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
        <div class="statIcon">${PL.icons.get("foil", 26)}</div>
        <div class="statLabel">Entity Touched</div>
        <div class="statValue">${stats.entityTouchedPulled}</div>
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

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("minus", 26)}</div>
        <div class="statLabel">Cards Sold</div>
        <div class="statValue">${stats.sold}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("reset", 26)}</div>
        <div class="statLabel">Cards Forged</div>
        <div class="statValue">${stats.forged}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("dice", 26)}</div>
        <div class="statLabel">Bargains Won</div>
        <div class="statValue">${stats.bargainsWon}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("dice", 26)}</div>
        <div class="statLabel">Bargain Streak</div>
        <div class="statValue">${bargainStreakLabel}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("dice", 26)}</div>
        <div class="statLabel">Best Bargain Streak</div>
        <div class="statValue">${stats.bargainBestStreak}</div>
    </div>

    <div class="statCard">
        <div class="statIcon">${PL.icons.get("loadout", 26)}</div>
        <div class="statLabel">Jack Builds Seen</div>
        <div class="statValue">${jackBuildsSeen.length}/${JACK_BUILDS.length}</div>
    </div>

</div>

${PL.records.render(perkRecord)}

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
        PL.sounds.error();
        alert("Not enough Blood Tokens!");
        return;
    }

    tokens -= cost;

    refreshTokenDisplays();

    

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

    logEvent("buy", {
        name: card.name,
        rarity: card.rarity,
        amount: -cost
    });

}
tokenDisplay.textContent = tokens;

/* Inventory rows carry no category -- equipCard never stored one -- so an
   add-on's compatibility has to be read back off the pool it came from. Joining
   by name here keeps that lookup in one place instead of at each use. */
function poolEntry(name) {

    return gameData.perks.concat(gameData.items, gameData.addons)
        .find(function (card) { return card.name === name; }) || null;

}

/* An add-on only fits the item family it was made for -- a Med-Kit add-on has
   nothing to attach to on a Toolbox, and DBD never lets one item wear
   another's add-on. Equipped rows carry no category of their own (same reason
   poolEntry exists above), so this is the one place that reads it. */
function categoryOf(name) {

    const entry = poolEntry(name);
    return entry ? entry.category : null;

}

/* One row per distinct card the player owns and has not already equipped.
   Rows are collapsed to pool entries because the roller picks cards, not
   copies; which copy gets equipped is settled later, by equipRolled. */
function ownedPool(type) {

    const seen = [];

    inventory.forEach(function (card) {

        if (card.type !== type || seen.indexOf(card.name) !== -1) {
            return;
        }

        seen.push(card.name);

    });

    return seen.map(poolEntry).filter(Boolean);

}

/* Prefers the plain copy, for the reason equipCard gives when it is handed a
   bare name: a foil is a thing you choose to show off, never something a roll
   should spend on your behalf. */
function equipRolled(name) {

    const card =
        inventory.find(function (c) { return c.name === name && !c.foil; }) ||
        inventory.find(function (c) { return c.name === name; });

    if (card) {
        equipCard(card);
    }

}

/* Empties every slot the player is not holding. Perks and add-ons come out
   back to front: unequipPerk splices, so clearing index 0 first would shift
   everything after it and the locks would end up pointing at the wrong cards. */
function clearUnlockedSlots() {

    for (let i = loadout.perks.length - 1; i >= 0; i--) {

        /* The Queen's loan cannot be unequipped at all, so it holds its slot
           whether or not the player locked it. */
        if (!rollLocks.perks[i] && !loadout.perks[i].queenBorrowed) {
            unequipPerk(i);
        }

    }

    for (let i = loadout.addons.length - 1; i >= 0; i--) {

        if (!rollLocks.addons[i]) {
            unequipAddon(i);
        }

    }

    /* Last, because an add-on kept across the roll constrains which item may
       be drawn, and that is decided from what is still equipped. */
    if (!rollLocks.item) {
        unequipItem();
    }

}

function rollLoadout() {

    if (loadout.aceLocked) {

        setRollNote((loadout.lockedBy || "The Ace") + " decides this loadout. Finish the match first.");
        return;

    }

    clearUnlockedSlots();

    /* Read after clearing, so "kept" means what actually survived rather than
       what was asked for -- a locked slot that was empty holds nothing. */
    const kept = {
        perks: loadout.perks.map(function (p) { return poolEntry(p.name); }).filter(Boolean),
        item: loadout.item ? poolEntry(loadout.item.name) : null,
        addons: loadout.addons.map(function (a) { return poolEntry(a.name); }).filter(Boolean)
    };

    const keptNames = kept.perks.concat(kept.item || [], kept.addons)
        .map(function (c) { return c.name; });

    const owned = {
        perks: ownedPool("Perk"),
        items: ownedPool("Item"),
        addons: ownedPool("Addon")
    };

    /* A card already held is out of its own pool. Without this a second copy
       could be drawn into another slot, and equipCard would reject it. */
    Object.keys(owned).forEach(function (key) {
        owned[key] = owned[key].filter(function (card) {
            return keptNames.indexOf(card.name) === -1;
        });
    });

    const result = PL.roller.roll(owned, kept, Math.random);

    result.perks.forEach(function (card) {
        if (keptNames.indexOf(card.name) === -1) {
            equipRolled(card.name);
        }
    });

    if (result.item && (!loadout.item || loadout.item.name !== result.item.name)) {
        equipRolled(result.item.name);
    }

    result.addons.forEach(function (card) {
        if (keptNames.indexOf(card.name) === -1) {
            equipRolled(card.name);
        }
    });

    /* Splicing compacted the kept cards to the front of each row, so the locks
       have to follow them there or they would guard whatever landed in the old
       position. */
    rollLocks.perks = [0, 1, 2, 3].map(function (i) { return i < kept.perks.length; });
    rollLocks.addons = [0, 1].map(function (i) { return i < kept.addons.length; });

    setRollNote(PL.roller.summarise(result));

    updateInventoryDisplay();
    updateLoadoutDisplay();
    animateRolledSlots();

    saveCurrentGame();

}

/* The roll used to just snap into place -- updateLoadoutDisplay rewrites
   every slot's innerHTML synchronously, which is correct but instant, and a
   deliberate action like this deserved more than a jump cut.
 *
 * Reads rollLocks after the roll, not before. Kept cards get compacted to
 * the front of each row and rollLocks gets rewritten to match (see the
 * comment above it), so by this point "unlocked" already means exactly
 * "this is what the roll just decided" for every group -- no need to track
 * positions through the reshuffle by hand.
 *
 * The flip itself is reveal's own .plBack, reused rather than reinvented: a
 * face-down cover placed over the card updateLoadoutDisplay already
 * rendered, staggered off DEAL_MS apart the same way a pack's cards land.
 * The legendary/special screen cues are the same two classes for the same
 * reason -- rolling a Legendary into a slot is the same kind of moment a
 * pack pulling one is. */
function animateRolledSlots() {

    const targets = [];

    for (let i = 0; i < 4; i++) {
        if (!rollLocks.perks[i] && loadout.perks[i]) {
            targets.push({ slot: perkSlots[i], label: "Perk", card: loadout.perks[i] });
        }
    }

    if (!rollLocks.item && loadout.item) {
        targets.push({ slot: itemSlot, label: "Item", card: loadout.item });
    }

    for (let i = 0; i < 2; i++) {
        if (!rollLocks.addons[i] && loadout.addons[i]) {
            targets.push({ slot: addonSlots[i], label: "Add-on", card: loadout.addons[i] });
        }
    }

    if (!targets.length) {
        return;
    }

    const DEAL_MS = 130;
    const FLIP_MS = 420;

    const RARITY_SCORE = { Common: 0, Rare: 1, Epic: 2, Legendary: 3, Special: 4 };
    let bestCard = null;

    targets.forEach(function (target, i) {

        const back = document.createElement("div");

        back.className = "plBack";
        back.style.pointerEvents = "none";
        back.innerHTML =
            '<span class="plBack__mark">' + PL.icons.get("dice", 20) + "</span>" +
            '<span class="plBack__rule"></span>' +
            '<span class="plBack__tier">' + target.label + "</span>";

        target.slot.appendChild(back);

        setTimeout(function () {

            PL.sounds.cardFlip();
            back.classList.add("plBack--gone");

            setTimeout(function () {
                back.remove();
            }, FLIP_MS);

        }, i * DEAL_MS);

        if (!bestCard || RARITY_SCORE[target.card.rarity] > RARITY_SCORE[bestCard.rarity]) {
            bestCard = target.card;
        }

    });

    /* Fires at the same moment the flips start rather than waiting for the
       last one to land, matching how a Quick-Opened pack's own celebration
       does not wait on its cards' staggered fade-in either. */
    if (bestCard && (bestCard.rarity === "Legendary" || bestCard.rarity === "Special")) {

        const panel = document.querySelector(".plLoadout");
        const isSpecial = bestCard.rarity === "Special";

        PL.sounds.specialReveal();

        if (isSpecial) {

            panel.classList.add("specialScreenBloom", "specialScreenPulse");

            setTimeout(function () {
                panel.classList.remove("specialScreenBloom", "specialScreenPulse");
            }, 1200);

        } else {

            panel.classList.add("legendaryScreenFlash", "legendaryScreenShake");

            setTimeout(function () {
                panel.classList.remove("legendaryScreenFlash", "legendaryScreenShake");
            }, 900);

        }

    }

}

function setRollNote(text) {

    if (rollNote) {
        rollNote.textContent = text;
    }

}

function toggleRollLock(kind, index) {

    if (kind === "item") {
        rollLocks.item = !rollLocks.item;
    } else {
        rollLocks[kind][index] = !rollLocks[kind][index];
    }

    PL.sounds.toggle();
    updateLoadoutDisplay();

}

/* Bulk equivalents of toggleRollLock, for the row at once instead of one
   slot at a time. Only ever touches filled slots -- an empty one has nothing
   to hold, same reasoning updateLoadoutDisplay already applies when it clears
   a lock out from under a card that just left. */
function holdAllSlots() {

    rollLocks.perks = rollLocks.perks.map(function (held, i) {
        return loadout.perks[i] ? true : held;
    });

    rollLocks.item = loadout.item ? true : rollLocks.item;

    rollLocks.addons = rollLocks.addons.map(function (held, i) {
        return loadout.addons[i] ? true : held;
    });

    PL.sounds.toggle();
    updateLoadoutDisplay();

}

function clearAllHolds() {

    rollLocks.perks = rollLocks.perks.map(function () { return false; });
    rollLocks.item = false;
    rollLocks.addons = rollLocks.addons.map(function () { return false; });

    PL.sounds.toggle();
    updateLoadoutDisplay();

}

/* The lock rides inside the slot, so the one place a card is drawn stays the
   one place it is drawn. Ace-locked loadouts get none: nothing can move, so a
   control promising to hold something still would be a lie. */
function lockMark(kind, index, held) {

    if (loadout.aceLocked || held) {
        return "";
    }

    const on = kind === "item" ? rollLocks.item : rollLocks[kind][index];

    return '<button type="button" class="slotLock' + (on ? " slotLock--on" : "") +
        '" data-lock="' + kind + '" data-lock-index="' + index +
        '" aria-pressed="' + on + '" title="' +
        (on ? "Held — the roller will keep this" : "Hold this slot when rolling") +
        '">' + PL.icons.get("lock", 14) + "</button>";

}

function updateLoadoutDisplay() {

    // ---------- PERKS ----------
    for (let i = 0; i < 4; i++) {

        const slot = perkSlots[i];
        const perk = loadout.perks[i];

        if (!perk) {

            /* An empty slot has nothing to hold, so a lock left on it would
               only survive to block the next roll from filling it. */
            rollLocks.perks[i] = false;

            slot.className = "slot";
            slot.innerHTML = emptySlotMark("perk");
            slot.onclick = null;
            continue;

        }

        slot.className = "slot slot--filled";

        slot.innerHTML = PL.card.render(perk, {
    size: "sm",
    foil: perk.foil,
    foilVariant: perk.foilVariant,
    actionLabel: perk.queenBorrowed
    ? "On Loan"
    : loadout.aceLocked
        ? "Can't Unequip"
        : "Unequip"
}) + lockMark("perks", i, perk.queenBorrowed);

        slot.onclick = function (event) {

            /* The lock sits on top of the card, which is already a big
               unequip target -- so it has to claim the click before the
               slot does, or holding a slot would throw it away instead. */
            if (event.target.closest(".slotLock")) {
                toggleRollLock("perks", i);
                return;
            }

            unequipPerk(i);

        };

    }


    // ---------- ITEM ----------

    if (!loadout.item) {

        rollLocks.item = false;

        itemSlot.className = "slot";
        itemSlot.innerHTML = emptySlotMark("item");
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
}) + lockMark("item", 0, false);

        itemSlot.onclick = function (event) {

            if (event.target.closest(".slotLock")) {
                toggleRollLock("item", 0);
                return;
            }

            unequipItem();

        };

    }


    // ---------- ADD-ONS ----------

    for (let i = 0; i < 2; i++) {

        const slot = addonSlots[i];
        const addon = loadout.addons[i];

        if (!addon) {

            rollLocks.addons[i] = false;

            slot.className = "slot";
            slot.innerHTML = emptySlotMark("add-on");
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
}) + lockMark("addons", i, false);

        slot.onclick = function (event) {

            if (event.target.closest(".slotLock")) {
                toggleRollLock("addons", i);
                return;
            }

            unequipAddon(i);

        };

    }

    /* Same absence lockMark itself checks: nothing to hold or release while
       the Ace is deciding, so the row-level shortcuts go quiet right along
       with every per-slot lock they stand in for. */
    if (holdAllButton && clearHoldsButton) {

        holdAllButton.hidden = loadout.aceLocked;
        clearHoldsButton.hidden = loadout.aceLocked;

        /* rollLocks for anything not actually filled was already forced back
           to false above, slot by slot, as each loop hit it -- so a plain
           count here is enough; nothing held can outlive the card it held. */
        const filled =
            loadout.perks.length +
            (loadout.item ? 1 : 0) +
            loadout.addons.length;

        const held =
            rollLocks.perks.filter(Boolean).length +
            (rollLocks.item ? 1 : 0) +
            rollLocks.addons.filter(Boolean).length;

        holdAllButton.disabled = filled === 0 || held === filled;
        clearHoldsButton.disabled = held === 0;

    }

}

/* A copy of what is equipped right now, taken before either resolution handler
   starts handing cards back. The terms are judged against what was carried into
   the trial, and by the time those handlers finish the loadout is empty. */
function loadoutSnapshot() {

    return {
        perks: loadout.perks.map(function (p) {
            return { name: p.name, rarity: p.rarity };
        }),
        item: loadout.item ? { name: loadout.item.name } : null,
        addons: loadout.addons.map(function (a) {
            return { name: a.name, rarity: a.rarity };
        })
    };

}

function strikeBargain() {

    if (bargain) {
        return;
    }

    if (!PL.bargain.canStrike(bargainPick, bargainStake, tokens)) {
        return;
    }

    /* Taken now rather than held in escrow. A stake that is still spendable is
       not a stake, and it would let the same tokens back two bargains and buy
       a pack besides. */
    tokens -= bargainStake;

    bargain = { termId: bargainPick, stake: bargainStake };
    bargainResult = null;

    logEvent("bargain", {
        struck: PL.bargain.termById(bargainPick).name,
        amount: -bargainStake
    });

    refreshTokenDisplays();

    saveCurrentGame();

}

/* Called from both resolution handlers with the loadout as it was played.
   Returns nothing: the panel and the balance are the report. */
function settleBargain(result, snapshot) {

    if (!bargain) {
        return;
    }

    const verdict = PL.bargain.settle(bargain, snapshot, result);

    const staked = bargain.stake;

    bargain = null;

    if (verdict.won) {

        stats.bargainsWon++;
        PL.sounds.confirm();

        // A win streak continues or starts; a loss streak breaks and resets.
        stats.bargainStreak = stats.bargainStreak > 0 ? stats.bargainStreak + 1 : 1;

        if (stats.bargainStreak > stats.bargainBestStreak) {
            stats.bargainBestStreak = stats.bargainStreak;
        }

    } else {

        PL.sounds.error();

        /* A refunded bargain (its term no longer exists) is neither a win nor
           a loss, so it is left out of the streak entirely rather than
           reading as a loss it never was. */
        if (!verdict.refunded) {
            stats.bargainStreak = stats.bargainStreak < 0 ? stats.bargainStreak - 1 : -1;
        }

    }

    if (verdict.payout > 0) {

        tokens += verdict.payout;

        showTokenPopup(
            "+" + verdict.payout + PL.icons.get("blood", 30),
            false
        );

    }

    bargainResult = {
        won: verdict.won,
        refunded: verdict.refunded,
        name: verdict.term ? verdict.term.name : "That bargain",
        staked: staked,
        payout: verdict.payout
    };

    logEvent("bargain", {
        settled: bargainResult.name,
        won: verdict.won,
        amount: verdict.payout
    });

    refreshTokenDisplays();

    saveCurrentGame();

}

function setBargainPick(id) {

    bargainPick = id;
    updateBargainPanel();

}

function nudgeBargainStake(direction) {

    bargainStake = PL.bargain.clampStake(
        bargainStake + direction * PL.bargain.stakeStep,
        tokens
    );

    updateBargainPanel();

}

function updateBargainPanel() {

    if (!bargainPanel) {
        return;
    }

    /* Re-clamped on every render rather than only when the stepper moves: the
       balance shifts under this panel constantly -- packs, sales, rewards --
       and a stake left above it would offer a bargain that cannot be struck. */
    bargainStake = PL.bargain.clampStake(bargainStake, tokens);

    if (bargain) {

        bargainPanel.innerHTML = PL.bargain.render.pending(bargain, tokens);
        return;

    }

    if (!bargainPick) {
        bargainPick = PL.bargain.terms[0].id;
    }

    bargainPanel.innerHTML = PL.bargain.render.picker(
        bargainPick,
        bargainStake,
        tokens,
        bargainResult
    );

}

function updateShardDisplay() {

    if (shardDisplay) {
        shardDisplay.textContent = shards;
    }

    if (pityNote) {

        const left = PL.forge.pityPacks - packsSinceNew;

        /* Only spoken about once it is close enough to matter. A counter that
           reads "8 packs to go" from the first pack of a new save describes a
           safety net nobody is falling toward yet. */
        pityNote.textContent =
            packsSinceNew >= 3 && left > 0
                ? left + " to a guaranteed new card"
                : "";

        /* The next pack is the one that guarantees it -- the one count in this
           whole countdown actually worth a second look. */
        pityNote.classList.toggle("plBar__pity--imminent", left === 1);

    }

    /* The collection is where forging happens, so its buttons go stale the
       moment a balance moves. Refreshed only when it is on screen. */
    if (collectionModal.style.display === "flex") {

        const tab = document.querySelector(".collectionTab.active");

        showCollection(tab ? tab.dataset.type : "perk");

    }

}

function forgeCard(name) {

    const card = gameData.perks.concat(gameData.items, gameData.addons)
        .find(function (entry) { return entry.name === name; });

    /* Re-decided against live state rather than trusted from the button. The
       collection list can sit open while a sale, a pull or a slot change moves
       the balance underneath it. */
    if (!PL.forge.canForge(card, shards, collection)) {
        return;
    }

    shards -= PL.forge.costOf(card.rarity);
    stats.forged++;

    collection.push(card.name);

    /* Forged plain, never foil. A foil is a thing luck hands you, and a mill
       that could print them would make the rarest pull in the game purchasable. */
    const existing = inventory.find(function (row) {
        return row.name === card.name && !row.foil;
    });

    if (existing) {
        existing.amount++;
    } else {
        inventory.push({
            name: card.name,
            rarity: card.rarity,
            type: card.type,
            amount: 1,
            foil: false,
            foilVariant: null
        });
    }

    logEvent("forge", {
        name: card.name,
        rarity: card.rarity,
        amount: PL.forge.costOf(card.rarity)
    });

    updateShardDisplay();
    updateInventoryDisplay();

    /* Runs last: a forged card can cross a completion milestone, and the track
       announces from here. */
    updateCollectionCounter();

    saveCurrentGame();

}

/* Records a card as seen, and says whether that was the first time.
 *
 * The six pull sites each carried their own copy of the same guard, spelled six
 * slightly different ways, and none of them kept the answer -- so by the time a
 * pack reached the reveal, the fact that a card had never been seen before had
 * already been thrown away. The reveal wants exactly the condition those guards
 * were testing, so it is returned rather than discarded.
 *
 * Only pack pulls need the answer. Forging and the Queen's swap discover cards
 * with nothing turning over on screen, so they ignore it.
 */
function discover(name) {

    if (collection.includes(name)) {
        return false;
    }

    collection.push(name);

    return true;

}

/* Every pack path ends in revealCards, so this is the one place that has to
   know a pack can come up empty -- rather than four selection loops each
   growing their own copy of the rule. */
function applyPity(pulledCards) {

    const foundSomething = collection.length > collectionAtLastPack;

    if (foundSomething) {

        packsSinceNew = 0;
        collectionAtLastPack = collection.length;
        return;

    }

    packsSinceNew++;

    if (packsSinceNew < PL.forge.pityPacks) {

        collectionAtLastPack = collection.length;
        return;

    }

    /* What this pack is allowed to hand back, taken from the pack itself.
     *
     * The guarantee used to draw from every card in the game, and pitySwap only
     * ever narrowed that by rarity — so a Basic Pack, which deals in perks and
     * nothing else, could pay its pity out in an add-on. The pack that made the
     * promise has to be the pack that keeps it.
     *
     * Read off the cards already rolled rather than from the pack's name: the
     * pull is the honest statement of what this pack deals in, it is right here,
     * and a rotating pack that mixes types or a pack added later needs no entry
     * in a table somebody has to remember to update. */
    const dealtTypes = pulledCards.map(function (card) {
        return card.type;
    });

    const unowned = gameData.perks.concat(gameData.items, gameData.addons)
        .filter(function (card) {
            return collection.indexOf(card.name) === -1 &&
                dealtTypes.indexOf(card.type) !== -1;
        });

    const swap = PL.forge.pitySwap(pulledCards, unowned, Math.random);

    /* Nothing left to give -- every forgeable card is owned. The counter stays
       where it is rather than resetting, so it pays out the moment the pool
       grows again. */
    if (!swap) {

        collectionAtLastPack = collection.length;
        return;

    }

    swap.indexes.forEach(function (i, slot) {

        /* The foil roll survives the swap. It was rolled honestly for this
           pack, and taking it away would make the pity pack the one place a
           foil cannot happen. */
        pulledCards[i] = {
            name: swap.card.name,

            /* A pity card is unowned by definition -- it is chosen off the
               list of everything the player has never seen -- so it is always
               a first sighting, and the reveal has to be told. The object is
               built from scratch here, which is how it used to lose the flag
               the roll had put on the card it replaced.

               Only the first slot, matching discover(): if the swap fills two
               slots, the second is a duplicate of the first, exactly as it
               would be had the pack rolled the card twice. */
            isNew: slot === 0,
            rarity: swap.card.rarity,
            type: swap.card.type,
            foil: pulledCards[i].foil,
            foilVariant: pulledCards[i].foilVariant
        };

    });

    collection.push(swap.card.name);

    /* No stats.foilsPulled++ here, deliberately. The swap does not roll a foil;
       it re-homes one the pack already rolled and already counted, onto the card
       it hands over instead. Counting again would pay one roll twice.

       Nothing touches foilCollection here either, not even for the card the
       swap hands over. This used to write the pity card in and then try to
       write the card it replaced back out again -- two mutations of shared,
       permanent state, reasoned about from a single roll, and the undo half
       of that was what could strip a foil a completely unrelated pack had
       legitimately earned (see revealCards, which now does this once, off
       pulledCards' final contents, instead of live during the roll). By the
       time revealCards looks, this slot already holds whichever card the
       player is actually getting, so there is nothing left for this
       function to reconcile. */
    packsSinceNew = 0;
    collectionAtLastPack = collection.length;

}

/* Each tab carries its own tally. One combined figure above them could never
   say that the items are nearly done while the perks are half missing, which
   is exactly the comparison that decides which tab to open.

   Characters counts finished sets rather than cards, because that is what a
   set is worth chasing in -- twelve survivors completed, not thirty-six perks
   owned. Different unit, same question. */
function refreshCollectionTabs() {

    if (!collectionTabs.length) {
        return;
    }

    const owned = list =>
        list.filter(card => collection.includes(card.name)).length;

    const tally = {
        perk: [owned(gameData.perks), gameData.perks.length],
        item: [owned(gameData.items), gameData.items.length],
        addon: [owned(gameData.addons), gameData.addons.length],
        character: [
            PL.characters.completeCount(collection),
            PL.characters.completable()
        ]
    };

    collectionTabs.forEach(tab => {

        const mark = tab.querySelector(".collectionTab__count");
        const count = tally[tab.dataset.type];

        if (mark && count) {
            mark.textContent = count[0] + "/" + count[1];
        }

    });

}

/* One way in. Both entry points used to set the list and the highlight
   separately, and the collection button skipped the highlight entirely -- so
   opening it straight after a look at Characters showed perk cards sitting
   under a lit Characters tab. */
function openCollection(type) {

    const tab = type || COLLECTION_HOME;

    collectionTabs.forEach(button =>
        button.classList.toggle("active", button.dataset.type === tab)
    );

    showCollection(tab);
    openModal(collectionModal);

}

/* Nothing to show, said in a way that points at the way out. Which sentence
   depends on why the list came back empty, because "no results" is the one
   answer that helps nobody. */
function collectionEmptyLine(type) {

    if (collectionFilter === "forge") {

        return collectionSearchText
            ? "Nothing matching that search is forgeable right now."
            : "No card here is within reach of " + shards +
                " shards. Selling duplicates is where shards come from.";

    }

    if (collectionFilter === "missing") {

        return collectionSearchText
            ? "Nothing missing matches that search."
            : "Nothing missing here — this set is complete.";

    }

    return "No cards match that search.";

}

function showCollection(type) {

    /* The chips read the card pool, and the roster is not in it. Search still
       applies there, so only the filters step aside. */
    if (collectionFilters) {
        collectionFilters.classList.toggle("hidden", type === "character");
    }

    /* #collectionList is a grid of card tiles, and the roster is not that.
       Its two children -- the score band and the set grid -- were being laid
       out as if they were two cards, which squeezed fifty-four survivors into
       one 140px column and stranded the score in the column beside it. The
       roster brings its own grid, so the list only has to get out of the way. */
    if (collectionList) {
        collectionList.classList.toggle("collectionList--sets", type === "character");
    }

    /* The one tab that is not a list of cards. It reads the same collection
       from a different angle, so it renders itself and returns. */
    if (type === "character") {

        collectionList.innerHTML =
            PL.characters.render(collection, collectionSearchText);
        return;

    }

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

    /* Narrowed after the search rather than instead of it, so a chip and a
       typed name compose the way anyone would expect them to. */
    if (collectionFilter === "missing") {

        cards = cards.filter(card => !collection.includes(card.name));

    }

    /* The same predicate the Forge button's disabled state runs on, so the
       chip can never offer a card the button then refuses. */
    if (collectionFilter === "forge") {

        cards = cards.filter(card =>
            PL.forge.canForge(card, shards, collection)
        );

    }

    if (!cards.length) {

        collectionList.innerHTML =
            '<p class="plSift__none">' + collectionEmptyLine(type) + "</p>";
        return;

    }

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

        /* Forging happens where you are already looking at what you are
           missing, rather than behind a separate screen listing the same cards
           a second time. Only undiscovered cards get the button, and Specials
           never do -- costOf returns null for them. */
        const cost = discovered ? null : PL.forge.costOf(card.rarity);

        const forgeAction = cost === null
            ? null
            : {
                label: "Forge " + cost + PL.icons.get("shard", 12),
                onclick: "forgeCard(" + JSON.stringify(card.name).replace(/"/g, "&quot;") + ")",
                disabled: shards < cost
            };

        return PL.card.render(card, {
    locked: !discovered,
    foil: entityTouched || isFoil,
    foilVariant: entityTouched
        ? "entityTouched"
        : "standard",
    count: amount,
    size: "sm",
    actions: forgeAction ? [forgeAction] : null
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

    PL.sounds.select();

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

        /* Whatever add-on used to sit on the last item only fits this one by
           coincidence. Anything that does not match goes back to the
           inventory rather than riding along mismatched -- back to front, the
           same reason clearUnlockedSlots does, since unequipAddon splices. */
        const itemCategory = categoryOf(card.name);

        for (let i = loadout.addons.length - 1; i >= 0; i--) {

            if (categoryOf(loadout.addons[i].name) !== itemCategory) {
                unequipAddon(i);
            }

        }

        card.amount--;

        if (card.amount <= 0) {
            // This row only — filtering by name also removed the other variant.
            inventory = inventory.filter(c => c !== card);
        }

        PL.sounds.select();

        updateInventoryDisplay();
        updateLoadoutDisplay();

        saveCurrentGame();

    }

    if (card.type === "Addon") {

        if (loadout.addons.length >= 2) {
            alert("Your add-on slots are full!");
            return;
        }

        /* Same rule the perk branch above enforces. This is the guard, not
           the Ace generator: every route into the loadout comes through
           here, so a check anywhere else would only cover one of them. */
        if (loadout.addons.some(equipped => equipped.name === card.name)) {
            alert("That add-on is already equipped!");
            return;
        }

        /* Add-ons are scoped to the item family they were made for. No item
           equipped means nothing for this one to attach to, and a mismatched
           item means it would not fit even if there were one. */
        if (!loadout.item) {
            PL.sounds.error();
            alert("Equip an item first!");
            return;
        }

        if (categoryOf(card.name) !== categoryOf(loadout.item.name)) {
            PL.sounds.error();
            alert("That add-on doesn't fit your equipped item!");
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

        PL.sounds.select();

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

    /* The Queen's loan is the one card in a loadout the player does not own,
       and queenBorrowed — the only thing saying so — lives on this object
       alone. Unequipping rebuilds an inventory entry field by field below,
       which dropped the flag and handed over a permanent card the Queen had
       only lent. No escape was needed: the card was owned the moment it left
       the slot, and could be sold or fed to a King from there.

       The loan runs to the end of the match, so it stays in its slot until
       the match resolves and the handlers there discard it. Silent like the
       aceLocked guard above, because the slot's own button says why. */
    if (perk.queenBorrowed) {
        return;
    }

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
       leave the Joker -- and, below, a card's last copy -- sellable through
       the other route. */
    if (!PL.sell.canSell(card, inventory)) {
        return;
    }

    PL.sounds.sell();

    card.amount--;

    /* Named rather than added straight onto the balance, so the log can say
       what the card was worth without walking the same ladder a second time
       and risking the two disagreeing. PL.sell owns the ladder itself now,
       so the row that builds the button's own label reads the same number. */
    const payout = PL.sell.valueOf(card);

    tokens += payout;

    /* The same copy pays twice, and deliberately: a spare is worth tokens to
       spend and shards toward a card you actually want. Making the player
       choose between the two would only be asking them to guess which shortage
       bites next, and the sell payout is left untouched so the pack economy
       does not move underneath them. */
    const ground = PL.forge.shardYield(card);

    shards += ground;
    stats.sold++;

    if (card.amount <= 0) {

        // Drop this row only. Filtering by name also took the other variant.
        inventory = inventory.filter(c => c !== card);

    }

    refreshTokenDisplays();
    updateShardDisplay();

    updateInventoryDisplay();

    logEvent("sell", {
        name: card.name,
        rarity: card.rarity,
        foil: !!card.foil,
        amount: payout,
        shards: ground
    });

}

/* Sells every spare copy currently on screen, keeping one of each. Scoped to
   visibleInventory() rather than the whole collection, so filtering to a
   rarity first and selling only touches what filter is actually showing --
   the same list the per-card Sell button already reads its index from.

   No logEvent per card, deliberately. The pull log is a history of notable
   pulls; two hundred near-identical "sold a spare Common" rows would bury
   that history rather than add to it, and the confirm dialog below already
   states the total before anything is spent. */
function sellDuplicates() {

    const found = PL.sell.duplicatesIn(visibleInventory(), PL.forge.shardYield);

    if (!found.totalCards) {
        return;
    }

    const sure = confirm(
        "Sell " + found.totalCards +
        " duplicate card" + (found.totalCards === 1 ? "" : "s") +
        " for +" + found.totalTokens + " Blood Tokens and +" +
        found.totalShards + " Iridescent Shards?"
    );

    if (!sure) {
        return;
    }

    PL.sounds.sell();

    found.items.forEach(function (entry) {

        entry.card.amount -= entry.count;

    });

    tokens += found.totalTokens;
    shards += found.totalShards;
    stats.sold += found.totalCards;

    refreshTokenDisplays();
    updateShardDisplay();
    updateInventoryDisplay();

    showTokenPopup(
        "+" + found.totalTokens + PL.icons.get("blood", 30) +
        " +" + found.totalShards + PL.icons.get("shard", 30),
        false
    );

    saveCurrentGame();

}

removeTokenButton.addEventListener("click", function () {

    if (tokens > 0) {
        tokens--;
    }

    refreshTokenDisplays();

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

/* The Special cards, per card, as a probability. They are not part of the
   table above: openPack draws a rarity first and this roll then replaces it
   outright, so Special sits on top of the 100% and the other rarities share
   what is left. Item packs are absent on purpose — openItemPack has never
   rolled it.

   The one rule these have to keep: Special ranks above Legendary in
   RARITY_RANK, so a pack's five Special odds have to add up to less than
   that same pack's Legendary rate, or the rarest tier in the game becomes
   the commoner one. Basic used to break it — its four summed to 5.33%
   against a 2% Legendary, which made a Special nearly three times easier to
   pull than the tier below it, and the Queen alone matched the whole
   Legendary rate. They summed to 0.98% after that fix; Jack joining at the
   Ace's own rate brings Basic to 1.18%, still under half of Legendary.
   Entity was always fine, and stays fine at 6.33% against a 15% Legendary. */
const PACK_SPECIAL_CHANCE = {
    Basic: {
        joker: 1 / 500,
        queen: 1 / 300,
        king: 1 / 400,
        ace: 1 / 500,
        jack: 1 / 500
    },
    Entity: {
        joker: 1 / 100,
        queen: 1 / 50,
        king: 1 / 75,
        ace: 1 / 100,
        jack: 1 / 100
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

/* What a rotating pack advertises on its wrapper.
 *
 * Read straight off rarityMode, the same switch getRotatingPackRarity above
 * runs on, so the strip on the pack and the cards that come out of it cannot
 * drift apart. Change the odds there and change them here in the same edit.
 */
function rotatingPackOdds(pack) {

    if (pack.joker) {
        return [{ rarity: "Special", pct: 100 }];
    }

    if (pack.rarityMode === "common") {
        return [{ rarity: "Common", pct: 100 }];
    }

    if (pack.rarityMode === "fiftyFifty") {
        return [
            { rarity: "Common", pct: 50 },
            { rarity: "Legendary", pct: 50 }
        ];
    }

    if (pack.rarityMode === "lucky") {
        return [
            { rarity: "Epic", pct: 80 },
            { rarity: "Legendary", pct: 20 }
        ];
    }

    /* "basic" falls through to getPackRarity("Basic"), so it advertises the
       Basic table rather than a copy of it. */
    return PL.panels.oddsFor("Basic");

}

/* The colour the booster wears while it tears: what the pack is for, not what
   you happen to pull out of it. Keyed on id so it always agrees with the
   accent the same pack wears on the rotating shelf (see the
   `.rp__pack[data-pack=...]` rules in chrome.css) — going by rarityMode or
   flags instead used to send lucky and duplicator through the same "epic"
   branch and left duplicator, heavy and the shelf out of step with each
   other. */
const ROTATING_PACK_TONES = {
    fiftyFifty: "rare",
    trash: "common",
    duplicator: "epic",
    lucky: "legendary",
    rustyEquipment: "item",
    fineEquipment: "item",
    heavy: "gild",
    joker: "special"
};

function rotatingPackTone(pack) {

    return ROTATING_PACK_TONES[pack.id] || "common";

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

function openRotatingPack(pack, auto) {

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
    ),
    gameData.perks.find(
        card => card.name === "Jack (Of All Trades)"
    )
].filter(Boolean);

    if (specialCards.length !== 5) {
        console.warn("One or more Faces & Aces cards could not be found.");
        packOpening = false;
        if (auto) {
            autoOpenStop("error");
        }
        return;
    }

    const specialCard =
        specialCards[
            Math.floor(
                Math.random() * specialCards.length
            )
        ];

    const firstSighting = discover(specialCard.name);

    pulledCards.push({
        name: specialCard.name,
        isNew: firstSighting,
        rarity: specialCard.rarity,
        type: specialCard.type,
        foil: false,
        foilVariant: null
    });

    revealCards(
        pulledCards,
        pack.name,
        pack.cost,
        pack,
        auto
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

        const firstSighting = discover(randomCard.name);

        /* Only the stat here. foilCollection used to be pushed into right
           alongside it, but that ran per roll, before pity gets a chance to
           swap the slot out -- revealCards now registers foilCollection once,
           off the pack's final contents, after pity has already run, so this
           counts the roll and nothing more. */
        if (foilResult.foil) {

            stats.foilsPulled++;

            if (foilResult.foilVariant === "entityTouched") {
                stats.entityTouchedPulled++;
            }

        }

        pulledCards.push({
            name: randomCard.name,
            isNew: firstSighting,
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

            const firstSighting = discover(randomCard.name);

            pulledCards.push({
                name: randomCard.name,
                isNew: firstSighting,
                rarity: randomCard.rarity,
                type: randomCard.type,
                foil: false,
                foilVariant: null
            });

        }

    }

    revealCards(
        pulledCards,
        pack.name,
        pack.cost,
        pack,
        auto
    );

}

function buyRotatingPack(packId, auto) {

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

    /* A human clicked the tile while Auto Open is on -- open the picker
       instead of buying one. The loop calls back in here itself with
       auto = true once a count is chosen, so this only ever intercepts the
       click that started it -- and only when nothing is already running:
       a click on some other pack mid-run would otherwise open a second
       picker and starting it would overwrite autoOpenRun out from under the
       loop still waiting on this one's animation to finish. While a run is
       live the toggle button is the only control that touches it. */
    if (autoOpenMode && !auto) {

        if (!autoOpenRun) {
            openAutoOpenPicker(autoOpenRotatingTarget(pack));
        }

        return;

    }

    if (packOpening) {

        /* Should never actually be true here: autoOpenStep only ever calls
           back in once revealCards's auto path has already released this
           flag. Stopping instead of returning bare is only a backstop
           against that assumption someday being wrong -- the alternative is
           the loop silently going nowhere, which looks exactly like the
           bug this whole feature grew out of fixing. */
        if (auto) {
            autoOpenStop("error");
        }

        return;

    }

    if (tokens < pack.cost) {

        if (auto) {
            autoOpenStop("outOfTokens");
        } else {
            PL.sounds.error();
            alert("Not enough Blood Tokens!");
        }

        return;
    }

    packOpening = true;

    tokens -= pack.cost;
    entry.stock--;

    stats.packsOpened++;

    refreshTokenDisplays();

    saveCurrentGame();

    openRotatingPack(pack, auto);

}

/* What clicking a shelf button or a rotating tile means for the picker: just
   enough to work out affordability and stock, and to call the right
   purchase function once a count is chosen. Shelf packs carry no packId --
   that absence is what autoOpenStockOf reads as "never runs out". */
/* `run` is how this exact pack actually gets opened -- a closure supplied by
   the caller, not re-derived later from packType. Item Pack does not share
   openPack's roll loop (it draws from items and add-ons, not perks), and
   autoOpenStep used to guess which function a shelf target needed from its
   packType string alone, defaulting to openPack for anything that was not
   "rotating". Item Pack was never that pack; nothing ever told the loop, and
   it pulled perks and called them Item Pack drops. Handing the loop the one
   function that already knows how to open this pack -- defined right here,
   at the only place cost/amount/packType are already known to be a matched
   set -- makes that guess impossible to need again, for this pack or the
   next one. */
function autoOpenShelfTarget(cost, amount, packType, label, run) {

    return { kind: "shelf", cost: cost, amount: amount, packType: packType, label: label, run: run };

}

function autoOpenRotatingTarget(pack) {

    return { kind: "rotating", packId: pack.id, cost: pack.cost, label: pack.name };

}

function autoOpenStockOf(target) {

    if (target.kind !== "rotating") {
        return null;
    }

    const entry = rotatingPackShop.find(e => e.id === target.packId);

    return entry ? entry.stock : 0;

}

function openAutoOpenPicker(target) {

    autoOpenTarget = target;
    autoOpenCount = 1;

    updateAutoOpenModal();

    openModal(autoOpenModal);

}

function updateAutoOpenModal() {

    if (!autoOpenTarget) {
        return;
    }

    const stock = autoOpenStockOf(autoOpenTarget);
    const cap = PL.autoOpen.plannedRuns("all", tokens, autoOpenTarget.cost, stock);

    autoOpenPackName.textContent = autoOpenTarget.label;

    autoOpenAfford.textContent = cap > 0
        ? "You can afford " + cap + (stock !== null ? " (" + stock + " in stock)" : "") + "."
        : "Not enough Blood Tokens.";

    autoOpenCount = Math.max(1, Math.min(autoOpenCount, Math.max(cap, 1)));
    autoOpenCountLabel.textContent = autoOpenCount;

    document.getElementById("autoOpenStart").disabled = cap === 0;
    document.getElementById("autoOpenAllIn").disabled = cap === 0;

}

/* Turns the picker's choice into a running loop. `requested` is either the
   stepper's count or the string "all" -- ALL IN's own meaning, not decided
   here (see PL.autoOpen.plannedRuns). */
function startAutoOpen(requested) {

    if (!autoOpenTarget) {
        return;
    }

    const stock = autoOpenStockOf(autoOpenTarget);
    const planned = PL.autoOpen.plannedRuns(requested, tokens, autoOpenTarget.cost, stock);

    if (planned <= 0) {
        return;
    }

    closeModal(autoOpenModal);

    autoOpenRun = {
        target: autoOpenTarget,
        remaining: planned,
        opened: 0,
        tokensSpent: 0
    };

    updateAutoOpenToggleLabel();

    autoOpenStep();

}

/* Called once to start the loop and once more per pack after that, from
   revealCards's auto callback, once a pack's full animation has actually
   finished -- never while one is still on screen. That is what openAuto's
   onCycleDone firing at cycle-end rather than tear-time buys the loop: there
   is no window here for a second pack to already be in flight. */
function autoOpenStep() {

    if (!autoOpenRun) {
        return;
    }

    if (!autoOpenMode) {
        autoOpenStop("toggledOff");
        return;
    }

    if (autoOpenRun.remaining <= 0) {
        autoOpenStop("done");
        return;
    }

    const target = autoOpenRun.target;
    const stock = autoOpenStockOf(target);

    /* Checked here, live, rather than trusted from when the run started --
       selling cards or another tab spending tokens mid-run is still allowed,
       so the budget this loop is working against can shrink underneath it. */
    if (tokens < target.cost) {
        autoOpenStop("outOfTokens");
        return;
    }

    if (stock !== null && stock <= 0) {
        autoOpenStop("outOfStock");
        return;
    }

    autoOpenRun.remaining--;
    autoOpenRun.opened++;
    autoOpenRun.tokensSpent += target.cost;

    updateAutoOpenToggleLabel();

    if (target.kind === "rotating") {
        buyRotatingPack(target.packId, true);
    } else {
        target.run(true);
    }

}

/* Ends a run, whatever ended it. Safe to call with no run in flight -- the
   toggle button routes here on every click while running, and openPack /
   openItemPack / buyRotatingPack's own guards can also land here if the
   loop's own live check above somehow missed something. */
function autoOpenStop(reason) {

    if (!autoOpenRun) {
        return;
    }

    const finished = autoOpenRun;

    autoOpenRun = null;

    updateAutoOpenToggleLabel();

    if (finished.opened === 0) {
        return;
    }

    const SUFFIX = {
        outOfTokens: " — out of tokens",
        outOfStock: " — out of stock",
        toggledOff: " — stopped",
        error: " — stopped"
    };

    showTokenPopup(
        "Auto Open: " + finished.opened + " pack" + (finished.opened === 1 ? "" : "s") +
        ", -" + finished.tokensSpent + PL.icons.get("blood", 30) +
        (SUFFIX[reason] || ""),
        false
    );

}

function updateAutoOpenToggleLabel() {

    if (!autoOpenToggle) {
        return;
    }

    autoOpenToggle.classList.toggle("autoToggle--on", autoOpenMode);
    autoOpenToggle.classList.toggle("autoToggle--running", !!autoOpenRun);
    autoOpenToggle.setAttribute("aria-pressed", String(autoOpenMode));

    const label = autoOpenRun
        ? "Running (" + autoOpenRun.remaining + " left) — Stop"
        : autoOpenMode
            ? "Auto Open: On"
            : "Auto Open";

    autoOpenToggle.querySelector(".autoToggle__label").textContent = label;

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

function openPack(cost, amount, packType, auto) {

    // See buyRotatingPack for why this only opens the picker when nothing
    // is already running.
    if (autoOpenMode && !auto) {

        if (!autoOpenRun) {
            openAutoOpenPicker(autoOpenShelfTarget(cost, amount, packType, packType + " Pack", function (autoRun) {
                openPack(cost, amount, packType, autoRun);
            }));
        }

        return;

    }

    if (packOpening) {

        // See buyRotatingPack's matching guard for why auto stops here
        // instead of just returning.
        if (auto) {
            autoOpenStop("error");
        }

        return;

    }
    if (tokens < cost) {

        // The auto-loop always checks affordability itself before calling
        // back in here; this guard only exists so a mistake there stops the
        // run quietly instead of popping a blocking alert mid-sequence.
        if (auto) {
            autoOpenStop("outOfTokens");
        } else {
            PL.sounds.error();
            alert("Not enough Blood Tokens!");
        }

        return;

    }

    packOpening = true;

    // Counted here rather than on entry, so a blocked or unaffordable attempt
    // no longer inflates the stat.
    stats.packsOpened++;

    tokens -= cost;

    refreshTokenDisplays();

    


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

} else if (
    roll <
    specialOdds.king +
    specialOdds.queen +
    specialOdds.joker +
    specialOdds.ace +
    specialOdds.jack
) {

    specialName = "Jack (Of All Trades)";

}
    if (specialName) {

        const specialCard = gameData.perks.find(
            card => card.name === specialName
        );

        if (specialCard) {

            const firstSighting = discover(specialCard.name);

            pulledCards.push({
                name: specialCard.name,
                isNew: firstSighting,
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
        const firstSighting = discover(randomCard.name);

        /* Only the stat here -- foilCollection is registered once, off the
           pack's final contents, in revealCards, after pity has already run. */
        if (foilResult.foil) {

            stats.foilsPulled++;

            if (foilResult.foilVariant === "entityTouched") {
                stats.entityTouchedPulled++;
            }

        }


        pulledCards.push({
    name: randomCard.name,
    isNew: firstSighting,
    rarity: randomCard.rarity,
    type: randomCard.type,
    foil: foilResult.foil,
    foilVariant: foilResult.foilVariant
});

    }


    
    revealCards(pulledCards, packType, cost, undefined, auto);

}

function openItemPack(auto) {

    // See buyRotatingPack for why this only opens the picker when nothing
    // is already running.
    if (autoOpenMode && !auto) {

        if (!autoOpenRun) {
            openAutoOpenPicker(autoOpenShelfTarget(10, 2, "Item", "Item Pack", function (autoRun) {
                openItemPack(autoRun);
            }));
        }

        return;

    }

    if (packOpening) {

        // See buyRotatingPack's matching guard for why auto stops here
        // instead of just returning.
        if (auto) {
            autoOpenStop("error");
        }

        return;

    }

    if (tokens < 10) {

        if (auto) {
            autoOpenStop("outOfTokens");
        } else {
            PL.sounds.error();
            alert("Not enough Blood Tokens!");
        }

        return;

    }

    packOpening = true;

    // Counted here rather than on entry, so a blocked or unaffordable attempt
    // no longer inflates the stat.
    stats.packsOpened++;

    tokens -= 10;

    refreshTokenDisplays();


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

        const firstSighting = discover(randomCard.name);

        /* Only the stat here -- foilCollection is registered once, off the
           pack's final contents, in revealCards, after pity has already run. */
        if (foilResult.foil) {

            stats.foilsPulled++;

            if (foilResult.foilVariant === "entityTouched") {
                stats.entityTouchedPulled++;
            }

        }

        pulledCards.push({
    name: randomCard.name,
    isNew: firstSighting,
    rarity: randomCard.rarity,
    type: randomCard.type,
    foil: foilResult.foil,
    foilVariant: foilResult.foilVariant
});

    }

    revealCards(pulledCards, "Item", 5, undefined, auto);

}
const RARITY_ORDER = ["Common", "Rare", "Epic", "Legendary"];

/* The card a handful is remembered by. A pack and The Ace both hand over
   several at once, and both are worth one line naming the one that mattered
   rather than a line each. */
function bestOf(cards) {

    return cards.reduce(function (a, b) {

        return RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity)
            ? b
            : a;

    });

}

/* The one way anything gets into the log.

   Every site that changes what you own calls this and nothing else: no caller
   knows the panel exists, that entries are capped, or that logging is what
   makes the moment worth saving. Adding a kind means writing one line at the
   site and one formatter in PL.panels — never touching the sites already here. */
function logEvent(kind, fields) {

    var entry = { at: Date.now(), kind: kind };

    Object.keys(fields).forEach(function (key) {
        entry[key] = fields[key];
    });

    var head = eventLog[0];

    /* Rewards come in bursts of one click per objective, so a trial reads as
       the single "+7" it felt like rather than as seven separate lines. */
    if (
        kind === "token" &&
        head &&
        head.kind === "token" &&
        entry.at - head.at < TOKEN_MERGE_MS
    ) {

        head.at = entry.at;
        head.amount += entry.amount;

        /* Three names and a count, rather than a line that grows without
           limit down the panel. */
        if (head.reasons.length < 3) {

            head.reasons.push(entry.reasons[0]);

        } else {

            head.more = (head.more || 0) + 1;

        }

    } else {

        eventLog.unshift(entry);
        eventLog = eventLog.slice(0, EVENT_LOG_LIMIT);

    }

    PL.panels.pulls();
    PL.panels.tabCounts();

    // Persisted now rather than waiting for a reveal to be clicked through,
    // so closing the tab mid-animation does not lose the entry.
    saveCurrentGame();

}

/* One line per pack, keeping only the best card in it — a log of every single
   card would bury the pull worth remembering. */
function recordPull(packType, pulledCards, cost) {

    if (!pulledCards.length) {

        return;

    }

    const best = bestOf(pulledCards);

    logEvent("pack", {
        pack: packType,
        count: pulledCards.length,
        cost: cost || 0,
        /* Whether the pack held a foil at all. The card itself may not be the
           best one in there, and a foil is worth a mark either way. */
        foil: pulledCards.some(function (card) {
            return !!card.foil;
        }),
        bestName: best.name,
        bestRarity: best.rarity,
        /* The whole pack rather than only the card it is named by, so the log
           can open what was actually in it. Only the fields the renderer
           cannot look up on its own: the art and the real name come from the
           card pool at paint time, so storing them here would put a second
           copy of the pool into every save. */
        cards: pulledCards.map(function (card) {
            return {
                name: card.name,
                rarity: card.rarity,
                type: card.type,
                foil: !!card.foil,
                foilVariant: card.foilVariant || null
            };
        })
    });

}

/* `rotating` is the ROTATING_PACKS entry when one of those is what tore open.
   The three shelf packs pass nothing and the booster dresses itself from FINE
   and PACK_ODDS as it always did. */
function revealCards(pulledCards, packType, cost, rotating, auto) {

    /* Before recordPull and before banking, so the log, the inventory and the
       cards the player is about to watch turn over all describe the same pack. */
    applyPity(pulledCards);

    /* foilCollection is registered once, here, off the pack's final contents --
       after pity has already done any swapping. The three pack openers used to
       each push into foilCollection themselves, straight out of the roll loop,
       before pity even ran; that meant a foil landing on a pity slot had to be
       pushed for the card handed over and then pulled back off the card taken
       away, and getting that undo wrong is how an unrelated pack could lose a
       foil it had legitimately earned. Reading pulledCards after pity has
       already replaced the taken-away slot needs no undo: whatever a slot
       holds here is what the player is actually getting. */
    pulledCards.forEach(function (card) {

        if (card.foil && !foilCollection.includes(card.name)) {
            foilCollection.push(card.name);
        }

    });

    recordPull(packType, pulledCards, cost);

    /* Banked here, before the seal animation even exists, not on tear and not
       on flip. The cost was already spent and saved by the caller (openPack /
       buyRotatingPack) before this ran, so a sealed pack sitting untouched on
       screen used to be a real gap: tokens gone, refresh, and the cards that
       were already rolled for you had never been written anywhere. Now both
       halves of the purchase land in the same synchronous breath. */
    bankPulledCards(pulledCards);

    const dressing = rotating
        ? {
            fine: rotating.description,
            odds: rotatingPackOdds(rotating),
            tone: rotatingPackTone(rotating)
        }
        : null;

    /* Two different entry points into ui/pack.js, not one with a branch
       inside it -- see openAuto's own comment for why manual play and the
       auto-loop cannot share a release signal. auto's onCycleDone doubles
       as "start the next one", which is what makes the loop safe: the next
       pack cannot begin until this exact pack's full animation has finished,
       so packOpening is never released early the way it deliberately is for
       a human tearing their own seal. */
    if (auto) {

        PL.pack.openAuto(packType, pulledCards, dressing, function () {

            packOpening = false;
            autoOpenStep();

        });

    } else {

        PL.pack.open(packType, pulledCards, function () {

            packOpening = false;

        }, dressing);

    }

}

/* Every card in the pack lands at once now, so they are all banked together
   rather than one per click as they were flipped. */
function bankPulledCards(pulledCards) {

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

    updateInventoryDisplay();
    updateCollectionCounter();
    saveCurrentGame();

}


escapedButton.addEventListener("click", function () {

    /* First, while the loadout is still the one that was carried in. Both the
       card-return below and the loadout reset after it would erase the very
       thing the terms are judged against. */
    const escapedWith = loadoutSnapshot();

    settleBargain("escaped", escapedWith);
    recordTrial("escaped", escapedWith);

    stats.escapes++;

    

    /* queenBorrowed perks were never owned — The Queen lent them for the
       match. Banking them would turn one Queen into a permanent free card. */
    let cardsToReturn = [
    ...loadout.perks.filter(
        card => card.name !== "The Queen" && !card.queenBorrowed
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

    const kept = cardsToReturn.length;

    loadout = {
    perks: [],
    item: null,
    addons: [],
    aceLocked: false,
    /* Which Special dealt this loadout, so the "finish the match first" copy
       names the actual card instead of assuming it was always the Ace. Reset
       everywhere aceLocked itself resets -- the two never carry different
       lifetimes. */
    lockedBy: null
};

    

    updateInventoryDisplay();
    updateLoadoutDisplay();

    logEvent("trial", {
        result: "Escaped",
        count: kept
    });

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

        /* Nothing to destroy, so this button has always done nothing here --
           but a bargain struck on an empty loadout still has to be able to
           lose. Without this, Bare Hands could be staked and then simply never
           settled by going down. Only the bargain is touched; the stat and the
           cards stay out of it, exactly as before. */
        settleBargain("sacrificed", loadoutSnapshot());

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

    // Before the Joker's rescue and the loadout reset, for the escape's reason.
    const lostWith = loadoutSnapshot();

    settleBargain("sacrificed", lostWith);
    recordTrial("sacrificed", lostWith);

    stats.sacrifices++;

const joker = loadout.perks.find(
    perk => perk.name === "The Joker"
);

if (joker) {

    /* Same loan rule as the escape path: the Joker protects what you own,
       and a borrowed perk was never yours. */
    const savedCards = [
        ...loadout.perks.filter(
            perk => perk.name !== "The Joker" && !perk.queenBorrowed
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
    aceLocked: false,
    /* Which Special dealt this loadout, so the "finish the match first" copy
       names the actual card instead of assuming it was always the Ace. Reset
       everywhere aceLocked itself resets -- the two never carry different
       lifetimes. */
    lockedBy: null
};

updateInventoryDisplay();
updateLoadoutDisplay();

logEvent("trial", {
    result: "Sacrificed",
    count: equipped,
    joker: !!joker
});

});

basicPackButton.addEventListener("click", function () {

    openPack(10, 3, "Basic");

});


entityPackButton.addEventListener("click", function () {

    openPack(15, 2, "Entity");

});


itemPackButton.addEventListener("click", function () {

    openItemPack();

});

/* One click does one of three things depending on state, same as a media
   player's play/pause: nothing running yet turns the mode on or off; a run
   in flight stops it instead, and leaves the mode on so the next pack
   clicked immediately opens the picker again rather than buying outright. */
autoOpenToggle.addEventListener("click", function () {

    if (autoOpenRun) {
        autoOpenStop("toggledOff");
        return;
    }

    autoOpenMode = !autoOpenMode;
    PL.sounds.toggle();
    updateAutoOpenToggleLabel();

});

closeAutoOpen.addEventListener("click", function () {

    closeModal(autoOpenModal);

});

window.addEventListener("click", function (event) {

    if (event.target === autoOpenModal) {
        closeModal(autoOpenModal);
    }

});

document.getElementById("autoOpenStepDown").addEventListener("click", function () {

    autoOpenCount = Math.max(1, autoOpenCount - 1);
    updateAutoOpenModal();

});

document.getElementById("autoOpenStepUp").addEventListener("click", function () {

    autoOpenCount = autoOpenCount + 1;
    updateAutoOpenModal();

});

document.getElementById("autoOpenStart").addEventListener("click", function () {

    startAutoOpen(autoOpenCount);

});

document.getElementById("autoOpenAllIn").addEventListener("click", function () {

    startAutoOpen("all");

});

document.querySelectorAll(".plTab").forEach(function (button) {

    button.addEventListener("click", function () {

        PL.panels.setTab(button.dataset.tab);

    });

});

document.getElementById("collectionButton")
    .addEventListener("click", function () {

        openCollection();

    });

/* Delegated: the chips are static, but keeping the read of "which one is lit"
   in one place stops the class and the variable drifting apart. */
if (collectionFilters) {

    collectionFilters.addEventListener("click", function (event) {

        const chip = event.target.closest("[data-filter]");

        if (!chip) {
            return;
        }

        collectionFilter = chip.dataset.filter;

        collectionFilters
            .querySelectorAll("[data-filter]")
            .forEach(other =>
                other.classList.toggle("plSift__chip--on", other === chip)
            );

        showCollection(
            document.querySelector(".collectionTab.active").dataset.type
        );

    });

}

if (rollLoadoutButton) {

    rollLoadoutButton.addEventListener("click", rollLoadout);

}

if (holdAllButton) {

    holdAllButton.addEventListener("click", holdAllSlots);

}

if (clearHoldsButton) {

    clearHoldsButton.addEventListener("click", clearAllHolds);

}

/* Delegated, because the panel is rebuilt whole on every balance change and
   per-control listeners would be re-bound on each of those passes. */
if (weeklyList) {

    document.getElementById("weeklyButton")
        .addEventListener("click", function () {

            updateWeeklyPanel();
            openModal(weeklyModal);

        });

    document.getElementById("closeWeekly")
        .addEventListener("click", function () {

            closeModal(weeklyModal);

        });

    /* Delegated: the board is rebuilt whole whenever anything it counts moves. */
    weeklyList.addEventListener("click", function (event) {

        const claim = event.target.closest("[data-weekly]");

        if (claim) {
            claimWeekly(claim.dataset.weekly);
        }

    });

}

if (bargainPanel) {

    bargainPanel.addEventListener("click", function (event) {

        const term = event.target.closest("[data-term]");

        if (term) {
            setBargainPick(term.dataset.term);
            return;
        }

        const step = event.target.closest("[data-stake]");

        if (step) {
            nudgeBargainStake(Number(step.dataset.stake));
            return;
        }

        if (event.target.closest("#strikeBargain")) {
            strikeBargain();
        }

    });

}

/* Delegated to the track rather than bound per node, because the track is
   rebuilt whole every time the collection changes and per-node handlers would
   be re-bound on each of those passes. */
if (collectionRewards) {

    collectionRewards.addEventListener("click", function (event) {

        const node = event.target.closest(".plTrack__node");

        if (node) {

            claimMilestone(node.dataset.pct);

        }

    });

}

PL.icons.hydrate();

PL.panels.more();

PL.foil.init();

PL.transfer.init();

/* One delegated listener on the document rather than handlers per card, so
   every card gets a description without any of the places that render one
   knowing the tooltip exists. */
PL.tooltip.wire();

/* Before the first click can play anything, so a saved level applies to the
   very first sound rather than the second. */
PL.sounds.init();

backupSavesOnce();

/* Items and add-ons used to be generic rarity buckets ("Rare Med-Kit"); the
   pool now carries the real DBD roster instead (tools/build-cards.mjs). A
   save written before that still has the old names woven through inventory,
   collection, foilCollection and the current loadout -- translated here so
   nothing a player already owns quietly turns into a card the game no
   longer recognises.

   Each old bucket maps to the specific real card whose art it was already
   wearing: same category, same rarity, picked the same way build-cards.mjs
   already picks art for a generic slot. The one exception is "Very Rare
   Toolbox Add-on", which never had a real match -- no Epic-tier Toolbox
   add-on exists -- and steps down to the nearest tier that does rather than
   up to one the player never earned. That step is also this table's one
   collision: both it and "Rare Toolbox Add-on" land on Grip Wrench, which
   is why migrateEquipmentNames merges rather than just renames.

   Declared here, immediately before loadCurrentGame() is first called,
   rather than down with migrateOldSave() further below -- a const is only
   live from its own declaration onward, and loadCurrentGame() calling this
   before script execution ever reached that declaration threw on every
   single load, "Cannot access 'EQUIPMENT_NAME_MIGRATION' before
   initialization", uncaught, which aborted the rest of this same top-level
   script -- including updatePackButtons(), both generateXShop() calls and
   both setInterval()s just below. That is the entire "shows nothing" a
   fresh page load produced: not a rendering bug, a table declared after
   the only place that ever read it. */
const EQUIPMENT_NAME_MIGRATION = {
    "Common Flashlight Add-on": "Battery",
    "Common Fog Vial Add-on": "Volcanic Stone",
    "Common Med-Kit Add-on": "Bandages",
    "Common Med-Kit": "Camping Aid Kit",
    "Common Toolbox Add-on": "Clean Rag",
    "Common Toolbox": "Worn-Out Tools",
    "Rare Flashlight Add-on": "Intense Halogen",
    "Rare Flashlight": "Sport Flashlight",
    "Rare Fog Vial Add-on": "Oily Sap",
    "Rare Fog Vial": "Vigo's Fog Vial",
    "Rare Med-Kit Add-on": "Gauze Roll",
    "Rare Med-Kit": "Emergency Med-Kit",
    "Rare Toolbox Add-on": "Grip Wrench",
    "Rare Toolbox": "Commodious Toolbox",
    "Ultra Rare Flashlight Add-on": "Odd Bulb",
    "Ultra Rare Fog Vial Add-on": "Potent Extract",
    "Ultra Rare Med-Kit Add-on": "Anti-Haemorrhagic Syringe",
    "Ultra Rare Toolbox Add-on": "Brand New Part",
    "Uncommon Flashlight Add-on": "Focus Lens",
    "Uncommon Flashlight": "Flashlight",
    "Uncommon Fog Vial Add-on": "Reactive Compound",
    "Uncommon Med-Kit Add-on": "Medical Scissors",
    "Uncommon Med-Kit": "First Aid Kit",
    "Uncommon Toolbox Add-on": "Cutting Wire",
    "Uncommon Toolbox": "Toolbox",
    "Very Rare Flashlight Add-on": "High-End Sapphire Lens",
    "Very Rare Flashlight": "Utility Flashlight",
    "Very Rare Fog Vial Add-on": "Mushroom Formula",
    "Very Rare Med-Kit Add-on": "Abdominal Dressing",
    "Very Rare Med-Kit": "Ranger Med-Kit",
    "Very Rare Toolbox Add-on": "Grip Wrench",
    "Very Rare Toolbox": "Alex's Toolbox"
};

function migrateEquipmentName(name) {

    return EQUIPMENT_NAME_MIGRATION[name] || name;

}

/* Runs on every load rather than once behind a flag -- 32 lookups is cheap,
   and a name that has already been translated just fails to match a second
   time, so re-running costs nothing. */
function migrateEquipmentNames() {

    inventory.forEach(function (row) {
        row.name = migrateEquipmentName(row.name);
    });

    /* Grip Wrench is where two old buckets now land (see the table's own
       comment above), so a save could hold two rows under the same name
       after translation -- merged here rather than left to shadow one
       another in the UI, grouped the same way a pulled card already is:
       name, foil and foilVariant together. */
    const mergedInventory = [];

    inventory.forEach(function (row) {

        const existing = mergedInventory.find(function (r) {
            return r.name === row.name &&
                r.foil === row.foil &&
                r.foilVariant === row.foilVariant;
        });

        if (existing) {
            existing.amount += row.amount;
        } else {
            mergedInventory.push(row);
        }

    });

    inventory = mergedInventory;

    /* Collection and foilCollection are name lists, not rows -- the same
       Grip Wrench collision would otherwise leave a duplicate entry sitting
       in either, rather than a wrong amount. */
    collection = collection
        .map(migrateEquipmentName)
        .filter(function (name, i, all) { return all.indexOf(name) === i; });

    foilCollection = foilCollection
        .map(migrateEquipmentName)
        .filter(function (name, i, all) { return all.indexOf(name) === i; });

    if (loadout.item) {
        loadout.item.name = migrateEquipmentName(loadout.item.name);
    }

    loadout.addons.forEach(function (addon) {
        addon.name = migrateEquipmentName(addon.name);
    });

}

/* Add-ons equipped before this rule existed -- or left mismatched by a name
   migration above landing an add-on and its item on two different families --
   go back to the inventory here rather than sitting on a slot they no longer
   fit. A plain data mutation, same as migrateEquipmentNames above: no display
   refresh or save, since load has not finished setting up the page yet. */
function repairMismatchedAddons() {

    if (!loadout.addons.length) {
        return;
    }

    const itemCategory = loadout.item ? categoryOf(loadout.item.name) : null;

    for (let i = loadout.addons.length - 1; i >= 0; i--) {

        const addon = loadout.addons[i];

        if (categoryOf(addon.name) === itemCategory) {
            continue;
        }

        const existing = inventory.find(function (card) {
            return card.name === addon.name &&
                card.foil === addon.foil &&
                card.foilVariant === addon.foilVariant;
        });

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

        loadout.addons.splice(i, 1);

    }

}

migrateOldSave();

loadCurrentGame();

updatePackButtons();

generateDailyShop();
generateRotatingPackShop();

updateShopTimer();
updateRotatingPackTimer();

setInterval(updateShopTimer, 1000);
setInterval(updateRotatingPackTimer, 1000);

function selectSave(slot) {

    if (slot === currentSave) {

        closeModal(saveSlotsModal);
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

    closeModal(saveSlotsModal);

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

    jackBuildsSeen = readSave("jackBuildsSeen", []);

    /* Shape-checked rather than taken on trust. readSave only guards against
       JSON that will not parse, so a key holding valid-but-wrong JSON still
       comes back as whatever it says -- and an object here would throw on the
       first indexOf and take the whole load with it. Same lesson as loadout
       below. */
    const savedBargain = readSave("bargain", null);

    /* Shape-checked rather than trusted. A stake that came back as a string or
       a term id that no longer exists would otherwise settle into a payout
       computed from nonsense. */
    bargain =
        savedBargain &&
        typeof savedBargain.termId === "string" &&
        typeof savedBargain.stake === "number" &&
        savedBargain.stake > 0
            ? { termId: savedBargain.termId, stake: savedBargain.stake }
            : null;

    bargainResult = null;

    shards = Number(localStorage.getItem(getSaveKey("shards"))) || 0;

    packsSinceNew = Number(localStorage.getItem(getSaveKey("packsSinceNew"))) || 0;

    /* Seeded to where the collection actually stands, not to zero. Left at zero,
       the first pack after any load would see the collection as having grown by
       its whole length and read as a lucky one. */
    collectionAtLastPack = collection.length;

    const savedWeekly = readSave("weekly", null);

    weekly =
        savedWeekly &&
        typeof savedWeekly.week === "number" &&
        savedWeekly.baseline && typeof savedWeekly.baseline === "object"
            ? {
                week: savedWeekly.week,
                baseline: savedWeekly.baseline,
                claimed: Array.isArray(savedWeekly.claimed)
                    ? savedWeekly.claimed.filter(function (id) {
                        return typeof id === "string";
                    })
                    : []
            }
            : { week: 0, baseline: {}, claimed: [] };

    const savedRecord = readSave("perkRecord", {});

    /* Shape-checked row by row. A record is read straight into arithmetic, and
       one bad entry would turn every rate on the page into NaN. */
    perkRecord = {};

    if (savedRecord && typeof savedRecord === "object" && !Array.isArray(savedRecord)) {

        Object.keys(savedRecord).forEach(function (name) {

            const row = savedRecord[name];

            if (row && typeof row.played === "number" && typeof row.escaped === "number" &&
                row.played >= 0 && row.escaped >= 0 && row.escaped <= row.played) {

                perkRecord[name] = { played: row.played, escaped: row.escaped };

            }

        });

    }

    const savedSets = readSave("completedSets", []);

    completedSets = Array.isArray(savedSets)
        ? savedSets.filter(function (n) { return typeof n === "string"; })
        : [];

    const savedMilestones = readSave("collectionMilestones", []);

    claimedMilestones = Array.isArray(savedMilestones)
        ? savedMilestones.filter(function (pct) {
            return typeof pct === "number";
        })
        : [];

    /* Seeded before anything renders, so a save already past a threshold opens
       with its rewards waiting quietly on the track instead of firing a banner
       for ground it covered in an earlier session. */
    lastReachedCount = PL.rewards.reachedCount(
        collection.length,
        getTotalCards()
    );

    eventLog = readSave("history", []);

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

    migrateEquipmentNames();
    repairMismatchedAddons();

    /* Normalised field by field rather than with a `|| default` on the whole
       object. migrateOldSave writes "{}" for a new player, which is truthy, so
       the old fallback never ran and every counter came back undefined — which
       in turn defeated the "new save gets 5 tokens" check below and left a
       fresh player unable to afford a single pack. */
    const savedStats = readSave("stats", {});

    /* The last three postdate the original four, so a save written before them
       simply starts at zero rather than at undefined — which would poison every
       weekly challenge that reads them. */
    stats = {
        escapes: savedStats.escapes || 0,
        sacrifices: savedStats.sacrifices || 0,
        packsOpened: savedStats.packsOpened || 0,
        foilsPulled: savedStats.foilsPulled || 0,
        sold: savedStats.sold || 0,
        forged: savedStats.forged || 0,
        bargainsWon: savedStats.bargainsWon || 0,
        entityTouchedPulled: savedStats.entityTouchedPulled || 0,
        bargainStreak: savedStats.bargainStreak || 0,
        bargainBestStreak: savedStats.bargainBestStreak || 0
    };

    dailyShop = readSave("dailyShop", []);

    /* buyShopCard trusts these rows outright -- name, rarity and type go
       straight into inventory with no lookup against gameData -- so an
       un-bought old-named row sitting here at load time needs the same
       translation the rest of a save just got, or buying it would add a
       card the pool no longer has. */
    dailyShop.forEach(function (card) {
        card.name = migrateEquipmentName(card.name);
    });

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

        tokens = 10;

        saveCurrentGame();

    }

    refreshTokenDisplays();
    updateShardDisplay();

    updateInventoryDisplay();
    updateCollectionCounter();
    updateLoadoutDisplay();
    updateShopDisplay();

    /* The log is built from eventLog, which this function just replaced with
       the incoming slot's history, so it repaints here with everything else
       rather than being left to the caller.

       It used to be the caller's job, and startup was the only caller that did
       it — so switching slots swapped the entries underneath a panel that went
       on showing the previous save's pulls until the next pack happened to
       redraw it. Every other panel above was already loaded and repainted in
       the same breath; this one is now too. */
    PL.panels.pulls();

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
        getSaveKey("jackBuildsSeen"),
        JSON.stringify(jackBuildsSeen)
    );

    localStorage.setItem(
        getSaveKey("collectionMilestones"),
        JSON.stringify(claimedMilestones)
    );

    localStorage.setItem(
        getSaveKey("completedSets"),
        JSON.stringify(completedSets)
    );

    localStorage.setItem(
        getSaveKey("perkRecord"),
        JSON.stringify(perkRecord)
    );

    localStorage.setItem(
        getSaveKey("weekly"),
        JSON.stringify(weekly)
    );

    localStorage.setItem(
        getSaveKey("shards"),
        shards
    );

    localStorage.setItem(
        getSaveKey("bargain"),
        JSON.stringify(bargain)
    );

    localStorage.setItem(
        getSaveKey("packsSinceNew"),
        packsSinceNew
    );

    localStorage.setItem(
        getSaveKey("history"),
        JSON.stringify(eventLog)
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
