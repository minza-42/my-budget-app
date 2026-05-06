import type { CategoryData, Transaction, TransactionList } from "./models.ts";
import "./style.css";
// jsPDF laddas dynamiskt vid export

// Globalt state
let transactions: TransactionList = JSON.parse(
	localStorage.getItem("transactions") || "[]",
);

// DOM-element
const form = document.getElementById("budget-form") as HTMLFormElement;
const descriptionInput = document.getElementById(
	"description",
) as HTMLInputElement;
const amountInput = document.getElementById("amount") as HTMLInputElement;
const typeSelect = document.getElementById("type") as HTMLSelectElement;
const categorySelect = document.getElementById(
	"category-select",
) as HTMLSelectElement;
const list = document.getElementById("transaction-list") as HTMLUListElement;
const balanceDisplay = document.getElementById("total-balance") as HTMLElement;
const exportPdfBtn = document.getElementById("export-pdf") as HTMLButtonElement;
const chartCanvas = document.getElementById(
	"budget-chart",
) as HTMLCanvasElement;
const chartLegend = document.getElementById("chart-legend") as HTMLUListElement;
const chartEmptyMessage = document.getElementById(
	"chart-empty-message",
) as HTMLParagraphElement;

const chartColors = [
	"#0b6e4f",
	"#1f7a8c",
	"#bf4342",
	"#f4a259",
	"#5f0f40",
	"#ff7f11",
	"#6a994e",
	"#386641",
];

