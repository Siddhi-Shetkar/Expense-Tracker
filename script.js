// DOM Elements
const form = document.getElementById('expenseForm');
const expenseIdInput = document.getElementById('expenseId');
const titleInput = document.getElementById('expenseTitle');
const amountInput = document.getElementById('expenseAmount');
const dateInput = document.getElementById('expenseDate');
const categoryInput = document.getElementById('expenseCategory');
const expenseList = document.getElementById('expenseList');
const submitBtn = document.getElementById('submitBtn');

const totalSpentEl = document.getElementById('totalSpent');
const budgetDisplayEl = document.getElementById('budgetDisplay');
const remainingBudgetEl = document.getElementById('remainingBudget');
const remainingCard = document.getElementById('remainingCard');

const budgetInput = document.getElementById('budgetInput');
const setBudgetBtn = document.getElementById('setBudgetBtn');

// State
let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
let budgetLimit = parseFloat(localStorage.getItem('budgetLimit')) || 0;
let categoryChartInstance = null;

// Initialization
function init() {
    // Set today's date as default
    if(!dateInput.value) {
        dateInput.valueAsDate = new Date();
    }
    
    // Set initial budget display
    if(budgetLimit > 0) {
        budgetInput.value = budgetLimit;
    }

    // Chart default config for dark mode
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', sans-serif";

    renderExpenses();
    updateSummary();
}

// Format Currency
function formatMoney(amount) {
    return '₹' + parseFloat(amount).toFixed(2);
}

// Map Category to Icons
const categoryIcons = {
    'Food': 'ph-hamburger',
    'Transport': 'ph-car',
    'Shopping': 'ph-shopping-bag',
    'Entertainment': 'ph-film-strip',
    'Bills': 'ph-receipt',
    'Other': 'ph-dots-three-circle'
};

// Add or Update Expense
form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = expenseIdInput.value;
    const title = titleInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    const category = categoryInput.value;

    if (!title || isNaN(amount) || !date || !category) {
        alert("Please fill in all fields.");
        return;
    }

    const expenseObj = {
        id: id ? id : generateID(),
        title,
        amount,
        date,
        category
    };

    if (id) {
        // Edit mode
        expenses = expenses.map(exp => exp.id === id ? expenseObj : exp);
        submitBtn.textContent = 'Add Expense';
        expenseIdInput.value = '';
    } else {
        // Add mode
        expenses.push(expenseObj);
    }

    // Sort by date descending
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    updateLocalStorage();
    renderExpenses();
    updateSummary();
    form.reset();
    dateInput.valueAsDate = new Date();
});

// Set Budget
setBudgetBtn.addEventListener('click', () => {
    const limit = parseFloat(budgetInput.value);
    if (!isNaN(limit) && limit >= 0) {
        budgetLimit = limit;
        localStorage.setItem('budgetLimit', budgetLimit);
        updateSummary();
        
        // Add subtle animation
        setBudgetBtn.innerHTML = '<i class="ph ph-check-circle"></i>';
        setTimeout(() => {
            setBudgetBtn.innerHTML = '<i class="ph ph-check"></i>';
        }, 1500);
    }
});

// Generate Random ID
function generateID() {
    return Math.random().toString(36).substr(2, 9);
}

// Render Expenses List
function renderExpenses() {
    expenseList.innerHTML = '';
    
    if (expenses.length === 0) {
        expenseList.innerHTML = '<div class="empty-state">No expenses recorded yet.</div>';
        return;
    }

    expenses.forEach(expense => {
        const item = document.createElement('div');
        item.classList.add('transaction-item');
        
        const iconClass = categoryIcons[expense.category] || categoryIcons['Other'];
        
        item.innerHTML = `
            <div class="tx-info">
                <div class="tx-icon cat-${expense.category}">
                    <i class="ph ${iconClass}"></i>
                </div>
                <div class="tx-details">
                    <h4>${expense.title}</h4>
                    <p>${expense.category} • ${formatDate(expense.date)}</p>
                </div>
            </div>
            <div class="tx-amount-actions">
                <span class="tx-amount">${formatMoney(expense.amount)}</span>
                <div class="tx-actions">
                    <button class="btn-icon edit" onclick="editExpense('${expense.id}')"><i class="ph ph-pencil-simple"></i></button>
                    <button class="btn-icon delete" onclick="deleteExpense('${expense.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </div>
        `;
        expenseList.appendChild(item);
    });
}

// Format Date string
function formatDate(dateString) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Delete Expense
window.deleteExpense = function(id) {
    if(confirm('Are you sure you want to delete this expense?')) {
        expenses = expenses.filter(expense => expense.id !== id);
        updateLocalStorage();
        renderExpenses();
        updateSummary();
    }
}

// Edit Expense
window.editExpense = function(id) {
    const expense = expenses.find(exp => exp.id === id);
    if(expense) {
        expenseIdInput.value = expense.id;
        titleInput.value = expense.title;
        amountInput.value = expense.amount;
        dateInput.value = expense.date;
        categoryInput.value = expense.category;
        
        submitBtn.textContent = 'Update Expense';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Update Totals and Budget Logic
function updateSummary() {
    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    
    totalSpentEl.innerText = formatMoney(totalSpent);
    budgetDisplayEl.innerText = budgetLimit > 0 ? formatMoney(budgetLimit) : 'Not Set';
    
    if (budgetLimit > 0) {
        const remaining = budgetLimit - totalSpent;
        remainingBudgetEl.innerText = formatMoney(remaining);
        
        // Update styling based on budget status
        remainingCard.classList.remove('warning', 'danger');
        
        if (remaining < 0) {
            remainingCard.classList.add('danger');
        } else if (remaining < (budgetLimit * 0.2)) { // Less than 20% remaining
            remainingCard.classList.add('warning');
        }
    } else {
        remainingBudgetEl.innerText = 'N/A';
        remainingCard.classList.remove('warning', 'danger');
    }

    updateCharts();
}

// Update Local Storage
function updateLocalStorage() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// Chart Logic
function updateCharts() {
    const categoryTotals = {};
    
    expenses.forEach(exp => {
        if(categoryTotals[exp.category]) {
            categoryTotals[exp.category] += exp.amount;
        } else {
            categoryTotals[exp.category] = exp.amount;
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    
    // Category Colors match CSS
    const backgroundColors = [
        '#10b981', // Food
        '#3b82f6', // Transport
        '#ec4899', // Shopping
        '#8b5cf6', // Entertainment
        '#f59e0b', // Bills
        '#94a3b8'  // Other
    ];

    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    if (expenses.length === 0) {
        // Show empty chart or clear canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "14px Outfit";
        ctx.textAlign = "center";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("No data to display", ctx.canvas.width/2, ctx.canvas.height/2);
        return;
    }

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map(label => {
                    if(label === 'Food') return '#10b981';
                    if(label === 'Transport') return '#3b82f6';
                    if(label === 'Shopping') return '#ec4899';
                    if(label === 'Entertainment') return '#8b5cf6';
                    if(label === 'Bills') return '#f59e0b';
                    return '#94a3b8';
                }),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#f8fafc',
                        padding: 15,
                        font: {
                            family: "'Outfit', sans-serif"
                        }
                    }
                }
            },
            cutout: '75%'
        }
    });
}

// Navigation Tab Logic
const navItems = document.querySelectorAll('.nav-item');
const mainContent = document.querySelector('.main-content');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active state
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Switch view
        const view = item.getAttribute('data-view');
        if (view === 'transactions') {
            mainContent.classList.add('view-transactions');
        } else {
            mainContent.classList.remove('view-transactions');
        }
    });
});

// Start App
init();
