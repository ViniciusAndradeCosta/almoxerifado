import prisma from "../../database/client.js";

async function getCountByDepartment(department) {
    try {
        const employeeCount = await prisma.employee.count({
            where: {
                department,
            },
        });
        
        return employeeCount;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function getEmployeeCountByDepartment(req, res) {
    const { department } = req.params;
    try {
        const employeeCount = await getCountByDepartment(department);
        res.json({ count: employeeCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getCountByCompany(company) {
    try {
        const employeeCount = await prisma.employee.count({
            where: {
                company,
            },
        });

        return employeeCount;
    } catch (error) {
        throw new Error(error.message);
    }
}

async function getEmployeeCountByCompany(req, res) {
    const { company } = req.params;
    try {
        const employeeCount = await getCountByCompany(company);
        res.json({ count: employeeCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export {
    getEmployeeCountByDepartment,
    getEmployeeCountByCompany,
};