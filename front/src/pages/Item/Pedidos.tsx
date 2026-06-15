import { useEffect, useState } from "react";
import api from "../../services/useApi";
import { Order, OrderItem } from "../../types/Order";
import { Item } from "../../types/Item";
import { formatDate } from "../../utils/dateFunctions";

const Pedidos = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulário de novo pedido
    const [supplier, setSupplier] = useState("");
    const [notes, setNotes] = useState("");
    const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split("T")[0]);

    // Itens do pedido sendo criado
    const [pedidoItens, setPedidoItens] = useState<OrderItem[]>([]);
    const [novoItemName, setNovoItemName] = useState("");
    const [novoItemType, setNovoItemType] = useState("");
    const [novoItemSize, setNovoItemSize] = useState("");
    const [novoItemQty, setNovoItemQty] = useState<number>(1);
    const [novoItemId, setNovoItemId] = useState<number | null>(null);
    const [filteredItems, setFilteredItems] = useState<Item[]>([]);

    // Modal de detalhes / recebimento
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [receiveQty, setReceiveQty] = useState<{ [key: number]: number }>({});

    // Filtro
    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        fetchOrders();
        fetchItems();
    }, []);

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

    // Busca de item para vincular ao pedido
    const handleItemSearch = (value: string) => {
        setNovoItemName(value.toUpperCase());
        setNovoItemId(null);
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
        setNovoItemId(item.id!);
        setNovoItemName(item.name);
        setNovoItemType(item.type);
        setNovoItemSize(item.size || "");
        setFilteredItems([]);
    };

    // Adicionar item à lista do pedido
    const handleAddItemToPedido = () => {
        if (!novoItemName) {
            window.alert("Informe o nome do item!");
            return;
        }
        if (novoItemQty <= 0) {
            window.alert("Quantidade inválida!");
            return;
        }

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

    // Criar pedido
    const handleCreateOrder = async () => {
        if (pedidoItens.length === 0) {
            window.alert("Adicione pelo menos um item ao pedido!");
            return;
        }

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
            const msg = error.response?.data?.error || "Erro ao criar pedido.";
            window.alert(msg);
        }
    };

    // Abrir modal de detalhes
    const handleOpenDetails = async (orderId: number) => {
        try {
            const res = await api.get(`/getorder/${orderId}`);
            setSelectedOrder(res.data);
            setReceiveQty({});
            setShowModal(true);
        } catch (error) {
            console.log(error);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };

    // Registrar recebimento de um item do pedido
    const handleReceive = async (orderItemId: number) => {
        const qty = receiveQty[orderItemId];
        if (!qty || qty <= 0) {
            window.alert("Informe a quantidade recebida!");
            return;
        }

        try {
            const res = await api.post(`/receiveorderitem/${orderItemId}`, {
                quantityReceived: qty,
            });

            if (res.data.success) {
                window.alert(res.data.message);
                // Recarrega o pedido atualizado
                const updated = await api.get(`/getorder/${selectedOrder?.id}`);
                setSelectedOrder(updated.data);
                setReceiveQty({ ...receiveQty, [orderItemId]: 0 });
                fetchOrders();
            }
        } catch (error: any) {
            const msg = error.response?.data?.error || "Erro ao registrar recebimento.";
            window.alert(msg);
        }
    };

    // Atualizar status do pedido
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
            const msg = error.response?.data?.error || "Erro ao atualizar status.";
            window.alert(msg);
        }
    };

    // Deletar pedido
    const handleDeleteOrder = async (orderId: number) => {
        if (!window.confirm("Deseja excluir este pedido e todos os seus itens?")) return;

        try {
            await api.delete(`/deleteorder/${orderId}`);
            window.alert("Pedido excluído!");
            fetchOrders();
            if (showModal) handleCloseModal();
        } catch (error) {
            console.log(error);
            window.alert("Erro ao excluir pedido.");
        }
    };

    // Badge de status
    const getStatusBadge = (status: string) => {
        const badges: { [key: string]: string } = {
            PENDENTE: "bg-warning text-dark",
            PARCIAL: "bg-info",
            ENTREGUE: "bg-success",
            CANCELADO: "bg-danger",
        };
        return badges[status] || "bg-secondary";
    };

    // Filtro
    const filteredOrders = statusFilter
        ? orders.filter((o) => o.status === statusFilter)
        : orders;

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
            <h1 className="text-center mb-4">Pedidos de Uniformes</h1>

            {/* Formulário de novo pedido */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">Novo Pedido</h5>
                    <div className="row g-3 mb-3">
                        <div className="col-md-3">
                            <label htmlFor="orderDate" className="form-label">Data do Pedido</label>
                            <input
                                type="date"
                                className="form-control"
                                id="orderDate"
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <label htmlFor="supplier" className="form-label">Fornecedor</label>
                            <input
                                type="text"
                                className="form-control"
                                id="supplier"
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                placeholder="Opcional"
                            />
                        </div>
                        <div className="col-md-5">
                            <label htmlFor="notes" className="form-label">Observações</label>
                            <input
                                type="text"
                                className="form-control"
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>

                    {/* Adicionar itens */}
                    <h6>Adicionar Itens ao Pedido</h6>
                    <div className="row g-2 mb-3 align-items-end">
                        <div className="col-md-4 position-relative">
                            <label className="form-label">Item</label>
                            <input
                                type="text"
                                className="form-control"
                                value={novoItemName}
                                onChange={(e) => handleItemSearch(e.target.value)}
                                placeholder="Nome do item..."
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
                        <div className="col-md-2">
                            <label className="form-label">Tipo</label>
                            <input
                                type="text"
                                className="form-control"
                                value={novoItemType}
                                onChange={(e) => setNovoItemType(e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Tamanho</label>
                            <input
                                type="text"
                                className="form-control"
                                value={novoItemSize}
                                onChange={(e) => setNovoItemSize(e.target.value)}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">Qtd</label>
                            <input
                                type="number"
                                className="form-control"
                                value={novoItemQty || ""}
                                onChange={(e) => setNovoItemQty(e.target.value === "" ? 0 : Number(e.target.value))}
                                onFocus={(e) => { if (novoItemQty === 0) e.target.value = ""; }}
                                min={1}
                            />
                        </div>
                        <div className="col-md-2">
                            <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={handleAddItemToPedido}
                            >
                                + Adicionar
                            </button>
                        </div>
                    </div>

                    {/* Lista de itens adicionados */}
                    {pedidoItens.length > 0 && (
                        <div className="table-responsive mb-3">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Tipo</th>
                                        <th>Tamanho</th>
                                        <th>Quantidade</th>
                                        <th>Vinculado</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidoItens.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.itemName}</td>
                                            <td>{item.itemType || "—"}</td>
                                            <td>{item.itemSize || "—"}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.itemId ? "Sim" : "Não"}</td>
                                            <td>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={() => handleRemoveItemFromPedido(index)}
                                                >
                                                    Remover
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="text-center">
                        <button
                            className="btn btn-success col-3"
                            onClick={handleCreateOrder}
                            disabled={pedidoItens.length === 0}
                        >
                            Criar Pedido ({pedidoItens.length} {pedidoItens.length === 1 ? "item" : "itens"})
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtro de status */}
            <div className="row mb-3">
                <div className="col-md-3">
                    <select
                        className="form-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">Todos os status</option>
                        <option value="PENDENTE">Pendente</option>
                        <option value="PARCIAL">Parcial</option>
                        <option value="ENTREGUE">Entregue</option>
                        <option value="CANCELADO">Cancelado</option>
                    </select>
                </div>
            </div>

            {/* Tabela de pedidos */}
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Histórico de Pedidos</h5>
                    {filteredOrders.length === 0 ? (
                        <p>Nenhum pedido encontrado.</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Data</th>
                                        <th>Fornecedor</th>
                                        <th>Itens</th>
                                        <th>Status</th>
                                        <th>Observações</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id}>
                                            <td>{order.id}</td>
                                            <td>{formatDate(order.orderDate)}</td>
                                            <td>{order.supplier || "—"}</td>
                                            <td>{order.items.length} {order.items.length === 1 ? "item" : "itens"}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadge(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td>{order.notes || "—"}</td>
                                            <td>
                                                <button
                                                    className="btn btn-primary btn-sm me-1"
                                                    onClick={() => handleOpenDetails(order.id!)}
                                                >
                                                    Detalhes
                                                </button>
                                                {order.status === "PENDENTE" && (
                                                    <button
                                                        className="btn btn-danger btn-sm me-1"
                                                        onClick={() => handleUpdateStatus(order.id!, "CANCELADO")}
                                                    >
                                                        Cancelar
                                                    </button>
                                                )}
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => handleDeleteOrder(order.id!)}
                                                >
                                                    Excluir
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

            {/* Modal de detalhes / recebimento */}
            {showModal && selectedOrder && (
                <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Pedido #{selectedOrder.id} —{" "}
                                    <span className={`badge ${getStatusBadge(selectedOrder.status)}`}>
                                        {selectedOrder.status}
                                    </span>
                                </h5>
                                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-4">
                                        <strong>Data:</strong> {formatDate(selectedOrder.orderDate)}
                                    </div>
                                    <div className="col-md-4">
                                        <strong>Fornecedor:</strong> {selectedOrder.supplier || "—"}
                                    </div>
                                    <div className="col-md-4">
                                        <strong>Observações:</strong> {selectedOrder.notes || "—"}
                                    </div>
                                </div>

                                <h6>Itens do Pedido</h6>
                                <div className="table-responsive">
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Tipo</th>
                                                <th>Tamanho</th>
                                                <th>Pedido</th>
                                                <th>Recebido</th>
                                                <th>Falta</th>
                                                {selectedOrder.status !== "CANCELADO" && <th>Receber</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedOrder.items.map((item) => {
                                                const falta = item.quantity - (item.quantityReceived || 0);
                                                return (
                                                    <tr key={item.id}>
                                                        <td>{item.itemName}</td>
                                                        <td>{item.itemType || "—"}</td>
                                                        <td>{item.itemSize || "—"}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>{item.quantityReceived || 0}</td>
                                                        <td>
                                                            <span className={falta > 0 ? "text-danger fw-bold" : "text-success fw-bold"}>
                                                                {falta}
                                                            </span>
                                                        </td>
                                                        {selectedOrder.status !== "CANCELADO" && (
                                                            <td>
                                                                {falta > 0 ? (
                                                                    <div className="d-flex gap-1">
                                                                        <input
                                                                            type="number"
                                                                            className="form-control form-control-sm"
                                                                            style={{ width: "80px" }}
                                                                            min={1}
                                                                            max={falta}
                                                                            value={receiveQty[item.id!] || ""}
                                                                            onChange={(e) =>
                                                                                setReceiveQty({
                                                                                    ...receiveQty,
                                                                                    [item.id!]: Number(e.target.value),
                                                                                })
                                                                            }
                                                                        />
                                                                        <button
                                                                            className="btn btn-success btn-sm"
                                                                            onClick={() => handleReceive(item.id!)}
                                                                        >
                                                                            Receber
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-success">Completo</span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pedidos;