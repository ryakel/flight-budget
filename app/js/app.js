var budgetChart = null;
var currentHours = {};
var aircraftData = {};
var preventAutoFill = false;
var defaultAircraft = [
    { id: 'PA28-151', rate: 165, type: 'wet', fuelPrice: 6, fuelBurn: 8 },
    { id: 'C-172', rate: 165, type: 'wet', fuelPrice: 6, fuelBurn: 8 },
    { id: 'C-R182', rate: 235, type: 'wet', fuelPrice: 6, fuelBurn: 8 },
    { id: 'PA28-181', rate: 105, type: 'dry', fuelPrice: 6, fuelBurn: 11.5 }
];

function toggleMenu() {
    var menu = document.getElementById('menuDropdown');
    menu.classList.toggle('open');
}

function saveBudget() {
    var budget = {
        version: '1.0',
        savedDate: new Date().toISOString(),
        currentHours: currentHours,
        settings: {
            targetCert: document.getElementById('targetCert').value,
            aircraft: [],
            lessonsPerWeek: parseFloat(document.getElementById('lessonsPerWeek').value) || 2,
            instructorRate: parseFloat(document.getElementById('instructorRate').value) || 60,
            simulatorRate: parseFloat(document.getElementById('simulatorRate').value) || 105,
            groundHours: parseFloat(document.getElementById('groundHours').value) || 0,
            headsetCost: parseFloat(document.getElementById('headsetCost').value) || 0,
            booksCost: parseFloat(document.getElementById('booksCost').value) || 0,
            bagCost: parseFloat(document.getElementById('bagCost').value) || 0,
            medicalCost: parseFloat(document.getElementById('medicalCost').value) || 300,
            knowledgeCost: parseFloat(document.getElementById('knowledgeCost').value) || 250,
            checkrideCost: parseFloat(document.getElementById('checkrideCost').value) || 1000,
            insuranceCost: parseFloat(document.getElementById('insuranceCost').value) || 1150,
            foreflightCost: parseFloat(document.getElementById('foreflightCost').value) || 275,
            onlineSchoolCost: parseFloat(document.getElementById('onlineSchoolCost').value) || 0,
            contingencyPercent: parseFloat(document.getElementById('contingencyPercent').value) || 20
        }
    };

    var aircraftItems = document.querySelectorAll('#aircraftList .aircraft-item');
    for (var i = 0; i < aircraftItems.length; i++) {
        var item = aircraftItems[i];
        var aircraft = {
            id: item.querySelector('.aircraft-id').value,
            rateType: item.querySelector('.aircraft-rate-type').value,
            baseRate: parseFloat(item.querySelector('.aircraft-base-rate').value) || 0,
            fuelPrice: parseFloat(item.querySelector('.fuel-price').value) || 0,
            fuelBurn: parseFloat(item.querySelector('.fuel-burn').value) || 0,
            dualHours: parseFloat(item.querySelector('.aircraft-dual-hours').value) || 0,
            soloHours: parseFloat(item.querySelector('.aircraft-solo-hours').value) || 0,
            familyHours: parseFloat(item.querySelector('.aircraft-family-hours').value) || 0
        };
        budget.settings.aircraft.push(aircraft);
    }

    var jsonStr = JSON.stringify(budget, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'flight-training-budget-' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    document.getElementById('menuDropdown').classList.remove('open');
}

function loadBudget(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var budget = JSON.parse(e.target.result);
            
            if (!budget.settings) {
                alert('Invalid budget file format.');
                return;
            }

            if (budget.currentHours) {
                currentHours = budget.currentHours;
                
                if (currentHours.totalTime && currentHours.totalTime > 0) {
                    document.getElementById('logbookSummary').style.display = 'block';
                    document.getElementById('summaryTotalTime').textContent = currentHours.totalTime.toFixed(1);
                    document.getElementById('summaryPICTime').textContent = currentHours.picTime.toFixed(1);
                    document.getElementById('summaryXCTime').textContent = currentHours.picXC.toFixed(1);
                    document.getElementById('summaryDualTime').textContent = currentHours.dualReceived.toFixed(1);
                    document.getElementById('summaryInstrumentTime').textContent = currentHours.instrumentTotal.toFixed(1);
                    document.getElementById('summaryActualInstrument').textContent = currentHours.actualInstrument.toFixed(1);
                    document.getElementById('summarySimulatedInstrument').textContent = currentHours.simulatedInstrument.toFixed(1);
                    
                    var simTimeElement = document.getElementById('summarySimTime');
                    simTimeElement.textContent = currentHours.simInstrumentTime.toFixed(1);
                    
                    var container = document.getElementById('summarySimTimeContainer');
                    if (container && !container.querySelector('.sim-max-text')) {
                        var maxText = document.createElement('span');
                        maxText.className = 'sim-max-text';
                        maxText.style.fontSize = '0.6em';
                        maxText.style.color = '#999';
                        maxText.style.marginLeft = '8px';
                        maxText.textContent = '/ 20 max';
                        container.appendChild(maxText);
                    }
                    
                    document.getElementById('summaryInstrumentDualAirplane').textContent = currentHours.instrumentDualAirplane.toFixed(1);
                    document.getElementById('summaryRecentInstrument').textContent = currentHours.recentInstrument.toFixed(1);
                }
            } else {
                currentHours = {};
            }

            document.getElementById('aircraftList').innerHTML = '';
            
            var settings = budget.settings;
            document.getElementById('targetCert').value = settings.targetCert || '';
            document.getElementById('lessonsPerWeek').value = settings.lessonsPerWeek || 2;
            document.getElementById('instructorRate').value = settings.instructorRate || 60;
            document.getElementById('simulatorRate').value = settings.simulatorRate || 105;
            document.getElementById('groundHours').value = settings.groundHours || 0;
            document.getElementById('headsetCost').value = settings.headsetCost || 0;
            document.getElementById('booksCost').value = settings.booksCost || 0;
            document.getElementById('bagCost').value = settings.bagCost || 0;
            document.getElementById('medicalCost').value = settings.medicalCost || 300;
            document.getElementById('knowledgeCost').value = settings.knowledgeCost || 250;
            document.getElementById('checkrideCost').value = settings.checkrideCost || 1000;
            document.getElementById('insuranceCost').value = settings.insuranceCost || 1150;
            document.getElementById('foreflightCost').value = settings.foreflightCost || 275;
            document.getElementById('onlineSchoolCost').value = settings.onlineSchoolCost || 0;
            document.getElementById('contingencyPercent').value = settings.contingencyPercent || 20;

            if (settings.aircraft && settings.aircraft.length > 0) {
                for (var i = 0; i < settings.aircraft.length; i++) {
                    var ac = settings.aircraft[i];
                    addAircraft({
                        id: ac.id,
                        rate: ac.baseRate,
                        type: ac.rateType,
                        fuelPrice: ac.fuelPrice,
                        fuelBurn: ac.fuelBurn
                    });
                    
                    var items = document.querySelectorAll('#aircraftList .aircraft-item');
                    var item = items[items.length - 1];
                    if (item) {
                        item.querySelector('.aircraft-dual-hours').value = ac.dualHours || 0;
                        item.querySelector('.aircraft-solo-hours').value = ac.soloHours || 0;
                        item.querySelector('.aircraft-family-hours').value = ac.familyHours || 0;
                    }
                }
            } else {
                for (var i = 0; i < defaultAircraft.length; i++) {
                    addAircraft(defaultAircraft[i]);
                }
            }

            calculate();
            
            preventAutoFill = true;
            updateDisplay();
            preventAutoFill = false;
            
            document.getElementById('menuDropdown').classList.remove('open');
            document.getElementById('budgetFileInput').value = '';
            
            alert('Budget loaded successfully!');
        } catch (error) {
            alert('Error loading budget file: ' + error.message);
            document.getElementById('budgetFileInput').value = '';
        }
    };
    reader.readAsText(file);
}

