let allCards = [];
let currentBuild = []; // Deck cards
let currentItems = { Weapon: null, Armor: null, Ring: null, Trinket: null, Pet: null };

// ------------------------------------------------------------------
// Build Manager & Equipment Logic
// ------------------------------------------------------------------

function toggleBuildContent() {
const content = document.getElementById('buildContent');
const btn = document.querySelector('.btn-toggle');
content.classList.toggle('collapsed');
if (content.classList.contains('collapsed')) {
btn.textContent = '▲ Expand Build';
} else {
btn.textContent = '▼ Collapse';
}
}

function getVariantDetails(variantId) {
let card = allCards.find(c => c.variants.includes(variantId));
if (!card) return null;

let vType = 'base';
if (variantId.endsWith('rare')) vType = 'rare';
else if (variantId.endsWith('b')) vType = 'b';
else if (variantId.endsWith('a')) vType = 'a';

let cost = card.vCosts[vType];
if (cost === undefined) cost = card.cost; 
if (cost === 'N/A' || isNaN(cost)) cost = 0;

return { card, cost, vType };


}

function addCurrentVariantToBuild(baseId) {
const img = document.getElementById(main-img-${baseId});
if (!img) return;
const variantId = img.getAttribute('data-id');
const cardObj = allCards.find(c => c.variants.includes(variantId));

if (cardObj && cardObj.category === 'items' && cardObj.itemType) {
    // It's an item - slot it
    const slot = cardObj.itemType;
    if (currentItems.hasOwnProperty(slot)) {
        currentItems[slot] = variantId;
    }
} else {
    // It's a deck card
    currentBuild.push(variantId);
}
renderBuild();


}

function removeFromDeck(index) {
currentBuild.splice(index, 1);
renderBuild();
}

function unequipItem(slot) {
currentItems[slot] = null;
renderBuild();
}

function renderBuild() {
// 1. Render Deck
const grid = document.getElementById('buildGrid');
const metricsPanel = document.getElementById('buildMetrics');
grid.innerHTML = '';

if(currentBuild.length === 0) {
    grid.innerHTML = '<div style="color:#666; font-style:italic; padding: 10px;">Select cards to start building your deck...</div>';
    metricsPanel.style.display = 'none';
} else {
    metricsPanel.style.display = 'flex';
    
    // Auto-Sort: Lowest Cost -> Alphabetical
    currentBuild.sort((id1, id2) => {
        let d1 = getVariantDetails(id1);
        let d2 = getVariantDetails(id2);
        if (!d1 || !d2) return 0;
        
        if (d1.cost !== d2.cost) return d1.cost - d2.cost;
        return d1.card.idKey.localeCompare(d2.card.idKey);
    });

    let totalCards = currentBuild.length;
    let totalCost = 0;
    let costCurve = {};
    let typeCounts = {};
    let allEffects = new Set();

    currentBuild.forEach((cardId, index) => {
        const div = document.createElement('div');
        div.className = 'build-item';
        div.innerHTML = `
            <img src="./card_images/${cardId}_result.png" alt="${cardId}" title="${cardId}">
            <button class="remove-btn" onclick="removeFromDeck(${index})">x</button>
        `;
        grid.appendChild(div);

        let d = getVariantDetails(cardId);
        if (d && d.card) {
            totalCost += d.cost;
            costCurve[d.cost] = (costCurve[d.cost] || 0) + 1;
            // Null-check protections for legacy saves that might have had items mixed into the deck
            if (d.card.types) d.card.types.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
            if (d.card.auras) d.card.auras.forEach(a => allEffects.add(a));
            if (d.card.curses) d.card.curses.forEach(c => allEffects.add(c));
        }
    });

    // Update Metrics UI
    document.getElementById('metricTotal').textContent = totalCards;
    document.getElementById('metricAvg').textContent = totalCards > 0 ? (totalCost / totalCards).toFixed(1) : "0.0";
    
    let curveHtml = '';
    Object.keys(costCurve).sort((a,b)=>a-b).forEach(cost => { curveHtml += `<li><span>Cost ${cost}:</span> <strong>${costCurve[cost]}</strong></li>`; });
    document.getElementById('metricCurve').innerHTML = curveHtml;

    let typesHtml = '';
    Object.keys(typeCounts).sort().forEach(type => { typesHtml += `<li><span>${type}:</span> <strong>${typeCounts[type]}</strong></li>`; });
    document.getElementById('metricTypes').innerHTML = typesHtml;

    let effectsHtml = '';
    Array.from(allEffects).sort().forEach(eff => { effectsHtml += `<span class="badge">${eff}</span>`; });
    document.getElementById('metricEffects').innerHTML = effectsHtml || '<span style="color:#666">None</span>';
}

// 2. Render Equipment Slots
const equipGrid = document.getElementById('equipmentGrid');
equipGrid.innerHTML = '';

['Weapon', 'Armor', 'Ring', 'Trinket', 'Pet'].forEach(slot => {
    const container = document.createElement('div');
    container.className = 'equip-slot-container';
    
    const label = document.createElement('div');
    label.className = 'equip-label';
    label.textContent = slot;
    
    const slotDiv = document.createElement('div');
    slotDiv.className = 'equip-slot';
    
    if (currentItems[slot]) {
        slotDiv.innerHTML = `
            <img src="./card_images/${currentItems[slot]}_result.png" alt="${currentItems[slot]}" title="${currentItems[slot]}">
            <button class="remove-btn" onclick="unequipItem('${slot}')">x</button>
        `;
    } else {
        slotDiv.innerHTML = `<span class="equip-empty-text">[ ]</span>`;
    }
    
    container.appendChild(label);
    container.appendChild(slotDiv);
    equipGrid.appendChild(container);
});


}

