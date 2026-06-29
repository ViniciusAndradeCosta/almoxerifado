import prisma from '../../database/client.js';
import bcrypt from 'bcrypt';
import { gerarToken } from '../../middlewares/auth.js';

const SALT_ROUNDS = 10;

// Campos seguros para retornar ao cliente (nunca inclui a senha).
const SAFE_USER_SELECT = {
    id: true,
    email: true,
    name: true,
    login: true,
    role: true,
};

async function createUser(req, res) {
    const { email, name, login, password, role } = req.body;

    if (!email || !name || !login || !password || !role) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                login,
                password: hashedPassword,
                role
            },
            select: SAFE_USER_SELECT
        });

        res.status(201).json(newUser);
    }
    catch (error) {
        // P2002 = violação de unicidade (login/email já existe)
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Login ou e-mail já cadastrado.' });
        }
        res.status(500).json({ error: error.message });
    }
}

async function getUser(req, res) {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: parseInt(id)
            },
            select: SAFE_USER_SELECT
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateUser(req, res) {
    const { id } = req.params;
    const { email, name, login, password, role } = req.body;

    try {
        const dataToUpdate = { email, name, login, role };

        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, SALT_ROUNDS);
        }

        const user = await prisma.user.update({
            where: {
                id: parseInt(id)
            },
            data: dataToUpdate,
            select: SAFE_USER_SELECT
        });

        res.json(user);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Login ou e-mail já cadastrado.' });
        }
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ error: error.message });
    }
}

async function getUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            select: SAFE_USER_SELECT
        });

        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function login(req, res) {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({ error: 'Login e senha são obrigatórios.' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: {
                login
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const token = gerarToken(user);

        // Retorna o token e apenas os dados públicos do usuário (sem a senha).
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                login: user.login,
                role: user.role,
            }
        });
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