function init() {
    for (var i = 0; i < defaultAircraft.length; i++) {
        addAircraft(defaultAircraft[i]);
    }
    
    document.getElementById('addAircraftBtn').addEventListener('click', function() { addAircraft(); });
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    document.getElementById('logbookFile').addEventListener('change', parseLogbook);
    document.getElementById('targetCert').addEventListener('change', updateDisplay);
    
    // Hamburger menu
    document.getElementById('hamburgerMenu').addEventListener('click', toggleMenu);
    document.getElementById('saveBudgetBtn').addEventListener('click', saveBudget);
    document.getElementById('loadBudgetBtn').addEventListener('click', function() {
        document.getElementById('budgetFileInput').click();
    });
    document.getElementById('budgetFileInput').addEventListener('change', loadBudget);
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        var menu = document.getElementById('menuDropdown');
        var hamburger = document.getElementById('hamburgerMenu');
        if (!menu.contains(e.target) && !hamburger.contains(e.target)) {
            menu.classList.remove('open');
        }
    });
    
    var instrumentHeader = document.getElementById('instrumentDetailsHeader');
    if (instrumentHeader) {
        instrumentHeader.addEventListener('click', function() {
            var content = document.getElementById('instrumentDetails');
            var icon = document.getElementById('instrumentDetailsIcon');
            if (content) content.classList.toggle('open');
            if (icon) icon.classList.toggle('open');
        });
    }
    
    var inputs = document.querySelectorAll('.input-field');
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('input', calculate);
    }
    
    document.getElementById('aircraftList').addEventListener('change', function(e) {
        if (e.target.classList.contains('aircraft-rate-type')) {
            var aircraftItem = e.target.closest('.aircraft-item');
            var fuelInputs = aircraftItem.querySelector('.fuel-inputs');
            if (e.target.value === 'wet') {
                fuelInputs.classList.add('hidden');
            } else {
                fuelInputs.classList.remove('hidden');
            }
            calculate();
        }
    });
    
    document.getElementById('aircraftList').addEventListener('input', calculate);
    calculate();
}