function saveBuildToLocal() {
const name = document.getElementById('buildName').value.trim();
if (!name) { alert("Please name your build before saving."); return; }
if (currentBuild.length === 0 && !Object.values(currentItems).some(x => x !== null)) {
alert("Add some cards or items before saving."); return;
}

let savedBuilds = JSON.parse(localStorage.getItem('ato_builds') || '{}');
savedBuilds[name] = { deck: currentBuild, items: currentItems };
localStorage.setItem('ato_builds', JSON.stringify(savedBuilds));

updateSavedBuildsDropdown();
document.getElementById('savedBuildsDropdown').value = name;


}

function updateSavedBuildsDropdown() {
const dropdown = document.getElementById('savedBuildsDropdown');
const savedBuilds = JSON.parse(localStorage.getItem('ato_builds') || '{}');

dropdown.innerHTML = '<option value="">-- Load Saved Build --</option>';
for (const name in savedBuilds) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    dropdown.appendChild(opt);
}


}

function loadBuildFromLocal(name) {
if (!name) return;
const savedBuilds = JSON.parse(localStorage.getItem('ato_builds') || '{}');
if (savedBuilds[name]) {
const data = savedBuilds[name];
// Handle legacy arrays or new objects
if (Array.isArray(data)) {
currentBuild = [...data];
currentItems = { Weapon: null, Armor: null, Ring: null, Trinket: null, Pet: null };
} else {
currentBuild = [...(data.deck || [])];
currentItems = Object.assign({ Weapon: null, Armor: null, Ring: null, Trinket: null, Pet: null }, data.items);
}

    document.getElementById('buildName').value = name;
    renderBuild();
    document.getElementById('shareLinkContainer').style.display = 'none';
}


}

function generateShareLink() {
if (currentBuild.length === 0 && !Object.values(currentItems).some(x=>x)) {
alert("Add some cards or items to generate a link!"); return;
}
const name = encodeURIComponent(document.getElementById('buildName').value.trim() || 'Untitled');

// Compress Deck
const counts = {};
currentBuild.forEach(c => counts[c] = (counts[c] || 0) + 1);
const deckString = Object.entries(counts).map(([c, count]) => count > 1 ? `${c}*${count}` : c).join(',');

// Compress Items (w:sword,a:tunic,etc)
const itemMap = { Weapon: 'w', Armor: 'a', Ring: 'r', Trinket: 't', Pet: 'p' };
const itemParts = [];
for (const [slot, id] of Object.entries(currentItems)) {
    if (id) itemParts.push(`${itemMap[slot]}:${id}`);
}
const itemString = itemParts.join(',');

const baseUrl = window.location.origin + window.location.pathname;
const finalUrl = `${baseUrl}?buildName=${name}&cards=${deckString}&items=${itemString}`;

const container = document.getElementById('shareLinkContainer');
const input = document.getElementById('shareLinkInput');
input.value = finalUrl;
container.style.display = 'block';
input.select();
document.execCommand('copy'); 


}

