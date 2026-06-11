export interface OrderItem {
    id?: number;
    orderId?: number;
    itemId?: number | null;
    itemName: string;
    itemType?: string;
    itemSize?: string;
    quantity: number;
    quantityReceived?: number;
}

export interface Order {
    id?: number;
    orderDate: string;
    status: string;
    supplier?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    items: OrderItem[];
}