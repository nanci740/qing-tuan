export type LedgerType = 'expense' | 'income';
export type LedgerIcon = 'food' | 'transport' | 'shopping' | 'fun' | 'daily' | 'other';

export interface LedgerTransaction {
  id: string;
  type: LedgerType;
  amount: number;
  currencyCode: string;
  categoryId: string;
  note: string;
  occurredOn: string;
  createdAt: number;
  updatedAt: number;
}
export interface LedgerCategory {
  id: string;
  name: string;
  icon: LedgerIcon;
  archived: boolean;
}
export interface LedgerCurrency {
  code: string;
  name: string;
  decimals: number;
}
export interface LedgerBudget {
  currencyCode: string;
  monthlyAmount: number;
}
export interface LedgerData {
  version: 1;
  transactions: LedgerTransaction[];
  categories: LedgerCategory[];
  currencies: LedgerCurrency[];
  budgets: LedgerBudget[];
}
export interface LedgerDraft {
  id: string | null;
  type: LedgerType;
  amount: string;
  currencyCode: string;
  categoryId: string;
  note: string;
  occurredOn: string;
}