function checkUrlForBuild() {
const params = new URLSearchParams(window.location.search);
const cards = params.get('cards');
const items = params.get('items');
const name = params.get('buildName');

let loadedAnything = false;

if (cards) {
    const decodedCards = [];
    cards.split(',').forEach(item => {
        if (!item) return;
        const parts = item.split('*');
        const cardId = parts[0];
        const count = parts.length > 1 ? parseInt(parts[1], 10) : 1;
        for (let i = 0; i < count; i++) decodedCards.push(cardId);
    });
    currentBuild = decodedCards;
    loadedAnything = true;
}

if (items) {
    const reverseMap = { 'w': 'Weapon', 'a': 'Armor', 'r': 'Ring', 't': 'Trinket', 'p': 'Pet' };
    currentItems = { Weapon: null, Armor: null, Ring: null, Trinket: null, Pet: null };
    items.split(',').forEach(part => {
        if(!part) return;
        const [slotKey, id] = part.split(':');
        if (reverseMap[slotKey] && id) {
            currentItems[reverseMap[slotKey]] = id;
        }
    });
    loadedAnything = true;
}

if (loadedAnything) {
    if (name) document.getElementById('buildName').value = decodeURIComponent(name);
    window.history.replaceState({}, document.title, window.location.pathname);
}


}

// ------------------------------------------------------------------
// UI & Dropdown Logic
// ------------------------------------------------------------------

function resetFilters() {
document.getElementById('searchInput').value = '';
document.getElementById('categoryFilter').value = 'all';

document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    cb.disabled = false;
});
document.querySelectorAll('.dropdown-content label').forEach(lbl => {
    lbl.classList.remove('disabled');
});

toggleSubMenu();
filterData();


}

function toggleSubMenu() {
const cat = document.getElementById('categoryFilter').value;
const cardMenu = document.getElementById('cardFilters');
const itemMenu = document.getElementById('itemFilters');

cardMenu.classList.add('hidden');
itemMenu.classList.add('hidden');

if (cat === 'normal' || cat === 'all') cardMenu.classList.remove('hidden');
if (cat === 'items') itemMenu.classList.remove('hidden');


}

function toggleDropdown(id, event) {
event.stopPropagation();
document.querySelectorAll('.dropdown-content').forEach(el => {
if(el.id !== id) el.classList.remove('show');
});
document.getElementById(id).classList.toggle('show');
}

document.addEventListener('click', function(event) {
if (!event.target.closest('.dropdown-content') && !event.target.closest('.select-box')) {
document.querySelectorAll('.dropdown-content').forEach(el => el.classList.remove('show'));
}
});

function createMultiSelect(containerId, title, optionsList, filterKey) {
const container = document.getElementById(containerId);
if (!optionsList || optionsList.length === 0) return;

let sortedOptions = Array.from(optionsList).filter(o => o);
if (title === 'Cost') sortedOptions.sort((a, b) => parseInt(a) - parseInt(b));
else sortedOptions.sort();

let html = `<div class="multi-select">
    <div class="select-box" id="box-${filterKey}" onclick="toggleDropdown('${containerId}-drop', event)">${title}</div>
    <div class="dropdown-content" id="${containerId}-drop">`;

sortedOptions.forEach(opt => {
    html += `<label><input type="checkbox" value="${opt}" class="${filterKey}-checkbox" onchange="filterData()"> <span>${opt}</span></label>`;
});

html += `</div></div>`;
container.innerHTML = html;


}

function getChecked(className) {
return Array.from(document.querySelectorAll(.${className}:checked)).map(cb => cb.value);
}

function updateDropdownHighlights(keys) {
keys.forEach(key => {
const box = document.getElementById(box-${key});
if (box) {
if (getChecked(${key}-checkbox).length > 0) box.classList.add('has-selection');
else box.classList.remove('has-selection');
}
});
}

function updateAvailableOptions(validCards, filterPrefix, attributeArrayName) {
const availableOptions = new Set();
validCards.forEach(c => {
if(c[attributeArrayName] !== undefined) {
if(Array.isArray(c[attributeArrayName])) {
c[attributeArrayName].forEach(attr => availableOptions.add(attr));
} else if(c[attributeArrayName]) {
availableOptions.add(c[attributeArrayName]);
}
}
});

document.querySelectorAll(`.${filterPrefix}-checkbox`).forEach(cb => {
    if (!cb.checked) {
        if (availableOptions.has(cb.value)) {
            cb.disabled = false;
            cb.parentElement.classList.remove('disabled');
        } else {
            cb.disabled = true;
            cb.parentElement.classList.add('disabled');
        }
    }
});


}

