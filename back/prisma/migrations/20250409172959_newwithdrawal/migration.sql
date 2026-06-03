-- CreateTable
CREATE TABLE "AllWithdrawal" (
    "id" SERIAL NOT NULL,
    "withdrawalDate" TIMESTAMP(3) NOT NULL,
    "itemId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemSector" TEXT NOT NULL,
    "itemSize" TEXT NOT NULL,
    "itemEan" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "employeeRole" TEXT NOT NULL,
    "employeeCompany" TEXT NOT NULL,
    "employeeDepartment" TEXT NOT NULL,

    CONSTRAINT "AllWithdrawal_pkey" PRIMARY KEY ("id")
);
