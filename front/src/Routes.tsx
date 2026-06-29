import { BrowserRouter, Navigate, Route, Routes, Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Armario from "./pages/Armario/Armario";
import Funcionario from "./pages/Funcionarios/Funcionarios";
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
import Hoje from "./pages/Dashboard/Hoje";
import Devolucao from "./pages/Item/Devolucao";
import NotasFiscais from "./pages/Item/NotasFiscais";
import TrocarFuncao from "./pages/Funcionarios/TrocarFuncao";

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
                <Route path="/hoje" element={<Hoje />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/armario" element={<Armario />} />
                <Route path="/funcionarios" element={<Funcionario />} />
                <Route path="/funcionarios/:id/trocar-funcao" element={<TrocarFuncao />} />
                <Route path="/funcionarios/:tipo" element={<Funcionario />} />
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
                <Route path="/devolucao" element={<Devolucao />} />
                <Route path="/notas-fiscais" element={<NotasFiscais />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default AppRoutes;