// ------------------------------------------------------------------
// Data Parsing & Loading
// ------------------------------------------------------------------

function parseCSV(text) {
const results = [];
let current = [];
let token = '';
let inQuotes = false;
for (let i = 0; i < text.length; i++) {
const c = text[i];
if (c === '"') {
if (inQuotes && text[i + 1] === '"') { token += '"'; i++; }
else { inQuotes = !inQuotes; }
} else if (c === ',' && !inQuotes) {
current.push(token.trim()); token = '';
} else if ((c === '\n' || c === '\r') && !inQuotes) {
if (c === '\r' && text[i + 1] === '\n') i++;
current.push(token.trim()); token = '';
if (current.length > 0) { results.push(current); current = []; }
} else { token += c; }
}
if (token || current.length > 0) { current.push(token.trim()); results.push(current); }
return results;
}

async function loadData() {
try {
// 1. JSON
const response = await fetch('./cards.json');
if (!response.ok) throw new Error(HTTP error! status: ${response.status});
const rawText = await response.text();
const cleanText = rawText.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ');
let db = JSON.parse(cleanText);

    // 2. Load stats.csv (Cards)
    let cardStatsMap = {};
    let typeHeaders = [], auraHeaders = [], curseHeaders = [];
    let uniqueClasses = new Set(), uniqueCosts = new Set(), uniqueRarities = new Set();
    
    try {
        const csvRes = await fetch('./stats.csv');
        if (csvRes.ok) {
            const csvText = await csvRes.text();
            const rows = parseCSV(csvText);
            const headers = rows[0].map(h => h.trim());
            
            typeHeaders = headers.slice(7, 25).filter(h => h);
            auraHeaders = headers.slice(25, 52).filter(h => h);
            curseHeaders = headers.slice(52, 77).filter(h => h);

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0]) continue;
                const cleanName = row[0].toLowerCase().trim();
                
                if (!cardStatsMap[cleanName]) {
                    cardStatsMap[cleanName] = {
                        heroClass: row[4] || 'Other',
                        cost: row[5] !== undefined && row[5] !== '' ? row[5].toString() : 'N/A',
                        rarity: row[6] || 'Unknown',
                        types: new Set(), auras: new Set(), curses: new Set(), vCosts: {}
                    };
                    if(row[4]) uniqueClasses.add(row[4]);
                    if(row[5] !== undefined && row[5] !== '') uniqueCosts.add(row[5].toString());
                    if(row[6]) uniqueRarities.add(row[6]);
                }

                let vType = 'base';
                if (row[1] && row[1].toUpperCase() === 'TRUE') vType = 'a';
                else if (row[2] && row[2].toUpperCase() === 'TRUE') vType = 'b';
                else if (row[3] && row[3].toUpperCase() === 'TRUE') vType = 'rare';
                
                if (row[5] !== undefined && row[5] !== '') {
                    cardStatsMap[cleanName].vCosts[vType] = parseInt(row[5], 10);
                }

                for(let j=7; j<=24; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') cardStatsMap[cleanName].types.add(headers[j]);
                for(let j=25; j<=51; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') cardStatsMap[cleanName].auras.add(headers[j]);
                for(let j=52; j<=76; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') cardStatsMap[cleanName].curses.add(headers[j]);
            }
        }
    } catch(e) { console.log("stats.csv not found."); }

    // 3. Load Item Export.csv (Items)
    let itemStatsMap = {};
    let itemTypeHeaders = new Set(), itemRarityHeaders = new Set();
    let itemBasicsHeaders = [], itemDamageHeaders = [], itemResistHeaders = [], itemAuraHeaders = [], itemCurseHeaders = [];

    try {
        const itemRes = await fetch('./Item Export.csv');
        if (itemRes.ok) {
            const itemText = await itemRes.text();
            const rows = parseCSV(itemText);
            const headers = rows[0].map(h => h.trim());
            
            itemBasicsHeaders = headers.slice(4, 12).filter(h => h);
            itemDamageHeaders = headers.slice(12, 21).filter(h => h);
            itemResistHeaders = headers.slice(21, 30).filter(h => h);
            itemAuraHeaders = headers.slice(30, 59).filter(h => h);
            itemCurseHeaders = headers.slice(59, 86).filter(h => h);

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row[0]) continue;
                const cleanName = row[0].toLowerCase().trim();
                
                if (!itemStatsMap[cleanName]) {
                    itemStatsMap[cleanName] = {
                        itemType: row[2] ? row[2].charAt(0).toUpperCase() + row[2].slice(1) : 'Unknown',
                        itemRarity: row[3] ? row[3].charAt(0).toUpperCase() + row[3].slice(1) : 'Unknown',
                        basics: new Set(), damage: new Set(), resists: new Set(), auras: new Set(), curses: new Set()
                    };
                    if(row[2]) itemTypeHeaders.add(itemStatsMap[cleanName].itemType);
                    if(row[3]) itemRarityHeaders.add(itemStatsMap[cleanName].itemRarity);
                }

                for(let j=4; j<=11; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].basics.add(headers[j]);
                for(let j=12; j<=20; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].damage.add(headers[j]);
                for(let j=21; j<=29; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].resists.add(headers[j]);
                for(let j=30; j<=58; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].auras.add(headers[j]);
                for(let j=59; j<=85; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].curses.add(headers[j]);
            }
        }
    } catch(e) { console.log("Item Export.csv not found."); }

    // 4. Create Dropdowns (Cards)
    createMultiSelect('classFilterContainer', 'Class', uniqueClasses, 'class');
    createMultiSelect('costFilterContainer', 'Cost', uniqueCosts, 'cost');
    createMultiSelect('rarityFilterContainer', 'Rarity', uniqueRarities, 'rarity');
    createMultiSelect('typeFilterContainer', 'Card Type', typeHeaders, 'type');
    createMultiSelect('auraFilterContainer', 'Auras', auraHeaders, 'aura');
    createMultiSelect('curseFilterContainer', 'Curses', curseHeaders, 'curse');

    // 5. Create Dropdowns (Items)
    createMultiSelect('itemTypeFilterContainer', 'Item Type', itemTypeHeaders, 'itemType');
    createMultiSelect('itemRarityFilterContainer', 'Rarity', itemRarityHeaders, 'itemRarity');
    createMultiSelect('itemBasicsFilterContainer', 'Basics', itemBasicsHeaders, 'itemBasics');
    createMultiSelect('itemDamageFilterContainer', 'Damage', itemDamageHeaders, 'itemDamage');
    createMultiSelect('itemResistFilterContainer', 'Resistances', itemResistHeaders, 'itemResist');
    createMultiSelect('itemAuraFilterContainer', 'Auras', itemAuraHeaders, 'itemAura');
    createMultiSelect('itemCurseFilterContainer', 'Curses', itemCurseHeaders, 'itemCurse');

    // 6. Merge Everything
    const categories = new Set();
    allCards = Object.entries(db.cards).map(([key, data]) => {
        let category = "normal";
        let cleanName = key;
        
        const match = key.match(/\(([^)]+)\)/);
        if (match) {
            category = match[1].toLowerCase();
            cleanName = key.replace(/\([^)]+\)/g, '').trim();
        }
        if (category === 'item') category = 'items'; // Force plural for consistency
        categories.add(category);
        
        let cardData = {
            idKey: cleanName,
            category: category,
            variants: data.IDs || [], 
            related: data.RelatedIDs || []
        };

        if (category === 'normal' || category === 'all') {
            const sData = cardStatsMap[cleanName.toLowerCase()] || { heroClass: 'Other', cost: 'N/A', rarity: 'Unknown', types: new Set(), auras: new Set(), curses: new Set(), vCosts: {} };
            cardData.heroClass = sData.heroClass;
            cardData.cost = sData.cost;
            cardData.rarity = sData.rarity;
            cardData.types = Array.from(sData.types);
            cardData.auras = Array.from(sData.auras);
            cardData.curses = Array.from(sData.curses);
            cardData.vCosts = sData.vCosts;
        } 
        
        if (category === 'items') {
            const iData = itemStatsMap[cleanName.toLowerCase()] || { itemType: 'Unknown', itemRarity: 'Unknown', basics: new Set(), damage: new Set(), resists: new Set(), auras: new Set(), curses: new Set() };
            cardData.itemType = iData.itemType;
            cardData.itemRarity = iData.itemRarity;
            cardData.itemBasics = Array.from(iData.basics);
            cardData.itemDamage = Array.from(iData.damage);
            cardData.itemResist = Array.from(iData.resists);
            cardData.itemAura = Array.from(iData.auras);
            cardData.itemCurse = Array.from(iData.curses);
            cardData.vCosts = {}; // Items don't use vCosts
        }

        return cardData;
    });
    
    allCards.sort((a, b) => a.idKey.localeCompare(b.idKey));

    // Clean "items" out of dynamic population since we hardcoded it
    const categorySelect = document.getElementById('categoryFilter');
    Array.from(categories).filter(c => c !== 'normal' && c !== 'items').sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        categorySelect.appendChild(option);
    });

    updateSavedBuildsDropdown();
    checkUrlForBuild();
    renderBuild();
    filterData(); 

} catch (error) {
    console.error("Error:", error);
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'block';
    errorDiv.innerHTML = `<h3>Failed to load data</h3><p style="font-size: 0.9em;">${error.message}</p>`;
}


}