// Exportera till PDF med separata kolumner och total
async function exportToPDF(): Promise<void> {
	if (transactions.length === 0) {
		alert("Det finns inga transaktioner att exportera.");
		return;
	}

	// Säkerställ att diagrammet är uppdaterat innan export.
	renderBudgetChart();

	// Dynamisk import av jsPDF
	const { default: jsPDF } = await import("jspdf");
	const doc = new jsPDF();
	doc.setFontSize(16);
	doc.text("Budgetrapport", 10, 15);
	doc.setFontSize(12);
	const headers = ["Beskrivning", "Inkomst", "Utgift", "Sparande", "Kategori"];
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
	for (const t of transactions) {
		let income = "";
		let expense = "";
		let savings = "";
		if (t.type === "income") {
			income = t.amount.toString().replace(".", ",");
			total += t.amount;
			totalIncome += t.amount;
		} else if (t.type === "expense") {
			expense = t.amount.toString().replace(".", ",");
			total -= t.amount;
			totalExpense += t.amount;
		} else if (t.type === "savings") {
			savings = t.amount.toString().replace(".", ",");
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
	}
	// Summeringsrad
	y += 3;
	doc.setFontSize(12);
	doc.text("Summa:", 10, y);
	doc.text(totalIncome.toString().replace(".", ","), 60, y);
	doc.text(totalExpense.toString().replace(".", ","), 90, y);
	doc.text(totalSavings.toString().replace(".", ","), 120, y);
	y += 10;
	doc.setFontSize(14);
	doc.text(`Totalt kvar: ${total.toString().replace(".", ",")} kr`, 10, y);

	if (chartCanvas.style.display !== "none") {
		const chartImage = chartCanvas.toDataURL("image/png");
		const chartWidth = 68;
		const chartHeight = 68;
		const chartY = y + 8;

		if (chartY + chartHeight + 12 > 285) {
			doc.addPage();
		}

		const chartX = (210 - chartWidth) / 2;
		const finalChartY = chartY + chartHeight + 12 > 285 ? 30 : chartY;

		doc.addImage(chartImage, "PNG", chartX, finalChartY, chartWidth, chartHeight);
		doc.setFontSize(10);
		doc.text(
			"Budgethjul",
			chartX + chartWidth / 2,
			finalChartY + chartHeight + 5,
		);
		doc.setFontSize(12);
	}

	doc.save("budget.pdf");
}

if (exportPdfBtn) {
	exportPdfBtn.addEventListener("click", exportToPDF);
}

// 1. Ladda kategorier från JSON
async function loadCategories(): Promise<void> {
	const fallbackCategories = [
		"Lön",
		"CSN",
		"Mat",
		"Hyra",
		"Nöje",
		"Transport",
		"Övrigt",
	];

	const setCategories = (categories: string[]): void => {
		const placeholderOption = categorySelect.querySelector('option[value=""]');
		categorySelect.innerHTML = "";
		if (placeholderOption) {
			categorySelect.appendChild(placeholderOption);
		}

		for (const cat of categories) {
			const option = document.createElement("option");
			option.value = cat;
			option.textContent = cat;
			categorySelect.appendChild(option);
		}
	};

	// Visa val direkt, även om hämtningen från JSON skulle misslyckas.
	setCategories(fallbackCategories);

	try {
		const response = await fetch("/categories.json");
		if (!response.ok) {
			throw new Error(`Kunde inte läsa kategorier (${response.status})`);
		}
		const data: CategoryData = await response.json();
		if (data.categories.length > 0) {
			setCategories(data.categories);
		}
	} catch (error) {
		console.error("Kunde inte ladda kategorier:", error);
	}
}

// 2. Spara till Local Storage
function saveToLocalStorage(): void {
	localStorage.setItem("transactions", JSON.stringify(transactions));
}

function formatAmount(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

function renderBudgetChart(): void {
	const ctx = chartCanvas.getContext("2d");
	if (!ctx) {
		return;
	}

	const totalsByCategory: Record<string, number> = {};
	let netTotal = 0;
	for (const transaction of transactions) {
		const signedAmount = transaction.type === "income" ? transaction.amount : -transaction.amount;
		netTotal += signedAmount;
		totalsByCategory[transaction.category] =
			(totalsByCategory[transaction.category] || 0) + Math.abs(signedAmount);
	}

	const entries = Object.entries(totalsByCategory).filter(([, total]) => total > 0);
	const chartTotal = entries.reduce((sum, [, total]) => sum + total, 0);

	ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
	chartLegend.innerHTML = "";

	if (entries.length === 0 || chartTotal === 0) {
		chartCanvas.style.display = "none";
		chartEmptyMessage.hidden = false;
		return;
	}

	chartCanvas.style.display = "block";
	chartEmptyMessage.hidden = true;

	let startAngle = -Math.PI / 2;
	const centerX = chartCanvas.width / 2;
	const centerY = chartCanvas.height / 2;
	const radius = 120;
	const innerRadius = 65;

	entries.forEach(([category, value], index) => {
		const sliceAngle = (value / chartTotal) * Math.PI * 2;
		const endAngle = startAngle + sliceAngle;
		const color = chartColors[index % chartColors.length];

		ctx.beginPath();
		ctx.moveTo(centerX, centerY);
		ctx.arc(centerX, centerY, radius, startAngle, endAngle);
		ctx.closePath();
		ctx.fillStyle = color;
		ctx.fill();

		const legendItem = document.createElement("li");
		legendItem.innerHTML = `
      <span class="legend-swatch" style="background-color:${color}"></span>
      <span>${category}: ${formatAmount(value)} kr (${Math.round((value / chartTotal) * 100)} %)</span>
    `;
		chartLegend.appendChild(legendItem);

		startAngle = endAngle;
	});

	ctx.beginPath();
	ctx.fillStyle = "#ffffff";
	ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = "#1f2933";
	ctx.font = "bold 17px Song Myung";
	ctx.textAlign = "center";
	ctx.fillText("Saldo", centerX, centerY - 6);
	ctx.font = "15px Song Myung";
	ctx.fillText(`${formatAmount(netTotal)} kr`, centerX, centerY + 18);
}

// 3. Uppdatera Balans och UI
function updateUI(): void {
	list.innerHTML = "";
	let total = 0;

	for (const t of transactions) {
		const li = document.createElement("li");
		const isIncome = t.type === "income";
		const val = isIncome ? t.amount : -t.amount;
		total += val;

		// Lägg till CSS-klass baserat på kategori och typ
		const categoryClass =
			t.category === "Sparande" ? "category-savings" : "";
		let typeClass = "expense"; // Standard
		if (t.type === "income") {
			typeClass = "income";
		} else if (t.type === "savings") {
			typeClass = "savings";
		}

		li.innerHTML = `
      <span class="${categoryClass}">${t.description} (${t.category})</span>
      <span class="${typeClass}">${isIncome ? "+" : "-"}${t.amount} kr</span>
      <button class="delete-btn" onclick="removeTransaction(${t.id})" aria-label="Radera ${t.description}">Radera</button>
    `;
		li.setAttribute("role", "listitem");
		list.appendChild(li);
	}

	balanceDisplay.textContent = total.toString();

	// Färgkoda balansen
	balanceDisplay.className = total >= 0 ? "positive" : "negative";
	renderBudgetChart();
}

// 4. Lägg till transaktion
form.addEventListener("submit", (e: Event) => {
	e.preventDefault();

	const newTransaction: Transaction = {
		id: Date.now(),
		description: descriptionInput.value,
		amount: Number(amountInput.value),
		type: typeSelect.value as "income" | "expense" | "savings",
		category: categorySelect.value,
	};

	transactions.push(newTransaction);
	saveToLocalStorage();
	updateUI();
	form.reset();
	categorySelect.selectedIndex = 0;
});

// 5. Radera transaktion (Görs tillgänglig via window för onclick)
function removeTransaction(id: number): void {
	transactions = transactions.filter((t) => t.id !== id);
	saveToLocalStorage();
	updateUI();
}

// Gör funktionen tillgänglig globalt
(window as any).removeTransaction = removeTransaction;

// Initial körning
loadCategories();
updateUI();