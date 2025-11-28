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
    console.log('initAircraftUI() called - starting initialization');

    try {
        // Load aircraft list into dropdown
        console.log('Calling refreshAircraftDropdown()...');
        refreshAircraftDropdown();

        // Load default aircraft if exists
        console.log('Checking for default aircraft...');
        const defaultAircraft = AircraftAPI.getDefaultAircraft();
        if (defaultAircraft) {
            console.log('Loading default aircraft:', defaultAircraft);
            loadAircraftIntoForm(defaultAircraft);
        } else {
            console.log('No default aircraft found');
        }

        // Initialize FAA lookup checkbox and check if ARLA API is available
        console.log('About to call checkARLAAvailability()...');
        checkARLAAvailability();
        console.log('checkARLAAvailability() called');
    } catch (error) {
        console.error('Error in initAircraftUI():', error);
    }
}

/**
 * Check if ARLA API is available and update UI accordingly
 */
async function checkARLAAvailability() {
    console.log('Checking ARLA API availability...');

    const checkbox = document.getElementById('enableFAALookup');
    const statusDiv = document.getElementById('faaLookupStatus');
    const label = document.getElementById('faaLookupLabel');

    if (!checkbox) {
        console.error('FAA lookup checkbox not found');
        return;
    }

    // Check if ARLA API endpoint is available with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.log('ARLA API check timeout after 2 seconds');
        controller.abort();
    }, 2000); // 2 second timeout

    try {
        console.log('Fetching /arla-api/api/v0/health...');
        const response = await fetch('/arla-api/api/v0/health', {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            // ARLA API is available - enable the checkbox
            console.log('ARLA API is available');
            enableARLACheckbox(checkbox, label, statusDiv);
        } else {
            // API responded but not healthy
            console.log('ARLA API responded but not healthy:', response.status);
            disableARLACheckbox(checkbox, label, statusDiv, 'ARLA API is not responding correctly');
        }
    } catch (error) {
        clearTimeout(timeoutId);
        // ARLA API is not available (ENABLE_FAA_LOOKUP=false or network error)
        console.log('ARLA API not available:', error.name, error.message);
        disableARLACheckbox(checkbox, label, statusDiv, 'FAA lookup is not enabled in this deployment');
    }
}

/**
 * Enable the ARLA checkbox
 */
function enableARLACheckbox(checkbox, label, statusDiv) {
    checkbox.disabled = false;

    // Restore label styling
    if (label) {
        label.style.opacity = '1';
        label.style.cursor = 'pointer';
    }

    // Check saved state
    if (typeof AircraftLookup !== 'undefined') {
        checkbox.checked = AircraftLookup.isOnlineLookupEnabled();
    }

    // Hide status message
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

/**
 * Disable the ARLA checkbox with visual feedback
 */
function disableARLACheckbox(checkbox, label, statusDiv, message) {
    // Checkbox is already disabled in HTML, just update message
    checkbox.checked = false;

    // Clear any saved setting from localStorage
    if (typeof AircraftLookup !== 'undefined') {
        AircraftLookup.setOnlineLookupEnabled(false);
    }

    // Show informational message
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#f1f5f9';
        statusDiv.style.color = '#64748b';
        statusDiv.style.border = '1px solid #cbd5e1';
        statusDiv.innerHTML = `ℹ <strong>Feature Not Available</strong><br>${message}. Aircraft data will be used from ForeFlight CSV only.`;
    }
}

/**
 * Toggle FAA aircraft lookup on/off
 */
