/**
 * Aircraft UI Integration
 * Connects the Aircraft API to the UI components
 */

let currentAircraftId = null;
let aircraftDirty = false;
let csvAircraftData = [];

/**
 * Initialize aircraft UI on page load
 */
function initAircraftUI() {
    // Load aircraft list into dropdown
    refreshAircraftDropdown();

    // Load default aircraft if exists
    const defaultAircraft = AircraftAPI.getDefaultAircraft();
    if (defaultAircraft) {
        loadAircraftIntoForm(defaultAircraft);
    }
}

/**
 * Refresh the aircraft dropdown
 */
function refreshAircraftDropdown() {
    const select = document.getElementById('aircraftSelect');
    const aircraft = AircraftAPI.getAllAircraft();
    const defaultId = AircraftAPI.getDefaultAircraft()?.id;

    // Clear existing options except first
    select.innerHTML = '<option value="">-- Select or Add Aircraft --</option>';

    // Add aircraft options
    aircraft.forEach(a => {
        const option = document.createElement('option');
        option.value = a.id;
        option.textContent = a.type + (a.registration ? ' (' + a.registration + ')' : '');
        if (a.id === defaultId) {
            option.textContent += ' ★';
        }
        select.appendChild(option);
    });

    // Add separator and "Add New" option
    if (aircraft.length > 0) {
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────';
        select.appendChild(separator);
    }

    const addNew = document.createElement('option');
    addNew.value = '_new_';
    addNew.textContent = '+ Add New Aircraft';
    select.appendChild(addNew);
}

/**
 * Load selected aircraft from dropdown
 */
function loadSelectedAircraft() {
    const select = document.getElementById('aircraftSelect');
    const selectedId = select.value;

    if (selectedId === '') {
        // No selection - hide form
        document.getElementById('aircraftDetails').style.display = 'none';
        currentAircraftId = null;
        return;
    }

    if (selectedId === '_new_') {
        // Add new aircraft
        clearAircraftForm();
        return;
    }

    // Check for unsaved changes
    if (aircraftDirty && !confirm('You have unsaved changes. Load different aircraft?')) {
        // Revert selection
        select.value = currentAircraftId || '';
        return;
    }

    // Load aircraft
    const aircraft = AircraftAPI.getAircraft(selectedId);
    if (aircraft) {
        loadAircraftIntoForm(aircraft);
    }
}

/**
 * Load aircraft data into form
 */
function loadAircraftIntoForm(aircraft) {
    currentAircraftId = aircraft.id;
    aircraftDirty = false;

    // Show form
    document.getElementById('aircraftDetails').style.display = 'block';

    // Populate fields
    document.getElementById('aircraftType').value = aircraft.type || '';
    document.getElementById('aircraftRegistration').value = aircraft.registration || '';

    // Determine rate type and set radio buttons
    if (aircraft.wetRate && aircraft.wetRate > 0) {
        document.querySelector('input[name="rateType"][value="wet"]').checked = true;
        document.getElementById('aircraftWetRate').value = aircraft.wetRate;
    } else if (aircraft.dryRate && aircraft.dryRate > 0) {
        document.querySelector('input[name="rateType"][value="dry"]').checked = true;
        document.getElementById('aircraftDryRate').value = aircraft.dryRate;
        document.getElementById('aircraftFuelPrice').value = aircraft.fuelPrice || '';
        document.getElementById('aircraftFuelBurn').value = aircraft.fuelBurn || '';
    } else {
        // Default to wet rate if neither is set
        document.querySelector('input[name="rateType"][value="wet"]').checked = true;
    }

    // Toggle the sections based on rate type
    toggleRateType();

    // Update select
    document.getElementById('aircraftSelect').value = aircraft.id;

    // Show/hide delete button
    document.getElementById('deleteAircraftBtn').style.display = 'inline-block';

    // Reset save button
    const saveBtn = document.getElementById('saveAircraftBtn');
    saveBtn.classList.remove('dirty');
    document.getElementById('saveAircraftText').textContent = 'Save Aircraft';
}

