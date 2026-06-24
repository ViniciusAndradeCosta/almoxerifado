import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../Auth/AuthContext";
import { useTheme } from "../Auth/ThemeContext";
import api from "../services/useApi";
import {
  IconHome, IconInbox, IconWash, IconPackage,
  IconShoppingCart, IconBell, IconBarChart, IconTrendingUp,
  IconUsers, IconArchive, IconSun, IconMoon, IconLogOut,
  IconChevronDown, IconChevronLeft, IconChevronRight, IconMenu
} from "./Icons";
import "./Sidebar.css";
import logoHiper from "../assets/logo-hiper.png";

const Sidebar = () => {
  const [collapsed, setCollapsed]   = useState(false);
  const [openMenu, setOpenMenu]     = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout }            = useAuth();
  const { theme, toggleTheme }      = useTheme();
  const location                    = useLocation();

  const fetchAlerts = async () => {
    try {
      const res = await api.get("/alerts/count");
      setAlertCount(res.data.total || 0);
    } catch (e) { console.log(e); }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    fetchAlerts();
  }, [location]);

  const toggle = (menu: string) => setOpenMenu(openMenu === menu ? null : menu);
  const active = (path: string) => location.pathname === path;

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
    : "??";

  return (
    <>
      <button className="sb-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        <IconMenu size={20}/>
      </button>

      {mobileOpen && <div className="sb-overlay" onClick={() => setMobileOpen(false)}/>}

      <aside className={`sb ${collapsed ? "sb--collapsed" : ""} ${mobileOpen ? "sb--open" : ""}`}>

        {/* ── Header ── */}
        <div className="sb-header">
          <div className="sb-brand">
            <img src={logoHiper} alt="Hiper Comercial" className="sb-logo-img"/>
            {!collapsed && (
              <div className="sb-brand-text">
                <span className="sb-brand-name">Hiper Comercial</span>
                <span className="sb-brand-sub">Almoxarifado</span>
              </div>
            )}
          </div>
          <button className="sb-collapse" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <IconChevronRight size={13}/> : <IconChevronLeft size={13}/>}
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="sb-nav">

          {!collapsed && <span className="sb-section">Operação</span>}

          <NavLink to="/hoje"       icon={<IconHome size={20}/>}  label="Hoje"               active={active("/hoje")}       collapsed={collapsed}/>
          <NavLink to="/entradas"   icon={<IconInbox size={20}/>} label="Entrada de Estoque" active={active("/entradas")}   collapsed={collapsed}/>
          <NavLink to="/lavanderia" icon={<IconWash size={20}/>}  label="Lavanderia"         active={active("/lavanderia")} collapsed={collapsed}/>

          {!collapsed && <span className="sb-section">Controle</span>}

          <NavGroup icon={<IconPackage size={20}/>} label="Estoque" id="estoque"
            open={openMenu === "estoque"} collapsed={collapsed} onToggle={() => toggle("estoque")}>
            <SubLink to="/estoque"       label="Ver Estoque"   active={active("/estoque")}/>
            <SubLink to="/notas-fiscais" label="Notas Fiscais" active={active("/notas-fiscais")}/>
            <SubLink to="/saidas"        label="Saídas"        active={active("/saidas")}/>
            <SubLink to="/descartados"   label="Descartados"   active={active("/descartados")}/>
            <SubLink to="/devolucao"     label="Devolução"     active={active("/devolucao")}/>
          </NavGroup>

          <NavLink to="/pedidos"   icon={<IconShoppingCart size={20}/>} label="Pedidos" active={active("/pedidos")}   collapsed={collapsed}/>
          <NavLink to="/sugestoes" icon={<IconBell size={20}/>}         label="Alertas" active={active("/sugestoes")} collapsed={collapsed} badge={alertCount}/>

          {!collapsed && <span className="sb-section">Gestão</span>}

          <NavGroup icon={<IconBarChart size={20}/>} label="Inteligência" id="intel"
            open={openMenu === "intel"} collapsed={collapsed} onToggle={() => toggle("intel")}>
            <SubLink to="/relatorios" label="Relatórios" active={active("/relatorios")}/>
            <SubLink to="/demanda"    label="Demanda"    active={active("/demanda")}/>
          </NavGroup>

          <NavLink to="/funcionarios" icon={<IconUsers size={20}/>}      label="Funcionários" active={active("/funcionarios")} collapsed={collapsed}/>
          <NavLink to="/armario"      icon={<IconArchive size={20}/>}    label="Armário"      active={active("/armario")}      collapsed={collapsed}/>
          <NavLink to="/dashboard"    icon={<IconTrendingUp size={20}/>} label="Dashboard"    active={active("/dashboard")}    collapsed={collapsed}/>

        </nav>

        {/* ── Footer ── */}
        <div className="sb-footer">
          <button className="sb-theme" onClick={toggleTheme}>
            {theme === "dark" ? <IconSun size={16}/> : <IconMoon size={16}/>}
            {!collapsed && <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>}
          </button>
          <div className="sb-user">
            <div className="sb-avatar">{initials}</div>
            {!collapsed && (
              <div className="sb-user-info">
                <span className="sb-user-name">{user?.name}</span>
                <span className="sb-user-role">{user?.role}</span>
              </div>
            )}
            <Link to="/login" className="sb-logout" onClick={logout} title="Sair">
              <IconLogOut size={16}/>
            </Link>
          </div>
        </div>

      </aside>
    </>
  );
};

/* ── Sub-components ── */
interface NavLinkProps {
  to: string; icon: React.ReactNode; label: string;
  active: boolean; collapsed: boolean; badge?: number;
}

const NavLink = ({ to, icon, label, active, collapsed, badge }: NavLinkProps) => (
  <Link to={to} className={`sb-link ${active ? "sb-link--active" : ""}`} title={collapsed ? label : undefined}>
    <div className="sb-link-icon-wrapper">
      {icon}
      {collapsed && badge !== undefined && badge >= 0 && (
        <span className="sb-badge-mini">{badge}</span>
      )}
    </div>
    {!collapsed && <span className="sb-link-label">{label}</span>}
    {!collapsed && badge !== undefined && badge >= 0 && (
      <span className="sb-badge-normal">{badge}</span>
    )}
  </Link>
);

interface NavGroupProps {
  icon: React.ReactNode; label: string; id: string;
  open: boolean; collapsed: boolean; onToggle: () => void; children: React.ReactNode;
}

const NavGroup = ({ icon, label, open, collapsed, onToggle, children }: NavGroupProps) => (
  <div className="sb-group">
    <button className="sb-link sb-link--group" onClick={onToggle}>
      <span className="sb-link-icon-wrapper">{icon}</span>
      {!collapsed && (
        <>
          <span className="sb-link-label">{label}</span>
          <span className={`sb-chevron ${open ? "sb-chevron--open" : ""}`}>
            <IconChevronDown size={12}/>
          </span>
        </>
      )}
    </button>
    {open && !collapsed && <ul className="sb-submenu">{children}</ul>}
  </div>
);

interface SubLinkProps { to: string; label: string; active: boolean; }
const SubLink = ({ to, label, active }: SubLinkProps) => (
  <li>
    <Link to={to} className={`sb-sublink ${active ? "sb-sublink--active" : ""}`}>
      <span className="sb-sublink-dot"/>
      {label}
    </Link>
  </li>
);

export default Sidebar;