function toggleFAALookup() {
    if (typeof AircraftLookup === 'undefined') return;

    const checkbox = document.getElementById('enableFAALookup');
    const statusDiv = document.getElementById('faaLookupStatus');
    const enabled = checkbox.checked;

    AircraftLookup.setOnlineLookupEnabled(enabled);

    // Show inline status message
    if (statusDiv) {
        if (enabled) {
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#d1fae5';
            statusDiv.style.color = '#065f46';
            statusDiv.style.border = '1px solid #6ee7b7';
            statusDiv.innerHTML = '✓ <strong>FAA Lookup Enabled</strong><br>Aircraft details will be automatically looked up from the FAA registry during import.';
        } else {
            statusDiv.style.display = 'block';
            statusDiv.style.background = '#e0e7ff';
            statusDiv.style.color = '#3730a3';
            statusDiv.style.border = '1px solid #a5b4fc';
            statusDiv.innerHTML = 'ℹ <strong>FAA Lookup Disabled</strong><br>Aircraft details will be used from your ForeFlight logbook only.';
        }

        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
        }, 4000);
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
        // Format: [TailNumber] Type or just Type if no tail number
        if (a.registration) {
            option.textContent = '[' + a.registration + '] ' + a.type;
        } else {
            option.textContent = a.type;
        }
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

    // Show/hide "Set as Default" button
    const defaultAircraft = AircraftAPI.getDefaultAircraft();
    const isDefault = defaultAircraft && defaultAircraft.id === aircraft.id;
    const setDefaultBtn = document.getElementById('setDefaultBtn');
    if (isDefault) {
        setDefaultBtn.style.display = 'none';
    } else {
        setDefaultBtn.style.display = 'inline-block';
    }

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

    // Hide delete and set default buttons
    document.getElementById('deleteAircraftBtn').style.display = 'none';
    document.getElementById('setDefaultBtn').style.display = 'none';

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

        // Reload to update button visibility (in case it became default)
        const reloaded = AircraftAPI.getAircraft(saved.id);
        loadAircraftIntoForm(reloaded);

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
 * Set current aircraft as default
 */
