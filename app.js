let allCards = []; 
        let currentBuild = []; 
        let allHeroes = [];
        let currentHero = null;
        let currentTraits = [0, 0, 0, 0]; // Options for levels 2, 3, 4, 5 (0 = A, 1 = B) 

        // ------------------------------------------------------------------
        // UI & Dropdown Logic
        // ------------------------------------------------------------------

        function toggleSubMenu() {
            const cat = document.getElementById('categoryFilter').value;
            const subMenu = document.getElementById('advancedFilters');
            const itemMenu = document.getElementById('itemFilters');
            
            if (cat === 'normal') {
                subMenu.classList.remove('hidden');
                itemMenu.classList.add('hidden');
            } else if (cat === 'item') {
                subMenu.classList.add('hidden');
                itemMenu.classList.remove('hidden');
            } else {
                // Hide both for Corruptors, Monsters, or "All" to prevent UI clutter
                subMenu.classList.add('hidden');
                itemMenu.classList.add('hidden');
            }
        }

        function toggleDropdown(el, event) {
            if (event) event.stopPropagation();
            
            if (typeof el === 'string') {
                document.querySelectorAll('.dropdown-content').forEach(c => {
                    if(c.id !== el) c.classList.remove('show');
                });
                const content = document.getElementById(el);
                if (content) content.classList.toggle('show');
            } else {
                const content = el.nextElementSibling;
                document.querySelectorAll('.dropdown-content').forEach(c => {
                    if(c !== content) c.classList.remove('show');
                });
                if (content) content.classList.toggle('show');
            }
        }

        function resetFilters() {
            // Uncheck all boxes and remove disabled states
            document.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                cb.disabled = false;
                cb.parentElement.classList.remove('disabled-option');
            });
            // Clear search
            document.getElementById('searchInput').value = '';
            
            // Remove active highlights
            document.querySelectorAll('.select-box').forEach(box => box.classList.remove('has-selections'));
            
            filterData();
        }

        document.addEventListener('click', function(event) {
            if (!event.target.closest('.dropdown-content') && !event.target.closest('.select-box')) {
                document.querySelectorAll('.dropdown-content').forEach(el => el.classList.remove('show'));
            }
        });

        function createMultiSelect(containerId, title, optionsList, filterKey) {
            const container = document.getElementById(containerId);
            if (!optionsList || optionsList.length === 0 || !container) return;
            
            let sortedOptions = Array.from(optionsList).filter(o => o);
            if (title === 'Cost') {
                sortedOptions.sort((a, b) => parseInt(a) - parseInt(b));
            } else {
                sortedOptions.sort();
            }

            let html = `<div class="multi-select">`;
            html += `<div class="select-box" onclick="toggleDropdown(this, event)">${title}</div>`;
            html += `<div class="dropdown-content">`;
            html += `<div style="padding: 6px;"><input type="text" class="dropdown-search" placeholder="Search..." onkeyup="filterDropdown(this)" style="width:100%; padding: 6px; box-sizing: border-box; background: var(--bg-input); border: 1px solid var(--border-light); color: var(--text-bright); border-radius: 4px;"></div>`;
            
            sortedOptions.forEach(opt => {
                html += `<label><input type="checkbox" value="${opt}" class="${filterKey}-checkbox" onchange="filterData()"> ${opt}</label>`;
            });
            
            html += `</div></div>`;
            container.innerHTML = html;
        }

        function filterDropdown(input) {
            const query = input.value.toLowerCase();
            const labels = input.parentElement.parentElement.querySelectorAll('label');
            labels.forEach(label => {
                const text = label.textContent.toLowerCase();
                label.style.display = text.includes(query) ? 'block' : 'none';
            });
        }

        // ------------------------------------------------------------------
        // Build Manager Logic
        // ------------------------------------------------------------------

        function getVariantDetails(variantId) {
            let card = allCards.find(c => c.variants.includes(variantId));
            if (!card) return null;
            
            let vType = 'base';
            if (variantId.endsWith('rare')) vType = 'rare';
            else if (variantId.endsWith('b')) vType = 'b';
            else if (variantId.endsWith('a')) vType = 'a';
            
            let cost = card.vCosts && card.vCosts[vType] !== undefined ? card.vCosts[vType] : card.cost;
            if (cost === 'N/A' || isNaN(cost)) cost = 0;
            
            return { card, cost, vType };
        }

        function addCurrentVariantToBuild(baseId) {
            const img = document.getElementById(`main-img-${baseId}`);
            if (img) {
                const variantId = img.getAttribute('data-id');
                const d = getVariantDetails(variantId);
                if (d && d.card.category === 'item' && d.card.itemType) {
                    const newType = d.card.itemType.trim().toLowerCase();
                    // Remove existing item of same type
                    currentBuild = currentBuild.filter(id => {
                        let existing = getVariantDetails(id);
                        if (!existing || existing.card.category !== 'item') return true;
                        const existingType = (existing.card.itemType || '').trim().toLowerCase();
                        return existingType !== newType;
                    });
                }
                currentBuild.push(variantId);
                renderBuild();
            }
        }

        function removeFromBuild(index) {
            currentBuild.splice(index, 1);
            renderBuild();
        }

        function renderBuild() {
            const equipmentGrid = document.getElementById('equipmentSection');
            const deckGrid = document.getElementById('deckSection');
            const metricsPanel = document.getElementById('buildMetrics');
            
            deckGrid.innerHTML = '';
            
            const equipTypes = ['Weapon', 'Armor', 'Ring', 'Trinket', 'Pet'];
            equipmentGrid.innerHTML = equipTypes.map(t => `<div class="equipment-slot" data-type="${t}"><span>${t}</span></div>`).join('');
            
            if(currentBuild.length === 0) {
                deckGrid.innerHTML = '<div style="color:#666; font-style:italic; padding: 10px;">Select cards to start building...</div>';
                if(metricsPanel) metricsPanel.style.display = 'none';
                return;
            }

            if(metricsPanel) metricsPanel.style.display = 'flex';

            let totalCost = 0;
            let costCurve = {};
            let typeCounts = {};
            let allEffects = new Set();
            let deckCount = 0;

            currentBuild.forEach((cardId, index) => {
                let d = getVariantDetails(cardId);
                if (!d) return;

                const itemHtml = `
                    <div class="build-item" draggable="true" ondragstart="drag(event, '${cardId}')" ondragover="allowDrop(event)" ondrop="drop(event, ${index})" ondragend="document.getElementById('trashZone').style.display = 'none'">
                        <img src="./card_images/${cardId}_result.png" alt="${cardId}" title="${cardId}">
                        <button class="remove-btn" onclick="removeFromBuild(${index})">x</button>
                    </div>
                `;

                if (d.card.category === 'item') {
                    const cleanType = (d.card.itemType || 'Unknown').trim();
                    const capitalizedType = cleanType.charAt(0).toUpperCase() + cleanType.slice(1).toLowerCase();
                    const slot = equipmentGrid.querySelector(`.equipment-slot[data-type="${capitalizedType}"]`);
                    if (slot) {
                        slot.innerHTML = itemHtml;
                        slot.classList.add('filled');
                    } else {
                        // Fallback if itemType is Unknown or invalid
                        const div = document.createElement('div');
                        div.innerHTML = itemHtml;
                        deckGrid.appendChild(div.firstElementChild);
                        deckCount++;
                    }
                } else {
                    const div = document.createElement('div');
                    div.innerHTML = itemHtml;
                    deckGrid.appendChild(div.firstElementChild);
                    deckCount++;
                    
                    totalCost += d.cost;
                    costCurve[d.cost] = (costCurve[d.cost] || 0) + 1;
                    if(d.card.types) d.card.types.forEach(t => { typeCounts[t] = (typeCounts[t] || 0) + 1; });
                    if(d.card.auras) d.card.auras.forEach(a => allEffects.add(a));
                    if(d.card.curses) d.card.curses.forEach(c => allEffects.add(c));
                }
            });

            if(document.getElementById('metricTotal')) document.getElementById('metricTotal').textContent = deckCount;
            if(document.getElementById('metricAvg')) document.getElementById('metricAvg').textContent = deckCount > 0 ? (totalCost / deckCount).toFixed(1) : "0.0";
            
            let curveHtml = '';
            Object.keys(costCurve).sort((a,b)=>a-b).forEach(cost => {
                curveHtml += `<li><span>Cost ${cost}:</span> <strong>${costCurve[cost]}</strong></li>`;
            });
            if(document.getElementById('metricCurve')) document.getElementById('metricCurve').innerHTML = curveHtml;

            let typesHtml = '';
            Object.keys(typeCounts).sort().forEach(type => {
                typesHtml += `<li><span>${type}:</span> <strong>${typeCounts[type]}</strong></li>`;
            });
            if(document.getElementById('metricTypes')) document.getElementById('metricTypes').innerHTML = typesHtml;

            let effectsHtml = '';
            Array.from(allEffects).sort().forEach(eff => {
                effectsHtml += `<span class="badge">${eff}</span>`;
            });
            if(document.getElementById('metricEffects')) document.getElementById('metricEffects').innerHTML = effectsHtml || '<span style="color:#666">None</span>';
        }

        function saveBuildToLocal() {
            const name = document.getElementById('buildName').value.trim();
            if (!name) { alert("Please name your build before saving."); return; }
            if (currentBuild.length === 0) { alert("Add some cards before saving."); return; }

            let savedBuilds = JSON.parse(localStorage.getItem('ato_builds') || '{}');
            savedBuilds[name] = currentBuild;
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
                currentBuild = [...savedBuilds[name]];
                document.getElementById('buildName').value = name;
                renderBuild();
                document.getElementById('shareLinkContainer').style.display = 'none';
            }
        }

        function clearBuild() {
            if(confirm("Are you sure you want to clear the entire build?")) {
                currentBuild = [];
                currentHero = null;
                currentTraits = [0, 0, 0, 0];
                document.getElementById('buildName').value = "";
                document.getElementById('heroSelect').value = "";
                document.getElementById('traitsToggle').style.display = 'none';
                document.getElementById('traitsSection').style.display = 'none';
                renderBuild();
            }
        }

        function changeHero() {
            const heroId = document.getElementById('heroSelect').value;
            if (!heroId) {
                currentHero = null;
                document.getElementById('traitsToggle').style.display = 'none';
                document.getElementById('traitsSection').style.display = 'none';
                return;
            }
            
            currentHero = allHeroes.find(h => h.id === heroId);
            currentTraits = [0, 0, 0, 0];
            
            // Lock class filter
            const classCheckboxes = document.querySelectorAll('.class-checkbox');
            classCheckboxes.forEach(cb => {
                cb.checked = (currentHero.classes.includes(cb.value));
            });
            filterData();
            
            renderTraitsUI();
        }

        function selectTrait(levelIndex, optionIndex) {
            currentTraits[levelIndex] = optionIndex;
            renderTraitsUI();
        }

        function renderTraitsUI() {
            const toggle = document.getElementById('traitsToggle');
            const section = document.getElementById('traitsSection');
            if (!currentHero) {
                toggle.style.display = 'none';
                section.style.display = 'none';
                return;
            }
            
            toggle.style.display = 'flex';
            if (!toggle.classList.contains('collapsed')) {
                section.style.display = 'flex';
            }
            
            let html = `
                <div class="trait-level">
                    <span class="trait-level-label">Innate</span>
                    <div class="trait-innate">${currentHero.traits.innate}</div>
                </div>
            `;
            
            for (let i = 2; i <= 5; i++) {
                const levelKey = 'level' + i;
                const opts = currentHero.traits[levelKey];
                const selectedOpt = currentTraits[i - 2];
                // Level 2 and Level 4 usually grant cards
                const iconHtml = (i === 2 || i === 4) ? '<span class="trait-card-icon">🎴</span>' : '';
                
                html += `
                    <div class="trait-level">
                        <span class="trait-level-label">Level ${i}</span>
                        <button class="trait-btn ${selectedOpt === 0 ? 'active' : ''}" onclick="selectTrait(${i - 2}, 0)">
                            ${iconHtml}${opts[0]}
                        </button>
                        <button class="trait-btn ${selectedOpt === 1 ? 'active' : ''}" onclick="selectTrait(${i - 2}, 1)">
                            ${iconHtml}${opts[1]}
                        </button>
                    </div>
                `;
            }
            section.innerHTML = html;
        }

        function deleteSavedBuild() {
            const dropdown = document.getElementById('savedBuildsDropdown');
            const name = dropdown.value;
            if (!name) return;
            if(confirm(`Are you sure you want to delete the saved build "${name}"?`)) {
                let savedBuilds = JSON.parse(localStorage.getItem('ato_builds') || '{}');
                delete savedBuilds[name];
                localStorage.setItem('ato_builds', JSON.stringify(savedBuilds));
                updateSavedBuildsDropdown();
                if (document.getElementById('buildName').value === name) {
                    document.getElementById('buildName').value = "";
                    currentBuild = [];
                    renderBuild();
                }
            }
        }

        function sortBuildByCost(event) {
            if(event) event.stopPropagation();
            currentBuild.sort((id1, id2) => {
                let d1 = getVariantDetails(id1);
                let d2 = getVariantDetails(id2);
                if (!d1 || !d2) return 0;
                if (d1.cost !== d2.cost) return d1.cost - d2.cost;
                return d1.card.idKey.localeCompare(d2.card.idKey);
            });
            renderBuild();
        }

        let dragCardId = null;

        function drag(ev, cardId) {
            dragCardId = cardId;
            ev.dataTransfer.setData("text", cardId);
            document.getElementById('trashZone').style.display = 'block';
        }

        function allowDrop(ev) {
            ev.preventDefault();
        }

        function drop(ev, dropIndex) {
            ev.preventDefault();
            document.getElementById('trashZone').style.display = 'none';
            if (!dragCardId) return;
            
            // Extract all copies of the dragged card
            const copies = currentBuild.filter(id => id === dragCardId);
            currentBuild = currentBuild.filter(id => id !== dragCardId);
            
            // Insert them at the target index
            let newIndex = dropIndex;
            // Bound check just in case
            if (newIndex < 0) newIndex = 0;
            if (newIndex > currentBuild.length) newIndex = currentBuild.length;
            
            currentBuild.splice(newIndex, 0, ...copies);
            dragCardId = null;
            renderBuild();
        }

        function dropTrash(ev) {
            ev.preventDefault();
            document.getElementById('trashZone').style.display = 'none';
            if (!dragCardId) return;
            
            // Delete all copies
            currentBuild = currentBuild.filter(id => id !== dragCardId);
            dragCardId = null;
            renderBuild();
        }

        function generateShareLink() {
            const name = encodeURIComponent(document.getElementById('buildName').value.trim() || 'My Build');
            const counts = {};
            currentBuild.forEach(c => counts[c] = (counts[c] || 0) + 1);
            const cards = Object.entries(counts).map(([c, count]) => count > 1 ? `${c}-${count}` : c).join(',');
            const baseUrl = window.location.origin + window.location.pathname;
            
            let finalUrl = `${baseUrl}?buildName=${name}&cards=${cards}`;
            if (currentHero) {
                finalUrl += `&hero=${currentHero.id}&traits=${currentTraits.join(',')}`;
            }
            
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
            const name = params.get('buildName');
            const heroParam = params.get('hero');
            const traitsParam = params.get('traits');
            
            if (heroParam) {
                const heroSelect = document.getElementById('heroSelect');
                if (heroSelect) heroSelect.value = heroParam;
                currentHero = allHeroes.find(h => h.id === heroParam);
                
                if (traitsParam) {
                    const t = traitsParam.split(',').map(Number);
                    if (t.length === 4) currentTraits = t;
                }
                
                if (currentHero) {
                    renderTraitsUI();
                    
                    // Lock class filter
                    const classCheckboxes = document.querySelectorAll('.class-checkbox');
                    classCheckboxes.forEach(cb => {
                        cb.checked = (currentHero.classes.includes(cb.value));
                    });
                }
            }

            if (cards) {
                currentBuild = [];
                cards.split(',').filter(c => c).forEach(item => {
                    const parts = item.split('-');
                    if (parts.length === 2 && !isNaN(parts[1])) {
                        for(let i = 0; i < parseInt(parts[1]); i++) currentBuild.push(parts[0]);
                    } else {
                        currentBuild.push(item);
                    }
                });
                if (name) document.getElementById('buildName').value = decodeURIComponent(name);
                window.history.replaceState({}, document.title, window.location.pathname);
            }
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
                } else {
                    token += c;
                }
            }
            if (token || current.length > 0) { current.push(token.trim()); results.push(current); }
            return results;
        }

        async function loadData() {
            try {
                // Fetch JSON
                const response = await fetch('./cards.json'); 
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const rawText = await response.text();
                const cleanText = rawText.replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' '); 
                
                let db;
                try { db = JSON.parse(cleanText); } 
                catch (parseError) { throw new Error(`Syntax error in cards.json: ${parseError.message}`); }

                // --- Parse Card Stats (stats.csv) ---
                let statsMap = {};
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
                            
                            if (!statsMap[cleanName]) {
                                statsMap[cleanName] = {
                                    heroClass: row[4] || 'Other',
                                    cost: row[5] !== undefined && row[5] !== '' ? row[5] : 'N/A',
                                    rarity: row[6] || 'Unknown',
                                    types: new Set(), auras: new Set(), curses: new Set(), vCosts: {}
                                };
                                if(row[4]) uniqueClasses.add(row[4]);
                                if(row[5] !== undefined && row[5] !== '') uniqueCosts.add(row[5]);
                                if(row[6]) uniqueRarities.add(row[6]);
                            }

                            let vType = 'base';
                            if (row[1] && row[1].toUpperCase() === 'TRUE') vType = 'a';
                            else if (row[2] && row[2].toUpperCase() === 'TRUE') vType = 'b';
                            else if (row[3] && row[3].toUpperCase() === 'TRUE') vType = 'rare';
                            
                            if (row[5] !== undefined && row[5] !== '') statsMap[cleanName].vCosts[vType] = parseInt(row[5], 10);

                            for(let j=7; j<=24; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') statsMap[cleanName].types.add(headers[j]);
                            for(let j=25; j<=51; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') statsMap[cleanName].auras.add(headers[j]);
                            for(let j=52; j<=76; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') statsMap[cleanName].curses.add(headers[j]);
                        }
                    }
                } catch(e) { console.log("stats.csv not found."); }

                // --- Parse Item Stats (Item Export.csv) ---
                let itemStatsMap = {};
                let itemBasicsHeaders = [], itemDamageHeaders = [], itemResistHeaders = [], itemAuraHeaders = [], itemCurseHeaders = [];
                let uniqueItemTypes = new Set(), uniqueItemRarities = new Set();

                try {
                    const itemCsvRes = await fetch('./Item Export.csv');
                    if (itemCsvRes.ok) {
                        const itemCsvText = await itemCsvRes.text();
                        const itemRows = parseCSV(itemCsvText);
                        const itemHeaders = itemRows[0].map(h => h.trim());

                        itemBasicsHeaders = itemHeaders.slice(4, 12).filter(h => h); 
                        itemDamageHeaders = itemHeaders.slice(12, 21).filter(h => h); 
                        itemResistHeaders = itemHeaders.slice(21, 30).filter(h => h); 
                        itemAuraHeaders = itemHeaders.slice(30, 59).filter(h => h); 
                        itemCurseHeaders = itemHeaders.slice(59, 86).filter(h => h); 

                        for (let i = 1; i < itemRows.length; i++) {
                            const row = itemRows[i];
                            if (!row[0]) continue;
                            const cleanName = row[0].toLowerCase().trim();

                            if (!itemStatsMap[cleanName]) {
                                itemStatsMap[cleanName] = {
                                    type: row[2] || 'Unknown',
                                    rarity: row[3] || 'Unknown',
                                    basics: new Set(), damage: new Set(), resist: new Set(), auras: new Set(), curses: new Set()
                                };
                                if(row[2]) uniqueItemTypes.add(row[2]);
                                if(row[3]) uniqueItemRarities.add(row[3]);
                            }

                            for(let j=4; j<=11; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].basics.add(itemHeaders[j]);
                            for(let j=12; j<=20; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].damage.add(itemHeaders[j]);
                            for(let j=21; j<=29; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].resist.add(itemHeaders[j]);
                            for(let j=30; j<=58; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].auras.add(itemHeaders[j]);
                            for(let j=59; j<=85; j++) if(row[j] && row[j].toUpperCase() === 'TRUE') itemStatsMap[cleanName].curses.add(itemHeaders[j]);
                        }
                    }
                } catch(e) { console.log("Item Export.csv not found."); }

                // --- Build UI Dropdowns ---
                createMultiSelect('classFilterContainer', 'Class', uniqueClasses, 'class');
                createMultiSelect('costFilterContainer', 'Cost', uniqueCosts, 'cost');
                createMultiSelect('rarityFilterContainer', 'Rarity', uniqueRarities, 'rarity');
                createMultiSelect('typeFilterContainer', 'Card Type', typeHeaders, 'type');
                createMultiSelect('auraFilterContainer', 'Auras', auraHeaders, 'aura');
                createMultiSelect('curseFilterContainer', 'Curses', curseHeaders, 'curse');

                createMultiSelect('itemTypeFilterContainer', 'Item Type', uniqueItemTypes, 'item-type');
                createMultiSelect('itemRarityFilterContainer', 'Rarity', uniqueItemRarities, 'item-rarity');
                createMultiSelect('itemBasicsFilterContainer', 'Basics', itemBasicsHeaders, 'item-basics');
                createMultiSelect('itemDamageFilterContainer', 'Damage', itemDamageHeaders, 'item-damage');
                createMultiSelect('itemResistFilterContainer', 'Resistances', itemResistHeaders, 'item-resist');
                createMultiSelect('itemAuraFilterContainer', 'Auras', itemAuraHeaders, 'item-aura');
                createMultiSelect('itemCurseFilterContainer', 'Curses', itemCurseHeaders, 'item-curse');

                const categories = new Set();
                allCards = []; 

                Object.entries(db.cards).forEach(([key, data]) => {
                    let category = "normal";
                    let cleanName = key;
                    
                    const match = key.match(/\(([^)]+)\)/);
                    if (match) {
                        category = match[1].toLowerCase();
                        cleanName = key.replace(/\([^)]+\)/g, '').trim();
                    }
                    if (category === 'items') category = 'item';
                    categories.add(category);
                    
                    const sheetData = statsMap[cleanName.toLowerCase()] || { 
                        heroClass: 'Other', cost: 'N/A', rarity: 'Unknown', types: new Set(), auras: new Set(), curses: new Set(), vCosts: {} 
                    };
                    const itemSheetData = itemStatsMap[cleanName.toLowerCase()] || {
                        type: 'Unknown', rarity: 'Unknown', basics: new Set(), damage: new Set(), resist: new Set(), auras: new Set(), curses: new Set()
                    };

                    // Purge developer cards: Skip if Normal and not found in stats.csv
                    if (category === "normal" && sheetData.heroClass === 'Other' && Array.from(sheetData.types).length === 0) return;

                    allCards.push({
                        idKey: cleanName,
                        category: category,
                        heroClass: sheetData.heroClass, cost: sheetData.cost, rarity: sheetData.rarity,
                        types: Array.from(sheetData.types), auras: Array.from(sheetData.auras), curses: Array.from(sheetData.curses), vCosts: sheetData.vCosts,
                        itemType: itemSheetData.type, itemRarity: itemSheetData.rarity, itemBasics: Array.from(itemSheetData.basics), itemDamage: Array.from(itemSheetData.damage), itemResist: Array.from(itemSheetData.resist), itemAuras: Array.from(itemSheetData.auras), itemCurses: Array.from(itemSheetData.curses),
                        variants: data.IDs || [], related: data.RelatedIDs || []
                    });
                });
                
                allCards.sort((a, b) => a.idKey.localeCompare(b.idKey));

                const categorySelect = document.getElementById('categoryFilter');
                Array.from(categories).filter(c => c !== 'normal').sort().forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat;
                    option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
                    categorySelect.appendChild(option);
                });

                updateSavedBuildsDropdown();
                
                try {
                    const heroRes = await fetch('./heroes.json?v=' + new Date().getTime());
                    if (heroRes.ok) {
                        allHeroes = await heroRes.json();
                        const heroSelect = document.getElementById('heroSelect');
                        heroSelect.innerHTML = '<option value="">-- Select Hero --</option>';
                        const classEmojis = {
                            "Warrior": "🛡️",
                            "Mage": "🔥",
                            "Healer": "➕",
                            "Scout": "🏹"
                        };
                        allHeroes.forEach(h => {
                            const opt = document.createElement('option');
                            opt.value = h.id;
                            const emojiStr = h.classes.map(c => classEmojis[c] || "").join('');
                            opt.textContent = `${h.name} ${emojiStr}`;
                            heroSelect.appendChild(opt);
                        });
                    } else {
                        console.error("HTTP error fetching heroes.json:", heroRes.status);
                    }
                } catch(e) { console.error("heroes.json not found or invalid:", e); }

                checkUrlForBuild();
                renderBuild();
                filterData(); 

            } catch (error) {
                document.getElementById('error-message').style.display = 'block';
                document.getElementById('error-message').innerHTML = `<h3>Error</h3><p>${error.message}</p>`;
            }
        }

        // ------------------------------------------------------------------
        // Rendering & Filtering
        // ------------------------------------------------------------------

        function getBorderClass(variantId, baseId) {
            if (variantId.endsWith('rare')) return 'border-rare';
            if (variantId.endsWith('b') && variantId !== baseId + 'b' + 'b') return 'border-b';
            if (variantId.endsWith('a') && variantId !== baseId + 'a' + 'a') return 'border-a';
            return 'border-base';
        }

        function handleImageError(img) {
            if (img.classList.contains('variant-img')) {
                img.style.display = 'none';
            } else {
                const missingId = img.getAttribute('data-id');
                img.outerHTML = `<div class="error-state" id="${img.id}">Image Not Found<br><small style="margin-top: 10px; color: #aaa;">${missingId}_result.png</small></div>`;
            }
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
                        let borderCls = getBorderClass(upgradeId, baseId);
                        htmlStr += `<img class="variant-img ${borderCls}" id="thumb-${baseId}-${upgradeId}" src="./card_images/${upgradeId}_result.png" onclick="swapImage('${baseId}', '${upgradeId}')" onerror="handleImageError(this)">`;
                    });
                    htmlStr += `</div>`;
                }

                htmlStr += `<button class="add-btn" onclick="addCurrentVariantToBuild('${baseId}')">+ Add to Build</button>`;

                cardDiv.innerHTML = htmlStr;
                grid.appendChild(cardDiv);
            });
        }

        function swapImage(baseId, newId) {
            const mainImgElement = document.getElementById(`main-img-${baseId}`);
            if(mainImgElement.tagName === 'IMG') {
               mainImgElement.src = `./card_images/${newId}_result.png`;
               mainImgElement.setAttribute('data-id', newId);
            } else {
               const newImg = document.createElement('img');
               newImg.src = `./card_images/${newId}_result.png`;
               newImg.id = `main-img-${baseId}`;
               newImg.setAttribute('data-id', newId);
               newImg.onerror = function() { handleImageError(this) };
               mainImgElement.parentNode.replaceChild(newImg, mainImgElement);
            }
            const variantsContainer = document.getElementById(`thumb-${baseId}-${newId}`).parentElement;
            const thumbs = variantsContainer.querySelectorAll('.variant-img');
            thumbs.forEach(t => t.classList.remove('active'));
            document.getElementById(`thumb-${baseId}-${newId}`).classList.add('active');
        }

        // ------------------------------------------------------------------
        // Master Filter Engine (Dynamic Facets & AND/OR Logic)
        // ------------------------------------------------------------------

        function filterData() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const selectedCategory = document.getElementById('categoryFilter').value;
            
            const getChecked = (className) => Array.from(document.querySelectorAll(`.${className}:checked`)).map(cb => cb.value);
            
            // Map our specific dropdowns to their corresponding object fields in the allCards data
            const filters = {
                'class': { vals: getChecked('class-checkbox'), field: 'heroClass' },
                'cost': { vals: getChecked('cost-checkbox'), field: 'cost' },
                'rarity': { vals: getChecked('rarity-checkbox'), field: 'rarity' },
                'type': { vals: getChecked('type-checkbox'), field: 'types' },
                'aura': { vals: getChecked('aura-checkbox'), field: 'auras' },
                'curse': { vals: getChecked('curse-checkbox'), field: 'curses' },
                'item-type': { vals: getChecked('item-type-checkbox'), field: 'itemType' },
                'item-rarity': { vals: getChecked('item-rarity-checkbox'), field: 'itemRarity' },
                'item-basics': { vals: getChecked('item-basics-checkbox'), field: 'itemBasics' },
                'item-damage': { vals: getChecked('item-damage-checkbox'), field: 'itemDamage' },
                'item-resist': { vals: getChecked('item-resist-checkbox'), field: 'itemResist' },
                'item-aura': { vals: getChecked('item-aura-checkbox'), field: 'itemAuras' },
                'item-curse': { vals: getChecked('item-curse-checkbox'), field: 'itemCurses' }
            };

            // Logic Gate: Returns true if the card passes all currently active filters
            function passesFilters(card, skipKey = null) {
                const matchesSearch = card.idKey.toLowerCase().includes(searchTerm) || card.variants.join(' ').toLowerCase().includes(searchTerm);
                if (!matchesSearch) return false;
                if (selectedCategory !== 'all' && card.category !== selectedCategory) return false;

                if (selectedCategory === 'normal' || selectedCategory === 'all') {
                    // Scalar fields (OR logic)
                    if (skipKey !== 'class' && filters['class'].vals.length > 0 && !filters['class'].vals.includes(card.heroClass)) return false;
                    if (skipKey !== 'cost' && filters['cost'].vals.length > 0 && !filters['cost'].vals.includes(card.cost.toString())) return false;
                    if (skipKey !== 'rarity' && filters['rarity'].vals.length > 0 && !filters['rarity'].vals.includes(card.rarity)) return false;
                    
                    // Array fields (AND logic - must contain EVERY selected tag)
                    if (skipKey !== 'type' && filters['type'].vals.length > 0 && !filters['type'].vals.every(t => card.types.includes(t))) return false;
                    if (skipKey !== 'aura' && filters['aura'].vals.length > 0 && !filters['aura'].vals.every(a => card.auras.includes(a))) return false;
                    if (skipKey !== 'curse' && filters['curse'].vals.length > 0 && !filters['curse'].vals.every(c => card.curses.includes(c))) return false;
                }

                if (selectedCategory === 'item' || selectedCategory === 'all') {
                    if (skipKey !== 'item-type' && filters['item-type'].vals.length > 0 && !filters['item-type'].vals.includes(card.itemType)) return false;
                    if (skipKey !== 'item-rarity' && filters['item-rarity'].vals.length > 0 && !filters['item-rarity'].vals.includes(card.itemRarity)) return false;
                    
                    if (skipKey !== 'item-basics' && filters['item-basics'].vals.length > 0 && !filters['item-basics'].vals.every(t => card.itemBasics.includes(t))) return false;
                    if (skipKey !== 'item-damage' && filters['item-damage'].vals.length > 0 && !filters['item-damage'].vals.every(t => card.itemDamage.includes(t))) return false;
                    if (skipKey !== 'item-resist' && filters['item-resist'].vals.length > 0 && !filters['item-resist'].vals.every(t => card.itemResist.includes(t))) return false;
                    if (skipKey !== 'item-aura' && filters['item-aura'].vals.length > 0 && !filters['item-aura'].vals.every(t => card.itemAuras.includes(t))) return false;
                    if (skipKey !== 'item-curse' && filters['item-curse'].vals.length > 0 && !filters['item-curse'].vals.every(t => card.itemCurses.includes(t))) return false;
                }
                return true;
            }

            // 1. Render actual results
            const filtered = allCards.filter(c => passesFilters(c));
            renderCards(filtered);

            // 2. Highlight active dropdown menus
            document.querySelectorAll('.multi-select').forEach(ms => {
                const hasChecked = ms.querySelectorAll('input:checked').length > 0;
                const box = ms.querySelector('.select-box');
                if(hasChecked) box.classList.add('has-selections');
                else box.classList.remove('has-selections');
            });

            // 3. Dynamic Facet Math (Gray out invalid options to prevent zero-result dead ends)
            Object.keys(filters).forEach(key => {
                const isOrFilter = ['class', 'cost', 'rarity', 'item-type', 'item-rarity'].includes(key);
                
                // Get all cards that pass the test for this specific dropdown calculation
                const validCards = allCards.filter(c => passesFilters(c, isOrFilter ? key : null));
                
                // Extract every available property from that subset
                const validValues = new Set();
                validCards.forEach(c => {
                    let val = c[filters[key].field];
                    if (Array.isArray(val)) {
                        val.forEach(v => validValues.add(v));
                    } else {
                        validValues.add(val !== undefined && val !== null ? val.toString() : '');
                    }
                });

                // Disable checkboxes that are not present in the valid subset
                document.querySelectorAll(`.${key}-checkbox`).forEach(cb => {
                    const label = cb.parentElement;
                    if (!validValues.has(cb.value)) {
                        label.classList.add('disabled-option');
                        cb.disabled = true;
                    } else {
                        label.classList.remove('disabled-option');
                        cb.disabled = false;
                    }
                });
            });
        }

        loadData();
