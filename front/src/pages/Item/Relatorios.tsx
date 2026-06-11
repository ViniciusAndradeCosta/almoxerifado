import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";

interface ReportData {
    item: {
        id: number;
        name: string;
        type: string;
        sector: string;
        size: string;
        estoqueAtual: number;
    };
    periodo: { inicio: string; fim: string };
    totalSaidas: number;
    totalEntradas: number;
    saldoPeriodo: number;
    consumoPorMes: { [key: string]: number };
    entradasPorMes: { [key: string]: number };
    topFuncionarios: { nome: string; total: number }[];
    detalheSaidas: any[];
    detalheEntradas: any[];
}

interface ConsumptionItem {
    itemId: number;
    itemName: string;
    itemType: string;
    itemSector: string;
    totalSaidas: number;
    estoqueAtual: number;
}

interface StockSummary {
    totalItens: number;
    itensSemEstoque: number;
    itensComEstoque: number;
    itens: any[];
}

const Relatorios = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [activeTab, setActiveTab] = useState<"item" | "geral" | "estoque">("item");

    // Relatório por item
    const [itemSearch, setItemSearch] = useState("");
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    // Relatório geral
    const [consumptionData, setConsumptionData] = useState<ConsumptionItem[]>([]);
    const [geralInicio, setGeralInicio] = useState("");
    const [geralFim, setGeralFim] = useState("");
    const [loadingGeral, setLoadingGeral] = useState(false);

    // Resumo estoque
    const [stockSummary, setStockSummary] = useState<StockSummary | null>(null);
    const [loadingStock, setLoadingStock] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await api.get("/getitems");
            setItems(res.data);
        } catch (error) {
            console.log(error);
        }
    };

    // === RELATÓRIO POR ITEM ===
    const handleItemSearch = (value: string) => {
        setItemSearch(value.toUpperCase());
        setSelectedItemId(null);
        if (value.length > 0) {
            const filtered = items.filter((item) =>
                item.name.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredItems(filtered);
        } else {
            setFilteredItems([]);
        }
    };

    const handleSelectItem = (item: Item) => {
        setSelectedItemId(item.id!);
        setItemSearch(item.name);
        setFilteredItems([]);
    };

    const handleFetchReport = async () => {
        if (!selectedItemId) {
            window.alert("Selecione um item!");
            return;
        }

        try {
            setLoadingReport(true);
            let url = `/reports/item/${selectedItemId}`;
            const params = [];
            if (dataInicio) params.push(`dataInicio=${dataInicio}`);
            if (dataFim) params.push(`dataFim=${dataFim}`);
            if (params.length > 0) url += `?${params.join("&")}`;

            const res = await api.get(url);
            setReportData(res.data);
        } catch (error: any) {
            const msg = error.response?.data?.error || "Erro ao buscar relatório.";
            window.alert(msg);
        } finally {
            setLoadingReport(false);
        }
    };

    // === RELATÓRIO GERAL ===
    const handleFetchGeral = async () => {
        try {
            setLoadingGeral(true);
            let url = "/reports/consumption";
            const params = [];
            if (geralInicio) params.push(`dataInicio=${geralInicio}`);
            if (geralFim) params.push(`dataFim=${geralFim}`);
            if (params.length > 0) url += `?${params.join("&")}`;

            const res = await api.get(url);
            setConsumptionData(res.data.itens || []);
        } catch (error) {
            console.log(error);
            window.alert("Erro ao buscar relatório geral.");
        } finally {
            setLoadingGeral(false);
        }
    };

    // === RESUMO ESTOQUE ===
    const handleFetchStock = async () => {
        try {
            setLoadingStock(true);
            const res = await api.get("/reports/stock-summary");
            setStockSummary(res.data);
        } catch (error) {
            console.log(error);
            window.alert("Erro ao buscar resumo do estoque.");
        } finally {
            setLoadingStock(false);
        }
    };

    // === EXPORT CSV ===
    const handleExportCSV = async () => {
        try {
            let url = "/reports/export/csv";
            const params = [];
            if (geralInicio) params.push(`dataInicio=${geralInicio}`);
            if (geralFim) params.push(`dataFim=${geralFim}`);
            if (params.length > 0) url += `?${params.join("&")}`;

            const res = await api.get(url, { responseType: "blob" });
            const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "relatorio_consumo.csv";
            link.click();
        } catch (error) {
            console.log(error);
            window.alert("Erro ao exportar CSV.");
        }
    };

    return (
        <div className="container mt-3">
            <h1 className="text-center mb-4">Relatórios</h1>

            {/* Abas */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "item" ? "active" : ""}`}
                        onClick={() => setActiveTab("item")}
                    >
                        Por Item
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "geral" ? "active" : ""}`}
                        onClick={() => setActiveTab("geral")}
                    >
                        Consumo Geral
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "estoque" ? "active" : ""}`}
                        onClick={() => { setActiveTab("estoque"); handleFetchStock(); }}
                    >
                        Resumo Estoque
                    </button>
                </li>
            </ul>

            {/* === ABA: POR ITEM === */}
            {activeTab === "item" && (
                <>
                    <div className="card mb-4">
                        <div className="card-body">
                            <h5 className="card-title">Relatório por Item</h5>
                            <div className="row g-3 align-items-end">
                                <div className="col-md-4 position-relative">
                                    <label className="form-label">Item</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={itemSearch}
                                        onChange={(e) => handleItemSearch(e.target.value)}
                                        placeholder="Digite o nome do item..."
                                        autoComplete="off"
                                    />
                                    {filteredItems.length > 0 && (
                                        <ul className="list-group position-absolute w-100" style={{ zIndex: 1000, maxHeight: "200px", overflowY: "auto" }}>
                                            {filteredItems.map((item) => (
                                                <li
                                                    key={item.id}
                                                    className="list-group-item list-group-item-action"
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() => handleSelectItem(item)}
                                                >
                                                    {item.name} — {item.type}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Data Início</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={dataInicio}
                                        onChange={(e) => setDataInicio(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Data Fim</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={dataFim}
                                        onChange={(e) => setDataFim(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <button className="btn btn-primary w-100" onClick={handleFetchReport}>
                                        Buscar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loadingReport && (
                        <div className="text-center mb-3">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    )}

                    {reportData && !loadingReport && (
                        <>
                            {/* Cards resumo */}
                            <div className="row g-3 mb-4">
                                <div className="col-md-3">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h6 className="card-subtitle mb-1 text-muted">Estoque Atual</h6>
                                            <h3>{reportData.item.estoqueAtual}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h6 className="card-subtitle mb-1 text-muted">Total Saídas</h6>
                                            <h3 className="text-danger">{reportData.totalSaidas}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h6 className="card-subtitle mb-1 text-muted">Total Entradas</h6>
                                            <h3 className="text-success">{reportData.totalEntradas}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h6 className="card-subtitle mb-1 text-muted">Saldo Período</h6>
                                            <h3 className={reportData.saldoPeriodo >= 0 ? "text-success" : "text-danger"}>
                                                {reportData.saldoPeriodo >= 0 ? "+" : ""}{reportData.saldoPeriodo}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-3 mb-4">
                                {/* Consumo por mês */}
                                <div className="col-md-6">
                                    <div className="card">
                                        <div className="card-body">
                                            <h6 className="card-title">Saídas por Mês</h6>
                                            {Object.keys(reportData.consumoPorMes).length === 0 ? (
                                                <p className="text-muted">Sem saídas no período.</p>
                                            ) : (
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr><th>Mês</th><th>Quantidade</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.entries(reportData.consumoPorMes).map(([mes, qty]) => (
                                                            <tr key={mes}><td>{mes}</td><td>{qty}</td></tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Top funcionários */}
                                <div className="col-md-6">
                                    <div className="card">
                                        <div className="card-body">
                                            <h6 className="card-title">Top Funcionários (Saídas)</h6>
                                            {reportData.topFuncionarios.length === 0 ? (
                                                <p className="text-muted">Sem dados no período.</p>
                                            ) : (
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr><th>Funcionário</th><th>Quantidade</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {reportData.topFuncionarios.map((f, i) => (
                                                            <tr key={i}><td>{f.nome}</td><td>{f.total}</td></tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* === ABA: CONSUMO GERAL === */}
            {activeTab === "geral" && (
                <>
                    <div className="card mb-4">
                        <div className="card-body">
                            <h5 className="card-title">Consumo Geral</h5>
                            <div className="row g-3 align-items-end">
                                <div className="col-md-3">
                                    <label className="form-label">Data Início</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={geralInicio}
                                        onChange={(e) => setGeralInicio(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Data Fim</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={geralFim}
                                        onChange={(e) => setGeralFim(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-primary w-100" onClick={handleFetchGeral}>
                                        Buscar
                                    </button>
                                </div>
                                <div className="col-md-3">
                                    <button className="btn btn-outline-success w-100" onClick={handleExportCSV}>
                                        Exportar CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {loadingGeral && (
                        <div className="text-center mb-3">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    )}

                    {consumptionData.length > 0 && !loadingGeral && (
                        <div className="card">
                            <div className="card-body">
                                <h6 className="card-title">Ranking de Consumo ({consumptionData.length} itens)</h6>
                                <div className="table-responsive">
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Item</th>
                                                <th>Tipo</th>
                                                <th>Setor</th>
                                                <th>Total Saídas</th>
                                                <th>Estoque Atual</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {consumptionData.map((item) => (
                                                <tr key={item.itemId}>
                                                    <td>{item.itemId}</td>
                                                    <td>{item.itemName}</td>
                                                    <td>{item.itemType}</td>
                                                    <td>{item.itemSector}</td>
                                                    <td>{item.totalSaidas}</td>
                                                    <td>{item.estoqueAtual}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* === ABA: RESUMO ESTOQUE === */}
            {activeTab === "estoque" && (
                <>
                    {loadingStock && (
                        <div className="text-center mb-3">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    )}

                    {stockSummary && !loadingStock && (
                        <>
                            <div className="row g-3 mb-4">
                                <div className="col-md-4">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h6 className="text-muted">Total de Itens</h6>
                                            <h3>{stockSummary.totalItens}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h6 className="text-muted">Com Estoque</h6>
                                            <h3 className="text-success">{stockSummary.itensComEstoque}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="card text-center">
                                        <div className="card-body">
                                            <h6 className="text-muted">Sem Estoque</h6>
                                            <h3 className="text-danger">{stockSummary.itensSemEstoque}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table table-striped">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Nome</th>
                                                    <th>Tipo</th>
                                                    <th>Setor</th>
                                                    <th>Tamanho</th>
                                                    <th>Quantidade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {stockSummary.itens.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td>{item.id}</td>
                                                        <td>{item.name}</td>
                                                        <td>{item.type}</td>
                                                        <td>{item.sector}</td>
                                                        <td>{item.size || "—"}</td>
                                                        <td className={item.quantity === 0 ? "text-danger fw-bold" : ""}>
                                                            {item.quantity}
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
                </>
            )}
        </div>
    );
};

export default Relatorios;