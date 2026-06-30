import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import api from '../../services/useApi';
import { Cabinet } from '../../types/Cabinet';
import { format } from 'date-fns';
import { Employee } from '../../types/Employee';
import { IconSearch, IconDownload, IconEdit } from '../../components/Icons';
import { SearchDropdown } from '../../components/SearchDropdown';

const Armario = () => {
    const [armarios, setArmarios]           = useState<Cabinet[]>([]);
    const [nomeOcupante, setNomeOcupante]   = useState('');
    const [number, setNumber]               = useState(0);
    const [filtro, setFiltro]               = useState('');
    const [filtroSituacao, setFiltroSituacao] = useState(''); // '' | 'Ocupado' | 'Disponivel'
    const [armariosDisponiveis, setArmariosDisponiveis] = useState(0);
    const [armariosOcupados, setArmariosOcupados]       = useState(0);
    const [funcionarios, setFuncionarios]   = useState<Employee[]>([]);
    const [funcsFiltrados, setFuncsFiltrados] = useState<Employee[]>([]);
    const [showModal, setShowModal]         = useState(false);

    useEffect(() => {
        fetchArmarios();
        fetchFuncionarios();
    }, []);

    const fetchArmarios = async () => {
        try {
            const res = await api.get('/getcabinets');
            setArmarios(res.data);
            setArmariosDisponiveis(res.data.filter((a: Cabinet) => a.situation === 'Disponivel').length);
            setArmariosOcupados(res.data.filter((a: Cabinet) => a.situation === 'Ocupado').length);
        } catch (error) { console.log(error); }
    };

    const fetchFuncionarios = async () => {
        try {
            const res = await api.get('/getemployees');
            setFuncionarios(res.data);
        } catch (error) { console.log(error); }
    };

    const handleUpdateWardrobe = async () => {
        try {
            await api.put(`/cabinet/${number}`, {
                name: nomeOcupante.toUpperCase(),
                situation: 'Ocupado',
                date: new Date().toISOString()
            });
            setShowModal(false);
            setNomeOcupante('');
            fetchArmarios();
        } catch (error) { console.log(error); }
    };

    const handleClearWardrobe = async () => {
        try {
            await api.put(`/cabinet/${number}`, { name: '', situation: 'Disponivel', date: null });
            setShowModal(false);
            setNomeOcupante('');
            fetchArmarios();
        } catch (error) { console.log(error); }
    };

    const handleExportCSV = () => {
        const csvData = armarios.map(({ number, size, sector, situation, date, name }) => ({
            NUMERO: number, TAMANHO: size, SETOR: sector,
            SITUACAO: situation, DATA: date, NOME: name || '',
        }));
        const csv = Papa.unparse(csvData, { delimiter: ';' });
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = 'armarios.csv';
        a.click();
    };

    // Filtro combinado: texto + situação
    const filtered = [...armarios]
        .sort((a, b) => {
            const sc = a.situation.localeCompare(b.situation);
            return sc !== 0 ? sc : a.number - b.number;
        })
        .filter(a => {
            const textoOk = !filtro || a.number.toString().includes(filtro) || (a.name || '').toLowerCase().includes(filtro.toLowerCase());
            const situacaoOk = !filtroSituacao || a.situation === filtroSituacao;
            return textoOk && situacaoOk;
        });

    const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' };
    const head: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', fontSize: '0.75rem', fontWeight: 700 };
    const lbl: React.CSSProperties  = { fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Header */}
            <div style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 2px' }}>Armários</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', margin: 0 }}>
                    Gerencie a ocupação dos armários do almoxarifado
                </p>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                    { label: 'Total de Armários',  value: armarios.length,       color: 'var(--text-primary)' },
                    { label: 'Ocupados',            value: armariosOcupados,      color: 'var(--danger)' },
                    { label: 'Disponíveis',         value: armariosDisponiveis,   color: 'var(--success)' },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ ...card, padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Filtros + Export */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Busca por texto */}
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
                        <IconSearch size={13}/>
                    </div>
                    <input
                        className="form-control"
                        value={filtro}
                        onChange={e => setFiltro(e.target.value)}
                        placeholder="Buscar por número ou nome do ocupante..."
                        style={{ paddingRight: 32 }}
                    />
                </div>

                {/* Filtro de situação — toggles */}
                {(['', 'Ocupado', 'Disponivel'] as const).map(s => (
                    <button key={s} onClick={() => setFiltroSituacao(s)} style={{
                        padding: '7px 16px', borderRadius: 7, cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap',
                        border: `1px solid ${filtroSituacao === s
                            ? s === 'Ocupado' ? 'var(--danger)' : s === 'Disponivel' ? 'var(--success)' : 'var(--brand)'
                            : 'var(--border)'}`,
                        background: filtroSituacao === s
                            ? s === 'Ocupado' ? '#fff0f0' : s === 'Disponivel' ? '#f0fff4' : 'var(--brand-subtle)'
                            : 'var(--surface)',
                        color: filtroSituacao === s
                            ? s === 'Ocupado' ? 'var(--danger)' : s === 'Disponivel' ? 'var(--success)' : 'var(--brand)'
                            : 'var(--text-secondary)',
                    }}>
                        {s === '' ? 'Todos' : s === 'Ocupado' ? `🔴 Ocupados (${armariosOcupados})` : `🟢 Disponíveis (${armariosDisponiveis})`}
                    </button>
                ))}

                <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <IconDownload size={13}/> Exportar CSV
                </button>
            </div>

            {/* Tabela */}
            <div style={card}>
                <div style={head}>
                    <span>Lista de Armários</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{filtered.length} armário{filtered.length !== 1 ? 's' : ''}</span>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: 600, overflowY: 'auto' }}>
                    <table className="table table-striped" style={{ margin: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr>
                                <th style={{ width: 70, textAlign: 'center' }}>Nº</th>
                                <th style={{ textAlign: 'center' }}>Setor · Tamanho</th>
                                <th>Situação</th>
                                <th>Ocupante</th>
                                <th>Data</th>
                                <th style={{ textAlign: 'center' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                        Nenhum armário encontrado.
                                    </td>
                                </tr>
                            ) : filtered.map(armario => (
                                <tr key={armario.number}>
                                    <td style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                                        {armario.number}
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        {armario.sector} · {armario.size}
                                    </td>
                                    <td>
                                        {/* Cores semânticas na situação */}
                                        <span style={{
                                            fontSize: '0.72rem', fontWeight: 800,
                                            color: armario.situation === 'Ocupado' ? 'var(--danger)' : 'var(--success)',
                                        }}>
                                            {armario.situation === 'Ocupado' ? '🔴 Ocupado' : '🟢 Disponível'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: armario.name ? 600 : 400, fontSize: '0.8rem', color: armario.name ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: armario.name ? 'normal' : 'italic' }}>
                                        {armario.name || '—'}
                                    </td>
                                    <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                                        {armario.date ? format(new Date(armario.date), 'dd/MM/yyyy HH:mm') : '—'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            onClick={() => { setNumber(armario.number); setNomeOcupante(armario.name || ''); setShowModal(true); }}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 5, border: 'none', background: '#2563EB', color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            <IconEdit size={11}/> Atualizar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de atualização */}
            {showModal && (
                <>
                    <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }}/>
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                        width: 420, zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Armário #{number}</span>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>×</button>
                        </div>
                        <div style={{ padding: '16px 20px' }}>
                            <label style={lbl}>Nome do Ocupante</label>
                            <SearchDropdown<Employee>
                                value={nomeOcupante}
                                onChange={(val) => {
                                    setNomeOcupante(val);
                                    const v = val.trim().toLowerCase();
                                    // Casa pela ORDEM das letras: nome (ou qualquer palavra) que COMECE com o texto.
                                    setFuncsFiltrados(v
                                        ? funcionarios.filter(f => {
                                            const nome = f.name.toLowerCase();
                                            return nome.startsWith(v) || nome.split(/\s+/).some(p => p.startsWith(v));
                                        }).slice(0, 30)
                                        : []);
                                }}
                                onSelect={(f) => { setNomeOcupante(f.name); setFuncsFiltrados([]); }}
                                onClear={() => setFuncsFiltrados([])}
                                items={funcsFiltrados}
                                placeholder="Digite o nome do funcionário"
                                getKey={(f) => f.id ?? f.name}
                                renderItem={(f) => (
                                    <div style={{ padding: '8px 12px', fontSize: '0.8rem' }}>{f.name}</div>
                                )}
                            />
                        </div>
                        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-secondary)', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
                                Cancelar
                            </button>
                            <button onClick={handleClearWardrobe} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: 'var(--success)', color: '#fff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                                Liberar
                            </button>
                            <button onClick={handleUpdateWardrobe} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: 'var(--brand)', color: '#fff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}>
                                Ocupar
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Armario;