import type { Transaction, TransactionList } from "./models.ts";
import "./style.css";
import { loadFromLocalStorage, saveToLocalStorage } from "./storage.ts";
import { loadCategories } from "./categories.ts";
import { renderBudgetChart } from "./chart.ts";
import { updateUI } from "./ui.ts";
import { exportToPDF } from "./pdf.ts";

// ── DOM-element ──────────────────────────────────────────
const form            = document.getElementById("budget-form")      as HTMLFormElement;
const descriptionInput = document.getElementById("description")     as HTMLInputElement;
const amountInput     = document.getElementById("amount")           as HTMLInputElement;
const typeSelect      = document.getElementById("type")             as HTMLSelectElement;
const categorySelect  = document.getElementById("category-select")  as HTMLSelectElement;
const list            = document.getElementById("transaction-list") as HTMLUListElement;
const balanceDisplay  = document.getElementById("total-balance")    as HTMLElement;
const exportPdfBtn    = document.getElementById("export-pdf")       as HTMLButtonElement;
const chartCanvas     = document.getElementById("budget-chart")     as HTMLCanvasElement;
const chartLegend     = document.getElementById("chart-legend")     as HTMLUListElement;
const chartEmptyMsg   = document.getElementById("chart-empty-message") as HTMLParagraphElement;

// ── State ────────────────────────────────────────────────
let transactions: TransactionList = loadFromLocalStorage();

// ── Hjälpfunktioner ──────────────────────────────────────
function renderChart(): void {
	renderBudgetChart(transactions, chartCanvas, chartLegend, chartEmptyMsg);
}

function removeTransaction(id: number): void {
	transactions = transactions.filter((t) => t.id !== id);
	saveToLocalStorage(transactions);
	render();
}

function render(): void {
	updateUI(transactions, list, balanceDisplay, renderChart, removeTransaction);
}

// ── Event listeners ──────────────────────────────────────

// ── Dark/Light mode ───────────────────────────────────────
const themeToggleBtn = document.getElementById("theme-toggle") as HTMLButtonElement | null;
const themeIcon = document.getElementById("theme-icon") as HTMLImageElement | null;
const THEME_KEY = "budget-theme";

function setTheme(theme: "light" | "dark") {
	       if (theme === "dark") {
		       document.body.classList.add("dark");
		       if (themeIcon) themeIcon.src = "img/dark-mode.svg";
	       } else {
		       document.body.classList.remove("dark");
		       if (themeIcon) themeIcon.src = "img/light-mode.svg";
	       }
	       localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
	const isDark = document.body.classList.contains("dark");
	setTheme(isDark ? "light" : "dark");
}

if (themeToggleBtn) {
	themeToggleBtn.addEventListener("click", toggleTheme);
}

// Init theme on load
const savedTheme = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
if (savedTheme) {
	setTheme(savedTheme);
} else {
	// Auto-detect system preference
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	setTheme(prefersDark ? "dark" : "light");
}
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
	saveToLocalStorage(transactions);
	render();
	form.reset();
	categorySelect.selectedIndex = 0;
});

if (exportPdfBtn) {
	exportPdfBtn.addEventListener("click", () =>
		exportToPDF(transactions, chartCanvas, renderChart),
	);
}

// ── Init ─────────────────────────────────────────────────
loadCategories(categorySelect);
render();