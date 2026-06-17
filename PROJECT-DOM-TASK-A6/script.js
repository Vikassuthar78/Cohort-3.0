// State management with Local Storage Initialization
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// DOM Elements
const taskForm = document.getElementById('task-form');
const taskTitleInput = document.getElementById('task-title');
const taskCategorySelect = document.getElementById('task-category');
const taskContainer = document.getElementById('task-container');
const themeToggleBtn = document.getElementById('theme-toggle');

// Filters & Counter Elements
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const countPending = document.getElementById('count-pending');
const countCompleted = document.getElementById('count-completed');
const clearAllBtn = document.getElementById('clear-all-btn');

// Initial setup engine loop
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderTasks();
});


// PERSISTENCE ENGINE: Theme Management 

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.dataset.theme = savedTheme;
}

themeToggleBtn.addEventListener('click', () => {
    const htmlElement = document.documentElement;
    const currentTheme = htmlElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    htmlElement.setAttribute('data-theme', newTheme);
    htmlElement.dataset.theme = newTheme;
    localStorage.setItem('theme', newTheme);
});


// RENDER ENGINE: DocumentFragment Optimization & Filtering

function renderTasks() {
    const searchQuery = searchInput.value.toLowerCase();
    const selectedCategory = filterCategory.value;

    // Clear the current container contents
    taskContainer.innerHTML = '';

    // Create an offline DocumentFragment to prevent successive layout reflows
    const fragment = document.createDocumentFragment();

    let pendingCount = 0;
    let completedCount = 0;

    tasks.forEach(task => {
        // Track underlying metrics independent of visible filtering
        if (task.status === 'completed') completedCount++;
        else pendingCount++;

        // Evaluate Search & Category Constraints
        const matchesSearch = task.title.toLowerCase().includes(searchQuery);
        const matchesCategory = selectedCategory === 'All' || task.category === selectedCategory;

        if (matchesSearch && matchesCategory) {
            const card = createTaskCardNode(task);
            // Append target directly inside offline Fragment layout tree
            fragment.appendChild(card);
        }
    });

    // Commit single unified DOM paint batch update operation
    taskContainer.appendChild(fragment);

    // Sync state values visually
    countPending.textContent = pendingCount;
    countCompleted.textContent = completedCount;
}

// Node element template creation logic factory pattern
function createTaskCardNode(task) {
    const taskCard = document.createElement('div');
    taskCard.classList.add('task-card');
    if (task.status === 'completed') taskCard.classList.add('completed');

    // Section 2 Requirements: Custom data-* tracking variables
    taskCard.dataset.id = task.id;
    taskCard.dataset.status = task.status;
    taskCard.dataset.category = task.category;

    const taskHeader = document.createElement('div');
    taskHeader.classList.add('task-header');

    const h3 = document.createElement('h3');
    h3.appendChild(document.createTextNode(task.title));

    const badge = document.createElement('span');
    badge.classList.add('category-badge');
    badge.appendChild(document.createTextNode(task.category));

    taskHeader.append(h3, badge);

    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('task-actions');

    const editBtn = document.createElement('button');
    editBtn.classList.add('btn-edit');
    editBtn.textContent = 'Edit Button';

    const completeBtn = document.createElement('button');
    completeBtn.classList.add('btn-complete');
    completeBtn.textContent = task.status === 'completed' ? 'Undo' : 'Complete Button';

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn-delete');
    deleteBtn.textContent = 'Delete Button';

    actionsContainer.append(editBtn, completeBtn, deleteBtn);
    taskCard.append(taskHeader, actionsContainer);

    return taskCard;
}

// Update Local Storage tracking data array values
function updateLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}


// DOM EVENT MUTATION WRAPPERS
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const titleValue = taskTitleInput.value.trim();
    const categoryValue = taskCategorySelect.value;

    if (!titleValue || !categoryValue) return;

    const newTask = {
        id: Date.now().toString(),
        title: titleValue,
        category: categoryValue,
        status: 'pending'
    };

    // Prepend to start of local array stack trace tracking frame data 
    tasks.unshift(newTask);
    updateLocalStorage();
    renderTasks();
    taskForm.reset();
});

// Event delegation tracking logic on target structure lists
taskContainer.addEventListener('click', (e) => {
    const target = e.target;
    const taskCard = target.closest('.task-card');
    if (!taskCard) return;

    const taskId = taskCard.dataset.id;
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    // Delete Mutation Logic Block
    if (target.classList.contains('btn-delete')) {
        tasks.splice(taskIndex, 1);
        updateLocalStorage();
        renderTasks();
    }

    // Status Completion Toggle Loop Wrapper Block
    else if (target.classList.contains('btn-complete')) {
        tasks[taskIndex].status = tasks[taskIndex].status === 'pending' ? 'completed' : 'pending';
        updateLocalStorage();
        renderTasks();
    }

    // Interactive Edit Mode Engine Node Frame Wrapper Block
    else if (target.classList.contains('btn-edit')) {
        const taskHeader = taskCard.querySelector('.task-header');
        const h3 = taskHeader.querySelector('h3');

        if (target.textContent === 'Edit Button') {
            target.textContent = 'Save';

            const editContainer = document.createElement('div');
            editContainer.classList.add('edit-mode-container');

            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.value = h3.textContent;

            editContainer.append(editInput);
            h3.after(editContainer);
            h3.style.display = 'none';
        } else {
            const editInput = taskCard.querySelector('.edit-mode-container input');
            const updatedTitle = editInput.value.trim();

            if (updatedTitle) {
                tasks[taskIndex].title = updatedTitle;
                updateLocalStorage();
                renderTasks();
            }
        }
    }
});


// LIVE SEARCH, FILTERS, & BULK REMOVAL ACTIONS

searchInput.addEventListener('input', renderTasks);
filterCategory.addEventListener('change', renderTasks);

clearAllBtn.addEventListener('click', () => {
    const confirmed = confirm("Are you completely sure you want to clear all tasks permanently?");
    if (confirmed) {
        tasks = [];
        updateLocalStorage();
        renderTasks();
    }
});