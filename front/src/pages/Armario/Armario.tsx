import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import api from '../../services/useApi';
import { Cabinet } from '../../types/Cabinet';
import { format } from 'date-fns';
import { Employee } from '../../types/Employee';

const Armario = () => {
	const [armarios, setArmarios] = useState<Cabinet[]>([]);
	const [nomeOcupante, setNomeOcupante] = useState('');
	const [number, setNumber] = useState(0);
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
	const [filtro, setFiltro] = useState('');
	const [armariosDisponiveis, setArmariosDisponiveis] = useState(0);
	const [armariosOcupados, setArmariosOcupados] = useState(0);
	const [funcionarios, setFuncionarios] = useState<Employee[]>([]);

	useEffect(() => {
		fetchArmarios();
		fetchFuncionarios();
	}, []);

	const fetchArmarios = async () => {
		try {
			const res = await api.get('/getcabinets');
			setArmarios(res.data);
			const disponiveis = res.data.filter((armario: Cabinet) => armario.situation === 'Disponivel');
			const ocupados = res.data.filter((armario: Cabinet) => armario.situation === 'Ocupado');
			setArmariosDisponiveis(disponiveis.length);
			setArmariosOcupados(ocupados.length);
		} catch (error) {
			console.log(error);
		}
	};

	const fetchFuncionarios = async () => {
		try {
			let res;
			res = await api.get('/getemployees');
			setFuncionarios(res.data);
		} catch (error) {
			console.log(error);
		}
	};

	const getRowColorClass = (situation: string) => {
		return situation === 'Ocupado' ? 'text-danger fw-bold' : 'text-success fw-bold';
	};

	const handleUpdateWardrobe = async () => {
		try {
			console.log(number)
			await api.put(`/cabinet/${number}`, { name: nomeOcupante.toUpperCase(), situation: 'Ocupado', date: new Date().toISOString() });
			fetchArmarios();
		} catch (error) {
			console.log(error);
		}
	}

	const handleClearWardrobe = async () => {
		try {
			await api.put(`/cabinet/${number}`, { name: '', situation: 'Disponivel', date: null });
			fetchArmarios();
		} catch (error) {
			console.log(error);
		}
	}

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setNomeOcupante(e.target.value);
	}

	const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFiltro(event.target.value)
	}

	const sortedArmarios = [...armarios].sort((a: Cabinet, b: Cabinet) => {
		const situationA = (a.situation && a.situation.toLowerCase()) ?? '';
		const situationB = (b.situation && b.situation.toLowerCase()) ?? '';
		const situationCompare = situationA.localeCompare(situationB);
		if (situationCompare !== 0) {
			return situationCompare;
		}
		return a.number - b.number;
	});

	const handleExportCSV = () => {
		// Extract only the needed columns
		const csvData = armarios.map(({ number, size, sector, situation, date }) => ({
			NUMERO: number,
			TAMANHO: size,
			SETOR: sector,
			SITUACAO: situation,
			DATA: date,
		}));

		// Create CSV string manually
		const csv = Papa.unparse(csvData, {
			columns: ['NUMERO', 'TAMANHO', 'SETOR', 'SITUACAO', 'DATA'],
			delimiter: ';',
		});

		const csvBlob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });

		// Create a link and trigger a click to download the file
		const csvURL = window.URL.createObjectURL(csvBlob);
		const tempLink = document.createElement('a');
		tempLink.href = csvURL;
		tempLink.setAttribute('download', 'armarios.csv');
		document.body.appendChild(tempLink);
		tempLink.click();
		document.body.removeChild(tempLink);
	};

	return (
		<div className='container-lg'>
			<div>
				<h1 className='text-center my-5' >Lista de Armários</h1>
				<input type="text" className='form-control mb-3' placeholder='Digite o número do armário ou o nome da pessoa' value={filtro} onChange={handleFilterChange} />
			</div>
			<div style={{ height: '600px' }}>
				<div className="h-100 overflow-y-auto ">
					<table className='table table-striped table-bordered table-hover' style={{ width: '100%', borderCollapse: 'collapse' }}>
						<thead>
							<tr>
								<th style={{ width: '5%' }}>Número</th>
								<th style={{ width: '15%', textAlign: 'center' }}>Setor - Tamanho</th>
								<th style={{ width: '15%' }}>Situação</th>
								<th style={{ width: '45%' }}>Nome</th>
								<th style={{ width: '12%' }} >Data</th>
								<th>...</th>
							</tr>
						</thead>
						<tbody>
							{sortedArmarios.filter((armario: Cabinet) => armario.number.toString().includes(filtro) || armario.name.toLowerCase().includes(filtro.toLowerCase()))
								.map((armario: Cabinet) => (
									<tr key={armario.number}>  {/* Ensure `armario.number` exists before using it as a key */}
										<td className='text-center'>{armario.number}</td>
										<td className='text-center'>{armario.sector} - {armario.size}</td>
										<td className={getRowColorClass(armario.situation)}>{armario.situation}</td>
										<td>{armario.name}</td>
										<td>{armario.date ? format(armario.date, "dd/MM/yyyy HH:mm") : ''}</td>
										<td><button className='btn btn-danger' data-bs-toggle="modal" data-bs-target="#staticBackdrop" onClick={() => setNumber(armario.number)}> Atualizar </button></td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			</div>
			<div className="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex={-1} aria-labelledby="staticBackdropLabel" aria-hidden="true">
				<div className="modal-dialog modal-dialog-centered">
					<div className="modal-content">
						<div className="modal-header">
							<h1 className="modal-title fs-5" id="staticBackdropLabel">Atualizar Armário</h1>
							<button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
						</div>
						<div className="modal-body">
							<label>
								Nome do Ocupante:
							</label>
							<input type="text" className='form-control mb-3' value={nomeOcupante} placeholder='Digite o nome do ocupante' onChange={handleNameChange} list="funcionarios" autoComplete='off'/>
							<datalist id="funcionarios">
								{funcionarios.map((funcionario) => (
									<option key={funcionario.id} value={funcionario.name}>{funcionario.name}</option>
								))}
							</datalist>
						</div>
						<div className="modal-footer">
							<button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => handleUpdateWardrobe()}>Ocupar </button>
							<button type="button" className="btn btn-danger" data-bs-dismiss="modal" onClick={() => handleClearWardrobe()}>Liberar</button>
						</div>
					</div>
				</div>
			</div>


			<div className='text-center fw-bold'>
				<div className='text-success'>Armarios Disponíveis: {armariosDisponiveis}</div>
				<div className='text-danger'>Armarios Ocupados: {armariosOcupados}</div>
				<div className='mb-8 mb-4'>
					<h4 className="text-lg mb-2"> Exportar Armários para CSV</h4>
					<button type='button' className='btn btn-primary' onClick={handleExportCSV}>BAIXAR</button>
				</div>
			</div>

		</div>


	);
}

export default Armario;