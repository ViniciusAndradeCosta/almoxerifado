import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './Navbar.css';
import { useAuth } from '../Auth/AuthContext';
import api from '../services/useApi';

const Navbar = () => {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [alertCount, setAlertCount] = useState(0);

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!isMobileMenuOpen);
    };

    const logout = useAuth().logout;

    // Polling de alertas a cada 60 segundos
    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const res = await api.get('/alerts/count');
                setAlertCount(res.data.total || 0);
            } catch (error) {
                console.log(error);
            }
        };

        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <nav className='d-flex justify-content-center navbar2'>
            <div className={`navbar-mobile-button ${isMobileMenuOpen ? 'open' : ''}`} onClick={toggleMobileMenu}>
                <span></span>
                <span></span>
                <span></span>
            </div>
            <ul className={`navbar-list ${isMobileMenuOpen ? 'open' : ''}`}>
                <li><Link to="/armario" onClick={toggleMobileMenu}>Armario</Link></li>
                <li><Link to="/funcionarios" onClick={toggleMobileMenu}>Ver Funcionarios</Link></li>
                <li><Link to="/cadastrarfuncionario" onClick={toggleMobileMenu}>Cadastrar Funcionario</Link></li>
                <li><Link to="/funcionarios/new" onClick={toggleMobileMenu}>Novos Funcionarios</Link></li>
                <li><Link to="/estoque" onClick={toggleMobileMenu}>Estoque</Link></li>
                <li><Link to="/dashboard" onClick={toggleMobileMenu}>Dashboard</Link></li>
                <li><Link to="/saidas" onClick={toggleMobileMenu}>Saidas</Link></li>
                <li><Link to="/demanda" onClick={toggleMobileMenu}>Demanda</Link></li>
                <li><Link to="/entradas" onClick={toggleMobileMenu}>Entradas</Link></li>
                <li><Link to="/pedidos" onClick={toggleMobileMenu}>Pedidos</Link></li>
                <li><Link to="/relatorios" onClick={toggleMobileMenu}>Relatórios</Link></li>
                <li><Link to="/descartados" onClick={toggleMobileMenu}>Descartados</Link></li>
                <li><Link to="/lavanderia" onClick={toggleMobileMenu}>Lavanderia</Link></li>
                <li>
                    <Link to="/sugestoes" onClick={toggleMobileMenu}>
                        Alertas
                        {alertCount > 0 && (
                            <span className="badge bg-danger ms-1" style={{ fontSize: '0.7em' }}>
                                {alertCount}
                            </span>
                        )}
                    </Link>
                </li>
            </ul>
            <div className="user-actions">
                <span>Olá, {useAuth().user?.name}</span>
                <button className='btn btn-danger'>
                    <Link to="/login" className='btn' onClick={logout}>Sair</Link>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;