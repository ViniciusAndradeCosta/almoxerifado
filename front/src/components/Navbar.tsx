// Navbar.js

import { Link } from 'react-router-dom';
import { useState } from 'react';
import './Navbar.css';
import { useAuth } from '../Auth/AuthContext';

const Navbar = () => {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!isMobileMenuOpen);
    };

    const logout = useAuth().logout;

    return (
        <nav className='d-flex justify-content-center navbar2'>
            <div className={`navbar-mobile-button ${isMobileMenuOpen ? 'open' : ''}`} onClick={toggleMobileMenu}>
                <span></span>
                <span></span>
                <span></span>
            </div>
            <ul className={`navbar-list ${isMobileMenuOpen ? 'open' : ''}`}>
                {/* <li><Link to="/login" onClick={toggleMobileMenu}>Login</Link></li>
                <li><Link to="/register" onClick={toggleMobileMenu}>Register</Link></li>
                <li><Link to="/dashboard" onClick={toggleMobileMenu}>Dashboard</Link></li> */}
                <li><Link to="/armario" onClick={toggleMobileMenu}>Armario</Link></li>
                <li><Link to="/funcionarios" onClick={toggleMobileMenu}>Ver Funcionarios</Link></li>
                <li><Link to="/cadastrarfuncionario" onClick={toggleMobileMenu}>Cadastrar Funcionario</Link></li>
                <li><Link to="/funcionarios/new" onClick={toggleMobileMenu}>Novos Funcionarios</Link></li>
                <li><Link to="/estoque" onClick={toggleMobileMenu}>Estoque</Link></li>
                <li><Link to="/dashboard" onClick={toggleMobileMenu}>Dashboard</Link></li>
                <li><Link to="/saidas" onClick={toggleMobileMenu}>Saidas</Link></li>
                <li><Link to="/demanda" onClick={toggleMobileMenu}>Demanda</Link></li>
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