function exportToPDF() {
    var cert = document.getElementById('targetCert').value;
    var filename = 'flight-training-budget-' + (cert || 'general') + '.pdf';
    
    var element = document.querySelector('.main-container');
    var opt = {
        margin: 0.5,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    var btn = document.getElementById('exportPdfBtn');
    var originalText = btn.textContent;
    btn.textContent = 'Generating PDF...';
    btn.disabled = true;
    
    html2pdf().set(opt).from(element).save().then(function() {
        btn.textContent = originalText;
        btn.disabled = false;
    }).catch(function(error) {
        console.error('PDF generation error:', error);
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Error generating PDF. Please try again.');
    });
}

function addAircraft(defaults) {
    defaults = defaults || null;
    var newItem = document.createElement('div');
    newItem.className = 'aircraft-item';

    var aircraftId = defaults ? defaults.id : '';
    var rateType = defaults ? defaults.type : 'wet';
    var baseRate = defaults ? defaults.rate : 120;
    var fuelPrice = defaults ? defaults.fuelPrice : 6.5;
    var fuelBurn = defaults ? defaults.fuelBurn : 8;
    
    var isDefault = defaults && (defaults.id === 'PA28-151' || defaults.id === 'C-172' || defaults.id === 'C-R182' || defaults.id === 'PA28-181');
    var showRemove = !isDefault;

    var html = '<input type="text" class="input-field aircraft-id" placeholder="Aircraft ID" value="' + aircraftId + '">';
    html += '<select class="input-field aircraft-rate-type">';
    html += '<option value="wet"' + (rateType === 'wet' ? ' selected' : '') + '>Wet</option>';
    html += '<option value="dry"' + (rateType === 'dry' ? ' selected' : '') + '>Dry</option>';
    html += '</select>';
    html += '<div class="aircraft-rate-section">';
    html += '<span style="color: #999;">$</span>';
    html += '<input type="number" class="input-field aircraft-base-rate" value="' + baseRate + '">';
    html += '<span class="input-unit">/hr</span>';
    html += '</div>';
    html += showRemove ? '<button class="btn-remove aircraft-remove">Remove</button>' : '<span></span>';
    html += '<div class="fuel-inputs' + (rateType === 'wet' ? ' hidden' : '') + '">';
    html += '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:0.9em;color:#666;">Fuel: $</span>';
    html += '<input type="number" class="input-field fuel-price" value="' + fuelPrice + '" step="0.01">';
    html += '<span class="input-unit">/gal</span></div>';
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    html += '<input type="number" class="input-field fuel-burn" value="' + fuelBurn + '" step="0.1">';
    html += '<span class="input-unit">gal/hr</span></div></div>';
    html += '<div class="aircraft-item-row2">';
    html += '<div class="hour-input-group"><label>Dual:</label><div class="hour-input-row">';
    html += '<input type="number" class="input-field hour-input aircraft-dual-hours" value="0" step="0.1"><span style="font-size:0.85em;color:#999;">hrs</span></div>';
    html += '<div class="hour-cost-display aircraft-dual-cost">$0</div></div>';
    html += '<div class="hour-input-group"><label>Solo:</label><div class="hour-input-row">';
    html += '<input type="number" class="input-field hour-input aircraft-solo-hours" value="0" step="0.1"><span style="font-size:0.85em;color:#999;">hrs</span></div>';
    html += '<div class="hour-cost-display aircraft-solo-cost">$0</div></div>';
    html += '<div class="hour-input-group"><label>Personal:</label><div class="hour-input-row">';
    html += '<input type="number" class="input-field hour-input aircraft-family-hours" value="0" step="0.1"><span style="font-size:0.85em;color:#999;">hrs</span></div>';
    html += '<div class="hour-cost-display aircraft-family-cost">$0</div></div>';
    html += '<div style="font-size:0.95em;color:#1e40af;font-weight:700;align-self:center;">Total: <span class="aircraft-total-cost">$0</span></div>';
    html += '</div>';

    newItem.innerHTML = html;
    document.getElementById('aircraftList').appendChild(newItem);

    if (showRemove) {
        newItem.querySelector('.aircraft-remove').addEventListener('click', function() {
            newItem.remove();
            calculate();
        });
    }
}

function parseLogbook(event) {
    var file = event.target.files[0];
    if (!file) return;

    var uploadArea = document.getElementById('fileUploadArea');

    // Helper function to update upload card status
    function updateUploadCard(state, title, message) {
        uploadArea.classList.remove('file-uploaded', 'file-upload-error');
        if (state === 'success') {
            uploadArea.classList.add('file-uploaded');
        } else if (state === 'error') {
            uploadArea.classList.add('file-upload-error');
        }

        var h3 = uploadArea.querySelector('h3');
        var p = uploadArea.querySelector('p');
        if (h3) h3.textContent = title;
        if (p) {
            if (message.includes('<br>')) {
                p.innerHTML = message;
            } else {
                p.textContent = message;
            }
        }
    }

    updateUploadCard('success', 'Processing...', 'Reading file...');

    var reader = new FileReader();
    reader.onerror = function(e) {
        console.error('FileReader error:', e);
        updateUploadCard('error', 'File Read Error', 'Failed to read the file. Please try again.');
        document.getElementById('logbookFile').value = '';
    };
    reader.onload = function(e) {
        console.log('File loaded, length:', e.target.result.length);
        updateUploadCard('success', 'Processing...', 'Parsing data...');

        var text = e.target.result;
        var lines = text.split('\n');
        console.log('Split into lines:', lines.length);

        // Validate ForeFlight export header
        if (lines.length === 0 || !lines[0].includes('ForeFlight Logbook Import')) {
            updateUploadCard('error', 'Invalid File Format', 'This does not appear to be a valid ForeFlight logbook export. Please export your logbook from ForeFlight and try again.');
            document.getElementById('logbookFile').value = '';
            return;
        }
        console.log('Header validation passed');

        var aircraftIdx = -1;
        var flightsIdx = -1;

        for (var i = 0; i < lines.length; i++) {
            if (lines[i].includes('Aircraft Table')) {
                aircraftIdx = i + 1;
                console.log('Found Aircraft Table at line', i, '-> aircraftIdx =', aircraftIdx);
            }
            if (lines[i].includes('Flights Table')) {
                console.log('Found Flights Table at line', i);
                // Find the actual header row (contains "Date" and "AircraftID")
                for (var j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                    if (lines[j].includes('Date') && lines[j].includes('AircraftID')) {
                        flightsIdx = j;
                        console.log('Found flights header at line', j, '-> flightsIdx =', flightsIdx);
                        break;
                    }
                }
                break;
            }
        }
        console.log('Index search complete: aircraftIdx =', aircraftIdx, ', flightsIdx =', flightsIdx);
        
        if (aircraftIdx > 0 && flightsIdx > aircraftIdx) {
            console.log('Parsing aircraft table...');
            var aircraftCsv = lines.slice(aircraftIdx, flightsIdx - 1).join('\n');
            Papa.parse(aircraftCsv, {
                header: true,
                dynamicTyping: false,
                skipEmptyLines: true,
                complete: function(results) {
                    console.log('Aircraft parse complete:', results.data.length, 'aircraft found');
                    for (var i = 0; i < results.data.length; i++) {
                        var aircraft = results.data[i];
                        if (aircraft.AircraftID) {
                            aircraftData[aircraft.AircraftID] = {
                                equipType: aircraft['equipType (FAA)'] || '',
                                aircraftClass: aircraft['aircraftClass (FAA)'] || '',
                                make: aircraft.Make || '',
                                model: aircraft.Model || '',
                                year: aircraft.Year || ''
                            };
                        }
                    }
                },
                error: function(error) {
                    console.error('Error parsing aircraft table:', error);
                }
            });
        }

        if (flightsIdx === -1) {
            updateUploadCard('error', 'Invalid File Format', 'Could not find Flights Table in CSV. Make sure this is a ForeFlight logbook export.');
            document.getElementById('logbookFile').value = '';
            return;
        }

        console.log('Parsing flights table...');
        Papa.parse(lines.slice(flightsIdx).join('\n'), {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                console.log('Flights parse complete:', results.data.length, 'rows found');
                var validFlights = [];
                var actualFlights = 0;
                var simFlights = 0;
                
                for (var i = 0; i < results.data.length; i++) {
                    var row = results.data[i];
                    // Only count entries with a date AND actual time logged
                    if (row.Date && (row.TotalTime > 0 || row.SimulatedFlight > 0)) {
                        validFlights.push(row);
                        
                        // Check if it's a simulator flight
                        var aircraftId = row.AircraftID || '';
                        var isSimulator = false;
                        if (aircraftData[aircraftId]) {
                            var equipType = (aircraftData[aircraftId].equipType || '').toLowerCase();
                            isSimulator = equipType === 'batd' || equipType === 'aatd' || equipType === 'ftd';
                        }
                        
                        if (isSimulator) {
                            simFlights++;
                        } else {
                            actualFlights++;
                        }
                    }
                }
                
                if (validFlights.length === 0) {
                    updateUploadCard('error', 'No Flights Found', 'The file was parsed but no valid flights were found. Please check your ForeFlight export.');
                    document.getElementById('logbookFile').value = '';
                    return;
                }
                
                processLogbook(validFlights);

                // Create detailed message showing both actual and simulator flights
                var message = 'Processed ' + actualFlights + ' flight' + (actualFlights !== 1 ? 's' : '');
                if (simFlights > 0) {
                    message += ' and ' + simFlights + ' simulator session' + (simFlights !== 1 ? 's' : '');
                }
                message += '.<br>Select a certification to auto-fill remaining hours needed.';
                updateUploadCard('success', 'Logbook Imported: ' + file.name, message);

                // Prompt to import aircraft from CSV
                if (typeof showCSVImportModal === 'function') {
                    setTimeout(function() {
                        showAircraftImportPrompt(validFlights, aircraftData);
                    }, 500);
                }
            },
            error: function(error) {
                console.error('Error parsing flights table:', error);
                updateUploadCard('error', 'Error Parsing File', 'Error: ' + error.message);
                document.getElementById('logbookFile').value = '';
            }
        });
    };
    console.log('Starting to read file:', file.name, 'Size:', file.size, 'bytes');
    reader.readAsText(file);
}

