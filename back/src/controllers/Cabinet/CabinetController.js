import prisma from '../../database/client.js'

async function createCabinet(req, res) {
    const { number, size, sector, situation, date, name } = req.body;

    try {
        let newData = {
            number: parseInt(number),
            size,
            sector,
            situation,
            name
        };

        // Verificar se a data está presente
        if (date) {
            newData.date = date; // Incluir a data apenas se estiver presente
        }

        const newCabinet = await prisma.cabinet.create({
            data: newData
        });

        console.log("Novo Armario Criado", newCabinet);
        res.json(newCabinet);
    }
    catch (error) {
        console.error("Erro ao criar novo armario", error);
        res.json({ error: error.message });
    }
}

async function getCabinet(req, res) {
    const { number } = req.params;

    try {
        const cabinet = await prisma.cabinet.findUnique({
            where: {
                number: parseInt(number)
            }
        });

        res.json(cabinet);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getCabinets(req, res) {
    try {
        const cabinets = await prisma.cabinet.findMany();

        res.json(cabinets);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function updateCabinet(req, res) {
    const { number } = req.params;
    const { size, sector, situation, date, name } = req.body;

    try {
        const cabinet = await prisma.cabinet.update({
            where: {
                number: parseInt(number)
            },
            data: {
                size,
                sector,
                situation,
                date,
                name
            }
        });

        res.json(cabinet);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function deleteCabinet(req, res) {
    const {id : number} = req.params;

    try {
        const cabinet = await prisma.cabinet.delete({
            where: {
                number: parseInt(number)
            }
        });

        res.json(cabinet);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

export {
    createCabinet,
    getCabinet,
    getCabinets,
    updateCabinet,
    deleteCabinet
}
