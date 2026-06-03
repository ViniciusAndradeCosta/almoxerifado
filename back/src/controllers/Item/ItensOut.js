import prisma from "../../database/client.js";

async function giveItem(req, res) {
    const { employeeId, itemId, quantity, withdrawalDate } = req.body;

    const verifyItem = await prisma.item.findUnique({
        where: {
            id: itemId
        }
    });

    if (!verifyItem) {
        return res.status(400).json({ error: 'Item não encontrado' });
    }

    // Buscar dados do funcionário
    const employee = await prisma.employee.findUnique({
        where: {
            id: employeeId
        }
    });

    if (!employee) {
        return res.status(400).json({ error: 'Funcionário não encontrado' });
    }

    try {
        // Salvar na tabela Withdrawal
        const newWithdrawal = await prisma.withdrawal.create({
            data: {
                employeeId,
                itemId,
                quantity
            }
        });

        // Salvar na tabela AllWithdrawal, agora com o idWithdrawal correto
        const allWithdrawalData = {
            withdrawalDate: withdrawalDate ? new Date(withdrawalDate) : new Date(),
            idWithdrawal: newWithdrawal.id, // Corrigido para usar o id do withdrawal criado
            itemId: itemId,
            itemName: verifyItem.name,
            itemType: verifyItem.type,
            itemSector: verifyItem.sector,
            itemSize: verifyItem.size || null,
            itemEan: verifyItem.ean || null,
            quantity: quantity,
            employeeName: employee.name,
            employeeId: employeeId,
            employeeRole: employee.role,
            employeeCompany: employee.company,
            employeeDepartment: employee.department
        };
        console.log(allWithdrawalData)

        const newAllWithdrawal = await prisma.allWithdrawal.create({
            data: allWithdrawalData
        });

        const updatedItem = await prisma.item.update({
            where: {
                id: itemId
            },
            data: {
                quantity: {
                    decrement: quantity
                }
            }
        });

        res.json({ 
            success: true, 
            withdrawal: newWithdrawal, 
            allWithdrawal: newAllWithdrawal,
            message: 'Saída registrada com sucesso em ambas as tabelas'
        });
    }
    catch (error) {
        console.error('Erro ao processar saída:', error);
        res.status(500).json({ 
            error: error.message,
            details: error,
            success: false
        });
    }
}

