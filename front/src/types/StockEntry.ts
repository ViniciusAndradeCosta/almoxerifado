export interface StockEntry {
    id?: number;
    itemId: number;
    quantity: number;
    entryDate: string;
    supplier?: string;
    invoiceNumber?: string;
    notes?: string;
    createdAt?: string;
    item?: {
        name: string;
        type: string;
        sector: string;
        size: string;
    };
}