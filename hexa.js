import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCAil0nUgA6yqZO_O59fwaz5oE-rAKldZQ",
    authDomain: "mshexa-4a274.firebaseapp.com",
    projectId: "mshexa-4a274",
    storageBucket: "mshexa-4a274.firebasestorage.app",
    messagingSenderId: "418772221157",
    appId: "1:418772221157:web:a6448e70607f7d1e2f680c",
    measurementId: "G-KTJCJ3Y75D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const soulInput = document.getElementById('soulInput');
const fragmentInput = document.getElementById('fragmentInput');
const confirmBtn = document.getElementById('confirmBtn');
const historyBody = document.getElementById('historyBody');
const noDataMsg = document.getElementById('noDataMsg');

// State (kept in memory, synced from Firestore)
let history = [];

// Helper: Format Date/Time from Timestamp or Date object
const formatDateTime = (dateObj) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');

    return {
        date: `${yyyy}/${mm}/${dd}`,
        time: `${hh}:${min}`
    };
};

// Delete Record
const deleteRecord = async (id) => {
    if (confirm('確定要刪除這筆紀錄嗎？')) {
        try {
            await deleteDoc(doc(db, "records", id));
            // UI auto-updates via onSnapshot
        } catch (e) {
            console.error("Error deleting document: ", e);
            alert("刪除失敗，請檢查網路連線");
        }
    }
};

// Render Table
const renderTable = () => {
    historyBody.innerHTML = '';

    if (history.length === 0) {
        noDataMsg.style.display = 'block';
        return;
    }

    noDataMsg.style.display = 'none';

    // Only take the latest 7 records for display
    // Note: 'history' is already sorted by desc timestamp from Firestore query
    const displayItems = history.slice(0, 7);

    displayItems.forEach((item, index) => {
        // Calculate diffs
        // item is at history[index]. Previous record is at history[index + 1]
        const prevItem = history[index + 1];

        const getDiffHtml = (current, key) => {
            if (!prevItem) return ''; // No previous record to compare

            const curVal = parseInt(current);
            const prevVal = parseInt(prevItem[key]);

            if (isNaN(curVal) || isNaN(prevVal)) return '';

            const diff = curVal - prevVal;

            const sign = diff > 0 ? '+' : '';
            let styleClass = 'diff-neutral';
            if (diff > 0) styleClass = 'diff-pos';
            if (diff < 0) styleClass = 'diff-neg';

            return `<span class="diff-val ${styleClass}">[${sign}${diff}]</span>`;
        };

        const soulDiffHtml = getDiffHtml(item.soul, 'soul');
        const fragmentDiffHtml = getDiffHtml(item.fragment, 'fragment');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.time}</td>
            <td style="font-weight: bold; color: #6c5ce7;">
                ${item.soul}
            </td>
            <td style="font-weight: bold;">
                ${soulDiffHtml}
            </td>
            <td style="font-weight: bold; color: #00cec9;">
                ${item.fragment}
            </td>
            <td style="font-weight: bold;">
                ${fragmentDiffHtml}
            </td>
        `;

        // Add Double Click Listener
        row.setAttribute('title', '點擊兩下刪除此紀錄');
        row.style.cursor = 'pointer';
        row.addEventListener('dblclick', () => deleteRecord(item.id));

        historyBody.appendChild(row);
    });
};

// Add Record
const addRecord = async () => {
    const soulVal = soulInput.value.trim();
    const fragmentVal = fragmentInput.value.trim();

    if (!soulVal || !fragmentVal) {
        alert('請輸入正確數值');
        return;
    }

    const now = new Date();
    const { date, time } = formatDateTime(now);

    try {
        confirmBtn.disabled = true; // Prevent double click
        confirmBtn.textContent = "儲存中...";

        await addDoc(collection(db, "records"), {
            timestamp: serverTimestamp(), // Use server time for accurate sorting
            date: date,
            time: time,
            soul: soulVal || '-',
            fragment: fragmentVal || '-'
        });

        // Clear Inputs (UI update handles by snapshot)
        soulInput.value = '';
        fragmentInput.value = '';

    } catch (e) {
        console.error("Error adding document: ", e);
        alert("儲存失敗，請檢查網路連線或 Firebase 設定");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = "確認輸入";
    }
};

// Listen to Firestore
const setupRealtimeListener = () => {
    // limit 20 to ensure we have enough history to calc diffs for the top 7
    const q = query(collection(db, "records"), orderBy("timestamp", "desc"), limit(20));

    // Include metadata changes to ensure local writes with pending server timestamps are displayed immediately
    onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        history = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Handle pending server timestamp if needed, but we rely on stored date strings
            history.push({ id: doc.id, ...data });
        });
        renderTable();
    }, (error) => {
        console.error("Real-time listener error:", error);
    });
};

// Event Listeners
confirmBtn.addEventListener('click', addRecord);

// Enter key support
const handleEnterKey = (e) => {
    if (e.key === 'Enter') {
        // Prevent default form submission if any
        if (soulInput.value && fragmentInput.value) {
            addRecord();
        }
    }
};

soulInput.addEventListener('keydown', handleEnterKey);
fragmentInput.addEventListener('keydown', handleEnterKey);

// Initialize
setupRealtimeListener();

// [Optional] Check for local data migration?
// For now, we just start fresh with Firestore.
