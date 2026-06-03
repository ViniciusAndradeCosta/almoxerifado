import prisma from '../../database/client.js';

async function createUser(req, res) {
    const { id, email, name, login, password, role} = req.body;

    try {
        const newUser = await prisma.user.create({
            data: {
                id,
                email,
                name,
                login,
                password,
                role
            }
        });

        res.json(newUser);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getUser(req, res) {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: parseInt(id)
            }
        });

        res.json(user);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function updateUser(req, res) {
    const { id } = req.params;
    const { email, name, login, password, role } = req.body;

    try {
        const user = await prisma.user.update({
            where: {
                id: parseInt(id)
            },
            data: {
                email,
                name,
                login,
                password,
                role
            }
        });

        res.json(user);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function deleteUser(req, res) {
    const { id } = req.params;

    try {
        await prisma.user.delete({
            where: {
                id: parseInt(id)
            }
        });

        res.json({ message: 'User deleted' });
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function getUsers(req, res) {
    try {
        const users = await prisma.user.findMany();

        res.json(users);
    }
    catch (error) {
        res.json({ error: error.message });
    }
}

async function login(req, res) {
    const { login, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                login
            }
        });

        if (user) {
            if (user.password === password) {
                res.json(user);
            } else {
                res.status(401).json({ error: 'Invalid password' });
            }
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export {
    createUser,
    getUser,
    updateUser,
    deleteUser,
    getUsers,
    login
};
