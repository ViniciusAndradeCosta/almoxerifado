import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";

interface LaundryRecord {
    id: number;
    itemId: number;
    quantity: number;
    status: string;
    sendDate: string;
    expectedReturn: string | null;
    returnDate: string | null;
    laundryName: string | null;
    sentBy: string | null;
    notes: string | null;
    atrasado?: boolean;
    diasNaLavanderia?: number;
    item: { name: string; type: string; sector: string; size: string };
}

const Lavanderia = () => {
    const [activeTab, setActiveTab] = useState<"enviar" | "pendentes" | "historico">("pendentes");
    const [pendentes, setPendentes] = useState<LaundryRecord[]>([]);
    const [historico, setHistorico] = useState<LaundryRecord[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulário envio
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [itemSearch, setItemSearch] = useState("");
    const [quantity, setQuantity] = useState<number>(0);
    const [sendDate, setSendDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [expectedReturn, setExpectedReturn] = useState("");
    const [sentBy, setSentBy] = useState("");
    const [notes, setNotes] = useState("");
    const [tipoEnvio, setTipoEnvio] = useState("ESTOQUE");

    // Modal retorno
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnRecord, setReturnRecord] = useState<LaundryRecord | null>(null);
    const [returnQty, setReturnQty] = useState<number>(0);
    const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [returnNotes, setReturnNotes] = useState("");

    // Resumo
    const [totalPecas, setTotalPecas] = useState(0);
    const [totalAtrasados, setTotalAtrasados] = useState(0);

    useEffect(() => {
        fetchPendentes();
        fetchHistorico();
        fetchItems();
    }, []);

    const fetchPendentes = async () => {
        try {
            setLoading(true);
            const res = await api.get("/laundry/pending");
            setPendentes(res.data.registros || []);
            setTotalPecas(res.data.totalPecas || 0);
            setTotalAtrasados(res.data.totalAtrasados || 0);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistorico = async () => {
        try {
            const res = await api.get("/laundry/all");
            setHistorico(res.data.registros || []);
        } catch (error) {
            console.log(error);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await api.get("/getitems");
            setItems(res.data);
        } catch (error) {
            console.log(error);
        }
    };

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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedItemId) {
            window.alert("Selecione um item!");
            return;
        }
        if (quantity <= 0) {
            window.alert("Quantidade inválida!");
            return;
        }

        try {
            const data = {
                itemId: selectedItemId,
                quantity,
                sendDate: new Date(sendDate).toISOString(),
                expectedReturn: expectedReturn ? new Date(expectedReturn).toISOString() : null,
                sentBy: sentBy || null,
                notes: notes || null,
                tipo: tipoEnvio,
            };

            const res = await api.post("/laundry/send", data);

            if (res.data.success) {
                const msg = tipoEnvio === "ESTOQUE"
                    ? "Peças do estoque enviadas para a lavanderia (estoque atualizado)!"
                    : "Peças do funcionário registradas para lavanderia (estoque não afetado).";
                window.alert(msg);
                setSelectedItemId(null);
                setItemSearch("");
                setQuantity(0);
                setExpectedReturn("");
                setSentBy("");
                setNotes("");
                fetchPendentes();
                fetchHistorico();
                fetchItems();
                setActiveTab("pendentes");
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || "Erro ao enviar para lavanderia.";
            window.alert(msg);
        }
    };

    const handleOpenReturn = (record: LaundryRecord) => {
        setReturnRecord(record);
        setReturnQty(record.quantity);
        setReturnDate(new Date().toISOString().split("T")[0]);
        setReturnNotes("");
        setShowReturnModal(true);
    };

    const handleReturn = async () => {
        if (!returnRecord) return;

        if (returnQty <= 0) {
            window.alert("Quantidade inválida!");
            return;
        }

        try {
            const res = await api.post(`/laundry/return/${returnRecord.id}`, {
                quantityReturned: returnQty,
                returnDate: new Date(returnDate).toISOString(),
                notes: returnNotes || null,
            });

            if (res.data.success) {
                window.alert(res.data.message);
                setShowReturnModal(false);
                setReturnRecord(null);
                fetchPendentes();
                fetchHistorico();
                fetchItems();
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || "Erro ao registrar retorno.";
            window.alert(msg);
        }
    };

    const getTipoLabel = (tipo: string | null) => {
        if (tipo === "ESTOQUE") return "Estoque";
        if (tipo === "FUNCIONARIO") return "Funcionário";
        return tipo || "—";
    };

    const getTipoBadge = (tipo: string | null) => {
        if (tipo === "ESTOQUE") return "bg-primary";
        if (tipo === "FUNCIONARIO") return "bg-secondary";
        return "bg-secondary";
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
            <h1 className="text-center mb-4">Controle de Lavanderia</h1>

            {/* Cards resumo */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="text-muted">Lotes Pendentes</h6>
                            <h3>{pendentes.length}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card text-center">
                        <div className="card-body">
                            <h6 className="text-muted">Peças na Lavanderia</h6>
                            <h3 className="text-primary">{totalPecas}</h3>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card text-center border-danger">
                        <div className="card-body">
                            <h6 className="text-muted">Atrasados</h6>
                            <h3 className={totalAtrasados > 0 ? "text-danger" : "text-success"}>
                                {totalAtrasados}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Abas */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "pendentes" ? "active" : ""}`}
                        onClick={() => setActiveTab("pendentes")}
                    >
                        Pendentes
                        {pendentes.length > 0 && (
                            <span className="badge bg-primary ms-2">{pendentes.length}</span>
                        )}
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "enviar" ? "active" : ""}`}
                        onClick={() => setActiveTab("enviar")}
                    >
                        Enviar para Lavanderia
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === "historico" ? "active" : ""}`}
                        onClick={() => setActiveTab("historico")}
                    >
                        Histórico
                    </button>
                </li>
            </ul>

            {/* === ABA: PENDENTES === */}
            {activeTab === "pendentes" && (
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">Peças na Lavanderia</h5>
                        {pendentes.length === 0 ? (
                            <p className="text-success">Nenhuma peça na lavanderia no momento.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Item</th>
                                            <th>Tipo</th>
                                            <th>Origem</th>
                                            <th>Qtd</th>
                                            <th>Enviado em</th>
                                            <th>Retorno Previsto</th>
                                            <th>Dias</th>
                                            <th>Status</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendentes.map((r) => (
                                            <tr key={r.id} className={r.atrasado ? "table-danger" : ""}>
                                                <td>{r.id}</td>
                                                <td>{r.item.name}</td>
                                                <td>{r.item.type}</td>
                                                <td>
                                                    <span className={`badge ${getTipoBadge(r.laundryName)}`}>
                                                        {getTipoLabel(r.laundryName)}
                                                    </span>
                                                </td>
                                                <td>{r.quantity}</td>
                                                <td>{formatDate(r.sendDate)}</td>
                                                <td>
                                                    {r.expectedReturn
                                                        ? formatDate(r.expectedReturn)
                                                        : "—"}
                                                </td>
                                                <td>{r.diasNaLavanderia} dias</td>
                                                <td>
                                                    {r.atrasado ? (
                                                        <span className="badge bg-danger">Atrasado</span>
                                                    ) : (
                                                        <span className="badge bg-primary">Na Lavanderia</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleOpenReturn(r)}
                                                    >
                                                        Registrar Retorno
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === ABA: ENVIAR === */}
            {activeTab === "enviar" && (
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">Enviar Peças para Lavanderia</h5>

                        {/* Seletor de tipo */}
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label className="form-label">Origem das peças</label>
                                <select
                                    className="form-select"
                                    value={tipoEnvio}
                                    onChange={(e) => setTipoEnvio(e.target.value)}
                                >
                                    <option value="ESTOQUE">Estoque — sai do estoque temporariamente</option>
                                    <option value="FUNCIONARIO">Funcionário — não afeta o estoque</option>
                                </select>
                            </div>
                            <div className="col-md-6 d-flex align-items-end">
                                {tipoEnvio === "ESTOQUE" ? (
                                    <div className="alert alert-info mb-0 w-100 py-2">
                                        As peças serão <strong>retiradas do estoque</strong> e devolvidas no retorno.
                                    </div>
                                ) : (
                                    <div className="alert alert-secondary mb-0 w-100 py-2">
                                        Registro apenas para controle. <strong>Estoque não será alterado.</strong>
                                    </div>
                                )}
                            </div>
                        </div>

                        <form onSubmit={handleSend}>
                            <div className="row g-3">
                                <div className="col-md-5 position-relative">
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
                                                    {item.name} — Estoque: {item.quantity}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Quantidade</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={quantity || ""}
                                        onChange={(e) => setQuantity(e.target.value === "" ? 0 : Number(e.target.value))}
                                        min={1}
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Data Envio</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={sendDate}
                                        onChange={(e) => setSendDate(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">Retorno Previsto</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={expectedReturn}
                                        onChange={(e) => setExpectedReturn(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Enviado por</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={sentBy}
                                        onChange={(e) => setSentBy(e.target.value)}
                                        placeholder="Opcional"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Observações</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Opcional"
                                    />
                                </div>
                                <div className="col-12 text-center">
                                    <button type="submit" className="btn btn-primary col-3">
                                        Enviar para Lavanderia
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* === ABA: HISTÓRICO === */}
            {activeTab === "historico" && (
                <div className="card">
                    <div className="card-body">
                        <h5 className="card-title">Histórico Completo</h5>
                        {historico.length === 0 ? (
                            <p>Nenhum registro encontrado.</p>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-striped">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Item</th>
                                            <th>Origem</th>
                                            <th>Qtd</th>
                                            <th>Status</th>
                                            <th>Enviado em</th>
                                            <th>Retornou em</th>
                                            <th>Enviado por</th>
                                            <th>Observações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historico.map((r) => (
                                            <tr key={r.id}>
                                                <td>{r.id}</td>
                                                <td>{r.item.name}</td>
                                                <td>
                                                    <span className={`badge ${getTipoBadge(r.laundryName)}`}>
                                                        {getTipoLabel(r.laundryName)}
                                                    </span>
                                                </td>
                                                <td>{r.quantity}</td>
                                                <td>
                                                    <span className={`badge ${r.status === "RETORNADA" ? "bg-success" : "bg-primary"}`}>
                                                        {r.status === "RETORNADA" ? "Retornada" : "Na Lavanderia"}
                                                    </span>
                                                </td>
                                                <td>{formatDate(r.sendDate)}</td>
                                                <td>{r.returnDate ? formatDate(r.returnDate) : "—"}</td>
                                                <td>{r.sentBy || "—"}</td>
                                                <td>{r.notes || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de retorno */}
            {showReturnModal && returnRecord && (
                <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Retorno — {returnRecord.item.name} (Lote #{returnRecord.id})
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowReturnModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    <strong>Enviadas:</strong> {returnRecord.quantity} peças em{" "}
                                    {formatDate(returnRecord.sendDate)}
                                </p>
                                <p>
                                    <strong>Origem:</strong>{" "}
                                    <span className={`badge ${getTipoBadge(returnRecord.laundryName)}`}>
                                        {getTipoLabel(returnRecord.laundryName)}
                                    </span>
                                    {returnRecord.laundryName === "FUNCIONARIO" && (
                                        <small className="text-muted ms-2">(estoque não será alterado)</small>
                                    )}
                                </p>

                                <div className="mb-3">
                                    <label className="form-label">Quantidade que Retornou</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={returnQty || ""}
                                        onChange={(e) => setReturnQty(e.target.value === "" ? 0 : Number(e.target.value))}
                                        min={1}
                                        max={returnRecord.quantity}
                                    />
                                    {returnRecord.laundryName === "ESTOQUE" && (
                                        <small className="text-muted">
                                            Se retornar menos que {returnRecord.quantity}, a diferença será registrada como descarte (dano).
                                        </small>
                                    )}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Data do Retorno</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={returnDate}
                                        onChange={(e) => setReturnDate(e.target.value)}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Observações</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={returnNotes}
                                        onChange={(e) => setReturnNotes(e.target.value)}
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowReturnModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button className="btn btn-success" onClick={handleReturn}>
                                    Confirmar Retorno
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Lavanderia;