import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
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
import { ThemeProvider } from "./Auth/ThemeContext";
import Register from "./pages/Login/Register";
import AtualizaSaida from "./pages/Item/AtualizaSaida";
import DemandPage from "./pages/Dashboard/Demanda";
import EntradaEstoque from "./pages/Item/EntradaEstoque";
import Pedidos from "./pages/Item/Pedidos";
import Relatorios from "./pages/Item/Relatorios";
import Sugestoes from "./pages/Item/Sugestoes";
import Descartados from "./pages/Item/Descartados";
import Lavanderia from "./pages/Item/Lavanderia";

const AppLayout = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

const AdminRoutes = () => {
  const { authenticated, user } = useAuth();
  return authenticated && user && user.role === "admin" ? <Outlet /> : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route element={<AdminRoutes />}>
              <Route element={<AppLayout />}>
                <Route path="/registro" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/armario" element={<Armario />} />
                <Route path="/funcionarios" element={<Funcionario />} />
                <Route path="/funcionarios/:tipo" element={<Funcionario />} />
                <Route path="/cadastrarfuncionario" element={<CadastraFuncionario />} />
                <Route path="/atualizarfuncionario/:id" element={<AtualizaFuncionario />} />
                <Route path="/novosfuncionarios" element={<Funcionario />} />
                <Route path="/estoque" element={<Estoque />} />
                <Route path="/saidas" element={<TodasSaidas />} />
                <Route path="/saida/:id" element={<SaidaItens />} />
                <Route path="/item/:id" element={<AtualizaItem />} />
                <Route path="/atualizarsaida/:id" element={<AtualizaSaida />} />
                <Route path="/demanda" element={<DemandPage />} />
                <Route path="/entradas" element={<EntradaEstoque />} />
                <Route path="/pedidos" element={<Pedidos />} />
                <Route path="/relatorios" element={<Relatorios />} />
                <Route path="/sugestoes" element={<Sugestoes />} />
                <Route path="/descartados" element={<Descartados />} />
                <Route path="/lavanderia" element={<Lavanderia />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default AppRoutes;