// Store data for aircraft import prompt
var pendingAircraftImportData = null;

function showAircraftImportPrompt(validFlights, aircraftData) {
    // Store data for later use
    pendingAircraftImportData = { validFlights: validFlights, aircraftData: aircraftData };

    // Show the prompt modal
    document.getElementById('aircraftImportPromptModal').style.display = 'flex';
}

function closeAircraftImportPrompt() {
    document.getElementById('aircraftImportPromptModal').style.display = 'none';
    pendingAircraftImportData = null;
}

function confirmAircraftImport() {
    console.log('confirmAircraftImport called');
    console.log('pendingAircraftImportData:', pendingAircraftImportData);
    console.log('typeof showCSVImportModal:', typeof showCSVImportModal);

    // Save the data BEFORE closing the prompt (which clears it)
    const savedData = pendingAircraftImportData;

    closeAircraftImportPrompt();

    if (savedData && typeof showCSVImportModal === 'function') {
        console.log('Calling showCSVImportModal with:', savedData.validFlights.length, 'flights');
        showCSVImportModal(savedData.validFlights, savedData.aircraftData);
    } else {
        console.error('Cannot call showCSVImportModal:', {
            hasPendingData: !!savedData,
            functionExists: typeof showCSVImportModal === 'function'
        });
    }
}

