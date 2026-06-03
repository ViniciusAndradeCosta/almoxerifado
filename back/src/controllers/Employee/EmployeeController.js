import prisma from '../../database/client.js';
import exceljs from 'exceljs';
import fs from 'fs';

async function createEmployee(req, res) {
    const { id, name, company, role, department, admissionDate, shirt_size, pants_size, shoes_size } = req.body;

    try {
        const newEmployee = await prisma.employee.create({
            data: {
                id,
                name: name.toUpperCase(),
                company: company.toUpperCase(),
                role: role.toUpperCase(),
                department: department.toUpperCase(),
                admissionDate,
                shirt_size,
                pants_size,
                shoes_size
            }
        });

        res.json(newEmployee);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getEmployee(req, res) {
    const { id } = req.params;

    try {
        const employee = await prisma.employee.findUnique({
            where: {
                id: parseInt(id)
            }
        });

        res.json(employee);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getEmployees(req, res) {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: {
                admissionDate: 'desc' // Ordena pela data de admissão em ordem ascendente
            }
        });

        res.json(employees);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function updateEmployee(req, res) {
    const { id } = req.params;
    const { name, company, role, department, admissionDate, shirt_size, pants_size, shoes_size } = req.body;

    try {
        const employee = await prisma.employee.update({
            where: {
                id: parseInt(id)
            },
            data: {
                name: name.toUpperCase(),
                company: company.toUpperCase(),
                role: role.toUpperCase(),
                department: department.toUpperCase(),
                admissionDate,
                shirt_size: shirt_size.toUpperCase(),
                pants_size,
                shoes_size
            }
        });

        res.json(employee);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function deleteEmployee(req, res) {
    const { id } = req.params;

    try {
        const employee = await prisma.employee.delete({
            where: {
                id: parseInt(id)
            }
        });

        res.json(employee);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function downloadNewEmployee(req, res) {
    const { id } = req.params;
    const username = req.headers['username'];

    try {
        // Obtenha os dados do funcionário com o ID fornecido
        const funcionario = await prisma.employee.findUnique({
            where: {
                id: parseInt(id)
            }
        });

        // Crie uma nova instância do Excel Workbook
        const workbook = new exceljs.Workbook();

        // liste os arquivos no diretório
        const files = fs.readdirSync('../');
        console.log(files);
        // Carregue o modelo.xlsx
        await workbook.xlsx.readFile('../modelo.xlsx');

        // Obtenha a planilha ativa
        const worksheet = workbook.getWorksheet(1);

        if (funcionario.company == 'HIPER' || funcionario.company == 'HIPERLANCHES' || funcionario.company == 'HIPERLANCHES MATRIZ' || funcionario.company == 'HIPER LANCHES MATRIZ') {
            worksheet.getCell('D5').value = 'AVENIDA GENTIL BICALHO, 340 - CARNEIRINHOS, JOAO MONLEVADE - MG';
            worksheet.getCell('F4').value = 'CNPJ: 18.107.045/0002-06';
        } if (funcionario.company == 'SUPER FILIAL' || funcionario.company == 'HIPERLANCHES FILIAL' || funcionario.company == 'HIPER LANCHES FILIAL') {
            worksheet.getCell('D5').value = 'AVENIDA WILSON ALVARENGA, 700 - CARNEIRINHOS, JOAO MONLEVADE - MG';
            worksheet.getCell('F4').value = 'CNPJ: 18.107.045/0003-97';
        } if (funcionario.company == 'SUPER MATRIZ'){
            worksheet.getCell('D5').value = 'AVENIDA GETÚLIO VARGAS, 4164 - CARNEIRINHOS, JOAO MONLEVADE - MG';
            worksheet.getCell('F4').value = 'CNPJ: 18.107.045/0001-25';
        }
        // Preencha as células com os dados do funcionário
        worksheet.getCell('E9').value = funcionario.name;
        worksheet.getCell('E10').value = funcionario.role;
        worksheet.getCell('E11').value = funcionario.department;
        worksheet.getCell('E12').value = funcionario.admissionDate;
        worksheet.getCell('E14').value = funcionario.admissionDate;

        worksheet.getCell('E17').value = username.toUpperCase();
        // Salve o arquivo em um buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // Defina os headers da resposta para download do arquivo
        res.set({
            'Content-Disposition': 'attachment; filename="funcionario.xlsx"',
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Envie o buffer como resposta
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Erro ao criar a planilha:', error);
        res.status(500).send('Erro ao criar a planilha');
    }
}

export {
    createEmployee,
    getEmployee,
    getEmployees,
    updateEmployee,
    deleteEmployee,
    downloadNewEmployee
};
