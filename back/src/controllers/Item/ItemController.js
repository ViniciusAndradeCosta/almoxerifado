import prisma from '../../database/client.js'

async function createItem(req, res) {
    const { id, name, quantity, ean, type, sector, size} = req.body;

    try {
        const newItem = await prisma.item.create({
            data: {
                id,
                name: name.toUpperCase(),
                quantity: parseInt(quantity),
                ean,
                type: type.toUpperCase(),
                sector: sector.toUpperCase(),
                size
            }
        });

        res.json(newItem);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getItem(req, res) {
    const { id } = req.params;

    try {
        const item = await prisma.item.findUnique({
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

async function getItems(req, res) {
    try {
        const items = await prisma.item.findMany(
            {
                orderBy: {
                    name: 'asc'
                }
            }
        );
        res.set('Cache-Control', 'no-store');
        res.json(items);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateItem(req, res) {
    const { id } = req.params;
    const { name, ean, quantity, type, sector, size } = req.body;

    try {
        const item = await prisma.item.update({
            where: {
                id: parseInt(id)
            },
            data: {
                name,
                ean,
                quantity,
                type,
                sector,
                size
            }
        });

        res.json(item);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function deleteItem(req, res) {
    const { id } = req.params;

    try {
        const item = await prisma.item.delete({
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

async function getItemsByName (req, res) {
    const { name } = req.params;

    try {
        const items = await prisma.item.findMany({
            where: {
                name: {
                    contains: name
                }
            }
        });

        res.json(items);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

export {
    createItem,
    getItem,
    getItems,
    updateItem,
    deleteItem,
    getItemsByName,
}
