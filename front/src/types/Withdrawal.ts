export type Withdrawal = {
    id: number;
    withdrawalDate: string;
    quantity: number;
    itemId: number;
    employeeId: number;
    item: {
        name: string;
    };
    employee: {
        name: string;
    };
}

export type WithdrawalUpdate = {
    withdrawalDate: string;
    quantity: number;
}

export type WithdrawalPlus = {
    id: number;
    withdrawalDate: string;
    quantity: number;
    itemId: number;
    employeeId: number;
    item: {
        name: string;
        sector: string;
        type: string;
    };
    employee: {
        name: string;
        department: string;
    };
}