/**
 * Clear aircraft form for new entry
 */
function clearAircraftForm() {
    currentAircraftId = null;
    aircraftDirty = false;

    // Show form
    document.getElementById('aircraftDetails').style.display = 'block';

    // Clear fields
    document.getElementById('aircraftType').value = '';
    document.getElementById('aircraftRegistration').value = '';
    document.getElementById('aircraftWetRate').value = '';
    document.getElementById('aircraftDryRate').value = '';
    document.getElementById('aircraftFuelPrice').value = '';
    document.getElementById('aircraftFuelBurn').value = '';

    // Reset to wet rate by default
    document.querySelector('input[name="rateType"][value="wet"]').checked = true;
    toggleRateType();

    // Update select
    document.getElementById('aircraftSelect').value = '';

    // Hide delete button
    document.getElementById('deleteAircraftBtn').style.display = 'none';

    // Reset save button
    const saveBtn = document.getElementById('saveAircraftBtn');
    saveBtn.classList.remove('dirty');
    document.getElementById('saveAircraftText').textContent = 'Save New Aircraft';
}

/**
 * Toggle between wet and dry rate sections
 */
function toggleRateType() {
    const rateType = document.querySelector('input[name="rateType"]:checked').value;
    const wetSection = document.getElementById('wetRateSection');
    const drySection = document.getElementById('dryRateSection');
    const fuelPriceSection = document.getElementById('fuelPriceSection');
    const fuelBurnSection = document.getElementById('fuelBurnSection');

    if (rateType === 'wet') {
        wetSection.style.display = 'flex';
        drySection.style.display = 'none';
        fuelPriceSection.style.display = 'none';
        fuelBurnSection.style.display = 'none';
        // Clear dry rate fields
        document.getElementById('aircraftDryRate').value = '';
        document.getElementById('aircraftFuelPrice').value = '';
        document.getElementById('aircraftFuelBurn').value = '';
    } else {
        wetSection.style.display = 'none';
        drySection.style.display = 'flex';
        fuelPriceSection.style.display = 'flex';
        fuelBurnSection.style.display = 'flex';
        // Clear wet rate field
        document.getElementById('aircraftWetRate').value = '';
    }
}

/**
 * Mark aircraft as dirty (unsaved changes)
 */
function markAircraftDirty() {
    aircraftDirty = true;
    const saveBtn = document.getElementById('saveAircraftBtn');
    saveBtn.classList.add('dirty');
    document.getElementById('saveAircraftText').textContent = 'Save Changes *';
}

/**
 * Save current aircraft
 */
function saveCurrentAircraft() {
    try {
        // Validate
        if (!document.getElementById('aircraftType').value.trim()) {
            alert('Please enter an aircraft type');
            return;
        }

        // Determine rate type
        const rateType = document.querySelector('input[name="rateType"]:checked').value;

        // Gather form data based on rate type
        const aircraftData = {
            type: document.getElementById('aircraftType').value.trim(),
            registration: document.getElementById('aircraftRegistration').value.trim(),
            wetRate: 0,
            dryRate: 0,
            fuelPrice: 0,
            fuelBurn: 0
        };

        if (rateType === 'wet') {
            aircraftData.wetRate = parseFloat(document.getElementById('aircraftWetRate').value) || 0;
            if (aircraftData.wetRate === 0) {
                alert('Please enter a wet rate');
                return;
            }
        } else {
            aircraftData.dryRate = parseFloat(document.getElementById('aircraftDryRate').value) || 0;
            aircraftData.fuelPrice = parseFloat(document.getElementById('aircraftFuelPrice').value) || 0;
            aircraftData.fuelBurn = parseFloat(document.getElementById('aircraftFuelBurn').value) || 0;

            if (aircraftData.dryRate === 0) {
                alert('Please enter a dry rate');
                return;
            }
            if (aircraftData.fuelPrice === 0 || aircraftData.fuelBurn === 0) {
                alert('Please enter fuel price and fuel burn for dry rate');
                return;
            }
        }

        // Save or update
        let saved;
        if (currentAircraftId) {
            // Update existing
            saved = AircraftAPI.updateAircraft(currentAircraftId, aircraftData);
        } else {
            // Add new
            saved = AircraftAPI.addAircraft(aircraftData);
            currentAircraftId = saved.id;
        }

        // Save to storage
        AircraftAPI.saveConfig();

        // Refresh UI
        refreshAircraftDropdown();
        loadAircraftIntoForm(saved);

        // Show success
        alert('Aircraft saved successfully!');

    } catch (error) {
        alert('Error saving aircraft: ' + error.message);
        console.error(error);
    }
}

