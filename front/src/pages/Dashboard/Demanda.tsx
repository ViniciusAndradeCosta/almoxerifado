import { useState, useEffect, useMemo } from 'react';
import api from '../../services/useApi';
import { AllWithdrawal } from '../../types/AllWithdrawal';
import SortableTableLow from '../../components/SortedTableLow';

interface StockItem {
    itemId: number;
    itemName: string;
    currentStock: number;
}

interface DemandData {
    itemId: number;
    itemName: string;
    itemType: string;
    itemSector: string;
    totalWithdrawn: number;
    monthlyAverage: number;
    currentStock: number;
    suggestedRestock: number;
    [key: string]: string | number;
}

const DemandPage = () => {
    const [withdrawals, setWithdrawals] = useState<AllWithdrawal[]>([]);
    const [stockData, setStockData] = useState<StockItem[]>([]);
    const [filterZeroStock, setFilterZeroStock] = useState(false);
    const [filterNonZeroStock, setFilterNonZeroStock] = useState(false);
    const [filterSuggestedRestock, setFilterSuggestedRestock] = useState(false);
    const [itemNameFilter, setItemNameFilter] = useState('');
    const [itemTypeFilter, setItemTypeFilter] = useState('');
    const [itemSectorFilter, setItemSectorFilter] = useState('');

    const fetchWithdrawals = async () => {
        try {
            const res = await api.get('/getallwithdrawals');
            setWithdrawals(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStock = async () => {
        try {
            const stock = await api.get('/getitems');
            setStockData(
                stock.data.map((item: any) => ({
                    itemId: item.id,
                    itemName: item.name,
                    currentStock: item.quantity,
                }))
            );
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
        fetchStock();
    }, []);

    // Processar dados de demanda
    const processDemandData = (): DemandData[] => {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const itemWithdrawals: {
            [key: number]: { itemName: string; itemType: string; itemSector: string; totalWithdrawn: number };
        } = {};

        withdrawals
            .filter(w => new Date(w.withdrawalDate) >= ninetyDaysAgo)
            .forEach(w => {
                if (!itemWithdrawals[w.itemId]) {
                    itemWithdrawals[w.itemId] = {
                        itemName: w.itemName,
                        itemType: w.itemType || '',
                        itemSector: w.itemSector || '',
                        totalWithdrawn: 0,
                    };
                }
                itemWithdrawals[w.itemId].totalWithdrawn += w.quantity;
            });

        return Object.entries(itemWithdrawals).map(([itemId, data]) => {
            const stockItem = stockData.find(s => s.itemId === parseInt(itemId)) || {
                itemId: parseInt(itemId),
                itemName: data.itemName,
                currentStock: 0,
            };
            const monthlyAverage = data.totalWithdrawn / 3;

            let suggestedRestock: number;
            if (data.itemSector === 'ESCRITORIO' || data.itemSector === 'LIMPEZA') {
                suggestedRestock = Math.max(0, monthlyAverage - stockItem.currentStock);
            } else {
                suggestedRestock = Math.max(0, monthlyAverage * 3 - stockItem.currentStock); // Estoque para 90 dias
            }

            return {
                itemId: parseInt(itemId),
                itemName: data.itemName,
                itemType: data.itemType,
                itemSector: data.itemSector,
                totalWithdrawn: data.totalWithdrawn,
                monthlyAverage: parseFloat(monthlyAverage.toFixed(2)),
                currentStock: stockItem.currentStock,
                suggestedRestock: parseFloat(suggestedRestock.toFixed(2)),
            };
        });
    };

    // Filtrar dados com base nos filtros
    const filteredDemandData = useMemo(() => {
        let data = processDemandData();

        // Filtros de estoque
        if (filterZeroStock || filterNonZeroStock) {
            data = data.filter(item => 
                (filterZeroStock && item.currentStock === 0) || 
                (filterNonZeroStock && item.currentStock > 0)
            );
        }
        
        if (filterSuggestedRestock) {
            data = data.filter(item => item.suggestedRestock > 0);
        }

        // Filtros de texto
        if (itemNameFilter) {
            data = data.filter(item =>
                item.itemName.toLowerCase().includes(itemNameFilter.toLowerCase())
            );
        }
        if (itemTypeFilter) {
            data = data.filter(item =>
                item.itemType.toLowerCase().includes(itemTypeFilter.toLowerCase())
            );
        }
        if (itemSectorFilter) {
            data = data.filter(item =>
                item.itemSector.toLowerCase().includes(itemSectorFilter.toLowerCase())
            );
        }

        return data;
    }, [
        withdrawals,
        stockData,
        filterZeroStock,
        filterNonZeroStock,
        filterSuggestedRestock,
        itemNameFilter,
        itemTypeFilter,
        itemSectorFilter,
    ]);

    // Handlers para checkboxes
    const handleZeroStockChange = (checked: boolean) => {
        setFilterZeroStock(checked);
        if (checked) {
            setFilterNonZeroStock(false);
        }
    };

    const handleNonZeroStockChange = (checked: boolean) => {
        setFilterNonZeroStock(checked);
        if (checked) {
            setFilterZeroStock(false);
        }
    };

    const handleSuggestedRestockChange = (checked: boolean) => {
        setFilterSuggestedRestock(checked);
    };

    // Configuração da SortableTableLow
    const columns = [
        'itemId',
        'itemName',
        'itemType',
        'itemSector',
        'totalWithdrawn',
        'monthlyAverage',
        'currentStock',
        'suggestedRestock',
    ];

    const columnDisplayNames = {
        itemId: 'ID do Item',
        itemName: 'Nome do Item',
        itemType: 'Tipo do Item',
        itemSector: 'Setor do Item',
        totalWithdrawn: 'Total Retirado (90 dias)',
        monthlyAverage: 'Média Mensal',
        currentStock: 'Estoque Atual',
        suggestedRestock: 'Sugestão de Reposição',
    };

    return (
        <div className="container-fluid mt-4">
            <div className="row mb-4">
                <div className="col-12">
                    <h1 className="h3 mb-4">Detalhes da Demanda</h1>

                    {/* Filtros */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <h5 className="card-title">Filtros</h5>
                            <div className="row">
                                {/* Checkboxes */}
                                <div className="col-md-6 mb-3">
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="zeroStock"
                                            checked={filterZeroStock}
                                            onChange={e => handleZeroStockChange(e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor="zeroStock">
                                            Mostrar apenas itens com estoque zero
                                        </label>
                                    </div>
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="nonZeroStock"
                                            checked={filterNonZeroStock}
                                            onChange={e => handleNonZeroStockChange(e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor="nonZeroStock">
                                            Mostrar apenas itens com estoque maior que zero
                                        </label>
                                    </div>
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="suggestedRestock"
                                            checked={filterSuggestedRestock}
                                            onChange={e => handleSuggestedRestockChange(e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor="suggestedRestock">
                                            Mostrar apenas itens com sugestão de reposição
                                        </label>
                                    </div>
                                </div>
                                {/* Filtros de texto */}
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label htmlFor="itemNameFilter" className="form-label">
                                            Nome do Item
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="itemNameFilter"
                                            value={itemNameFilter}
                                            onChange={e => setItemNameFilter(e.target.value)}
                                            placeholder="Filtrar por nome"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="itemTypeFilter" className="form-label">
                                            Tipo do Item
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="itemTypeFilter"
                                            value={itemTypeFilter}
                                            onChange={e => setItemTypeFilter(e.target.value)}
                                            placeholder="Filtrar por tipo"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label htmlFor="itemSectorFilter" className="form-label">
                                            Setor do Item
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="itemSectorFilter"
                                            value={itemSectorFilter}
                                            onChange={e => setItemSectorFilter(e.target.value)}
                                            placeholder="Filtrar por setor"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabela */}
                    <div className="card">
                        <div className="card-body">
                            <SortableTableLow
                                data={filteredDemandData}
                                columns={columns}
                                columnDisplayNames={columnDisplayNames}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemandPage;