import type { TransactionList } from "./models.ts";
import { categoryColorMap } from "./categories.ts";

export function formatAmount(value: number): string {
	return value.toFixed(2).replace(".", ",");
}

export function renderBudgetChart(
	transactions: TransactionList,
	chartCanvas: HTMLCanvasElement,
	chartLegend: HTMLUListElement,
	chartEmptyMessage: HTMLParagraphElement,
): void {
	const ctx = chartCanvas.getContext("2d");
	if (!ctx) return;

	const totalsByCategory: Record<string, number> = {};
	let netTotal = 0;

	for (const transaction of transactions) {
		const signedAmount =
			transaction.type === "income" ? transaction.amount : -transaction.amount;
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

	// Inre cirkel (donut-effekt)
	ctx.beginPath();
	ctx.fillStyle = "#ffffff";
	ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
	ctx.fill();

	// Saldo-text i mitten
	ctx.fillStyle = "#1f2933";
	ctx.font = "bold 17px Song Myung";
	ctx.textAlign = "center";
	ctx.fillText("Saldo", centerX, centerY - 6);
	ctx.font = "15px Song Myung";
	ctx.fillText(`${formatAmount(netTotal)} kr`, centerX, centerY + 18);
}