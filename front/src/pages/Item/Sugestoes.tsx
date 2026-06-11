import { useEffect, useState } from "react";
import api from "../../services/useApi";

interface Sugestao {
    itemId: number;
    itemName: string;
    itemType: string;
    itemSector: string;
    itemSize: string | null;
    estoqueAtual: number;
    margemSeguranca: number;
    totalSaidas: number;
    totalEntradas: number;
    mediaMensalSaida: number;
    mediaMensalEntrada: number;
    coberturaMeses: number;
    estoqueIdeal: number;
    estoqueAlvo: number;
    sugestaoQuantidade: number;
    status: string;
}

interface Alerta {
    itemId: number;
    itemName: string;
    itemType: string;
    itemSector: string;
    itemSize: string | null;
    estoqueAtual: number;
    margemSeguranca: number;
    limiteAtencao: number;
    deficit: number;
    nivel: string;
    mensagem: string;
}

interface AlertasData {
    totalAlertas: number;
    contagem: { critico: number; alerta: number; atencao: number };
    alertas: { critico: Alerta[]; alerta: Alerta[]; atencao: Alerta[] };
}

const Sugestoes = () => {
    const [activeTab, setActiveTab] = useState<"sugestoes" | "alertas" | "margem">("sugestoes");
    const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
    const [alertasData, setAlertasData] = useState<AlertasData | null>(null);
    const [loading, setLoading] = useState(true);

    // Filtros sugestões
    const [filtroStatus, setFiltroStatus] = useState("");
    const [filtroNome, setFiltroNome] = useState("");

    // Margem de segurança
    const [margemItemId, setMargemItemId] = useState("");
    const [margemValor, setMargemValor] = useState<number>(0);
    const [margemSetor, setMargemSetor] = useState("");
    const [margemLoteValor, setMargemLoteValor] = useState<number>(0);

    useEffect(() => {
        fetchSugestoes();
        fetchAlertas();
    }, []);

    const fetchSugestoes = async () => {
        try {
            setLoading(true);
            const res = await api.get("/suggestions");
            setSugestoes(res.data.sugestoes || []);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAlertas = async () => {
        try {
            const res = await api.get("/alerts");
            setAlertasData(res.data);
        } catch (error) {
            console.log(error);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: { [key: string]: string } = {
            SEM_ESTOQUE: "bg-danger",
            ABAIXO_MARGEM: "bg-warning text-dark",
            ATENCAO: "bg-info text-dark",
            ESTOQUE_BAIXO: "bg-secondary",
            OK: "bg-success",
        };
        return badges[status] || "bg-secondary";
    };

    const getStatusLabel = (status: string) => {
        const labels: { [key: string]: string } = {
            SEM_ESTOQUE: "Sem Estoque",
            ABAIXO_MARGEM: "Abaixo da Margem",
            ATENCAO: "Atenção",
            ESTOQUE_BAIXO: "Estoque Baixo",
            OK: "OK",
        };
        return labels[status] || status;
    };

    const getNivelBadge = (nivel: string) => {
        const badges: { [key: string]: string } = {
            CRITICO: "bg-danger",
            ALERTA: "bg-warning text-dark",
            ATENCAO: "bg-info text-dark",
        };
        return badges[nivel] || "bg-secondary";
    };

    // Filtrar sugestões
    const filteredSugestoes = sugestoes.filter((s) => {
        if (filtroStatus && s.status !== filtroStatus) return false;
        if (filtroNome && !s.itemName.toLowerCase().includes(filtroNome.toLowerCase())) return false;
        return true;
    });

    // Atualizar margem individual
    const handleUpdateMargem = async () => {
        if (!margemItemId) {
            window.alert("Informe o ID do item!");
            return;
        }
        try {
            const res = await api.put(`/item/${margemItemId}/minstock`, { minStock: margemValor });
            if (res.data.success) {
                window.alert(res.data.message);
                fetchSugestoes();
                fetchAlertas();
                setMargemItemId("");
                setMargemValor(0);
            }
        } catch (error: any) {
            window.alert(error.response?.data?.error || "Erro ao atualizar margem.");
        }
    };

    // Atualizar margem em lote
    const handleUpdateMargemLote = async () => {
        if (!margemSetor) {
            window.alert("Informe o setor!");
            return;
        }
        try {
            const res = await api.put("/items/minstock/batch", {
                sector: margemSetor,
                minStock: margemLoteValor,
            });
            if (res.data.success) {
                window.alert(res.data.message);
                fetchSugestoes();
                fetchAlertas();
            }
        } catch (error: any) {
            window.alert(error.response?.data?.error || "Erro ao atualizar margem em lote.");
        }
    };

    if (loading) {
        return (
            <div className="container d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                    <h4>Carregando dados...</h4>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-3">
            <h1 className="text-center mb-4">Sugestões e Alertas</h1>

            {/* Cards resumo de alertas */}
            {alertasData && (
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card text-center border-danger">
                            <div className="card-body">
                                <h6 className="text-muted">Crítico</h6>
                                <h3 className="text-danger">{alertasData.contagem.critico}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center border-warning">
                            <div className="card-body">
                                <h6 className="text-muted">Alerta</h6>
                                <h3 className="text-warning">{alertasData.contagem.alerta}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center border-info">
                            <div className="card-body">
                                <h6 className="text-muted">Atenção</h6>
                                <h3 className="text-info">{alertasData.contagem.atencao}</h3>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card text-center">
                            <div className="card-body">
                                <h6 className="text-muted">Total Alertas</h6>
                                <h3>{alertasData.totalAlertas}</h3>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Abas */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "sugestoes" ? "active" : ""}`}
                        onClick={() => setActiveTab("sugestoes")}
                    >
                        Sugestões de Pedido
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "alertas" ? "active" : ""}`}
                        onClick={() => setActiveTab("alertas")}
                    >
                        Alertas Detalhados
                        {alertasData && alertasData.totalAlertas > 0 && (
                            <span className="badge bg-danger ms-2">{alertasData.totalAlertas}</span>
                        )}
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "margem" ? "active" : ""}`}
                        onClick={() => setActiveTab("margem")}
                    >
                        Configurar Margem
                    </button>
                </li>
            </ul>

            {/* === ABA: SUGESTÕES === */}
            {activeTab === "sugestoes" && (
                <>
                    <div className="row g-3 mb-3">
                        <div className="col-md-4">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Filtrar por nome..."
                                value={filtroNome}
                                onChange={(e) => setFiltroNome(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <select
                                className="form-select"
                                value={filtroStatus}
                                onChange={(e) => setFiltroStatus(e.target.value)}
                            >
                                <option value="">Todos os status</option>
                                <option value="SEM_ESTOQUE">Sem Estoque</option>
                                <option value="ABAIXO_MARGEM">Abaixo da Margem</option>
                                <option value="ATENCAO">Atenção</option>
                                <option value="ESTOQUE_BAIXO">Estoque Baixo</option>
                                <option value="OK">OK</option>
                            </select>
                        </div>
                        <div className="col-md-3">
                            <button className="btn btn-outline-primary" onClick={fetchSugestoes}>
                                Atualizar
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-body">
                            <h6 className="card-title">
                                {filteredSugestoes.length} {filteredSugestoes.length === 1 ? "item" : "itens"}
                            </h6>
                            <div className="table-responsive">
                                <table className="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Item</th>
                                            <th>Setor</th>
                                            <th>Estoque</th>
                                            <th>Margem</th>
                                            <th>Média/Mês</th>
                                            <th>Estoque Alvo</th>
                                            <th>Sugestão</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSugestoes.map((s) => (
                                            <tr key={s.itemId}>
                                                <td>{s.itemId}</td>
                                                <td>{s.itemName}</td>
                                                <td>{s.itemSector}</td>
                                                <td>{s.estoqueAtual}</td>
                                                <td>{s.margemSeguranca}</td>
                                                <td>{s.mediaMensalSaida}</td>
                                                <td>{s.estoqueAlvo}</td>
                                                <td className={s.sugestaoQuantidade > 0 ? "fw-bold text-danger" : ""}>
                                                    {s.sugestaoQuantidade > 0 ? s.sugestaoQuantidade : "—"}
                                                </td>
                                                <td>
                                                    <span className={`badge ${getStatusBadge(s.status)}`}>
                                                        {getStatusLabel(s.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* === ABA: ALERTAS DETALHADOS === */}
            {activeTab === "alertas" && alertasData && (
                <>
                    {alertasData.totalAlertas === 0 ? (
                        <div className="card">
                            <div className="card-body text-center">
                                <h5 className="text-success">Nenhum alerta ativo. Estoque saudável!</h5>
                            </div>
                        </div>
                    ) : (
                        <>
                            {alertasData.alertas.critico.length > 0 && (
                                <div className="card mb-3 border-danger">
                                    <div className="card-header bg-danger text-white">
                                        🔴 Crítico — Estoque Zerado ({alertasData.alertas.critico.length})
                                    </div>
                                    <div className="card-body">
                                        {alertasData.alertas.critico.map((a) => (
                                            <div key={a.itemId} className="d-flex justify-content-between align-items-center border-bottom py-2">
                                                <div>
                                                    <strong>{a.itemName}</strong> — {a.itemType} — {a.itemSector}
                                                </div>
                                                <span className="badge bg-danger">Estoque: {a.estoqueAtual}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {alertasData.alertas.alerta.length > 0 && (
                                <div className="card mb-3 border-warning">
                                    <div className="card-header bg-warning text-dark">
                                        🟠 Alerta — Abaixo da Margem ({alertasData.alertas.alerta.length})
                                    </div>
                                    <div className="card-body">
                                        {alertasData.alertas.alerta.map((a) => (
                                            <div key={a.itemId} className="d-flex justify-content-between align-items-center border-bottom py-2">
                                                <div>
                                                    <strong>{a.itemName}</strong> — {a.itemType} — {a.itemSector}
                                                    <br />
                                                    <small className="text-muted">{a.mensagem}</small>
                                                </div>
                                                <div className="text-end">
                                                    <span className="badge bg-warning text-dark">Estoque: {a.estoqueAtual}/{a.margemSeguranca}</span>
                                                    <br />
                                                    <small>Faltam: {a.deficit}</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {alertasData.alertas.atencao.length > 0 && (
                                <div className="card mb-3 border-info">
                                    <div className="card-header bg-info text-dark">
                                        🟡 Atenção — Próximo da Margem ({alertasData.alertas.atencao.length})
                                    </div>
                                    <div className="card-body">
                                        {alertasData.alertas.atencao.map((a) => (
                                            <div key={a.itemId} className="d-flex justify-content-between align-items-center border-bottom py-2">
                                                <div>
                                                    <strong>{a.itemName}</strong> — {a.itemType} — {a.itemSector}
                                                    <br />
                                                    <small className="text-muted">{a.mensagem}</small>
                                                </div>
                                                <div className="text-end">
                                                    <span className="badge bg-info text-dark">Estoque: {a.estoqueAtual}/{a.margemSeguranca}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* === ABA: CONFIGURAR MARGEM === */}
            {activeTab === "margem" && (
                <>
                    <div className="row g-4">
                        <div className="col-md-6">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title">Margem Individual</h5>
                                    <p className="text-muted">Defina a margem de segurança para um item específico.</p>
                                    <div className="row g-2 align-items-end">
                                        <div className="col-4">
                                            <label className="form-label">ID do Item</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={margemItemId}
                                                onChange={(e) => setMargemItemId(e.target.value)}
                                                placeholder="Ex: 1"
                                            />
                                        </div>
                                        <div className="col-4">
                                            <label className="form-label">Margem</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={margemValor}
                                                onChange={(e) => setMargemValor(Number(e.target.value))}
                                                min={0}
                                            />
                                        </div>
                                        <div className="col-4">
                                            <button className="btn btn-primary w-100" onClick={handleUpdateMargem}>
                                                Salvar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title">Margem por Setor</h5>
                                    <p className="text-muted">Defina a margem de segurança para todos os itens de um setor.</p>
                                    <div className="row g-2 align-items-end">
                                        <div className="col-4">
                                            <label className="form-label">Setor</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={margemSetor}
                                                onChange={(e) => setMargemSetor(e.target.value.toUpperCase())}
                                                placeholder="Ex: LIMPEZA"
                                            />
                                        </div>
                                        <div className="col-4">
                                            <label className="form-label">Margem</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={margemLoteValor}
                                                onChange={(e) => setMargemLoteValor(Number(e.target.value))}
                                                min={0}
                                            />
                                        </div>
                                        <div className="col-4">
                                            <button className="btn btn-primary w-100" onClick={handleUpdateMargemLote}>
                                                Salvar Lote
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de referência */}
                    <div className="card mt-4">
                        <div className="card-body">
                            <h6 className="card-title">Margens Atuais</h6>
                            <div className="table-responsive">
                                <table className="table table-striped table-sm">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Item</th>
                                            <th>Setor</th>
                                            <th>Estoque</th>
                                            <th>Margem Atual</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sugestoes.map((s) => (
                                            <tr key={s.itemId}>
                                                <td>{s.itemId}</td>
                                                <td>{s.itemName}</td>
                                                <td>{s.itemSector}</td>
                                                <td>{s.estoqueAtual}</td>
                                                <td>{s.margemSeguranca}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadge(s.status)}`}>
                                                        {getStatusLabel(s.status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Sugestoes;