async function returnItem(req, res) {
    const { id } = req.params;

    try {
        const item = await prisma.withdrawal.delete({
            where: {
                id: parseInt(id)
            }
        });

        res.json(item);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function returnItemAndAddQuantity(req, res) {
    const { id } = req.params;

    try {
        const item = await prisma.withdrawal.findUnique({
            where: {
                id: parseInt(id)
            }
        });

        const updatedItem = await prisma.item.update({
            where: {
                id: item.itemId
            },
            data: {
                quantity: {
                    increment: item.quantity // Subtrai a quantidade devolvida da quantidade atual do item
                }
            }
        });

        const deletedItem = await prisma.withdrawal.delete({
            where: {
                id: parseInt(id)
            }
        });

        res.json(deletedItem);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getItensOut(req, res) {
    const { id } = req.params;

    try {
        const itensOut = await prisma.withdrawal.findMany({
            where: {
                employeeId: parseInt(id)
            },
            include: {
                item: {
                    select: {
                        name: true
                    }
                }
            }
        });

        res.json(itensOut);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getWithdrawals(req, res) {
    try {
        const withdrawals = await prisma.withdrawal.findMany();

        res.json(withdrawals);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getWithdrawalsOut(req, res) {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
            include: {
                item: {
                    select: {
                        name: true
                    }
                },
                employee: {
                    select: {
                        name: true
                    }
                }
            }
        });

        res.json(withdrawals);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getWithdrawalsOutPlus(req, res) {
    try {
        const withdrawals = await prisma.withdrawal.findMany({
            include: {
                item: {
                    select: {
                        name: true,
                        sector: true,
                        type: true
                    }
                },
                employee: {
                    select: {
                        name: true,
                        department: true
                    }
                }
            }
        });

        res.json(withdrawals);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function updateWithdrawal(req, res) {
    const { id } = req.params;
    const { quantity, withdrawalDate } = req.body;

    try {
        const withdrawal = await prisma.withdrawal.update({
            where: {
                id: parseInt(id)
            },
            data: {
                quantity,
                withdrawalDate
            }
        });
        const allWithdrawal = await prisma.allWithdrawal.updateMany({
            where: {
                idWithdrawal: parseInt(id)
            },
            data: {
                quantity,
                withdrawalDate
            }
        });

        res.json({ allWithdrawal,
            updatedAllWithdrawalCount: allWithdrawal.count
         });

    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getItemOut(req, res) {
    const { id } = req.params;

    try {
        const itemOut = await prisma.withdrawal.findUnique({
            where: {
                id: parseInt(id)
            },
            include: {
                item: {
                    select: {
                        name: true
                    }
                }
            }
        });

        res.json(itemOut);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getAllWithdrawals(req, res) {
    try {
        const allWithdrawal = await prisma.allWithdrawal.findMany({
            orderBy: {
                withdrawalDate: 'desc'
            }
        })

        res.json(allWithdrawal);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function createWithdrawal(req, res) {
    const {
        idWithdrawal,
        withdrawalDate,
        itemId,
        itemName,
        itemType,
        itemSector,
        itemSize,
        itemEan,
        quantity,
        employeeName,
        employeeId,
        employeeRole,
        employeeCompany,
        employeeDepartment,
      } = req.body;

    try {
        const newWithdrawal = await prisma.allWithdrawal.create({
            data: {
                idWithdrawal: Number(idWithdrawal),
                withdrawalDate: withdrawalDate,
                itemId: Number(itemId),
                itemName,
                itemType,
                itemSector,
                itemSize: itemSize || null,
                itemEan: itemEan || null,
                quantity: Number(quantity),
                employeeName,
                employeeId: Number(employeeId),
                employeeRole,
                employeeCompany,
                employeeDepartment,
            },
        });

        return res.status(201).json(newWithdrawal);
    } catch (error) {
        res.json({ error: error.message });
    }
}

async function getWithdrawalsByItem(req, res) {
    const { itemId } = req.params;

    try {
        const withdrawals = await prisma.withdrawal.findMany({
            where: {
                itemId: parseInt(itemId)
            },
            include: {
                item: {
                    select: {
                        name: true,
                        sector: true,
                        type: true
                    }
                },
                employee: {
                    select: {
                        name: true,
                        department: true
                    }
                }
            },
            orderBy: {
                withdrawalDate: 'desc'
            }
        });

        res.json(withdrawals);
    } catch (error) {
        res.json({ error: error.message });
    }
}

async function deleteItemWithWithdrawals(req, res) {
    const { itemId } = req.params;

    try {
        // Primeiro, deletar todas as saídas relacionadas ao item
        await prisma.withdrawal.deleteMany({
            where: {
                itemId: parseInt(itemId)
            }
        });

        // Depois, deletar o item
        const deletedItem = await prisma.item.delete({
            where: {
                id: parseInt(itemId)
            }
        });

        res.json({ 
            message: 'Item e todas as suas saídas foram deletados com sucesso',
            deletedItem 
        });
    } catch (error) {
        res.json({ error: error.message });
    }
}

async function testAllWithdrawal(req, res) {
    try {
        // Testar se a tabela AllWithdrawal está funcionando
        const testData = {
            idWithdrawal: 1,
            withdrawalDate: new Date(),
            itemId: 1,
            itemName: 'TESTE',
            itemType: 'TESTE',
            itemSector: 'TESTE',
            itemSize: null,
            itemEan: null,
            quantity: 1,
            employeeName: 'TESTE',
            employeeId: 1,
            employeeRole: 'TESTE',
            employeeCompany: 'TESTE',
            employeeDepartment: 'TESTE'
        };

        const result = await prisma.allWithdrawal.create({
            data: testData
        });

        // Deletar o registro de teste
        await prisma.allWithdrawal.delete({
            where: { id: result.id }
        });

        res.json({ 
            success: true, 
            message: 'Tabela AllWithdrawal está funcionando corretamente',
            testResult: result
        });
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message,
            details: error
        });
    }
}

async function deleteAllWithdrawal(req, res) {
    const { id } = req.params;
    try {
        const allWithdrawal = await prisma.allWithdrawal.delete({
            where: {
                id: parseInt(id)
            }
        });
        res.json({ success: true, message: 'Registro excluído com sucesso' });
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

export {
    getItensOut,
    giveItem,
    returnItem,
    returnItemAndAddQuantity,
    getWithdrawals,
    getWithdrawalsOut,
    updateWithdrawal,
    getItemOut,
    getWithdrawalsOutPlus,
    getAllWithdrawals,
    createWithdrawal,
    getWithdrawalsByItem,
    deleteItemWithWithdrawals,
    testAllWithdrawal,
    deleteAllWithdrawal
};