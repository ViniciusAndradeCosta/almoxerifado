import prisma from '../../database/client.js'

async function createItem(req, res) {
    const { id, name, quantity, ean, type, sector, size } = req.body;

    // Validação: nome é obrigatório
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'O nome do item é obrigatório.' });
    }

    try {
        const newItem = await prisma.item.create({
            data: {
                id,
                name: name.trim().toUpperCase(),
                quantity: parseInt(quantity) || 0,
                ean: ean?.trim() || null,
                // type e sector são opcionais — não quebra se vier vazio
                type:   type?.trim()   ? type.trim().toUpperCase()   : null,
                sector: sector?.trim() ? sector.trim().toUpperCase() : null,
                size:   size?.trim()   ? size.trim().toUpperCase()   : null,
            }
        });

        res.json(newItem);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getItem(req, res) {
    const { id } = req.params;

    try {
        const item = await prisma.item.findUnique({
            where: { id: parseInt(id) }
        });

        res.json(item);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getItems(req, res) {
    try {
        const items = await prisma.item.findMany({
            orderBy: { name: 'asc' }
        });
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
            where: { id: parseInt(id) },
            data: {
                name:     name?.trim().toUpperCase()   ?? undefined,
                ean:      ean?.trim()                  ?? null,
                quantity: quantity !== undefined ? parseInt(quantity) : undefined,
                type:     type?.trim()   ? type.trim().toUpperCase()   : null,
                sector:   sector?.trim() ? sector.trim().toUpperCase() : null,
                size:     size?.trim()   ? size.trim().toUpperCase()   : null,
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
            where: { id: parseInt(id) }
        });

        res.json(item);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getItemsByName(req, res) {
    const { name } = req.params;

    try {
        const items = await prisma.item.findMany({
            where: {
                name: { contains: name }
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