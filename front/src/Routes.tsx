import { BrowserRouter, Navigate, Route, RouteProps, Routes, Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Armario from "./pages/Armario/Armario";
import Funcionario from "./pages/Funcionarios/Funcionario";
import CadastraFuncionario from "./pages/Funcionarios/CadastraFuncionario";
import AtualizaFuncionario from "./pages/Funcionarios/AtualizaFuncionario";
import Estoque from "./pages/Item/Estoque";
import SaidaItens from "./pages/Item/SaidaItens";
import TodasSaidas from "./pages/Item/TodasSaidas";
import AtualizaItem from "./pages/Item/AtualizaItem";
import { AuthProvider, useAuth } from "./Auth/AuthContext";
import Register from "./pages/Login/Register";
import AtualizaSaida from "./pages/Item/AtualizaSaida";
import DemandPage from "./pages/Dashboard/Demanda";

const AdminRoutes = () => {
  const { authenticated, user } = useAuth();

  return (
    authenticated && user && user.role == 'admin' ? <Outlet /> : <Navigate to="/login" />
  )
};

const SacRoutes = () => {
  const { authenticated, user } = useAuth();

  return (
    authenticated && user && user.role == 'rh' ? <Outlet /> : <Navigate to="/login" />
  )
}

const AppRoutes = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<><Login /></>} />
          <Route path="/registro" element={<><Navbar /><Register/></>} />
          <Route element={<AdminRoutes />}>
            <Route path="/dashboard" element={<><Navbar /><Dashboard /></>} />
            <Route path="/armario" element={<><Navbar /><Armario /></>} />
            <Route path="/funcionarios" element={<><Navbar /><Funcionario /></>} />
            <Route path="/funcionarios/:tipo" element={<><Navbar /><Funcionario /></>} />
            <Route path="/cadastrarfuncionario" element={<><Navbar /><CadastraFuncionario /></>} />
            <Route path="/atualizarfuncionario/:id" element={<><Navbar /><AtualizaFuncionario /></>} />
            <Route path="/novosfuncionarios" element={<><Navbar /><Funcionario /></>} />
            <Route path="/estoque" element={<><Navbar /><Estoque /></>} />
            <Route path="/saidas" element={<><Navbar /><TodasSaidas /></>} />
            <Route path="/saida/:id" element={<><Navbar /><SaidaItens /></>} />
            <Route path="/item/:id" element={<><Navbar /><AtualizaItem /></>} />
            <Route path="/atualizarsaida/:id" element={<><Navbar /><AtualizaSaida /></>} />
            <Route path="/demanda" element={<><Navbar /><DemandPage /></>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default AppRoutes;