function processLogbook(data) {
    currentHours = {
        totalTime: 0, picTime: 0, picXC: 0, xcTime: 0, dualReceived: 0,
        instrumentTotal: 0, actualInstrument: 0, simulatedInstrument: 0,
        simTime: 0, simInstrumentTime: 0, batdTime: 0, instrumentDualAirplane: 0, recentInstrument: 0, 
        complexTime: 0
    };

    var twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (!row.Date) continue;
        
        var totalTime = row.TotalTime || 0;
        var pic = row.PIC || 0;
        var xc = row.CrossCountry || 0;
        var dual = row.DualReceived || 0;
        var actual = row.ActualInstrument || 0;
        var simulated = row.SimulatedInstrument || 0;
        var simulator = row.SimulatedFlight || 0;
        var complex = row['[Hours]Complex'] || 0;
        var aircraftId = row.AircraftID || '';

        currentHours.totalTime += totalTime;
        currentHours.picTime += pic;
        currentHours.xcTime += xc;
        currentHours.dualReceived += dual;
        currentHours.complexTime += complex;

        var isSimulator = false;
        var isBATD = false;
        if (aircraftData[aircraftId]) {
            var equipType = (aircraftData[aircraftId].equipType || '').toLowerCase();
            isSimulator = equipType === 'batd' || equipType === 'aatd' || equipType === 'ftd';
            isBATD = equipType === 'batd';
        }
        
        if (isSimulator) {
            currentHours.simTime += simulator;
            currentHours.simInstrumentTime += simulated;
            
            if (isBATD && simulator > 0) {
                currentHours.batdTime += simulator;
            }
            
            currentHours.instrumentTotal += simulated;
        } else {
            currentHours.actualInstrument += actual;
            currentHours.simulatedInstrument += simulated;
            currentHours.instrumentTotal += actual + simulated;
        }

        if (pic > 0 && xc > 0) {
            currentHours.picXC += Math.min(pic, xc, totalTime);
        }

        if (!isSimulator && dual > 0 && (actual > 0 || simulated > 0)) {
            currentHours.instrumentDualAirplane += Math.min(dual, actual + simulated, totalTime);
        }

        var flightDate = new Date(row.Date);
        if (!isSimulator && flightDate >= twoMonthsAgo && dual > 0 && (actual > 0 || simulated > 0)) {
            currentHours.recentInstrument += Math.min(dual, actual + simulated, totalTime);
        }
    }

    document.getElementById('logbookSummary').style.display = 'block';
    document.getElementById('summaryTotalTime').textContent = currentHours.totalTime.toFixed(1);
    document.getElementById('summaryPICTime').textContent = currentHours.picTime.toFixed(1);
    document.getElementById('summaryXCTime').textContent = currentHours.picXC.toFixed(1);
    document.getElementById('summaryDualTime').textContent = currentHours.dualReceived.toFixed(1);
    
    document.getElementById('summaryInstrumentTime').textContent = currentHours.instrumentTotal.toFixed(1);
    document.getElementById('summaryActualInstrument').textContent = currentHours.actualInstrument.toFixed(1);
    document.getElementById('summarySimulatedInstrument').textContent = currentHours.simulatedInstrument.toFixed(1);
    
    var simTimeElement = document.getElementById('summarySimTime');
    simTimeElement.textContent = currentHours.simInstrumentTime.toFixed(1);
    
    var container = document.getElementById('summarySimTimeContainer');
    if (container && !container.querySelector('.sim-max-text')) {
        var maxText = document.createElement('span');
        maxText.className = 'sim-max-text';
        maxText.style.fontSize = '0.6em';
        maxText.style.color = '#999';
        maxText.style.marginLeft = '8px';
        maxText.textContent = '/ 20 max';
        container.appendChild(maxText);
    }
    
    document.getElementById('summaryInstrumentDualAirplane').textContent = currentHours.instrumentDualAirplane.toFixed(1);
    document.getElementById('summaryRecentInstrument').textContent = currentHours.recentInstrument.toFixed(1);

    updateDisplay();
}

