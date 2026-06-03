import prisma from "../../database/client.js";

async function getEmployeesStartingToday(req, res) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
        const employees = await prisma.employee.findMany({
            where: {
                admissionDate: {
                    gte: yesterday,
                },
            },
        });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export { getEmployeesStartingToday };