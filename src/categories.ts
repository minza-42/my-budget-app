export interface Category {
	name: string;
	color: string;
}

export const categoryColorMap: Record<string, string> = {};

const fallbackCategories: Category[] = [
	{ name: "Lön",       color: "#4CAF50" },
	{ name: "CSN",       color: "#81C784" },
	{ name: "Sparande",  color: "#2E7D32" },
	{ name: "Mat",       color: "#FF9800" },
	{ name: "Hyra",      color: "#D32F2F" },
	{ name: "Nöje",      color: "#2196F3" },
	{ name: "Transport", color: "#9C27B0" },
	{ name: "Övrigt",    color: "#9E9E9E" },
];

function applyCategories(
	categories: Category[],
	categorySelect: HTMLSelectElement,
): void {
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
}

export async function loadCategories(
	categorySelect: HTMLSelectElement,
): Promise<void> {
	applyCategories(fallbackCategories, categorySelect);

	try {
		const response = await fetch(`${import.meta.env.BASE_URL}categories.json`);
		if (!response.ok) throw new Error(`Kunde inte läsa kategorier (${response.status})`);
		const data = await response.json();
		if (Array.isArray(data) && data.length > 0 && data[0].name && data[0].color) {
			applyCategories(data, categorySelect);
		}
	} catch (error) {
		console.error("Kunde inte ladda kategorier:", error);
	}
}