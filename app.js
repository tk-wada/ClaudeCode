const STORAGE_KEY = "daily-tasks";

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

let tasks = loadTasks();
let currentFilter = "all";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const prioritySelect = document.getElementById("priority-select");
const dueDateInput = document.getElementById("due-date");
const taskList = document.getElementById("task-list");
const taskCount = document.getElementById("task-count");
const filterButtons = document.querySelectorAll(".filter-btn");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  tasks.push({
    id: Date.now(),
    text,
    priority: prioritySelect.value,
    dueDate: dueDateInput.value || null,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  saveTasks(tasks);
  render();
  input.value = "";
  dueDateInput.value = "";
  input.focus();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.completed = !task.completed;
  saveTasks(tasks);
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks(tasks);
  render();
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

const priorityLabels = { high: "\u9AD8", medium: "\u4E2D", low: "\u4F4E" };
const priorityOrder = { high: 0, medium: 1, low: 2 };

function render() {
  const filtered = tasks.filter((t) => {
    if (currentFilter === "active") return !t.completed;
    if (currentFilter === "completed") return t.completed;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  taskList.innerHTML = "";

  sorted.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.completed ? " completed" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => toggleComplete(task.id));

    const textSpan = document.createElement("span");
    textSpan.className = "task-text";
    textSpan.textContent = task.text;

    const badge = document.createElement("span");
    badge.className = `priority-badge priority-${task.priority}`;
    badge.textContent = priorityLabels[task.priority];

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(badge);

    if (task.dueDate) {
      const due = document.createElement("span");
      due.className = "task-due";
      if (isOverdue(task.dueDate) && !task.completed) {
        due.classList.add("overdue");
      }
      due.textContent = formatDate(task.dueDate);
      li.appendChild(due);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "\u00D7";
    delBtn.title = "\u524A\u9664";
    delBtn.addEventListener("click", () => deleteTask(task.id));
    li.appendChild(delBtn);

    taskList.appendChild(li);
  });

  const activeCount = tasks.filter((t) => !t.completed).length;
  taskCount.textContent = `\u672A\u5B8C\u4E86: ${activeCount}\u4EF6`;
}

render();
