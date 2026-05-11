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
	const margin = 20;
	const contentW = pageW - margin * 2;

	// Kontrollera om mörkt läge är aktivt
	const isDarkMode = document.body.classList.contains("dark");

	// Dynamiska färger baserat på valt tema
	const colorBg: [number, number, number]         = isDarkMode ? [24, 25, 26]   : [247, 247, 245]; 
	const colorSurface: [number, number, number]    = isDarkMode ? [35, 37, 38]   : [255, 255, 255]; 
	const colorAccent: [number, number, number]     = isDarkMode ? [247, 247, 245]: [26, 26, 26];    
	const colorBorder: [number, number, number]     = isDarkMode ? [44, 45, 47]   : [232, 232, 228]; 
	const colorText: [number, number, number]       = isDarkMode ? [247, 247, 245]: [26, 26, 26];    
	const colorTextMuted: [number, number, number]  = isDarkMode ? [176, 176, 170]: [136, 136, 130]; 
	
	// Funktionella färger
	const colorIncome: [number, number, number]     = isDarkMode ? [59, 173, 78]  : [26, 102, 64];   
	const colorExpense: [number, number, number]    = isDarkMode ? [255, 127, 127]: [184, 50, 50];   
	const colorSavings: [number, number, number]    = isDarkMode ? [127, 166, 255]: [26, 79, 166];   

	// --- Beräkningar och rendering (samma logik som förut men med dynamiska färger) ---
	let totalIncome = 0;
	let totalExpense = 0;
	let totalSavings = 0;
	for (const t of transactions) {
		if (t.type === "income") totalIncome += t.amount;
		else if (t.type === "expense") totalExpense += t.amount;
		else if (t.type === "savings") totalSavings += t.amount;
	}
	const netTotal = totalIncome - totalExpense - totalSavings;

	doc.setFillColor(...colorBg);
	doc.rect(0, 0, pageW, 297, "F");

	let y = 25;
	doc.setTextColor(...colorText);
	doc.setFont("times", "italic");
	doc.setFontSize(32);
	doc.text("Budget App", margin, y);
	
	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.setTextColor(...colorTextMuted);
	const dateStr = new Date().toLocaleDateString("sv-SE", {
		year: "numeric", month: "long", day: "numeric",
	});
	doc.text(dateStr, pageW - margin, y - 2, { align: "right" });

	y += 10;
	doc.setDrawColor(...colorBorder);
	doc.line(margin, y, pageW - margin, y);

	y += 15;
	doc.setFontSize(8);
	doc.setFont("helvetica", "bold");
	doc.setTextColor(...colorTextMuted);
	doc.text("TOTALT SALDO", pageW / 2, y, { align: "center", charSpace: 1.5 });
	
	y += 18;
	const balanceColor = netTotal >= 0 ? colorIncome : colorExpense;
	doc.setTextColor(...balanceColor);
	doc.setFont("times", "normal");
	doc.setFontSize(44);
	doc.text(`${formatAmount(netTotal)} kr`, pageW / 2, y, { align: "center" });

	y += 20;

	doc.setFont("helvetica", "bold");
	doc.setFontSize(12);
	doc.setTextColor(...colorAccent);
	doc.text("Transaktioner", margin, y);

	y += 6;
	const colDesc = margin;
	const colCat  = margin + 80;
	const colAmt  = pageW - margin;
	const rowH = 10;

	doc.setFontSize(9);
	doc.setTextColor(...colorTextMuted);
	doc.text("BESKRIVNING", colDesc, y);
	doc.text("KATEGORI", colCat, y);
	doc.text("BELOPP", colAmt, y, { align: "right" });
	
	y += 2;
	doc.setDrawColor(...colorBorder);
	doc.line(margin, y, pageW - margin, y);
	y += 2;

	for (const t of transactions) {
		if (y > 260) { 
			doc.addPage(); 
			doc.setFillColor(...colorBg); 
			doc.rect(0, 0, pageW, 297, "F"); 
			y = 20; 
		}
		
		doc.setFillColor(...colorSurface);
		doc.roundedRect(margin - 2, y, contentW + 4, rowH - 2, 2, 2, "F");

		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.setTextColor(...colorText);
		doc.text(t.description, colDesc + 2, y + 5);

		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(...colorTextMuted);
		doc.text(t.category.toUpperCase(), colCat, y + 5);

		doc.setFontSize(10);
		doc.setFont("helvetica", "bold");
		const typeColor = t.type === "income" ? colorIncome : (t.type === "savings" ? colorSavings : colorExpense);
		doc.setTextColor(...typeColor);
		const prefix = t.type === "income" ? "+" : "-";
		doc.text(`${prefix}${formatAmount(t.amount)} kr`, colAmt - 2, y + 5, { align: "right" });

		y += rowH;
	}

	if (chartCanvas.style.display !== "none") {
		y += 15;
		if (y + 80 > 280) { doc.addPage(); doc.setFillColor(...colorBg); doc.rect(0,0,pageW,297,"F"); y = 20; }
		
		doc.setDrawColor(...colorBorder);
		doc.line(margin, y, pageW - margin, y);
		
		y += 15;
		doc.setFont("helvetica", "bold");
		doc.setFontSize(10);
		doc.setTextColor(...colorTextMuted);
		doc.text("FÖRDELNING", pageW / 2, y, { align: "center", charSpace: 1.5 });

		y += 15;
		const chartSize = 60;
		const chartX = (pageW - chartSize) / 2;
		
		// Anpassa plattan bakom diagrammet till ytfärgen
		doc.setFillColor(...colorSurface);
		doc.roundedRect(chartX - 10, y - 5, chartSize + 20, chartSize + 15, 5, 5, "F");
		doc.addImage(chartCanvas.toDataURL("image/png"), "PNG", chartX, y, chartSize, chartSize);
	}

	const pageCount = (doc as any).internal.getNumberOfPages();
	for (let p = 1; p <= pageCount; p++) {
		doc.setPage(p);
		doc.setFontSize(8);
		doc.setTextColor(...colorTextMuted);
		doc.text(`Sida ${p} av ${pageCount}`, pageW / 2, 288, { align: "center" });
	}

	doc.save(`budgetrapport-${isDarkMode ? 'dark' : 'light'}.pdf`);
}