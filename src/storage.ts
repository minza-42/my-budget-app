import type { TransactionList } from "./models.ts";

const STORAGE_KEY = "transactions";

export function loadFromLocalStorage(): TransactionList {
	return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

export function saveToLocalStorage(transactions: TransactionList): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}