import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CalendarIcon, FilterIcon, DownloadIcon, RefreshCw } from 'lucide-react';
import api from '../../services/useApi';
import { AllWithdrawal } from '../../types/AllWithdrawal';

const Dashboard = () => {
    const [withdrawals, setWithdrawals] = useState<AllWithdrawal[]>([]);
    const [chartType, setChartType] = useState<'line' | 'bar'>('bar');
    const [loading, setLoading] = useState(false);

    const fetchWithdrawals = async () => {
        try {
            const res = await api.get('/getallwithdrawals');
            const sortedData = res.data.sort((a: AllWithdrawal, b: AllWithdrawal) => {
                return new Date(b.withdrawalDate).getTime() - new Date(a.withdrawalDate).getTime();
            })
            setWithdrawals(sortedData);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    // Processar dados para o gráfico mensal
    const processMonthlyData = () => {
        const monthlyData: { [key: string]: number } = {};

        withdrawals.forEach(withdrawal => {
            const date = new Date(withdrawal.withdrawalDate);
            const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = 0;
            }

            monthlyData[monthYear] += withdrawal.quantity;
        });

        return Object.entries(monthlyData).map(([month, quantity]) => ({
            month,
            quantity
        })).sort((a, b) => {
            const [aMonth, aYear] = a.month.split('/').map(Number);
            const [bMonth, bYear] = b.month.split('/').map(Number);

            if (aYear !== bYear) return aYear - bYear;
            return aMonth - bMonth;
        });
    };

    // Processar dados por setor
    const processSectorData = () => {
        const sectorData: { [key: string]: number } = {};

        withdrawals.forEach(withdrawal => {
            const sector = withdrawal.itemSector;

            if (!sectorData[sector]) {
                sectorData[sector] = 0;
            }

            sectorData[sector] += withdrawal.quantity;
        });

        return Object.entries(sectorData).map(([sector, quantity]) => ({
            sector,
            quantity
        }));
    };

    // Processar dados por departamento
    const processDepartmentData = () => {
        const deptData: { [key: string]: number } = {};

        withdrawals.forEach(withdrawal => {
            const dept = withdrawal.employeeDepartment;

            if (!deptData[dept]) {
                deptData[dept] = 0;
            }

            deptData[dept] += withdrawal.quantity;
        });

        return Object.entries(deptData).map(([department, quantity]) => ({
            department,
            quantity
        }));
    };

    // Simular carregamento de dados
    const refreshData = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    };

    const monthlyData = processMonthlyData();
    const sectorData = processSectorData();
    const departmentData = processDepartmentData();

    return (
        <div className="container-fluid mt-4">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center">
                        <h1 className="h3 mb-0">Dashboard de Saídas do Almoxarifado</h1>
                        <div className="d-flex gap-2">
                            <button className="btn btn-outline-secondary d-flex align-items-center gap-1" onClick={refreshData}>
                                <RefreshCw size={16} /> {loading ? 'Carregando...' : 'Atualizar'}
                            </button>
                            <div className="dropdown">
                                <button className="btn btn-outline-secondary dropdown-toggle d-flex align-items-center gap-1" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <CalendarIcon size={16} /> Período
                                </button>
                                <ul className="dropdown-menu">
                                    <li><a className="dropdown-item" href="#">Último mês</a></li>
                                    <li><a className="dropdown-item" href="#">Últimos 3 meses</a></li>
                                    <li><a className="dropdown-item" href="#">Este ano</a></li>
                                </ul>
                            </div>
                            <button className="btn btn-outline-secondary d-flex align-items-center gap-1">
                                <DownloadIcon size={16} /> Exportar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-md-4 mb-4">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">Total de Saídas</h5>
                            <h2 className="display-4 fw-bold text-primary">
                                {withdrawals.reduce((sum, item) => sum + item.quantity, 0)}
                            </h2>
                            <p className="text-muted">Itens retirados do almoxarifado</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-4 mb-4">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">Tipos de Itens</h5>
                            <h2 className="display-4 fw-bold text-success">
                                {new Set(withdrawals.map(w => w.itemType)).size}
                            </h2>
                            <p className="text-muted">Categorias diferentes</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-4 mb-4">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">Departamentos</h5>
                            <h2 className="display-4 fw-bold text-info">
                                {new Set(withdrawals.map(w => w.employeeDepartment)).size}
                            </h2>
                            <p className="text-muted">Setores atendidos</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Quantidade de Saídas por Mês</h5>
                            <div className="btn-group">
                                <button
                                    type="button"
                                    className={`btn btn-sm ${chartType === 'bar' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setChartType('bar')}
                                >
                                    Barras
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${chartType === 'line' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setChartType('line')}
                                >
                                    Linha
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    {chartType === 'bar' ? (
                                        <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="quantity" name="Quantidade" fill="#0d6efd" />
                                        </BarChart>
                                    ) : (
                                        <LineChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="quantity" name="Quantidade" stroke="#0d6efd" activeDot={{ r: 8 }} />
                                        </LineChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-md-6 mb-4 mb-md-0">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">Saídas por Setor</h5>
                        </div>
                        <div className="card-body">
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={sectorData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="sector" type="category" width={80} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="quantity" name="Quantidade" fill="#198754" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">Saídas por Departamento</h5>
                        </div>
                        <div className="card-body">
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={departmentData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" />
                                        <YAxis dataKey="department" type="category" width={80} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="quantity" name="Quantidade" fill="#0dcaf0" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Últimas Saídas</h5>
                            <button className="btn btn-outline-primary btn-sm">Ver todas</button>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Data</th>
                                            <th>Item</th>
                                            <th>Quantidade</th>
                                            <th>Setor</th>
                                            <th>Funcionário</th>
                                            <th>Departamento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {withdrawals.slice(0, 25).map(withdrawal => (
                                            <tr key={withdrawal.id}>
                                                <td>{new Date(withdrawal.withdrawalDate).toLocaleDateString()}</td>
                                                <td>{withdrawal.itemName}</td>
                                                <td>{withdrawal.quantity}</td>
                                                <td>{withdrawal.itemSector}</td>
                                                <td>{withdrawal.employeeName}</td>
                                                <td>{withdrawal.employeeDepartment}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;