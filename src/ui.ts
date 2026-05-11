import type { TransactionList } from "./models.ts";

export function updateUI(
	transactions: TransactionList,
	list: HTMLUListElement,
	balanceDisplay: HTMLElement,
	renderChart: () => void,
	removeTransaction: (id: number) => void,
): void {
	list.innerHTML = "";
	let total = 0;

	for (const t of transactions) {
		const li = document.createElement("li");
		const isIncome = t.type === "income";
		const val = isIncome ? t.amount : -t.amount;
		total += val;

		const categoryClass = t.category === "Sparande" ? "category-savings" : "";
		const typeClass =
			t.type === "income" ? "income" :
			t.type === "savings" ? "savings" : "expense";

		   li.innerHTML = `
			   <span class="item-name">${t.description}</span>
			   <span class="item-category">${t.category}</span>
			   <span class="item-amount ${typeClass}">${isIncome ? "+" : "-"}${t.amount} kr</span>
			   <button class="delete-btn" aria-label="Radera ${t.description}">Radera</button>
		   `;
		li.setAttribute("role", "listitem");

		// Använd addEventListener istället för inline onclick
		li.querySelector(".delete-btn")!.addEventListener("click", () => {
			removeTransaction(t.id);
		});

		list.appendChild(li);
	}

	balanceDisplay.textContent = total.toString();
	balanceDisplay.className = total >= 0 ? "positive" : "negative";
	renderChart();
}