// ------------------------------------------------------------------
// Rendering
// ------------------------------------------------------------------

function handleImageError(img) {
if (img.classList.contains('variant-img')) img.style.display = 'none';
else img.outerHTML = <div class="error-state" id="${img.id}">Image Not Found<br><small style="margin-top: 10px; color: #aaa;">${img.getAttribute('data-id')}_result.png</small></div>;
}

function getBorderClass(variantId, baseId) {
if (variantId.endsWith('rare')) return 'border-rare';
if (variantId.endsWith('b') && variantId !== baseId + 'b' + 'b') return 'border-b';
if (variantId.endsWith('a') && variantId !== baseId + 'a' + 'a') return 'border-a';
return 'border-base';
}

function renderCards(cardsToRender) {
const grid = document.getElementById('cardGrid');
grid.innerHTML = '';

cardsToRender.forEach(card => {
    if (card.variants.length === 0) return;
    const baseId = card.variants[0]; 
    const upgrades = card.variants.slice(1); 

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-container';
    
    let htmlStr = `<h3 class="card-title">${card.idKey}</h3>`;
    htmlStr += `<img src="./card_images/${baseId}_result.png" class="main-img" id="main-img-${baseId}" alt="${baseId}" data-id="${baseId}" onerror="handleImageError(this)">`;
    
    if (upgrades.length > 0) {
        htmlStr += `<div class="variants">`;
        htmlStr += `<img class="variant-img border-base active" id="thumb-${baseId}-${baseId}" src="./card_images/${baseId}_result.png" onclick="swapImage('${baseId}', '${baseId}')" onerror="handleImageError(this)">`;
        upgrades.forEach(upgradeId => {
            htmlStr += `<img class="variant-img ${getBorderClass(upgradeId, baseId)}" id="thumb-${baseId}-${upgradeId}" src="./card_images/${upgradeId}_result.png" onclick="swapImage('${baseId}', '${upgradeId}')" onerror="handleImageError(this)">`;
        });
        htmlStr += `</div>`;
    }

    htmlStr += `<button class="add-btn" onclick="addCurrentVariantToBuild('${baseId}')">+ Add to Build</button>`;
    cardDiv.innerHTML = htmlStr;
    grid.appendChild(cardDiv);
});


}