function updateDisplay() {
    var cert = document.getElementById('targetCert').value;
    if (!cert) {
        document.getElementById('requirementsList').style.display = 'none';

        // Reset aircraft hours to 0 when no certification is selected
        if (!preventAutoFill) {
            var aircraftItems = document.querySelectorAll('#aircraftList .aircraft-item');
            for (var i = 0; i < aircraftItems.length; i++) {
                var item = aircraftItems[i];
                var dualInput = item.querySelector('.aircraft-dual-hours');
                var soloInput = item.querySelector('.aircraft-solo-hours');

                if (dualInput) dualInput.value = '0';
                if (soloInput) soloInput.value = '0';
            }
            calculate();
        }
        return;
    }

    var requirements = {
        ir: [
            { name: '50 hours PIC cross country', required: 50, field: 'picXC', type: 'solo' },
            { name: '10 hours PIC XC in airplanes', required: 10, field: 'picXC', type: 'solo' },
            { name: '40 hours actual or simulated instrument', required: 40, field: 'instrumentTotal', type: 'dual', showBreakdown: true },
            { name: '15 hours instrument training from instructor', required: 15, field: 'instrumentDualAirplane', type: 'dual' },
            { name: 'One 250nm XC: 3 approaches, 3 approach types', required: 1, field: 'longXC', type: 'dual', isSpecial: true },
            { name: '3 hours instrument training (last 2 months)', required: 3, field: 'recentInstrument', type: 'dual' }
        ],
        cpl: [
            { name: '250 hours total time', required: 250, field: 'totalTime', type: 'solo' },
            { name: '100 hours PIC', required: 100, field: 'picTime', type: 'solo' },
            { name: '50 hours PIC in airplanes', required: 50, field: 'picTime', type: 'solo' },
            { name: '50 hours PIC cross country', required: 50, field: 'picXC', type: 'solo' },
            { name: '10 hours PIC XC in airplanes', required: 10, field: 'picXC', type: 'solo' },
            { name: '20 hours training (total)', required: 20, field: 'dualReceived', type: 'dual' },
            { name: '10 hours instrument training', required: 10, field: 'instrumentDualAirplane', type: 'dual' },
            { name: '5 hours instrument in single engine', required: 5, field: 'instrumentDualAirplane', type: 'dual' },
            { name: '10 hours complex or TAA', required: 10, field: 'complexTime', type: 'dual' },
            { name: 'One 2hr day XC (100nm+ from origin)', required: 1, field: 'dayXC', type: 'dual', isSpecial: true },
            { name: 'One 2hr night XC (100nm+ from origin)', required: 1, field: 'nightXC', type: 'dual', isSpecial: true },
            { name: '3 hours training (last 2 months)', required: 3, field: 'recentInstrument', type: 'dual' },
            { name: '10 hours solo or PIC time', required: 10, field: 'picTime', type: 'solo' },
            { name: 'One solo 300nm XC (one leg 250nm+)', required: 1, field: 'soloLongXC', type: 'solo', isSpecial: true },
            { name: '5 hours night VFR (10 T/O and landings)', required: 5, field: 'nightTime', type: 'solo', isSpecial: true }
        ],
        cfi: [
            { name: '250 hours total time', required: 250, field: 'totalTime', type: 'solo' },
            { name: '100 hours PIC', required: 100, field: 'picTime', type: 'solo' },
            { name: '50 hours PIC cross country', required: 50, field: 'picXC', type: 'solo' },
            { name: '15 hours instrument (in training)', required: 15, field: 'instrumentTotal', type: 'dual' }
        ]
    };

    var reqs = requirements[cert];
    if (!reqs) return;

    if (currentHours.totalTime) {
        document.getElementById('requirementsList').style.display = 'block';
    }
    
    var html = '';
    var totalDualNeeded = 0;
    var totalSoloNeeded = 0;
    
    for (var i = 0; i < reqs.length; i++) {
        var req = reqs[i];
        var current = currentHours[req.field] || 0;
        var needed = Math.max(req.required - current, 0);
        var pct = Math.min((current / req.required) * 100, 100);
        
        if (needed > 0 && !req.isSpecial) {
            if (req.type === 'dual') {
                totalDualNeeded = Math.max(totalDualNeeded, needed);
            } else {
                totalSoloNeeded = Math.max(totalSoloNeeded, needed);
            }
        }
        
        if (currentHours.totalTime) {
            var status = pct >= 100 ? 'completed' : (pct > 0 ? 'in-progress' : 'not-started');
            var badge = pct >= 100 ? 'badge-completed' : (pct > 0 ? 'badge-in-progress' : 'badge-not-started');
            var badgeText = pct >= 100 ? 'Complete' : (pct > 0 ? 'In Progress' : 'Not Started');

            html += '<div class="requirement-item ' + status + '">';
            html += '<div class="requirement-header"><div class="requirement-title">' + req.name + '</div>';
            html += '<div class="requirement-badge ' + badge + '">' + badgeText + '</div></div>';
            
            if (req.isSpecial) {
                html += '<div class="requirement-stats"><span>Special flight requirement</span>';
                html += '<span>' + (pct >= 100 ? 'Completed' : 'Not completed') + '</span></div>';
            } else {
                html += '<div class="requirement-stats"><span>' + current.toFixed(1) + ' / ' + req.required + ' hrs</span>';
                html += '<span>' + needed.toFixed(1) + ' hrs needed</span></div>';
            }
            
            if (req.showBreakdown && req.field === 'instrumentTotal') {
                html += '<div class="requirement-breakdown">';
                html += '(' + currentHours.batdTime.toFixed(1) + ' BATD hours included)<br>';
                html += '(' + currentHours.simInstrumentTime.toFixed(1) + ' total simulator hours included)';
                html += '</div>';
            }
            
            html += '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>';
        }
    }

    if (currentHours.totalTime) {
        document.getElementById('requirementsContent').innerHTML = html;
    }
    
    if (!preventAutoFill) {
        var aircraftItems = document.querySelectorAll('#aircraftList .aircraft-item');
        if (aircraftItems.length > 0) {
            var firstAircraft = aircraftItems[0];
            var dualInput = firstAircraft.querySelector('.aircraft-dual-hours');
            var soloInput = firstAircraft.querySelector('.aircraft-solo-hours');
            
            if (dualInput) dualInput.value = totalDualNeeded.toFixed(1);
            if (soloInput) soloInput.value = totalSoloNeeded.toFixed(1);
            
            calculate();
        }
    }
}

