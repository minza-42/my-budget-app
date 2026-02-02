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
  categorySelect.selectedIndex = 0; // Återställ till "Välj kategori..."
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