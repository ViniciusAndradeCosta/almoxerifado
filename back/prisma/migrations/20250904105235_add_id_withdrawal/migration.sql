/*
  Warnings:

  - Added the required column `idWithdrawal` to the `AllWithdrawal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AllWithdrawal" ADD COLUMN     "idWithdrawal" INTEGER NOT NULL;
