import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../Auth/AuthContext";
import { useTheme } from "../Auth/ThemeContext";
import api from "../services/useApi";
import "./Sidebar.css";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get("/alerts/count");
        setAlertCount(res.data.total || 0);
      } catch (e) { console.log(e); }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fecha mobile ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const toggleMenu = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile hamburger */}
      <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <span></span><span></span><span></span>
      </button>

      {/* Overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          {!collapsed && <h1 className="sidebar-logo">Almoxarifado</h1>}
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "→" : "←"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Estoque */}
          <div className="sidebar-group">
            <button className="sidebar-group-title" onClick={() => toggleMenu("estoque")}>
              <span className="sidebar-icon">📦</span>
              {!collapsed && <span>Estoque</span>}
              {!collapsed && <span className={`sidebar-arrow ${openMenu === "estoque" ? "open" : ""}`}>▾</span>}
            </button>
            {openMenu === "estoque" && !collapsed && (
              <ul className="sidebar-submenu">
                <li><Link to="/estoque" className={isActive("/estoque") ? "active" : ""}>Ver Estoque</Link></li>
                <li><Link to="/entradas" className={isActive("/entradas") ? "active" : ""}>Entradas</Link></li>
                <li><Link to="/saidas" className={isActive("/saidas") ? "active" : ""}>Saídas</Link></li>
                <li><Link to="/descartados" className={isActive("/descartados") ? "active" : ""}>Descartados</Link></li>
                <li><Link to="/lavanderia" className={isActive("/lavanderia") ? "active" : ""}>Lavanderia</Link></li>
              </ul>
            )}
          </div>

          {/* Pedidos */}
          <Link to="/pedidos" className={`sidebar-link ${isActive("/pedidos") ? "active" : ""}`}>
            <span className="sidebar-icon">🛒</span>
            {!collapsed && <span>Pedidos</span>}
          </Link>

          {/* Inteligência */}
          <div className="sidebar-group">
            <button className="sidebar-group-title" onClick={() => toggleMenu("inteligencia")}>
              <span className="sidebar-icon">📊</span>
              {!collapsed && <span>Inteligência</span>}
              {!collapsed && <span className={`sidebar-arrow ${openMenu === "inteligencia" ? "open" : ""}`}>▾</span>}
            </button>
            {openMenu === "inteligencia" && !collapsed && (
              <ul className="sidebar-submenu">
                <li><Link to="/relatorios" className={isActive("/relatorios") ? "active" : ""}>Relatórios</Link></li>
                <li><Link to="/demanda" className={isActive("/demanda") ? "active" : ""}>Demanda</Link></li>
              </ul>
            )}
          </div>

          {/* Alertas */}
          <Link to="/sugestoes" className={`sidebar-link ${isActive("/sugestoes") ? "active" : ""}`}>
            <span className="sidebar-icon">🔔</span>
            {!collapsed && (
              <>
                <span>Alertas</span>
                {alertCount > 0 && <span className="sidebar-badge">{alertCount}</span>}
              </>
            )}
            {collapsed && alertCount > 0 && <span className="sidebar-badge-mini">{alertCount}</span>}
          </Link>

          {/* Funcionários */}
          <div className="sidebar-group">
            <button className="sidebar-group-title" onClick={() => toggleMenu("funcionarios")}>
              <span className="sidebar-icon">👥</span>
              {!collapsed && <span>Funcionários</span>}
              {!collapsed && <span className={`sidebar-arrow ${openMenu === "funcionarios" ? "open" : ""}`}>▾</span>}
            </button>
            {openMenu === "funcionarios" && !collapsed && (
              <ul className="sidebar-submenu">
                <li><Link to="/funcionarios" className={isActive("/funcionarios") ? "active" : ""}>Ver Funcionários</Link></li>
                <li><Link to="/cadastrarfuncionario" className={isActive("/cadastrarfuncionario") ? "active" : ""}>Cadastrar</Link></li>
                <li><Link to="/funcionarios/new" className={isActive("/funcionarios/new") ? "active" : ""}>Novos</Link></li>
              </ul>
            )}
          </div>

          {/* Armário */}
          <Link to="/armario" className={`sidebar-link ${isActive("/armario") ? "active" : ""}`}>
            <span className="sidebar-icon">🗄️</span>
            {!collapsed && <span>Armário</span>}
          </Link>

          {/* Dashboard */}
          <Link to="/dashboard" className={`sidebar-link ${isActive("/dashboard") ? "active" : ""}`}>
            <span className="sidebar-icon">📈</span>
            {!collapsed && <span>Dashboard</span>}
          </Link>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-theme-btn" onClick={toggleTheme}>
            {theme === "dark" ? "☀️" : "🌙"} {!collapsed && (theme === "dark" ? "Modo Claro" : "Modo Escuro")}
          </button>
          <div className="sidebar-user">
            {!collapsed && <span className="sidebar-username">{user?.name}</span>}
            <Link to="/login" className="sidebar-logout" onClick={logout}>
              {collapsed ? "🚪" : "Sair"}
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;