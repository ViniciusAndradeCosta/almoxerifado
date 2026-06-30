import prisma from "../database/client.js";
import { LIMITE_DIAS_SAIDA } from "../config/businessRules.js";

// ===== REGRA DE NEGÓCIO: valida o limite de 20 dias da data de saída =====
export function validarDataSaida(withdrawalDate) {
  if (!withdrawalDate) return; // sem data informada => usa "agora", sempre válido

  const data = new Date(withdrawalDate);
  if (isNaN(data.getTime())) {
    throw { status: 400, message: "Data de saída inválida." };
  }

  // Permite qualquer horário de HOJE (compara contra o fim do dia atual).
  // Evita falso "futuro" por diferença de fuso entre cliente e servidor.
  const fimDeHoje = new Date();
  fimDeHoje.setHours(23, 59, 59, 999);
  if (data > fimDeHoje) {
    throw { status: 400, message: "Data de saída não pode ser no futuro." };
  }

  const limite = new Date();
  limite.setDate(limite.getDate() - LIMITE_DIAS_SAIDA);
  limite.setHours(0, 0, 0, 0); // compara apenas por dia

  if (data < limite) {
    throw {
      status: 400,
      message: `Data de saída fora do limite permitido de ${LIMITE_DIAS_SAIDA} dias.`,
    };
  }
}

// ===== Registra a saída (entrega ao funcionário) de forma TRANSACIONAL =====
// Ou tudo acontece (cria Withdrawal + AllWithdrawal + decrementa estoque),
// ou nada acontece. Impede o estoque de ficar inconsistente.
export async function registrarSaida({ employeeId, itemId, quantity, withdrawalDate }) {
  const empId = Number(employeeId);
  const itmId = Number(itemId);
  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty <= 0) {
    throw { status: 400, message: "Quantidade inválida." };
  }
  validarDataSaida(withdrawalDate); // <== NOVA REGRA DOS 20 DIAS (servidor)

  return prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: itmId } });
    if (!item) throw { status: 400, message: "Item não encontrado." };

    const employee = await tx.employee.findUnique({ where: { id: empId } });
    if (!employee) throw { status: 400, message: "Funcionário não encontrado." };

    // ===== TRAVA DE ESTOQUE: impede saída maior que o disponível =====
    if (item.quantity < qty) {
      throw {
        status: 400,
        message: `Estoque insuficiente. Disponível: ${item.quantity}, solicitado: ${qty}.`,
      };
    }

    const dataSaida = withdrawalDate ? new Date(withdrawalDate) : new Date();

    const newWithdrawal = await tx.withdrawal.create({
      // Agora a data também é gravada aqui (antes só ia no AllWithdrawal),
      // mantendo as duas tabelas consistentes.
      data: { employeeId: empId, itemId: itmId, quantity: qty, withdrawalDate: dataSaida },
    });

    const newAllWithdrawal = await tx.allWithdrawal.create({
      data: {
        withdrawalDate: dataSaida,
        idWithdrawal: newWithdrawal.id,
        itemId: itmId,
        itemName: item.name,
        itemType: item.type,
        itemSector: item.sector,
        itemSize: item.size || null,
        itemEan: item.ean || null,
        quantity: qty,
        employeeName: employee.name,
        employeeId: empId,
        employeeRole: employee.role,
        employeeCompany: employee.company,
        employeeDepartment: employee.department,
      },
    });

    const updatedItem = await tx.item.update({
      where: { id: itmId },
      data: { quantity: { decrement: qty } },
    });

    return { withdrawal: newWithdrawal, allWithdrawal: newAllWithdrawal, item: updatedItem };
  });
}