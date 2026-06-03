export type AllWithdrawal = {
    id: number;
    idWithdrawal: number;
    withdrawalDate: string;
    itemId: number;
    itemName: string;
    itemType: string;
    itemSector: string;
    itemSize?: string;
    itemEan?: string;
    quantity: number;
    employeeName: string;
    employeeId: number;
    employeeRole: string;
    employeeCompany: string;
    employeeDepartment: string;
}