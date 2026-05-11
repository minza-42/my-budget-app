import type { TransactionList } from "./models.ts";
import { formatAmount } from "./chart.ts";

export async function exportToPDF(
	transactions: TransactionList,
	chartCanvas: HTMLCanvasElement,
	renderChart: () => void,
): Promise<void> {
	if (transactions.length === 0) {
		alert("Det finns inga transaktioner att exportera.");
		return;
	}

	renderChart();

	const { default: jsPDF } = await import("jspdf");
	const doc = new jsPDF();
	const pageW = 210;
	const margin = 14;
	const contentW = pageW - margin * 2;

	// ── Färger ─────────────────────────────────────────
	const colorPrimary: [number, number, number]    = [26, 26, 26]; // --accent
	const colorIncome: [number, number, number]     = [26, 102, 64]; // --income
	const colorExpense: [number, number, number]    = [184, 50, 50]; // --expense
	const colorSavings: [number, number, number]    = [26, 79, 166]; // --savings
	const colorHeaderBg: [number, number, number]   = [26, 26, 26]; // --accent
	const colorHeaderText: [number, number, number] = [255, 255, 255];
	const colorRowEven: [number, number, number]    = [242, 242, 240]; // --surface-2
	const colorRowOdd: [number, number, number]     = [255, 255, 255]; // --surface
	const colorBorder: [number, number, number]     = [232, 232, 228]; // --border
	const colorSummaryBg: [number, number, number]  = [247, 247, 245]; // --bg
	const colorText: [number, number, number]       = [26, 26, 26]; // --text
	const colorMuted: [number, number, number]      = [136, 136, 130]; // --text-muted

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