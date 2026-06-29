import jwt from 'jsonwebtoken';

// Segredo usado para assinar/verificar os tokens JWT.
// DEVE ser definido via variável de ambiente em produção (JWT_SECRET).
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-trocar-em-producao';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// Gera um token JWT para um usuário autenticado.
export function gerarToken(user) {
  return jwt.sign(
    { id: user.id, login: user.login, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// Middleware: exige um token JWT válido no header Authorization: Bearer <token>.
// Em caso de sucesso, anexa os dados do usuário em req.user.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

// Middleware: exige que o usuário autenticado tenha papel de administrador.
// Deve ser usado SEMPRE depois de requireAuth.
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  }
  return next();
}