function calculate() {
    var groundHours = parseFloat(document.getElementById('groundHours').value) || 0;
    var instructorRate = parseFloat(document.getElementById('instructorRate').value) || 0;
    var totalFlightTrainingCost = 0;
    var totalFamilyFlightCost = 0;
    var totalDualHours = 0;
    var totalSoloHours = 0;
    var totalFamilyHours = 0;

    var aircraftItems = document.querySelectorAll('#aircraftList .aircraft-item');
    for (var i = 0; i < aircraftItems.length; i++) {
        var item = aircraftItems[i];
        var rateType = item.querySelector('.aircraft-rate-type').value;
        var aircraftRate = parseFloat(item.querySelector('.aircraft-base-rate').value) || 0;

        if (rateType === 'dry') {
            var fuelPrice = parseFloat(item.querySelector('.fuel-price').value) || 0;
            var fuelBurn = parseFloat(item.querySelector('.fuel-burn').value) || 0;
            aircraftRate = aircraftRate + (fuelPrice * fuelBurn);
        }

        var dualHours = parseFloat(item.querySelector('.aircraft-dual-hours').value) || 0;
        var soloHours = parseFloat(item.querySelector('.aircraft-solo-hours').value) || 0;
        var familyHours = parseFloat(item.querySelector('.aircraft-family-hours').value) || 0;

        var dualCost = dualHours * (aircraftRate + instructorRate);
        var soloCost = soloHours * aircraftRate;
        var familyCost = familyHours * aircraftRate;
        var aircraftTotal = dualCost + soloCost + familyCost;

        item.querySelector('.aircraft-dual-cost').textContent = '$' + dualCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        item.querySelector('.aircraft-solo-cost').textContent = '$' + soloCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        item.querySelector('.aircraft-family-cost').textContent = '$' + familyCost.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        item.querySelector('.aircraft-total-cost').textContent = '$' + aircraftTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        totalFlightTrainingCost += dualCost + soloCost;
        totalFamilyFlightCost += familyCost;
        totalDualHours += dualHours;
        totalSoloHours += soloHours;
        totalFamilyHours += familyHours;
    }

    var groundCost = groundHours * instructorRate;
    var flightTrainingTotal = totalFlightTrainingCost + groundCost;

    document.getElementById('dualHours').value = totalDualHours.toFixed(1);
    document.getElementById('soloHours').value = totalSoloHours.toFixed(1);
    document.getElementById('familyHours').value = totalFamilyHours.toFixed(1);

    var headsetCost = parseFloat(document.getElementById('headsetCost').value) || 0;
    var booksCost = parseFloat(document.getElementById('booksCost').value) || 0;
    var bagCost = parseFloat(document.getElementById('bagCost').value) || 0;
    var gearTotal = headsetCost + booksCost + bagCost;

    var medicalCost = parseFloat(document.getElementById('medicalCost').value) || 0;
    var knowledgeCost = parseFloat(document.getElementById('knowledgeCost').value) || 0;
    var checkrideCost = parseFloat(document.getElementById('checkrideCost').value) || 0;
    var insuranceCost = parseFloat(document.getElementById('insuranceCost').value) || 0;
    var examsTotal = medicalCost + knowledgeCost + checkrideCost + insuranceCost;

    var foreflightCost = parseFloat(document.getElementById('foreflightCost').value) || 0;
    var onlineSchoolCost = parseFloat(document.getElementById('onlineSchoolCost').value) || 0;
    var subscriptionsTotal = foreflightCost + onlineSchoolCost;

    var subtotal = flightTrainingTotal + totalFamilyFlightCost + gearTotal + examsTotal + subscriptionsTotal;
    var contingencyPercent = parseFloat(document.getElementById('contingencyPercent').value) || 0;
    var contingency = subtotal * (contingencyPercent / 100);
    var grandTotal = subtotal + contingency;

    document.getElementById('flightTrainingCost').textContent = '$' + flightTrainingTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    document.getElementById('familyFlightCost').textContent = '$' + totalFamilyFlightCost.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    document.getElementById('gearCost').textContent = '$' + gearTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    document.getElementById('examsCost').textContent = '$' + examsTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    document.getElementById('subscriptionsCost').textContent = '$' + subscriptionsTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    document.getElementById('subtotalCost').textContent = '$' + subtotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    document.getElementById('contingencyCost').textContent = '$' + contingency.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    document.getElementById('totalCost').textContent = '$' + grandTotal.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    var lessonsPerWeek = parseFloat(document.getElementById('lessonsPerWeek').value) || 2;
    var totalTrainingHours = totalDualHours + totalSoloHours;
    var avgHoursPerLesson = 1.5;
    
    if (totalTrainingHours > 0) {
        var weeksToComplete = totalTrainingHours / (lessonsPerWeek * avgHoursPerLesson);
        var monthsToComplete = weeksToComplete / 4.33;
        
        var trainingBudget = flightTrainingTotal + gearTotal + examsTotal + subscriptionsTotal;
        var trainingContingency = trainingBudget * (contingencyPercent / 100);
        var totalTrainingBudget = trainingBudget + trainingContingency;
        var monthlyBudget = totalTrainingBudget / monthsToComplete;
        
        document.getElementById('estimatedMonths').textContent = '~ ' + Math.ceil(monthsToComplete) + ' Months';
        document.getElementById('monthlyBudget').textContent = '$' + monthlyBudget.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    } else {
        document.getElementById('estimatedMonths').textContent = '~ 0 Months';
        document.getElementById('monthlyBudget').textContent = '$0.00';
    }

    updateBudgetChart(flightTrainingTotal, totalFamilyFlightCost, gearTotal, examsTotal, subscriptionsTotal, contingency);
}