/**
 * Delete current aircraft
 */
function deleteCurrentAircraft() {
    if (!currentAircraftId) return;

    const aircraft = AircraftAPI.getAircraft(currentAircraftId);
    const message = 'Delete ' + aircraft.type + (aircraft.registration ? ' (' + aircraft.registration + ')' : '') + '?';

    if (!confirm(message)) return;

    try {
        AircraftAPI.deleteAircraft(currentAircraftId);
        AircraftAPI.saveConfig();

        // Refresh UI
        refreshAircraftDropdown();
        clearAircraftForm();
        document.getElementById('aircraftDetails').style.display = 'none';

        alert('Aircraft deleted');

    } catch (error) {
        alert('Error deleting aircraft: ' + error.message);
        console.error(error);
    }
}

/**
 * Show manage aircraft modal
 */
function showManageAircraftModal() {
    const modal = document.getElementById('manageAircraftModal');
    const list = document.getElementById('aircraftManagementList');

    // Build aircraft list
    const aircraft = AircraftAPI.getAllAircraft();
    const defaultId = AircraftAPI.getDefaultAircraft()?.id;

    if (aircraft.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #666;">No saved aircraft yet. Add your first aircraft above!</p>';
    } else {
        list.innerHTML = aircraft.map(a => `
            <div class="aircraft-list-item ${a.id === defaultId ? 'is-default' : ''}">
                <div class="aircraft-list-header">
                    <div class="aircraft-list-title">
                        ${a.type}${a.registration ? ' (' + a.registration + ')' : ''}
                    </div>
                    ${a.id === defaultId ? '<span class="aircraft-list-badge">DEFAULT</span>' : ''}
                </div>
                <div class="aircraft-list-details">
                    ${a.wetRate > 0 ? `Wet Rate: $${a.wetRate}/hr` : `Dry Rate: $${a.dryRate}/hr`}
                    ${a.dryRate > 0 && a.fuelPrice ? `<br>Fuel: $${a.fuelPrice}/gal @ ${a.fuelBurn} gal/hr` : ''}
                </div>
                <div class="aircraft-list-actions">
                    <button class="btn-secondary" onclick="loadAircraftFromManage('${a.id}')">Edit</button>
                    ${a.id !== defaultId ? `<button class="btn-secondary" onclick="setAsDefault('${a.id}')">Set as Default</button>` : ''}
                    <button class="btn-secondary" onclick="deleteAircraftFromManage('${a.id}')" style="color: #dc2626;">Delete</button>
                </div>
            </div>
        `).join('');
    }

    modal.style.display = 'flex';
}

/**
 * Close manage aircraft modal
 */
function closeManageAircraftModal() {
    document.getElementById('manageAircraftModal').style.display = 'none';
}

/**
 * Load aircraft from manage modal
 */
function loadAircraftFromManage(id) {
    closeManageAircraftModal();
    const aircraft = AircraftAPI.getAircraft(id);
    if (aircraft) {
        loadAircraftIntoForm(aircraft);
    }
}

/**
 * Set aircraft as default
 */
function setAsDefault(id) {
    try {
        AircraftAPI.setDefaultAircraft(id);
        AircraftAPI.saveConfig();
        refreshAircraftDropdown();
        showManageAircraftModal(); // Refresh modal
    } catch (error) {
        alert('Error setting default: ' + error.message);
    }
}

