import type { CategoryData, Transaction, TransactionList } from "./models.ts";
import "./style.css";
// jsPDF laddas dynamiskt vid export

// Globalt state
let transactions: TransactionList = JSON.parse(
	localStorage.getItem("transactions") || "[]",
);

// DOM-element
const form = document.getElementById("budget-form") as HTMLFormElement;
const descriptionInput = document.getElementById("description") as HTMLInputElement;
const amountInput = document.getElementById("amount") as HTMLInputElement;
const typeSelect = document.getElementById("type") as HTMLSelectElement;
const categorySelect = document.getElementById("category-select") as HTMLSelectElement;
const list = document.getElementById("transaction-list") as HTMLUListElement;
const balanceDisplay = document.getElementById("total-balance") as HTMLElement;
const exportPdfBtn = document.getElementById("export-pdf") as HTMLButtonElement;
const chartCanvas = document.getElementById("budget-chart") as HTMLCanvasElement;
const chartLegend = document.getElementById("chart-legend") as HTMLUListElement;
const chartEmptyMessage = document.getElementById("chart-empty-message") as HTMLParagraphElement;

const categoryColorMap: Record<string, string> = {};

// Exportera till PDF
async function exportToPDF(): Promise<void> {
	if (transactions.length === 0) {
		alert("Det finns inga transaktioner att exportera.");
		return;
	}

	renderBudgetChart();

	const { default: jsPDF } = await import("jspdf");
	const doc = new jsPDF();
	const pageW = 210;
	const margin = 14;
	const contentW = pageW - margin * 2;

	// ── Färger ──────────────────────────────────────────────
	const colorPrimary: [number, number, number]    = [42, 122, 226];
	const colorIncome: [number, number, number]     = [23, 108, 42];
	const colorExpense: [number, number, number]    = [176, 0, 32];
	const colorSavings: [number, number, number]    = [42, 122, 226];
	const colorHeaderBg: [number, number, number]   = [42, 122, 226];
	const colorHeaderText: [number, number, number] = [255, 255, 255];
	const colorRowEven: [number, number, number]    = [240, 244, 255];
	const colorRowOdd: [number, number, number]     = [255, 255, 255];
	const colorBorder: [number, number, number]     = [220, 220, 235];
	const colorSummaryBg: [number, number, number]  = [230, 240, 255];
	const colorText: [number, number, number]       = [44, 62, 80];
	const colorMuted: [number, number, number]      = [120, 140, 160];

	// ── Beräkningar ─────────────────────────────────────────
	let totalIncome = 0;
	let totalExpense = 0;
	let totalSavings = 0;
	for (const t of transactions) {
		if (t.type === "income") totalIncome += t.amount;
		else if (t.type === "expense") totalExpense += t.amount;
		else if (t.type === "savings") totalSavings += t.amount;
	}
	const netTotal = totalIncome - totalExpense - totalSavings;

	// ── Header-banner ────────────────────────────────────────
	doc.setFillColor(...colorPrimary);
	doc.rect(0, 0, pageW, 28, "F");
	doc.setTextColor(...colorHeaderText);
	doc.setFontSize(20);
	doc.setFont("helvetica", "bold");
	doc.text("Budgetrapport", margin, 17);
	const dateStr = new Date().toLocaleDateString("sv-SE", {
		year: "numeric", month: "long", day: "numeric",
	});
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.text(dateStr, pageW - margin, 17, { align: "right" });

	// ── Sammanfattningskort ──────────────────────────────────
	let y = 36;
	const cardH = 22;
	const cardW = (contentW - 6) / 3;
	const cards = [
		{ label: "Inkomster", value: totalIncome,  color: colorIncome },
		{ label: "Utgifter",  value: totalExpense, color: colorExpense },
		{ label: "Sparande",  value: totalSavings, color: colorSavings },
	];
	for (let i = 0; i < cards.length; i++) {
		const cx = margin + i * (cardW + 3);
		doc.setFillColor(248, 250, 255);
		doc.setDrawColor(...colorBorder);
		doc.roundedRect(cx, y, cardW, cardH, 3, 3, "FD");
		doc.setFillColor(...cards[i].color);
		doc.rect(cx, y, cardW, 3, "F");
		doc.setTextColor(...colorMuted);
		doc.setFontSize(8);
		doc.setFont("helvetica", "normal");
		doc.text(cards[i].label, cx + cardW / 2, y + 9, { align: "center" });
		doc.setTextColor(...cards[i].color);
		doc.setFontSize(11);
		doc.setFont("helvetica", "bold");
		doc.text(`${formatAmount(cards[i].value)} kr`, cx + cardW / 2, y + 17, { align: "center" });
	}

	// ── Saldo-badge ──────────────────────────────────────────
	y += cardH + 6;
	const balanceColor: [number, number, number] = netTotal >= 0 ? colorIncome : colorExpense;
	doc.setFillColor(...balanceColor);
	doc.roundedRect(margin, y, contentW, 12, 3, 3, "F");
	doc.setTextColor(255, 255, 255);
	doc.setFontSize(11);
	doc.setFont("helvetica", "bold");
	doc.text(`Totalt kvar: ${formatAmount(netTotal)} kr`, pageW / 2, y + 8, { align: "center" });

	// ── Tabellrubrik ─────────────────────────────────────────
	y += 18;
	doc.setFontSize(12);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...colorText);
	doc.text("Transaktioner", margin, y);
	y += 5;

	const cols = {
		desc:     margin,
		type:     margin + 68,
		category: margin + 100,
		amount:   pageW - margin - 16,
	};
	const rowH = 8;

	// Tabellhuvud
	doc.setFillColor(...colorHeaderBg);
	doc.rect(margin, y, contentW, rowH, "F");
	doc.setTextColor(...colorHeaderText);
	doc.setFontSize(9);
	doc.setFont("helvetica", "bold");
	doc.text("Beskrivning", cols.desc + 2, y + 5.5);
	doc.text("Typ",         cols.type,     y + 5.5);
	doc.text("Kategori",    cols.category, y + 5.5);
	doc.text("Belopp",      cols.amount,   y + 5.5, { align: "right" });
	y += rowH;

	// Tabellrader
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	for (let i = 0; i < transactions.length; i++) {
		if (y > 272) { doc.addPage(); y = 15; }
		const t = transactions[i];
		doc.setFillColor(...(i % 2 === 0 ? colorRowEven : colorRowOdd));
		doc.rect(margin, y, contentW, rowH, "F");
		doc.setDrawColor(...colorBorder);
		doc.line(margin, y + rowH, margin + contentW, y + rowH);

		doc.setTextColor(...colorText);
		const descText = doc.splitTextToSize(t.description, 62)[0] as string;
		doc.text(descText, cols.desc + 2, y + 5.5);

		const typeLabel =
			t.type === "income" ? "Inkomst" :
			t.type === "expense" ? "Utgift" : "Sparande";
		const typeColor =
			t.type === "income" ? colorIncome :
			t.type === "expense" ? colorExpense : colorSavings;
		doc.setTextColor(...typeColor);
		doc.setFont("helvetica", "bold");
		doc.text(typeLabel, cols.type, y + 5.5);

		doc.setTextColor(...colorMuted);
		doc.setFont("helvetica", "normal");
		doc.text(t.category, cols.category, y + 5.5);

		const sign = t.type === "income" ? "+" : "−";
		doc.setTextColor(...typeColor);
		doc.setFont("helvetica", "bold");
		doc.text(`${sign} ${formatAmount(t.amount)} kr`, cols.amount, y + 5.5, { align: "right" });

		y += rowH;
	}

	// ── Summering ────────────────────────────────────────────
	y += 4;
	doc.setFillColor(...colorSummaryBg);
	doc.roundedRect(margin, y, contentW, 24, 3, 3, "F");
	doc.setFontSize(9);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(...colorMuted);
	doc.text("Totalt inkomster:", margin + 4, y + 8);
	doc.text("Totalt utgifter:",  margin + 4, y + 16);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...colorIncome);
	doc.text(`${formatAmount(totalIncome)} kr`,  cols.amount, y + 8,  { align: "right" });
	doc.setTextColor(...colorExpense);
	doc.text(`${formatAmount(totalExpense)} kr`, cols.amount, y + 16, { align: "right" });

	// ── Diagram ───────────────────────────────────────────────
	if (chartCanvas.style.display !== "none") {
		y += 32;
		if (y + 80 > 285) { doc.addPage(); y = 15; }
		doc.setFontSize(12);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(...colorText);
		doc.text("Budgethjul", margin, y);
		y += 4;
		const chartSize = 70;
		const chartX = (pageW - chartSize) / 2;
		doc.addImage(chartCanvas.toDataURL("image/png"), "PNG", chartX, y, chartSize, chartSize);
	}

	// ── Sidfot ────────────────────────────────────────────────
	const pageCount = (doc as any).internal.getNumberOfPages() as number;
	for (let p = 1; p <= pageCount; p++) {
		doc.setPage(p);
		doc.setFillColor(...colorPrimary);
		doc.rect(0, 287, pageW, 10, "F");
		doc.setTextColor(...colorHeaderText);
		doc.setFontSize(8);
		doc.setFont("helvetica", "normal");
		doc.text("Budget App", margin, 293);
		doc.text(`Sida ${p} av ${pageCount}`, pageW - margin, 293, { align: "right" });
	}

	doc.save("budget.pdf");
}