function swapImage(baseId, newId) {
const mainImgElement = document.getElementById(main-img-${baseId});
if(mainImgElement.tagName === 'IMG') {
mainImgElement.src = ./card_images/${newId}_result.png;
mainImgElement.setAttribute('data-id', newId);
} else {
const newImg = document.createElement('img');
newImg.src = ./card_images/${newId}_result.png;
newImg.id = main-img-${baseId};
newImg.className = 'main-img';
newImg.setAttribute('data-id', newId);
newImg.onerror = function() { handleImageError(this) };
mainImgElement.parentNode.replaceChild(newImg, mainImgElement);
}
const variantsContainer = document.getElementById(thumb-${baseId}-${newId}).parentElement;
variantsContainer.querySelectorAll('.variant-img').forEach(t => t.classList.remove('active'));
document.getElementById(thumb-${baseId}-${newId}).classList.add('active');
}

function filterData() {
const searchTerm = document.getElementById('searchInput').value.toLowerCase();
const selectedCategory = document.getElementById('categoryFilter').value;

updateDropdownHighlights(['class', 'cost', 'rarity', 'type', 'aura', 'curse', 'itemType', 'itemRarity', 'itemBasics', 'itemDamage', 'itemResist', 'itemAura', 'itemCurse']);

// Card Checkboxes
const sClasses = getChecked('class-checkbox');
const sCosts = getChecked('cost-checkbox');
const sRarities = getChecked('rarity-checkbox');
const sTypes = getChecked('type-checkbox');
const sAuras = getChecked('aura-checkbox');
const sCurses = getChecked('curse-checkbox');

// Item Checkboxes
const iTypes = getChecked('itemType-checkbox');
const iRarities = getChecked('itemRarity-checkbox');
const iBasics = getChecked('itemBasics-checkbox');
const iDamage = getChecked('itemDamage-checkbox');
const iResists = getChecked('itemResist-checkbox');
const iAuras = getChecked('itemAura-checkbox');
const iCurses = getChecked('itemCurse-checkbox');

const filtered = allCards.filter(card => {
    const matchesSearch = card.idKey.toLowerCase().includes(searchTerm) || card.variants.join(' ').toLowerCase().includes(searchTerm);
    if (!matchesSearch) return false;
    if (selectedCategory !== 'all' && card.category !== selectedCategory) return false;

    // Normal Cards Logic
    if (selectedCategory === 'normal' || selectedCategory === 'all') {
        if (card.category === 'normal') {
            if (sClasses.length > 0 && !sClasses.includes(card.heroClass)) return false;
            if (sCosts.length > 0 && !sCosts.includes(card.cost)) return false;
            if (sRarities.length > 0 && !sRarities.includes(card.rarity)) return false;
            
            // AND logic for arrays
            if (sTypes.length > 0 && !sTypes.every(t => card.types && card.types.includes(t))) return false;
            if (sAuras.length > 0 && !sAuras.every(a => card.auras && card.auras.includes(a))) return false;
            if (sCurses.length > 0 && !sCurses.every(c => card.curses && card.curses.includes(c))) return false;
        }
    }

    // Items Logic
    if (selectedCategory === 'items' || selectedCategory === 'all') {
        if (card.category === 'items') {
            if (iTypes.length > 0 && !iTypes.includes(card.itemType)) return false;
            if (iRarities.length > 0 && !iRarities.includes(card.itemRarity)) return false;
            
            // AND logic for arrays
            if (iBasics.length > 0 && !iBasics.every(b => card.itemBasics && card.itemBasics.includes(b))) return false;
            if (iDamage.length > 0 && !iDamage.every(d => card.itemDamage && card.itemDamage.includes(d))) return false;
            if (iResists.length > 0 && !iResists.every(r => card.itemResist && card.itemResist.includes(r))) return false;
            if (iAuras.length > 0 && !iAuras.every(a => card.itemAura && card.itemAura.includes(a))) return false;
            if (iCurses.length > 0 && !iCurses.every(c => card.itemCurse && card.itemCurse.includes(c))) return false;
        }
    }

    return true;
});

// Update disabled states for dead-end checking
if (selectedCategory === 'normal') {
    updateAvailableOptions(filtered, 'class', 'heroClass');
    updateAvailableOptions(filtered, 'cost', 'cost');
    updateAvailableOptions(filtered, 'rarity', 'rarity');
    updateAvailableOptions(filtered, 'type', 'types');
    updateAvailableOptions(filtered, 'aura', 'auras');
    updateAvailableOptions(filtered, 'curse', 'curses');
} else if (selectedCategory === 'items') {
    updateAvailableOptions(filtered, 'itemType', 'itemType');
    updateAvailableOptions(filtered, 'itemRarity', 'itemRarity');
    updateAvailableOptions(filtered, 'itemBasics', 'itemBasics');
    updateAvailableOptions(filtered, 'itemDamage', 'itemDamage');
    updateAvailableOptions(filtered, 'itemResist', 'itemResist');
    updateAvailableOptions(filtered, 'itemAura', 'itemAura');
    updateAvailableOptions(filtered, 'itemCurse', 'itemCurse');
}

renderCards(filtered);


}

// Ensure the initial data load triggers on script startup
// Add this here if your original script didn't call it anywhere explicitly
window.addEventListener('DOMContentLoaded', () => {
// loadData(); // Uncomment if you need this to kickstart the data loading
});