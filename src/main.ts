import './style.css';
// jsPDF laddas dynamiskt vid export
// Interface för en transaktion
interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'savings';
  category: string;
}

// Globalt state
let transactions: Transaction[] = JSON.parse(localStorage.getItem('transactions') || '[]');

// DOM-element
const form = document.getElementById('budget-form') as HTMLFormElement;
const descriptionInput = document.getElementById('description') as HTMLInputElement;
const amountInput = document.getElementById('amount') as HTMLInputElement;
const typeSelect = document.getElementById('type') as HTMLSelectElement;
const categorySelect = document.getElementById('category-select') as HTMLSelectElement;
const list = document.getElementById('transaction-list') as HTMLUListElement;
const balanceDisplay = document.getElementById('total-balance') as HTMLElement;
const exportPdfBtn = document.getElementById('export-pdf') as HTMLButtonElement;
// Exportera till PDF med separata kolumner och total
async function exportToPDF() {
  if (transactions.length === 0) {
    alert('Det finns inga transaktioner att exportera.');
    return;
  }
  // Dynamisk import av jsPDF
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Budgetrapport', 10, 15);
  doc.setFontSize(12);
  const headers = ['Beskrivning', 'Inkomst', 'Utgift', 'Sparande', 'Kategori'];
  let y = 30;
  // Rita tabellhuvud
  doc.text(headers[0], 10, y);
  doc.text(headers[1], 60, y);
  doc.text(headers[2], 90, y);
  doc.text(headers[3], 120, y);
  doc.text(headers[4], 150, y);
  y += 7;
  let total = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavings = 0;
  transactions.forEach(t => {
    let income = '', expense = '', savings = '';
    if (t.type === 'income') {
      income = t.amount.toString().replace('.', ',');
      total += t.amount;
      totalIncome += t.amount;
    } else if (t.type === 'expense') {
      expense = t.amount.toString().replace('.', ',');
      total -= t.amount;
      totalExpense += t.amount;
    } else if (t.type === 'savings') {
      savings = t.amount.toString().replace('.', ',');
      total -= t.amount;
      totalSavings += t.amount;
    }
    doc.text(t.description, 10, y);
    doc.text(income, 60, y);
    doc.text(expense, 90, y);
    doc.text(savings, 120, y);
    doc.text(t.category, 150, y);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
  });
  // Summeringsrad
  y += 3;
  doc.setFontSize(12);
  doc.text('Summa:', 10, y);
  doc.text(totalIncome.toString().replace('.', ','), 60, y);
  doc.text(totalExpense.toString().replace('.', ','), 90, y);
  doc.text(totalSavings.toString().replace('.', ','), 120, y);
  y += 10;
  doc.setFontSize(14);
  doc.text('Totalt kvar: ' + total.toString().replace('.', ',') + ' kr', 10, y);
  doc.save('budget.pdf');
}

if (exportPdfBtn) {
  exportPdfBtn.addEventListener('click', exportToPDF);
}

// 1. Ladda kategorier från JSON
async function loadCategories() {
  try {
    const response = await fetch('./categories.json');
    const data = await response.json();
    data.categories.forEach((cat: string) => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  } catch (error) {
    console.error("Kunde inte ladda kategorier:", error);
  }
}

// 2. Spara till Local Storage
function saveToLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// 3. Uppdatera Balans och UI
function updateUI() {
  list.innerHTML = '';
  let total = 0;

  transactions.forEach((t) => {
    const li = document.createElement('li');
    const isIncome = t.type === 'income';
    const val = isIncome ? t.amount : -t.amount;
    total += val;

    // Lägg till CSS-klass baserat på kategori och typ
    const categoryClass = t.category === 'Sparande' ? 'category-savings' : '';
    let typeClass = 'expense'; // Standard
    if (t.type === 'income') {
      typeClass = 'income';
    } else if (t.type === 'savings') {
      typeClass = 'savings';
    }

    li.innerHTML = `
      <span class="${categoryClass}">${t.description} (${t.category})</span>
      <span class="${typeClass}">${isIncome ? '+' : '-'}${t.amount} kr</span>
      <button class="delete-btn" onclick="removeTransaction(${t.id})" aria-label="Radera ${t.description}">Radera</button>
    `;
    li.setAttribute('role', 'listitem');
    list.appendChild(li);
  });

  balanceDisplay.textContent = total.toString();
  
  // Färgkoda balansen
  balanceDisplay.className = total >= 0 ? 'positive' : 'negative';
}

// 4. Lägg till transaktion
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const newTransaction: Transaction = {
    id: Date.now(),
    description: descriptionInput.value,
    amount: Number(amountInput.value),
    type: typeSelect.value as 'income' | 'expense' | 'savings',
    category: categorySelect.value
  };

  transactions.push(newTransaction);
  saveToLocalStorage();
  updateUI();
  form.reset();
  categorySelect.selectedIndex = 0;
});

// 5. Radera transaktion (Görs tillgänglig via window för onclick)
(window as any).removeTransaction = (id: number) => {
  transactions = transactions.filter(t => t.id !== id);
  saveToLocalStorage();
  updateUI();
};

// Initial körning
loadCategories();
updateUI();