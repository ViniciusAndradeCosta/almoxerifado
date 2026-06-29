import prisma from "../src/database/client.js";
import bcrypt from "bcrypt";

// ============================================================================
// Cria (ou atualiza) o PRIMEIRO usuário administrador do sistema.
//
// Como as rotas de criação de usuário agora exigem um admin autenticado, este
// script serve para o "bootstrapping": criar o admin inicial diretamente no
// banco. Depois disso, novos usuários podem ser criados pela tela /registro.
//
// Uso (defina as variáveis no .env ou inline):
//   ADMIN_LOGIN=admin ADMIN_PASSWORD="senhaForte" ADMIN_NAME="Administrador" \
//   ADMIN_EMAIL="admin@empresa.com" npm run criar-admin
// ============================================================================

const SALT_ROUNDS = 10;

async function criarAdmin() {
  const login = process.env.ADMIN_LOGIN || "admin";
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Administrador";
  const email = process.env.ADMIN_EMAIL || "admin@empresa.com";

  if (!password) {
    console.error("❌ Defina ADMIN_PASSWORD (e opcionalmente ADMIN_LOGIN, ADMIN_NAME, ADMIN_EMAIL).");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { login },
    update: { password: hashedPassword, name, email, role: "admin" },
    create: { login, password: hashedPassword, name, email, role: "admin" },
  });

  console.log(`✅ Admin pronto: login="${user.login}" (id=${user.id}, role=${user.role}).`);
}

criarAdmin()
  .catch((e) => {
    console.error("❌ Erro ao criar admin:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
