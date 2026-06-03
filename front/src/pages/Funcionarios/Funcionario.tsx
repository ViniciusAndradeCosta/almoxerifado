import { useEffect, useState } from "react";
import { Employee } from "../../types/Employee";
import api from "../../services/useApi";
import { Link, useNavigate, useParams } from "react-router-dom";
import Papa from 'papaparse';
import { WithdrawalPlus } from "../../types/Withdrawal";
import { formatDate } from "../../utils/dateFunctions";


const Funcionario: React.FC = () => {
	const { tipo } = useParams<{ tipo: string }>();
	const [funcionarios, setFuncionarios] = useState<Employee[]>([]);
	const [filtro, setFiltro] = useState('');
	const navigate = useNavigate();
	const [withdrawals, setWithdrawals] = useState<WithdrawalPlus[]>([]);

	useEffect(() => {
		fetchFuncionarios();
		fetchWithdrawals();
	}, [tipo]);

	const fetchFuncionarios = async () => {
		try {
			let res;
			if (tipo) {
				res = await api.get(`/getemployees/${tipo}`);
			} else {
				res = await api.get('/getemployees');
			}
			setFuncionarios(res.data);
		} catch (error) {
			console.log(error);
		}
	};

	const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFiltro(event.target.value)
	}

	const handleDeleteEmployee = async (id: number) => {
		const confirmDelete = window.confirm('Deseja realmente excluir este funcionário?');

		if (!confirmDelete) {
			return;
		}

		try {
			await api.delete(`/employee/${id}`);
			fetchFuncionarios();
		} catch (error) {
			console.log(error);
		}
	}

	const handleExportCSV = () => {
		// Extract only the needed columns
		const csvData = funcionarios.map(({ name, company, role, department, admissionDate, shirt_size, pants_size, shoes_size }) => ({
			NOME: name,
			EMPRESA: company,
			DEPARTAMENTO: department,
			CARGO: role,
			ADMISSAO: formatDate(admissionDate),
			CAMISA: shirt_size,
			CALÇA: pants_size,
			CALÇADO: shoes_size,
		}));

		// Create CSV string manually
		const csv = Papa.unparse(csvData, {
			columns: ['NOME', 'EMPRESA', 'DEPARTAMENTO', 'CARGO', 'ADMISSAO', 'CAMISA', 'CALÇA', 'CALÇADO'],
			delimiter: ';',
		});

		const csvBlob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });

		// Create a link and trigger a click to download the file
		const csvURL = window.URL.createObjectURL(csvBlob);
		const tempLink = document.createElement('a');
		tempLink.href = csvURL;
		tempLink.setAttribute('download', 'funcionarios.csv');
		document.body.appendChild(tempLink);
		tempLink.click();
		document.body.removeChild(tempLink);
	};

	const fetchWithdrawals = async () => {
		try {
			const res = await api.get('/getwithdrawalsoutplus');
			setWithdrawals(res.data);
		} catch (error) {
			console.log(error);
		}
	};

	const handleExportwithdrawals = () => {
		const csvData = withdrawals.map(({ withdrawalDate, quantity, item, employee }) => ({
			ITEM: item.name,
			TIPO: item.type,
			SETOR: item.sector,
			QUANTIDADE: quantity,
			FUNCIONARIO: employee.name,
			DEPARTAMENTO: employee.department,
			DATA: formatDate(withdrawalDate),
		}));

		const csv = Papa.unparse(csvData, {
			columns: ['ITEM', 'QUANTIDADE', 'TIPO', 'SETOR', 'FUNCIONARIO', 'DATA', 'DEPARTAMENTO'],
			delimiter: ';',
		});

		const csvBlob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });

		const csvURL = window.URL.createObjectURL(csvBlob);
		const tempLink = document.createElement('a');
		tempLink.href = csvURL;
		tempLink.setAttribute('download', 'relatorio.csv');
		document.body.appendChild(tempLink);
		tempLink.click();
		document.body.removeChild(tempLink);
	}

	return (
		<div className="container-lg">
			<div className="row">
				<div className="col-12">
					{!tipo && (
						<>
							<h1 className="text-center m-3">Funcionários</h1>
						</>
					)}
					{tipo && (
						<>
							<h1 className="text-center m-3">Novos Funcionários</h1>
						</>
					)}
				</div>
				<div className="col-12">
					<div className="row">
						<div className="">
							<div className="input-group mb-3">
								<input type="text" className="form-control" placeholder="Filtrar por nome" aria-label="Filtrar por nome" aria-describedby="basic-addon1" value={filtro} onChange={handleFilterChange} />
							</div>
						</div>
						<div className="col-6">
							<div className="d-flex justify-content-end">
							</div>
						</div>
					</div>
				</div>
				<div style={{ height: '600px' }} className="mb-3">
					<div className="h-100 overflow-y-auto border">
						<table className="table table-striped table-bordered table-hover" style={{ margin: '0' }}>
							<thead>
								<tr>
									<th scope="col">Nome</th>
									<th scope="col">Empresa</th>
									<th scope="col">Departamento</th>
									<th scope="col">Cargo</th>
									<th scope="col">Admissão</th>
									{tipo && (
										<>
											<th scope="col">Camisa</th>
											<th scope="col">Calça</th>
											<th scope="col">Calçado</th>
										</>
									)}
									{!tipo && (
										<>
											<th scope="col">...</th>
											<th scope="col">...</th>
										</>
									)}
								</tr>
							</thead>
							<tbody>
								{funcionarios.filter((funcionario: Employee) => funcionario.name.toLowerCase().includes(filtro.toLowerCase())).map((funcionario: Employee) => (
									<tr key={funcionario.id} className="align-middle">
										<td><Link to={`/saida/${funcionario.id}`}>{funcionario.name}</Link></td>
										<td>{funcionario.company}</td>
										<td>{funcionario.department}</td>
										<td>{funcionario.role}</td>
										<td style={{ width: "100px"}}>{formatDate(funcionario.admissionDate)}</td>
										{tipo && (
											<>
												<td>{funcionario.shirt_size}</td>
												<td>{funcionario.pants_size}</td>
												<td>{funcionario.shoes_size}</td>
											</>
										)}
										{!tipo && (
											<>
												<td><button className="btn btn-danger" onClick={() => handleDeleteEmployee(funcionario.id ?? 0)}>Excluir</button></td>
												<td><button className="btn btn-primary" onClick={() => navigate(`/atualizarfuncionario/${funcionario.id}`)}>Atualizar</button></td>
											</>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
			<div className="d-flex justify-content-evenly text-center">
				{
					!tipo && (
						<>
							<div className='border rounded p-3'>
								<h4 className="text-lg mb-2"> Exportar Funcionarios para CSV</h4>
								<button type='button' className='btn btn-primary' onClick={handleExportCSV}>BAIXAR</button>
							</div>
							<div className="border rounded p-3 text-center">
								<h4>Tirar relatório de consumo do almoxarifado</h4>
								<button className="btn btn-primary" onClick={handleExportwithdrawals}>BAIXAR</button>
							</div>
						</>
					)
				}

			</div>
		</div>
	);
}

export default Funcionario;