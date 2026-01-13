
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const rateInput = document.getElementById('rateType');
    const ntdInput = document.getElementById('ntdInput');
    const mesosInput = document.getElementById('mesosInput');

    // State
    const UNIT_MULTIPLIER = 10000;

    // Helper functions for formatting
    const formatNumber = (num) => {
        if (!num) return '';
        // Remove existing commas to ensure clean parsing then format
        const parts = num.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.join('.');
    };

    const parseNumber = (str) => {
        if (!str) return 0;
        // Remove commas and parse
        return parseFloat(str.replace(/,/g, '')) || 0;
    };

    // Chinese Unit Formatting Logic (Zero dependencies, pure math)
    const formatChineseMoney = (num) => {
        if (!num || num === 0) return '';

        const yi = Math.floor(num / 100000000); // 10^8
        const remainderAfterYi = num % 100000000;
        const wan = Math.floor(remainderAfterYi / 10000); // 10^4
        const remainder = Math.floor(remainderAfterYi % 10000); // Truncate decimals for display

        let result = '';
        if (yi > 0) {
            result += `${yi}億`;
        }

        if (wan > 0) {
            // If we have Yi, and Wan is less than 1000, we might strictly need padding (e.g. 1億0500萬) 
            // but standard casual reading usually omits leading zero unless it's strictly formal.
            // User example: 85億1295萬2725. No zero padding shown in examples.
            // However, 1億500萬 vs 1億0500萬? User example 85億1295... 1295 is full 4 digits.
            // Let's stick to simple concatenation for now.
            result += `${wan}萬`;
        } else if (yi > 0 && remainder > 0) {
            // Case where we have Yi and Remainder but 0 Wan. 
            // e.g. 100,000,001 -> 1億0萬1? Usually 1億0001?
            // User didn't specify this edge case. Let's add 0萬 if there is a remainder? 
            // Or just skip. "1億1" sounds like 1.1 billion or 100m+1.
            // Let's add '0萬' if yi > 0 and remainder > 0 is a safer bet for clarity, 
            // but let's stick to direct translation.
            if (remainder > 0) result += "0萬";
        }

        if (remainder > 0) {
            result += remainder;
        }

        return result;
    };

    const mesosChineseDisplay = document.getElementById('mesosChineseDisplay');

    const updateChineseDisplay = (mesosValue) => {
        mesosChineseDisplay.textContent = formatChineseMoney(mesosValue);
    };

    // Main conversion logic
    const calculate = (source) => {
        // Get raw values
        const rate = parseFloat(rateInput.value) || 0;
        const actualRate = rate * UNIT_MULTIPLIER;

        let ntd = parseNumber(ntdInput.value);
        let mesos = parseNumber(mesosInput.value);

        if (source === 'rate') {
            // When rate changes, recalculate Mesos based on NTD if NTD has value,
            // otherwise calculate NTD based on Mesos if Mesos has value.
            // Priority: NTD -> Mesos
            if (ntd > 0) {
                if (actualRate > 0) {
                    mesos = ntd * actualRate;
                    mesosInput.value = formatNumber(mesos);
                    updateChineseDisplay(mesos);
                } else {
                    mesosInput.value = '0';
                    updateChineseDisplay(0);
                }
            } else if (mesos > 0) {
                if (actualRate > 0) {
                    ntd = mesos / actualRate;
                    ntdInput.value = formatNumber(ntd.toFixed(2)); // Keep reasonable precision for NTD
                    updateChineseDisplay(mesos); // Logic: we start with Mesos, so display it
                } else {
                    ntdInput.value = '0';
                }
            }
        } else if (source === 'ntd') {
            // NTD -> Mesos
            if (actualRate > 0) {
                mesos = ntd * actualRate;
                mesosInput.value = formatNumber(mesos);
                updateChineseDisplay(mesos);
            }
        } else if (source === 'mesos') {
            // Mesos -> NTD
            if (actualRate > 0) {
                ntd = mesos / actualRate;
                // Avoid too many decimal places for NTD
                ntdInput.value = formatNumber(Number(ntd.toFixed(4)));
                updateChineseDisplay(mesos);
            }
        }
    };


    // Event Listeners for Input Formatting and Calculation

    // Rate Input
    rateInput.addEventListener('input', () => {
        calculate('rate');
    });

    // NTD Input
    ntdInput.addEventListener('input', (e) => {
        // Store cursor position
        const cursor = e.target.selectionStart;
        const originalLen = e.target.value.length;

        // Calculate and Format
        calculate('ntd');
        const rawValue = parseNumber(e.target.value);
        e.target.value = rawValue === 0 && e.target.value.trim() === '' ? '' : formatNumber(rawValue);

        // Adjust cursor (simple approximation)
        // If user is typing, we might need more complex cursor management, 
        // but for simple calculator this usually suffices or we just format on blur
        // Let's try to format on input but handle the cursor carefully?
        // Actually, re-formatting every keystroke can be annoying with cursors.
        // Let's update ONLY the OTHER field on input, and format THIS field on blur or carefully.

        // Revised approach for self-field: 
        // Don't format self while typing to avoid cursor jumping, format self on blur.
        // BUT user wants to see calculation immediately.
        // For 'ntdInput', we only update 'mesosInput'. We don't change 'ntdInput' value here programmatically 
        // unless it's strictly necessary, or we accept the cursor jump on format.
        // Let's stick to: Update logic uses the raw value, but we only format the valid numbers.
    });

    ntdInput.addEventListener('keyup', (e) => {
        // Optional: formatting self after typing stops? 
        // A common pattern is formatting on blur or using a library. 
        // We will implement simple 'format on input' but strip non-numeric first.

        const val = ntdInput.value;
        const num = parseNumber(val);
        // Only format if it doesn't end with a decimal point (user might be typing .5)
        if (!val.endsWith('.') && !val.endsWith('.0') && val !== '' && !isNaN(parseNumber(val))) {
            // Re-setting value moves cursor to end. Ideally we save cursor.
            // For this task, let's keep it simple: Real-time format might be buggy without advanced logic.
            // We will calc result immediately, format result immediately.
            // Format SOURCE field on blur.
        }
    });

    // Better UX approach:
    // 1. Get value, calculate result.
    // 2. Format RESULT field.
    // 3. Format SOURCE field only on 'change' (blur) or carefully.

    // Let's rewrite the listeners to be robust

    const handleInput = (type) => {
        // 1. Get raw value of the input source
        const inputEl = type === 'ntd' ? ntdInput : mesosInput;
        // Allow user to type freely (commas included are handled by parseNumber)

        calculate(type);
    };

    const handleBlur = (e) => {
        const val = parseNumber(e.target.value);
        if (val || val === 0) {
            e.target.value = formatNumber(val);
        } else {
            e.target.value = '';
        }
    }

    ntdInput.addEventListener('input', () => handleInput('ntd'));
    mesosInput.addEventListener('input', () => handleInput('mesos'));

    ntdInput.addEventListener('blur', handleBlur);
    mesosInput.addEventListener('blur', handleBlur);
    mesosInput.addEventListener('focus', (e) => {
        // Optional: strip commas on focus for easier editing?
        // e.target.value = parseNumber(e.target.value);
        // Let's leave commas, user can delete them or we handle them in parse.
        const val = e.target.value;
        if (val === '0') e.target.value = '';
    });
    ntdInput.addEventListener('focus', (e) => {
        const val = e.target.value;
        if (val === '0') e.target.value = '';
    });

});
