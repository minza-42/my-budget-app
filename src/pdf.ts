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
	const margin = 20; // Något bredare marginal för luftigare känsla
	const contentW = pageW - margin * 2;

	// ── Färger från style.css ─────────────────────────────
	const colorBg: [number, number, number]         = [247, 247, 245]; // --bg
	const colorSurface: [number, number, number]    = [255, 255, 255]; // --surface
	const colorAccent: [number, number, number]     = [26, 26, 26];    // --accent
	const colorBorder: [number, number, number]     = [232, 232, 228]; // --border
	const colorText: [number, number, number]       = [26, 26, 26];    // --text
	const colorTextMuted: [number, number, number]  = [136, 136, 130]; // --text-muted
	
	const colorIncome: [number, number, number]     = [26, 102, 64];   // --income
	const colorExpense: [number, number, number]    = [184, 50, 50];   // --expense
	const colorSavings: [number, number, number]    = [26, 79, 166];   // --savings

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

	// ── Sätt bakgrundsfärg på hela sidan ────────────────────
	doc.setFillColor(...colorBg);
	doc.rect(0, 0, pageW, 297, "F");

	// ── Header (Matchar h1 i CSS) ───────────────────────────
	let y = 25;
	doc.setTextColor(...colorText);
	doc.setFont("times", "italic"); // Närmsta standard-font för Instrument Serif
	doc.setFontSize(32);
	doc.text("Budget App", margin, y);
	
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.setTextColor(...colorTextMuted);
	const dateStr = new Date().toLocaleDateString("sv-SE", {
		year: "numeric", month: "long", day: "numeric",
	});
	doc.text(dateStr, pageW - margin, y - 2, { align: "right" });

	// Linje under header
	y += 10;
	doc.setDrawColor(...colorBorder);
	doc.line(margin, y, pageW - margin, y);

	// ── Totalt Saldo (Hero-sektion) ──────────────────────────
	y += 15; // Ökat avstånd från headern
	doc.setFontSize(8);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...colorTextMuted);
	// Ökat charSpace till 1.5 för en mer "designad" look
	doc.text("TOTALT SALDO", pageW / 2 - 5, y, { align: "center", charSpace: 1.5 }); // Centrera texten
	
	y += 18; // Ökat avstånd mellan texten och summan (från 12 till 18)
	const balanceColor = netTotal >= 0 ? colorIncome : colorExpense;
	doc.setTextColor(...balanceColor);
	doc.setFont("times", "normal");
	doc.setFontSize(44); // Något mindre för att kännas mer elegant
	doc.text(`${formatAmount(netTotal)} kr`, pageW / 2, y, { align: "center" });

	y += 20; // Extra marginal innan nästa sektion börjar

	// ── Transaktionstabell ──────────────────────────────────
	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.setTextColor(...colorAccent);
	doc.text("Transaktioner", margin, y, { align: "left" });

	y += 6;
	const colDesc = margin;
	const colCat  = margin + 80;
	const colAmt  = pageW - margin;
	const rowH = 10;

	// Tabellhuvud
	doc.setFontSize(9);
	doc.setTextColor(...colorTextMuted);
	doc.text("BESKRIVNING", colDesc, y);
	doc.text("KATEGORI", colCat, y);
	doc.text("BELOPP", colAmt, y, { align: "right" });
	
	y += 2;
	doc.setDrawColor(...colorBorder);
	doc.line(margin, y, pageW - margin, y);
	y += 2;

// ── Rader (Transaktioner) ──────────────────────────────
	for (const t of transactions) {
		if (y > 260) { 
			doc.addPage(); 
			doc.setFillColor(...colorBg); 
			doc.rect(0, 0, pageW, 297, "F"); 
			y = 20; 
		}
		
		// Bakgrund för rad
		doc.setFillColor(...colorSurface);
		doc.roundedRect(margin - 2, y, contentW + 4, rowH - 2, 2, 2, "F");

		// BESKRIVNING (Här sätter vi Bold för att säkerställa att texten syns bra)
		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.setTextColor(...colorText);
		doc.text(t.description, colDesc + 2, y + 5);

		// KATEGORI (Normal stil)
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(...colorTextMuted);
		doc.text(t.category.toUpperCase(), colCat, y + 5);

		// BELOPP (Bold stil)
		doc.setFontSize(10);
		doc.setFont("helvetica", "bold");
		const typeColor = t.type === "income" ? colorIncome : (t.type === "savings" ? colorSavings : colorExpense);
		doc.setTextColor(...typeColor);
		const prefix = t.type === "income" ? "+" : "-";
		doc.text(`${prefix}${formatAmount(t.amount)} kr`, colAmt - 2, y + 5, { align: "right" });

		y += rowH;
	}

	// ── Diagram-sektion (Budgethjul) ────────────────────────
	if (chartCanvas.style.display !== "none") {
		y += 15;
		if (y + 80 > 280) { doc.addPage(); doc.setFillColor(...colorBg); doc.rect(0,0,pageW,297,"F"); y = 20; }
		
		doc.setDrawColor(...colorBorder);
		doc.line(margin, y, pageW - margin, y);
		
		y += 15;
			   doc.setFont("helvetica", "bold");
			   doc.setFontSize(10);
			   doc.setTextColor(...colorTextMuted);
			   doc.text("FÖRDELNING", pageW / 2 - 5, y, { align: "center", charSpace: 1.5 }); // Centrera texten

		y += 15;
		const chartSize = 60;
		const chartX = (pageW - chartSize) / 2;
		// Lägg till vit platta bakom diagrammet för att det ska poppa
		doc.setFillColor(255, 255, 255);
		doc.roundedRect(chartX - 10, y - 5, chartSize + 20, chartSize + 15, 5, 5, "F");
		doc.addImage(chartCanvas.toDataURL("image/png"), "PNG", chartX, y, chartSize, chartSize);
	}

	// ── Sidfot ────────────────────────────────────────────────
	const pageCount = (doc as any).internal.getNumberOfPages();
	for (let p = 1; p <= pageCount; p++) {
		doc.setPage(p);
		doc.setFontSize(8);
		doc.setTextColor(...colorTextMuted);
		doc.text(`Sida ${p} av ${pageCount}`, pageW / 2, 288, { align: "center" });
	}

	doc.save("budgetrapport.pdf");
}