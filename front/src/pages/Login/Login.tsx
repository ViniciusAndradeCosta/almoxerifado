import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../Auth/AuthContext";
import logoHiper from "../../assets/logo-hiper.png";
import fachadaHiper from "../../assets/fachada-hiper.png";

const Login = () => {
  // Mudamos de 'email' para 'identificador' (que pode ser email ou username)
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Passamos o identificador no lugar do email
      await login(identificador, password);
      navigate("/hoje"); 
    } catch (err: any) {
      setError(err.response?.data?.error || "Credenciais inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      padding: "20px",
      backgroundImage: `url(${fachadaHiper})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat"
    }}>
      
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%)",
        zIndex: 0
      }} />

      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        position: "relative",
        zIndex: 1,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{ height: "4px", background: "var(--brand)", width: "100%" }} />
        
        <div style={{ padding: "40px 32px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
            <div style={{ 
              width: "65px", height: "65px", borderRadius: "14px", background: "var(--brand-subtle)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px",
              border: "1px solid var(--brand)", padding: "10px"
            }}>
              <img 
                src={logoHiper} 
                alt="Hiper Comercial" 
                className="login-logo"
                style={{ width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0) invert(1)" }} 
              />
            </div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
              Hiper Comercial
            </h1>
            <p style={{ fontSize: "0.8rem", color: "var(--brand)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>
              Almoxarifado
            </p>
          </div>

          {error && (
            <div style={{ 
              background: "var(--danger)", color: "#fff", padding: "10px 14px", 
              borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600, 
              marginBottom: "20px", textAlign: "center", animation: "fadeIn 0.3s ease" 
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* ── CAMPO ATUALIZADO ── */}
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", letterSpacing: "0.04em" }}>
                E-mail ou Usuário
              </label>
              <input
                type="text" /* Mudado de "email" para "text" para permitir nomes sem @ */
                value={identificador}
                onChange={e => setIdentificador(e.target.value)}
                placeholder="Digite seu e-mail ou nome de usuário"
                required
                style={{ 
                  width: "100%", padding: "12px 14px", fontSize: "0.9rem", 
                  borderRadius: "8px", border: "1px solid var(--border)",
                  background: "var(--surface-2)", color: "var(--text-primary)",
                  outline: "none", transition: "all 0.2s", boxSizing: "border-box"
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "var(--surface)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface-2)"; }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px", letterSpacing: "0.04em" }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ 
                  width: "100%", padding: "12px 14px", fontSize: "0.9rem", 
                  borderRadius: "8px", border: "1px solid var(--border)",
                  background: "var(--surface-2)", color: "var(--text-primary)",
                  outline: "none", transition: "all 0.2s", boxSizing: "border-box"
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "var(--surface)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--surface-2)"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "var(--brand)", color: "#fff", border: "none", borderRadius: "8px",
                padding: "12px", fontSize: "0.9rem", fontWeight: 700, marginTop: "12px",
                cursor: loading ? "not-allowed" : "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 4px 12px rgba(220, 53, 69, 0.2)"
              }}
              onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = "translateY(-1px)" }}
              onMouseLeave={e => { if(!loading) e.currentTarget.style.transform = "translateY(0)" }}
            >
              {loading ? <span className="spinner-border spinner-border-sm" /> : "Entrar no Sistema"}
            </button>
          </form>

          <div style={{ marginTop: "32px", textAlign: "center", display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
              © 2026 Hiper. Todos os direitos reservados.
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: 0, opacity: 0.7 }}>
              Desenvolvido por: <strong>Vinícius Andrade Costa</strong>
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        [data-theme="light"] .login-logo {
          filter: none !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;