/**
 * Delete aircraft from manage modal
 */
function deleteAircraftFromManage(id) {
    const aircraft = AircraftAPI.getAircraft(id);
    const message = 'Delete ' + aircraft.type + (aircraft.registration ? ' (' + aircraft.registration + ')' : '') + '?';

    if (!confirm(message)) return;

    try {
        AircraftAPI.deleteAircraft(id);
        AircraftAPI.saveConfig();
        refreshAircraftDropdown();
        showManageAircraftModal(); // Refresh modal

        // Clear form if this was the current aircraft
        if (currentAircraftId === id) {
            clearAircraftForm();
            document.getElementById('aircraftDetails').style.display = 'none';
        }
    } catch (error) {
        alert('Error deleting aircraft: ' + error.message);
    }
}

/**
 * Show CSV import modal with detected aircraft
 */
function showCSVImportModal(parsedData, aircraftTableData) {
    // Convert aircraftData object to array if needed
    let aircraftArray = null;
    if (aircraftTableData && typeof aircraftTableData === 'object' && !Array.isArray(aircraftTableData)) {
        // Convert object with AircraftID keys to array
        aircraftArray = Object.keys(aircraftTableData).map(id => ({
            AircraftID: id,
            Make: aircraftTableData[id].make || '',
            Model: aircraftTableData[id].model || '',
            ...aircraftTableData[id]
        }));
    } else if (Array.isArray(aircraftTableData)) {
        aircraftArray = aircraftTableData;
    }

    csvAircraftData = AircraftAPI.importFromCSV(parsedData, aircraftArray);

    if (csvAircraftData.length === 0) {
        alert('No aircraft found in CSV file');
        return;
    }

    const modal = document.getElementById('csvImportModal');
    const list = document.getElementById('csvAircraftList');
    const count = document.getElementById('csvAircraftCount');

    count.textContent = csvAircraftData.length;

    list.innerHTML = csvAircraftData.map((a, index) => `
        <div class="csv-aircraft-item">
            <div class="csv-aircraft-header">
                <input type="checkbox" class="csv-aircraft-checkbox" id="csv-check-${index}" checked>
                <div class="csv-aircraft-info">
                    <div class="csv-aircraft-stats">${a.registration} - ${a.totalTime.toFixed(1)} hours logged</div>
                </div>
            </div>
            <div style="padding-left: 30px; margin-bottom: 10px;">
                <label style="font-size: 0.9em; color: #666;">Aircraft Name</label>
                <input type="text" class="input-field" id="csv-name-${index}" value="${a.type}" placeholder="e.g., Cessna 172">
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 8px; padding-left: 30px;">
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                    <input type="radio" name="csv-rate-type-${index}" value="wet" checked onchange="toggleCSVRateType(${index})">
                    <span style="font-size: 0.9em;">Wet Rate</span>
                </label>
                <label style="display: flex; align-items: center; gap: 5px; cursor: pointer;">
                    <input type="radio" name="csv-rate-type-${index}" value="dry" onchange="toggleCSVRateType(${index})">
                    <span style="font-size: 0.9em;">Dry Rate</span>
                </label>
            </div>
            <div class="csv-aircraft-rates">
                <div id="csv-wet-section-${index}">
                    <label style="font-size: 0.9em; color: #666;">Wet Rate ($/hr)</label>
                    <input type="number" class="input-field" id="csv-wet-${index}" placeholder="150" min="0">
                </div>
                <div id="csv-dry-section-${index}" style="display: none;">
                    <label style="font-size: 0.9em; color: #666;">Dry Rate ($/hr)</label>
                    <input type="number" class="input-field" id="csv-dry-${index}" placeholder="120" min="0">
                </div>
                <div id="csv-fuel-section-${index}" style="display: none;">
                    <div style="margin-bottom: 8px;">
                        <label style="font-size: 0.9em; color: #666;">Fuel Price ($/gal)</label>
                        <input type="number" class="input-field" id="csv-fuel-price-${index}" placeholder="6" min="0" step="0.10">
                    </div>
                    <div>
                        <label style="font-size: 0.9em; color: #666;">Fuel Burn (gal/hr)</label>
                        <input type="number" class="input-field" id="csv-fuel-burn-${index}" placeholder="8" min="0" step="0.5">
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    modal.style.display = 'flex';
}

/**
 * Toggle between wet and dry rate for CSV import
 */
function toggleCSVRateType(index) {
    const rateType = document.querySelector(`input[name="csv-rate-type-${index}"]:checked`).value;
    const wetSection = document.getElementById(`csv-wet-section-${index}`);
    const drySection = document.getElementById(`csv-dry-section-${index}`);
    const fuelSection = document.getElementById(`csv-fuel-section-${index}`);

    if (rateType === 'wet') {
        wetSection.style.display = 'block';
        drySection.style.display = 'none';
        fuelSection.style.display = 'none';
        // Clear dry rate fields
        document.getElementById(`csv-dry-${index}`).value = '';
        document.getElementById(`csv-fuel-price-${index}`).value = '';
        document.getElementById(`csv-fuel-burn-${index}`).value = '';
    } else {
        wetSection.style.display = 'none';
        drySection.style.display = 'block';
        fuelSection.style.display = 'block';
        // Clear wet rate field
        document.getElementById(`csv-wet-${index}`).value = '';
    }
}

/**
 * Close CSV import modal
 */
function closeCSVImportModal() {
    document.getElementById('csvImportModal').style.display = 'none';
    csvAircraftData = [];
}

/**
 * Import selected aircraft from CSV
 */
function importSelectedAircraft() {
    let imported = 0;

    csvAircraftData.forEach((aircraft, index) => {
        const checkbox = document.getElementById(`csv-check-${index}`);
        if (!checkbox.checked) return;

        // Get edited aircraft name
        const aircraftName = document.getElementById(`csv-name-${index}`).value.trim();
        if (!aircraftName) {
            return; // Skip if no name entered
        }

        // Determine rate type for this aircraft
        const rateType = document.querySelector(`input[name="csv-rate-type-${index}"]:checked`).value;

        let aircraftData = {
            type: aircraftName,
            registration: aircraft.registration,
            wetRate: 0,
            dryRate: 0,
            fuelPrice: 0,
            fuelBurn: 0,
            source: 'foreflight',
            notes: `Imported from ForeFlight (${aircraft.totalTime.toFixed(1)} hrs logged)`
        };

        if (rateType === 'wet') {
            aircraftData.wetRate = parseFloat(document.getElementById(`csv-wet-${index}`).value) || 0;
            if (aircraftData.wetRate === 0) {
                return; // Skip if no wet rate entered
            }
        } else {
            aircraftData.dryRate = parseFloat(document.getElementById(`csv-dry-${index}`).value) || 0;
            aircraftData.fuelPrice = parseFloat(document.getElementById(`csv-fuel-price-${index}`).value) || 0;
            aircraftData.fuelBurn = parseFloat(document.getElementById(`csv-fuel-burn-${index}`).value) || 0;

            if (aircraftData.dryRate === 0 || aircraftData.fuelPrice === 0 || aircraftData.fuelBurn === 0) {
                return; // Skip if dry rate or fuel info not complete
            }
        }

        try {
            AircraftAPI.addAircraft(aircraftData);
            imported++;
        } catch (error) {
            console.error('Error importing aircraft:', error);
        }
    });

    if (imported > 0) {
        AircraftAPI.saveConfig();
        refreshAircraftDropdown();
        alert(`Imported ${imported} aircraft successfully!`);
    } else {
        alert('No aircraft imported. Please enter rates for the aircraft you want to import.');
    }

    closeCSVImportModal();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Wait for AircraftAPI to initialize
    setTimeout(initAircraftUI, 100);
});
