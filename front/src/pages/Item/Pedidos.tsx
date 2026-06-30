import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../services/useApi";
import { Order, OrderItem } from "../../types/Order";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";
import { SearchDropdown } from "../../components/SearchDropdown";

const Pedidos = () => {
    const location = useLocation();

    const [orders, setOrders] = useState<Order[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    const [supplier, setSupplier] = useState("");
    const [notes, setNotes] = useState("");
    const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);

    const [pedidoItens, setPedidoItens] = useState<OrderItem[]>([]);
    const [novoItemName, setNovoItemName] = useState("");
    const [novoItemType, setNovoItemType] = useState("");
    const [novoItemSize, setNovoItemSize] = useState("");
    const [novoItemQty, setNovoItemQty] = useState<number>(1);
    const [novoItemId, setNovoItemId] = useState<number | null>(null);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [receiveQty, setReceiveQty] = useState<{ [key: number]: number }>({});

    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        fetchOrders();
        fetchItems();
    }, []);

    // Lê parâmetros da URL e pré-preenche o formulário (ex: vindo do botão "Pedir" na tela Hoje)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const itemId   = params.get("itemId");
        const itemName = params.get("itemName");
        const itemType = params.get("itemType");
        const itemSize = params.get("itemSize");
        const qty      = params.get("qty");

        if (itemId && itemName) {
            setNovoItemId(Number(itemId));
            setNovoItemName(decodeURIComponent(itemName));
            setNovoItemType(decodeURIComponent(itemType || ""));
            setNovoItemSize(decodeURIComponent(itemSize || ""));
            if (qty) setNovoItemQty(Math.max(1, parseInt(qty) || 1));
            // Scroll suave para o formulário
            setTimeout(() => {
                document.getElementById("form-adicionar-item")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 400);
        }
    }, [location.search]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get("/getorders");
            setOrders(res.data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
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
        setNovoItemName(value.toUpperCase());
        setNovoItemId(null);
        const q = value.toLowerCase().trim();
        if (q.length > 0) {
            // Casa pela ORDEM das letras digitadas: nome (ou qualquer palavra dele)
            // que COMECE com o texto. Assim "A" não traz "CAMISA" por ter 'a' no meio.
            setFilteredItems(items.filter(item => {
                const nome = item.name.toLowerCase();
                return nome.startsWith(q) || nome.split(/\s+/).some(palavra => palavra.startsWith(q));
            }));
        } else {
            setFilteredItems([]);
        }
    };

    const handleSelectItem = (item: Item) => {
        setNovoItemId(item.id!);
        setNovoItemName(item.name);
        setNovoItemType(item.type);
        setNovoItemSize(item.size || "");
        setFilteredItems([]);
    };

    const handleAddItemToPedido = () => {
        if (!novoItemName) { window.alert("Informe o nome do item!"); return; }
        if (novoItemQty <= 0) { window.alert("Quantidade inválida!"); return; }

        const newItem: OrderItem = {
            itemId: novoItemId,
            itemName: novoItemName,
            itemType: novoItemType || undefined,
            itemSize: novoItemSize || undefined,
            quantity: novoItemQty,
        };

        setPedidoItens([...pedidoItens, newItem]);
        setNovoItemName("");
        setNovoItemType("");
        setNovoItemSize("");
        setNovoItemQty(1);
        setNovoItemId(null);
    };

    const handleRemoveItemFromPedido = (index: number) => {
        setPedidoItens(pedidoItens.filter((_, i) => i !== index));
    };

    const handleCreateOrder = async () => {
        if (pedidoItens.length === 0) { window.alert("Adicione pelo menos um item ao pedido!"); return; }
        try {
            const data = {
                orderDate: new Date(orderDate).toISOString(),
                supplier: supplier || null,
                notes: notes || null,
                items: pedidoItens,
            };
            const res = await api.post("/order", data);
            if (res.data.success) {
                window.alert("Pedido criado com sucesso!");
                setPedidoItens([]);
                setSupplier("");
                setNotes("");
                fetchOrders();
            }
        } catch (error: any) {
            window.alert(error.response?.data?.error || "Erro ao criar pedido.");
        }
    };

    const handleOpenDetails = async (orderId: number) => {
        try {
            const res = await api.get(`/getorder/${orderId}`);
            setSelectedOrder(res.data);
            setReceiveQty({});
            setShowModal(true);
        } catch (error) { console.log(error); }
    };

    const handleCloseModal = () => { setShowModal(false); setSelectedOrder(null); };

    const handleReceive = async (orderItemId: number) => {
        const qty = receiveQty[orderItemId];
        if (!qty || qty <= 0) { window.alert("Informe a quantidade recebida!"); return; }
        try {
            const res = await api.post(`/receiveorderitem/${orderItemId}`, { quantityReceived: qty });
            if (res.data.success) {
                window.alert(res.data.message);
                const updated = await api.get(`/getorder/${selectedOrder?.id}`);
                setSelectedOrder(updated.data);
                setReceiveQty({ ...receiveQty, [orderItemId]: 0 });
                fetchOrders();
            }
        } catch (error: any) {
            window.alert(error.response?.data?.error || "Erro ao registrar recebimento.");
        }
    };

    const handleUpdateStatus = async (orderId: number, newStatus: string) => {
        if (!window.confirm(`Deseja alterar o status para ${newStatus}?`)) return;
        try {
            await api.put(`/updateorderstatus/${orderId}`, { status: newStatus });
            window.alert("Status atualizado!");
            fetchOrders();
            if (selectedOrder && selectedOrder.id === orderId) {
                const updated = await api.get(`/getorder/${orderId}`);
                setSelectedOrder(updated.data);
            }
        } catch (error: any) {
            window.alert(error.response?.data?.error || "Erro ao atualizar status.");
        }
    };

    const handleDeleteOrder = async (orderId: number) => {
        if (!window.confirm("Deseja excluir este pedido e todos os seus itens?")) return;
        try {
            await api.delete(`/deleteorder/${orderId}`);
            window.alert("Pedido excluído!");
            fetchOrders();
            if (showModal) handleCloseModal();
        } catch (error) {
            window.alert("Erro ao excluir pedido.");
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: { [key: string]: string } = {
            PENDENTE: "bg-warning text-dark",
            PARCIAL: "bg-info",
            ENTREGUE: "bg-success",
            CANCELADO: "bg-danger",
        };
        return badges[status] || "bg-secondary";
    };

    const filteredOrders = statusFilter ? orders.filter(o => o.status === statusFilter) : orders;

    // Estilos
    const card: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" };
    const head: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", fontSize: "0.75rem", fontWeight: 700 };
    const lbl: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", color: "var(--text-secondary)", marginBottom: 5, display: "block" };
    const statusColors: Record<string, string> = { PENDENTE: "#856404", PARCIAL: "#0c5460", ENTREGUE: "#155724", CANCELADO: "#721c24" };
    const statusBg: Record<string, string>     = { PENDENTE: "#fff3cd", PARCIAL: "#d1ecf1", ENTREGUE: "#d4edda", CANCELADO: "#f8d7da" };

    if (loading) return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
            <div className="spinner-border text-primary" role="status"/>
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Header */}
            <div style={{ paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                <h1 style={{ fontSize: "1.2rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 2px" }}>Pedidos de Uniformes</h1>
                <p style={{ color: "var(--text-muted)", fontSize: "0.73rem", margin: 0 }}>Gerencie pedidos de reposição de estoque</p>
            </div>

            {/* Formulário de novo pedido */}
            <div style={{ ...card, overflow: "visible" }}>
                <div style={head}>
                    <span>Novo Pedido</span>
                </div>
                <div style={{ padding: 20 }}>
                    {/* Data, Fornecedor, Observações */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr", gap: 14, marginBottom: 20 }}>
                        <div>
                            <label style={lbl}>Data do Pedido</label>
                            <input type="date" className="form-control" value={orderDate} onChange={e => setOrderDate(e.target.value)}/>
                        </div>
                        <div>
                            <label style={lbl}>Fornecedor</label>
                            <input type="text" className="form-control" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Opcional"/>
                        </div>
                        <div>
                            <label style={lbl}>Observações</label>
                            <input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional"/>
                        </div>
                    </div>

                    {/* Adicionar itens — id para scroll vindo da tela Hoje */}
                    <div id="form-adicionar-item">
                        <label style={{ ...lbl, marginBottom: 10 }}>Adicionar Item ao Pedido</label>

                        {/* Banner informativo quando veio do botão Pedir */}
                        {novoItemName && novoItemId && (
                            <div style={{ padding: "10px 14px", background: "var(--brand-subtle)", border: "1px solid var(--brand)", borderRadius: 7, marginBottom: 12, fontSize: "0.78rem", color: "var(--brand)", fontWeight: 600 }}>
                                ⚡ Item pré-selecionado a partir do alerta de estoque. Ajuste a quantidade e clique em "+ Adicionar".
                            </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
                            <div>
                                <label style={lbl}>Item</label>
                                <SearchDropdown
                                    value={novoItemName}
                                    onChange={handleItemSearch}
                                    onSelect={handleSelectItem}
                                    items={filteredItems}
                                    onClear={() => setFilteredItems([])}
                                    placeholder="Digite o nome do item..."
                                    getKey={i => i.id!}
                                    renderItem={(item, highlighted) => (
                                        <div style={{ padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: "0.78rem" }}>{item.name}</div>
                                                <div style={{ fontSize: "0.68rem", color: highlighted ? "rgba(255,255,255,0.8)" : "var(--text-muted)" }}>
                                                    {item.type}{item.size ? ` · Tam. ${item.size}` : ""} · Estoque: {item.quantity}
                                                </div>
                                            </div>
                                            <span style={{
                                                fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", fontWeight: 700,
                                                color: highlighted ? "#fff" : item.quantity === 0 ? "var(--danger)" : item.quantity <= 10 ? "var(--warning)" : "var(--success)"
                                            }}>{item.quantity}</span>
                                        </div>
                                    )}
                                />
                            </div>
                            <div>
                                <label style={lbl}>Tipo</label>
                                <input type="text" className="form-control" value={novoItemType} onChange={e => setNovoItemType(e.target.value)} placeholder="Ex: UNIFORME"/>
                            </div>
                            <div>
                                <label style={lbl}>Tamanho</label>
                                <input type="text" className="form-control" value={novoItemSize} onChange={e => setNovoItemSize(e.target.value)} placeholder="Ex: M, G"/>
                            </div>
                            <div>
                                <label style={lbl}>Qtd</label>
                                <input type="number" className="form-control" value={novoItemQty || ""} onChange={e => setNovoItemQty(e.target.value === "" ? 0 : Number(e.target.value))} min={1}
                                    style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}/>
                            </div>
                            <div>
                                <button onClick={handleAddItemToPedido} style={{ padding: "8px 16px", borderRadius: 7, border: "none", background: "var(--brand)", color: "#fff", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", height: 38 }}>
                                    + Adicionar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de itens adicionados */}
                    {pedidoItens.length > 0 && (
                        <div style={{ ...card, marginTop: 16 }}>
                            <table className="table table-striped" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Item</th><th>Tipo</th><th>Tamanho</th>
                                        <th style={{ textAlign: "center" }}>Qtd</th>
                                        <th>Vinculado</th><th style={{ textAlign: "center" }}>Remover</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidoItens.map((item, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{item.itemName}</td>
                                            <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{item.itemType || "—"}</td>
                                            <td style={{ fontSize: "0.76rem", color: "var(--brand)", fontWeight: 700 }}>{item.itemSize || "—"}</td>
                                            <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{item.quantity}</td>
                                            <td style={{ fontSize: "0.76rem" }}>
                                                <span style={{ color: item.itemId ? "var(--success)" : "var(--text-muted)", fontWeight: 600, fontSize: "0.7rem" }}>
                                                    {item.itemId ? "✓ Vinculado" : "Manual"}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <button onClick={() => handleRemoveItemFromPedido(index)} style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "var(--danger)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                                                    Remover
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                        <button onClick={handleCreateOrder} disabled={pedidoItens.length === 0}
                            style={{ padding: "9px 28px", borderRadius: 7, border: "none", background: pedidoItens.length === 0 ? "var(--surface-2)" : "var(--success)", color: pedidoItens.length === 0 ? "var(--text-muted)" : "#fff", fontSize: "0.8rem", fontWeight: 700, cursor: pedidoItens.length === 0 ? "not-allowed" : "pointer" }}>
                            Criar Pedido ({pedidoItens.length} {pedidoItens.length === 1 ? "item" : "itens"})
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtro */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 4px" }}>
                <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: "150px", fontSize: "0.8rem" }}>
                    <option value="">Todos os status</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="PARCIAL">Parcial</option>
                    <option value="ENTREGUE">Entregue</option>
                    <option value="CANCELADO">Cancelado</option>
                </select>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{filteredOrders.length} pedido{filteredOrders.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Histórico de pedidos */}
            <div style={card}>
                <div style={head}>
                    <span>Histórico de Pedidos</span>
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{filteredOrders.length} pedido{filteredOrders.length !== 1 ? "s" : ""}</span>
                </div>
                {filteredOrders.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        Nenhum pedido encontrado.
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table className="table table-striped" style={{ margin: 0 }}>
                            <thead>
                                <tr>
                                    <th>Pedido</th>
                                    <th>Fornecedor</th>
                                    <th>Itens</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => {
                                    const totalQty = order.items.reduce((acc: number, i: any) => acc + i.quantity, 0);
                                    return (
                                        <tr key={order.id}>
                                            <td>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: "0.8rem", color: "var(--brand)" }}>#{order.id}</span>
                                                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(order.orderDate)}</span>
                                                    {order.notes && <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontStyle: "italic" }}>{order.notes}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>
                                                    {order.supplier || <span style={{ color: "var(--text-muted)", fontWeight: 400, fontStyle: "italic" }}>Sem fornecedor</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                                    <span style={{ fontWeight: 700, fontSize: "0.8rem" }}>{order.items.length} tipo{order.items.length !== 1 ? "s" : ""}</span>
                                                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{totalQty} un. total</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ padding: "3px 10px", borderRadius: 5, fontSize: "0.68rem", fontWeight: 800, background: statusBg[order.status] || "#e2e3e5", color: statusColors[order.status] || "#383d41", letterSpacing: "0.05em" }}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", gap: 5 }}>
                                                    <button onClick={() => handleOpenDetails(order.id!)} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: "#2563EB", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                                                        Detalhes
                                                    </button>
                                                    {order.status === "PENDENTE" && (
                                                        <button onClick={() => handleUpdateStatus(order.id!, "CANCELADO")} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--danger)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                                                            Cancelar
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteOrder(order.id!)} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--danger)", background: "none", color: "var(--danger)", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                                                        Excluir
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal detalhes */}
            {showModal && selectedOrder && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, width: "90%", maxWidth: 700, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                                Pedido #{selectedOrder.id}
                                <span style={{ marginLeft: 10, padding: "3px 10px", borderRadius: 5, fontSize: "0.68rem", fontWeight: 800, background: statusBg[selectedOrder.status] || "#e2e3e5", color: statusColors[selectedOrder.status] || "#383d41" }}>
                                    {selectedOrder.status}
                                </span>
                            </div>
                            <button onClick={handleCloseModal} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem" }}>×</button>
                        </div>
                        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16, padding: "12px 14px", background: "var(--surface-2)", borderRadius: 7 }}>
                                <div><span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Data</span><div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{formatDate(selectedOrder.orderDate)}</div></div>
                                <div><span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Fornecedor</span><div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{selectedOrder.supplier || "—"}</div></div>
                                <div><span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Observações</span><div style={{ fontWeight: 600, fontSize: "0.82rem" }}>{selectedOrder.notes || "—"}</div></div>
                            </div>
                            <table className="table table-striped" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Item</th><th>Tipo</th><th>Tam.</th>
                                        <th style={{ textAlign: "center" }}>Pedido</th>
                                        <th style={{ textAlign: "center" }}>Recebido</th>
                                        <th style={{ textAlign: "center" }}>Falta</th>
                                        {selectedOrder.status !== "CANCELADO" && <th>Receber</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map(item => {
                                        const falta = item.quantity - (item.quantityReceived || 0);
                                        return (
                                            <tr key={item.id}>
                                                <td style={{ fontWeight: 600, fontSize: "0.8rem" }}>{item.itemName}</td>
                                                <td style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{item.itemType || "—"}</td>
                                                <td style={{ fontSize: "0.76rem", color: "var(--brand)", fontWeight: 700 }}>{item.itemSize || "—"}</td>
                                                <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{item.quantity}</td>
                                                <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "var(--success)" }}>{item.quantityReceived || 0}</td>
                                                <td style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: falta > 0 ? "var(--danger)" : "var(--success)" }}>{falta}</td>
                                                {selectedOrder.status !== "CANCELADO" && (
                                                    <td>
                                                        {falta > 0 ? (
                                                            <div style={{ display: "flex", gap: 6 }}>
                                                                <input type="number" className="form-control form-control-sm" style={{ width: 70 }} min={1} max={falta}
                                                                    value={receiveQty[item.id!] || ""}
                                                                    onChange={e => setReceiveQty({ ...receiveQty, [item.id!]: Number(e.target.value) })}/>
                                                                <button onClick={() => handleReceive(item.id!)} style={{ padding: "4px 10px", borderRadius: 5, border: "none", background: "var(--success)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer" }}>
                                                                    Receber
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: "var(--success)", fontSize: "0.75rem", fontWeight: 600 }}>✓ Completo</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end" }}>
                            <button onClick={handleCloseModal} style={{ padding: "8px 20px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text-secondary)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pedidos;