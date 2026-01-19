import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const todoInput = document.getElementById('todoInput');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');

// Add Todo
const addTodo = async () => {
    const text = todoInput.value.trim();
    if (!text) return;

    try {
        addTodoBtn.disabled = true;
        await addDoc(collection(db, "todos"), {
            task: text,
            completed: false,
            timestamp: serverTimestamp()
        });
        todoInput.value = '';
    } catch (e) {
        console.error("Error adding todo: ", e);
        alert("新增失敗");
    } finally {
        addTodoBtn.disabled = false;
        todoInput.focus();
    }
};

// Toggle Complete
window.toggleTodo = async (id, currentStatus) => {
    try {
        const todoRef = doc(db, "todos", id);
        await updateDoc(todoRef, {
            completed: !currentStatus
        });
    } catch (e) {
        console.error("Error updating todo: ", e);
    }
};

// Delete Todo
window.deleteTodo = async (id) => {
    if (confirm('確定要刪除此事項嗎？')) {
        try {
            await deleteDoc(doc(db, "todos", id));
        } catch (e) {
            console.error("Error deleting todo: ", e);
        }
    }
};

// Listen to Todos
const setupTodoListener = () => {
    const q = query(collection(db, "todos"), orderBy("timestamp", "desc"));

    onSnapshot(q, (snapshot) => {
        todoList.innerHTML = '';
        if (snapshot.empty) {
            todoList.innerHTML = '<div class="no-data">目前沒有待辦事項</div>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement('li');
            li.className = `todo-item ${data.completed ? 'completed' : ''}`;

            li.innerHTML = `
                <div class="todo-content" onclick="toggleTodo('${doc.id}', ${data.completed})">
                    <div class="checkbox-custom ${data.completed ? 'checked' : ''}"></div>
                    <span class="todo-text">${data.task}</span>
                </div>
                <button class="delete-btn" onclick="deleteTodo('${doc.id}')">×</button>
            `;
            todoList.appendChild(li);
        });
    });
};

// Event Listeners
addTodoBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});

// Initialize
setupTodoListener();
