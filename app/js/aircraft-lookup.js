/**
 * Aircraft Lookup Module
 * Provides online lookup for aircraft details from FAA Registry
 * Currently supports US aircraft only (N-numbers)
 */

const AircraftLookup = (function() {
    const CACHE_KEY = 'aircraft-lookup-cache';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    const SETTINGS_KEY = 'aircraft-lookup-settings';

    // Default settings
    let settings = {
        enableOnlineLookup: false  // Opt-in by default
    };

    /**
     * Initialize the lookup module
     */
    function init() {
        loadSettings();
        console.log('Aircraft Lookup initialized. Online lookup:', settings.enableOnlineLookup ? 'enabled' : 'disabled');
    }

    /**
     * Load settings from localStorage
     */
    function loadSettings() {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                settings = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load lookup settings:', error);
        }
    }

    /**
     * Save settings to localStorage
     */
    function saveSettings() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save lookup settings:', error);
        }
    }

    /**
     * Enable or disable online lookup
     */
    function setOnlineLookupEnabled(enabled) {
        settings.enableOnlineLookup = enabled;
        saveSettings();
        console.log('Online lookup', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Check if online lookup is enabled
     */
    function isOnlineLookupEnabled() {
        return settings.enableOnlineLookup;
    }

    /**
     * Check if tail number is a US registration (N-number)
     */
    function isUSAircraft(tailNumber) {
        if (!tailNumber) return false;
        const cleaned = tailNumber.trim().toUpperCase();
        return cleaned.startsWith('N') && cleaned.length >= 2;
    }

    /**
     * Lookup aircraft details by tail number
     * Returns: { year, make, model, source: 'faa'|'cache'|null }
     */
    async function lookupByTailNumber(tailNumber) {
        if (!tailNumber) return null;

        // Only lookup US aircraft
        if (!isUSAircraft(tailNumber)) {
            console.log(`Skipping lookup for ${tailNumber}: not a US aircraft`);
            return null;
        }

        // Check cache first
        const cached = getFromCache(tailNumber);
        if (cached && !isCacheExpired(cached)) {
            console.log(`Using cached data for ${tailNumber}`);
            return { ...cached.data, source: 'cache' };
        }

        // Try online lookup if enabled
        if (settings.enableOnlineLookup && navigator.onLine) {
            try {
                console.log(`Looking up ${tailNumber} from FAA registry...`);
                const data = await fetchFromFAA(tailNumber);
                if (data) {
                    saveToCache(tailNumber, data);
                    return { ...data, source: 'faa' };
                }
            } catch (error) {
                console.warn(`FAA lookup failed for ${tailNumber}:`, error.message);
            }
        }

        return null;
    }

    /**
     * Fetch aircraft data from FAA Registry API via self-hosted ARLA
     */
    async function fetchFromFAA(tailNumber) {
        const cleaned = tailNumber.trim().toUpperCase();

        // Using self-hosted Aircraft Registration Lookup API (ARLA)
        // https://github.com/njfdev/Aircraft-Registration-Lookup-API
        // Runs as a sidecar container in docker-compose
        const arlaUrl = `/arla-api/api/v0/faa/registration/${encodeURIComponent(cleaned)}`;

        try {
            console.log(`Looking up ${cleaned} via self-hosted ARLA API...`);
            const response = await fetch(arlaUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`${cleaned} not found in FAA registry`);
                    return null;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Parse ARLA response format
            const result = parseARLAResponse(data, cleaned);

            if (result) {
                console.log(`Successfully looked up ${cleaned}:`, result);
                return result;
            }

            console.warn(`Could not parse data for ${cleaned}`);
            return null;
        } catch (error) {
            throw new Error(`FAA API request failed: ${error.message}`);
        }
    }

    /**
     * Parse ARLA API response
     */
    function parseARLAResponse(data, tailNumber) {
        try {
            // ARLA returns FAA data in uppercase
            // Expected fields may include: MFR_YEAR, MFR_NAME, MODEL, etc.
            const year = data.MFR_YEAR || data.YEAR_MFR || data.mfr_year || '';
            const make = data.MFR_NAME || data.MANUFACTURER || data.mfr_name || '';
            const model = data.MODEL || data.model || '';

            console.log(`Parsed ARLA response for ${tailNumber}:`, { year, make, model });

            if (make && model) {
                return { year, make, model };
            }

            // Log the full response for debugging if parsing failed
            console.warn(`Unexpected ARLA response structure for ${tailNumber}:`, data);
            return null;
        } catch (error) {
            console.error('Failed to parse ARLA response:', error);
            return null;
        }
    }

    /**
     * Parse FAA Registry HTML response
     */
    function parseRegistryHTML(html, tailNumber) {
        try {
            // Create a temporary DOM element to parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            let year = '';
            let make = '';
            let model = '';

            // The FAA Registry page uses a table with rows for each data field
            // Each row has a label cell and a data cell
            const rows = doc.querySelectorAll('table tr, tbody tr');

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const label = cells[0].textContent.trim();
                    const value = cells[1].textContent.trim();

                    // Match specific FAA field labels (case-insensitive)
                    const labelLower = label.toLowerCase();

                    if (labelLower.includes('year mfr') || labelLower === 'year manufactured') {
                        year = value;
                    } else if (labelLower.includes('manufacturer name') || labelLower === 'mfr name') {
                        make = value;
                    } else if (labelLower === 'model') {
                        model = value;
                    }
                }
            });

            // Also try to extract from specific table structure if present
            if (!make || !model) {
                // Look for rows with specific data attributes or classes
                const dataRows = doc.querySelectorAll('tr[data-label], .data-row');
                dataRows.forEach(row => {
                    const label = row.getAttribute('data-label') || '';
                    const value = row.querySelector('td:last-child')?.textContent.trim() || '';

                    if (label.toLowerCase().includes('manufacturer')) make = value;
                    if (label.toLowerCase().includes('model')) model = value;
                    if (label.toLowerCase().includes('year')) year = value;
                });
            }

            console.log(`Parsed ${tailNumber}: year="${year}", make="${make}", model="${model}"`);

            if (make && model) {
                return { year, make, model };
            }

            // Log the HTML structure for debugging if parsing failed
            console.warn(`Could not extract complete data for ${tailNumber}`);
            console.debug('HTML structure:', doc.body.innerHTML.substring(0, 500));

            return null;
        } catch (error) {
            console.error('Failed to parse FAA response:', error);
            return null;
        }
    }

    /**
     * Get aircraft data from cache
     */
    function getFromCache(tailNumber) {
        try {
            const cache = localStorage.getItem(CACHE_KEY);
            if (!cache) return null;

            const parsed = JSON.parse(cache);
            const key = tailNumber.trim().toUpperCase();
            return parsed[key] || null;
        } catch (error) {
            console.error('Failed to read cache:', error);
            return null;
        }
    }

    /**
     * Save aircraft data to cache
     */
    function saveToCache(tailNumber, data) {
        try {
            const cache = localStorage.getItem(CACHE_KEY);
            const parsed = cache ? JSON.parse(cache) : {};

            const key = tailNumber.trim().toUpperCase();
            parsed[key] = {
                data: data,
                timestamp: Date.now()
            };

            localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
            console.log(`Cached data for ${tailNumber}`);
        } catch (error) {
            console.error('Failed to save to cache:', error);
        }
    }

    /**
     * Check if cached data is expired
     */
    function isCacheExpired(cachedEntry) {
        if (!cachedEntry || !cachedEntry.timestamp) return true;
        const age = Date.now() - cachedEntry.timestamp;
        return age > CACHE_DURATION;
    }

    /**
     * Clear all cached data
     */
    function clearCache() {
        try {
            localStorage.removeItem(CACHE_KEY);
            console.log('Aircraft lookup cache cleared');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    /**
     * Get cache statistics
     */
    function getCacheStats() {
        try {
            const cache = localStorage.getItem(CACHE_KEY);
            if (!cache) return { count: 0, size: 0 };

            const parsed = JSON.parse(cache);
            const count = Object.keys(parsed).length;
            const size = new Blob([cache]).size;

            return { count, size };
        } catch (error) {
            return { count: 0, size: 0 };
        }
    }

    /**
     * Test lookup for debugging
     */
    async function testLookup(tailNumber) {
        console.log('=== Testing FAA Lookup ===');
        console.log('Tail Number:', tailNumber);
        console.log('Is US Aircraft:', isUSAircraft(tailNumber));
        console.log('Online Lookup Enabled:', settings.enableOnlineLookup);
        console.log('Navigator Online:', navigator.onLine);

        if (isUSAircraft(tailNumber) && settings.enableOnlineLookup) {
            try {
                const result = await lookupByTailNumber(tailNumber);
                console.log('Lookup Result:', result);
                return result;
            } catch (error) {
                console.error('Lookup Error:', error);
                return null;
            }
        } else {
            console.log('Lookup skipped - conditions not met');
            return null;
        }
    }

    // Public API
    return {
        init,
        lookupByTailNumber,
        isUSAircraft,
        setOnlineLookupEnabled,
        isOnlineLookupEnabled,
        clearCache,
        getCacheStats,
        testLookup  // For debugging
    };
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    AircraftLookup.init();
});