function updateBudgetChart(training, family, gear, exams, subs, contingency) {
    var ctx = document.getElementById('budgetChart');
    if (!ctx) return;

    var chartData = {
        labels: ['Flight Training', 'Personal', 'Gear', 'Exams', 'Subscriptions', 'Contingency'],
        datasets: [{
            data: [training, family, gear, exams, subs, contingency],
            backgroundColor: ['#1e40af', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'],
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    };

    if (budgetChart) {
        budgetChart.data = chartData;
        budgetChart.update();
    } else {
        budgetChart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                var total = 0;
                                for (var i = 0; i < context.dataset.data.length; i++) {
                                    total += context.dataset.data[i];
                                }
                                var pct = ((context.parsed / total) * 100).toFixed(1);
                                return context.label + ': $' + context.parsed.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' (' + pct + '%)';
                            }
                        }
                    }
                }
            }
        });
    }

    var legendDiv = document.getElementById('chartLegend');
    var colors = chartData.datasets[0].backgroundColor;
    var total = 0;
    for (var i = 0; i < chartData.datasets[0].data.length; i++) {
        total += chartData.datasets[0].data[i];
    }
    
    var html = '';
    for (var i = 0; i < chartData.labels.length; i++) {
        var value = chartData.datasets[0].data[i];
        var pct = ((value / total) * 100).toFixed(1);
        html += '<div class="legend-item"><div class="legend-color" style="background:' + colors[i] + '"></div>';
        html += '<div class="legend-label">' + chartData.labels[i] + '</div>';
        html += '<div class="legend-value">$' + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' (' + pct + '%)</div></div>';
    }
    legendDiv.innerHTML = html;
}

window.addEventListener('DOMContentLoaded', init);