function setAsDefaultAircraft() {
    if (!currentAircraftId) return;

    try {
        AircraftAPI.setDefaultAircraft(currentAircraftId);
        AircraftAPI.saveConfig();

        // Refresh UI
        refreshAircraftDropdown();

        // Reload the aircraft to update button visibility
        const aircraft = AircraftAPI.getAircraft(currentAircraftId);
        if (aircraft) {
            loadAircraftIntoForm(aircraft);
        }

        alert('Default aircraft updated!');

    } catch (error) {
        alert('Error setting default: ' + error.message);
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
async function showCSVImportModal(parsedData, aircraftTableData) {
    console.log('showCSVImportModal called');
    console.log('parsedData length:', parsedData?.length);
    console.log('aircraftTableData:', aircraftTableData);

    // Convert aircraftData object to array if needed
    let aircraftArray = null;
    if (aircraftTableData && typeof aircraftTableData === 'object' && !Array.isArray(aircraftTableData)) {
        // Convert object with AircraftID keys to array
        aircraftArray = Object.keys(aircraftTableData).map(id => {
            if (id === 'PFCMFD01') {
                console.log(`PFCMFD01 data:`, aircraftTableData[id]);
            }
            return {
                ...aircraftTableData[id],
                AircraftID: id,
                Make: aircraftTableData[id].make || '',
                Model: aircraftTableData[id].model || '',
                Year: aircraftTableData[id].year || '',
                'equipType (FAA)': aircraftTableData[id].equipType || ''
            };
        });
        console.log('Converted object to array:', aircraftArray);
    } else if (Array.isArray(aircraftTableData)) {
        aircraftArray = aircraftTableData;
        console.log('Already an array:', aircraftArray);
    }

    console.log('Calling AircraftAPI.importFromCSV...');
    csvAircraftData = AircraftAPI.importFromCSV(parsedData, aircraftArray);
    console.log('csvAircraftData result:', csvAircraftData);

    if (csvAircraftData.length === 0) {
        alert('No aircraft found in CSV file');
        return;
    }

    const modal = document.getElementById('csvImportModal');
    const list = document.getElementById('csvAircraftList');
    const count = document.getElementById('csvAircraftCount');

    count.textContent = csvAircraftData.length;

    // Helper function to clean make/model names
    function cleanName(name) {
        return name
            .replace(/\s+Aircraft\s*/gi, ' ')  // Remove "Aircraft"
            .replace(/\bAICSA\b/gi, 'Piper')   // Replace AICSA with Piper
            .trim();
    }

    // Perform FAA lookups for US aircraft if enabled
    if (typeof AircraftLookup !== 'undefined' && AircraftLookup.isOnlineLookupEnabled()) {
        console.log('Performing FAA lookups for aircraft...');
        for (let i = 0; i < csvAircraftData.length; i++) {
            const aircraft = csvAircraftData[i];
            if (AircraftLookup.isUSAircraft(aircraft.registration)) {
                try {
                    const lookupData = await AircraftLookup.lookupByTailNumber(aircraft.registration);
                    if (lookupData) {
                        // Override with FAA data if found
                        csvAircraftData[i].faaYear = lookupData.year || aircraft.year;
                        csvAircraftData[i].faaMake = lookupData.make || aircraft.make;
                        csvAircraftData[i].faaModel = lookupData.model || aircraft.model;
                        csvAircraftData[i].dataSource = lookupData.source; // 'faa' or 'cache'
                        console.log(`FAA lookup for ${aircraft.registration}:`, lookupData);
                    }
                } catch (error) {
                    console.warn(`Failed to lookup ${aircraft.registration}:`, error);
                }
            }
        }
    }

    list.innerHTML = csvAircraftData.map((a, index) => {
        // Use FAA data if available, otherwise use ForeFlight data
        const year = a.faaYear || a.year || '';
        const make = a.faaMake || a.make || '';
        const model = a.faaModel || a.model || '';
        const dataSource = a.dataSource || 'foreflight';

        const cleanMake = cleanName(make);
        const cleanModel = cleanName(model);

        // Check if this is a simulator (no make and no model, but has type)
        const isSimulator = !cleanMake && !cleanModel && a.type;

        // For simulators with no make/model, use the type field as the model
        const displayModel = cleanModel || (isSimulator ? a.type : '');
        const displayMake = cleanMake || (isSimulator ? 'N/A' : '');
        const displayYear = year || (isSimulator ? 'N/A' : '');

        // Create data source badge
        let sourceBadge = '';
        if (dataSource === 'faa') {
            sourceBadge = '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">✓ FAA Verified</span>';
        } else if (dataSource === 'cache') {
            sourceBadge = '<span style="background: #6366f1; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">✓ FAA Cached</span>';
        } else {
            sourceBadge = '<span style="background: #94a3b8; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">ForeFlight</span>';
        }

        return `
        <div class="csv-aircraft-item">
            <div class="csv-aircraft-header">
                <input type="checkbox" class="csv-aircraft-checkbox" id="csv-check-${index}" checked>
                <div class="csv-aircraft-info">
                    <div class="csv-aircraft-stats">${a.registration} - ${a.totalTime.toFixed(1)} hours logged${sourceBadge}</div>
                </div>
            </div>
            <div style="padding-left: 30px; margin-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <label style="font-size: 0.9em; color: #666;">Tail Number</label>
                    <input type="text" class="input-field" id="csv-tail-${index}" value="${a.registration}" placeholder="e.g., N12345" style="font-size: 1.1em; padding: 10px;">
                </div>
                <div>
                    <label style="font-size: 0.9em; color: #666;">Year</label>
                    <input type="text" class="input-field" id="csv-year-${index}" value="${displayYear}" placeholder="e.g., 1981" style="font-size: 1.1em; padding: 10px;">
                </div>
                <div>
                    <label style="font-size: 0.9em; color: #666;">Make</label>
                    <input type="text" class="input-field" id="csv-make-${index}" value="${displayMake}" placeholder="e.g., Cessna" style="font-size: 1.1em; padding: 10px;">
                </div>
                <div>
                    <label style="font-size: 0.9em; color: #666;">Model</label>
                    <input type="text" class="input-field" id="csv-model-${index}" value="${displayModel}" placeholder="e.g., 172 Skyhawk" style="font-size: 1.1em; padding: 10px;">
                </div>
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
                    <input type="number" class="input-field" id="csv-wet-${index}" value="150" min="0" style="background: #fffacd;">
                </div>
                <div id="csv-dry-section-${index}" style="display: none;">
                    <label style="font-size: 0.9em; color: #666;">Dry Rate ($/hr)</label>
                    <input type="number" class="input-field" id="csv-dry-${index}" value="120" min="0" style="background: #fffacd;">
                </div>
                <div id="csv-fuel-section-${index}" style="display: none;">
                    <div style="margin-bottom: 8px;">
                        <label style="font-size: 0.9em; color: #666;">Fuel Price ($/gal)</label>
                        <input type="number" class="input-field" id="csv-fuel-price-${index}" value="6" min="0" step="0.10" style="background: #fffacd;">
                    </div>
                    <div>
                        <label style="font-size: 0.9em; color: #666;">Fuel Burn (gal/hr)</label>
                        <input type="number" class="input-field" id="csv-fuel-burn-${index}" value="8" min="0" step="0.5" style="background: #fffacd;">
                    </div>
                </div>
            </div>
            <div style="padding-left: 30px; margin-top: 10px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9em;">
                    <input type="checkbox" id="csv-default-${index}" ${index === 0 ? 'checked' : ''} onchange="handleCSVDefaultChange(${index})">
                    <span>★ Set as default aircraft</span>
                </label>
            </div>
        </div>
        `;
    }).join('');

    modal.style.display = 'flex';
}

/**
 * Handle "Set as default" checkbox change - only one can be checked at a time
 */
function handleCSVDefaultChange(index) {
    const currentCheckbox = document.getElementById(`csv-default-${index}`);

    if (currentCheckbox.checked) {
        // Uncheck all other default checkboxes
        csvAircraftData.forEach((_, i) => {
            if (i !== index) {
                const otherCheckbox = document.getElementById(`csv-default-${i}`);
                if (otherCheckbox) {
                    otherCheckbox.checked = false;
                }
            }
        });
    }
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
    let skipped = 0;
    const skippedReasons = [];
    let defaultAircraftId = null;

    csvAircraftData.forEach((aircraft, index) => {
        const checkbox = document.getElementById(`csv-check-${index}`);
        if (!checkbox.checked) {
            console.log(`Skipping ${aircraft.registration}: not checked`);
            return;
        }

        // Get edited aircraft details from separate fields
        const tailNumber = document.getElementById(`csv-tail-${index}`).value.trim();
        const year = document.getElementById(`csv-year-${index}`).value.trim();
        const make = document.getElementById(`csv-make-${index}`).value.trim();
        const model = document.getElementById(`csv-model-${index}`).value.trim();

        if (!tailNumber) {
            skipped++;
            skippedReasons.push(`${aircraft.registration}: No tail number entered`);
            console.log(`Skipping ${aircraft.registration}: no tail number`);
            return;
        }

        // Build aircraft type/name from components
        let aircraftType = '';
        if (make && model) {
            aircraftType = `${make} ${model}`;
        } else if (make) {
            aircraftType = make;
        } else if (model) {
            aircraftType = model;
        } else {
            skipped++;
            skippedReasons.push(`${tailNumber}: No make or model entered`);
            console.log(`Skipping ${tailNumber}: no make or model`);
            return;
        }

        // Determine rate type for this aircraft
        const rateType = document.querySelector(`input[name="csv-rate-type-${index}"]:checked`).value;

        let aircraftData = {
            type: aircraftType,
            registration: tailNumber,
            wetRate: 0,
            dryRate: 0,
            fuelPrice: 0,
            fuelBurn: 0,
            source: 'foreflight',
            notes: `Imported from ForeFlight (${aircraft.totalTime.toFixed(1)} hrs logged)${year ? ` - ${year}` : ''}`
        };

        if (rateType === 'wet') {
            aircraftData.wetRate = parseFloat(document.getElementById(`csv-wet-${index}`).value) || 0;
            if (aircraftData.wetRate === 0) {
                skipped++;
                skippedReasons.push(`${tailNumber}: No wet rate entered`);
                console.log(`Skipping ${tailNumber}: no wet rate`);
                return;
            }
        } else {
            aircraftData.dryRate = parseFloat(document.getElementById(`csv-dry-${index}`).value) || 0;
            aircraftData.fuelPrice = parseFloat(document.getElementById(`csv-fuel-price-${index}`).value) || 0;
            aircraftData.fuelBurn = parseFloat(document.getElementById(`csv-fuel-burn-${index}`).value) || 0;

            if (aircraftData.dryRate === 0 || aircraftData.fuelPrice === 0 || aircraftData.fuelBurn === 0) {
                skipped++;
                skippedReasons.push(`${tailNumber}: Incomplete dry rate info`);
                console.log(`Skipping ${tailNumber}: incomplete dry rate info`);
                return;
            }
        }

        try {
            // Check if aircraft with this registration already exists
            const allAircraft = AircraftAPI.getAllAircraft();
            console.log(`Checking for existing aircraft. Total aircraft:`, allAircraft.length);
            const existingAircraft = allAircraft.find(a => {
                console.log(`  Comparing: "${a.registration}" === "${tailNumber}"`, a.registration === tailNumber);
                return a.registration === tailNumber;
            });

            let savedAircraft;
            if (existingAircraft) {
                // Update existing aircraft instead of adding new
                console.log(`Updating existing aircraft: ${tailNumber} (ID: ${existingAircraft.id})`);
                savedAircraft = AircraftAPI.updateAircraft(existingAircraft.id, aircraftData);
                imported++;
                console.log(`Updated ${tailNumber} successfully`);
            } else {
                // Add new aircraft
                console.log(`Adding new aircraft: ${tailNumber}`);
                savedAircraft = AircraftAPI.addAircraft(aircraftData);
                imported++;
                console.log(`Imported ${tailNumber} successfully`);
            }

            // Check if this aircraft should be set as default
            const isDefault = document.getElementById(`csv-default-${index}`);
            if (isDefault && isDefault.checked) {
                defaultAircraftId = savedAircraft.id;
                console.log(`Marked ${tailNumber} (ID: ${savedAircraft.id}) to be set as default`);
            }
        } catch (error) {
            console.error(`Error importing aircraft ${tailNumber}:`, error);
            skipped++;
            skippedReasons.push(`${tailNumber}: ${error.message}`);
        }
    });

    console.log('Import summary:', { imported, skipped, reasons: skippedReasons, defaultAircraftId });

    if (imported > 0) {
        // Set default aircraft if one was selected
        if (defaultAircraftId) {
            console.log(`Setting default aircraft to ID: ${defaultAircraftId}`);
            AircraftAPI.setDefaultAircraft(defaultAircraftId);
        }

        AircraftAPI.saveConfig();
        refreshAircraftDropdown();
        let message = `Imported ${imported} aircraft successfully!`;
        if (skipped > 0) {
            message += `\n\nSkipped ${skipped} aircraft (missing rental rates).`;
        }
        alert(message);
    } else {
        alert('No aircraft imported.\n\nPlease enter rental rates (wet or dry) for the aircraft you want to import.\n\nSkipped:\n' + skippedReasons.join('\n'));
    }

    closeCSVImportModal();
}

// Initialize on page load
console.log('aircraft-ui.js: Adding DOMContentLoaded listener');
document.addEventListener('DOMContentLoaded', function() {
    console.log('aircraft-ui.js: DOMContentLoaded fired');
    // Wait for AircraftAPI to initialize
    console.log('aircraft-ui.js: Setting timeout to call initAircraftUI in 100ms');
    setTimeout(function() {
        console.log('aircraft-ui.js: Timeout fired, calling initAircraftUI now');
        initAircraftUI();
    }, 100);
});
console.log('aircraft-ui.js: Script loaded');
