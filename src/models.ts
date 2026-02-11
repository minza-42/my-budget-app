// Interface för en transaktion
export interface Transaction {
	id: number;
	description: string;
	amount: number;
	type: "income" | "expense" | "savings";
	category: string;
}

// Interface för kategoridatan från JSON
export interface CategoryData {
	categories: string[];
}

// Type för listan med transaktioner
export type TransactionList = Transaction[];