if (exportPdfBtn) {
	exportPdfBtn.addEventListener("click", exportToPDF);
}

// 1. Ladda kategorier från JSON
async function loadCategories(): Promise<void> {
			       const fallbackCategories = [
				       { name: "Lön",       color: "#4CAF50" },
				       { name: "CSN",       color: "#81C784" },
				       { name: "Sparande",  color: "#2E7D32" },
				       { name: "Mat",       color: "#FF9800" },
				       { name: "Hyra",      color: "#D32F2F" },
				       { name: "Nöje",      color: "#2196F3" },
				       { name: "Transport", color: "#9C27B0" },
				       { name: "Övrigt",    color: "#9E9E9E" },
			       ];

	const applyCategories = (categories: { name: string; color: string }[]): void => {
		const placeholderOption = categorySelect.querySelector('option[value=""]');
		categorySelect.innerHTML = "";
		if (placeholderOption) categorySelect.appendChild(placeholderOption);
		for (const cat of categories) {
			const option = document.createElement("option");
			option.value = cat.name;
			option.textContent = cat.name;
			categorySelect.appendChild(option);
			categoryColorMap[cat.name] = cat.color;
		}
	};

	applyCategories(fallbackCategories);

	       try {
		       const response = await fetch(`${import.meta.env.BASE_URL}categories.json`);
		       if (!response.ok) throw new Error(`Kunde inte läsa kategorier (${response.status})`);
		       const data = await response.json();
		       // Om data är en array av kategorier (nytt format)
		       if (Array.isArray(data) && data.length > 0 && data[0].name && data[0].color) {
			       applyCategories(data);
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

// 3. Rita budgethjulet
function renderBudgetChart(): void {
	const ctx = chartCanvas.getContext("2d");
	if (!ctx) return;

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

	for (const [category, value] of entries) {
		const sliceAngle = (value / chartTotal) * Math.PI * 2;
		const endAngle = startAngle + sliceAngle;
		const color = categoryColorMap[category] ?? "#CFCFC4";

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
	}

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

// 4. Uppdatera balans och UI
function updateUI(): void {
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
			<span class="${categoryClass}">${t.description} (${t.category})</span>
			<span class="${typeClass}">${isIncome ? "+" : "-"}${t.amount} kr</span>
			<button class="delete-btn" onclick="removeTransaction(${t.id})" aria-label="Radera ${t.description}">Radera</button>
		`;
		li.setAttribute("role", "listitem");
		list.appendChild(li);
	}

	balanceDisplay.textContent = total.toString();
	balanceDisplay.className = total >= 0 ? "positive" : "negative";
	renderBudgetChart();
}

// 5. Lägg till transaktion
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

// 6. Radera transaktion (global för onclick)
function removeTransaction(id: number): void {
	transactions = transactions.filter((t) => t.id !== id);
	saveToLocalStorage();
	updateUI();
}
(window as any).removeTransaction = removeTransaction;

// Initial körning
loadCategories();
updateUI();