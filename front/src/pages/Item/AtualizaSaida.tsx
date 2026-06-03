import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { WithdrawalUpdate } from "../../types/Withdrawal";
import api from "../../services/useApi";
import { addHours, format, subDays } from "date-fns";
import { dateToISO, formatDate, getLocalDateISO } from "../../utils/dateFunctions";


const AtualizaSaida = () => {
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState<WithdrawalUpdate>({
    withdrawalDate: getLocalDateISO(),
    quantity: 0,
  })
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const navigate = useNavigate();

  const fetchWithdrawal = async () => {
    try {
      const res = await api.get(`/getitemout/${id}`);
      setFormData(res.data);
      setEmployeeId(res.data.employeeId);
    } catch (error) {
      console.log(error);
    }
  }

  const handleAtualizaSaida = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const data = {
      withdrawalDate: dateToISO(new Date(formData.withdrawalDate)),
      quantity: formData.quantity,
    }
    console.log(data);
    try {
      const response = await api.put(`/updatewithdrawal/${id}`, data);
      console.log(response.data.allWithdrawal);
      console.log(response.data.updatedAllWithdrawalCount);
      alert("Saída atualizada com sucesso!");
      navigate(`/saida/${employeeId}`);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => { 
    fetchWithdrawal();
  }, [id]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const oneWeekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  return (
    <div className="container">
      <h1 className="text-center mt-3">Atualiza Saída</h1>
      <form onSubmit={handleAtualizaSaida}>
        <div className="mb-3">
          <label htmlFor="withdrawalDate" className="form-label">Data da Saída</label>
          <input 
            type="date" 
            className="form-control" 
            id="withdrawalDate" 
            min={oneWeekAgo}
            max={today}
            style={{ userSelect: 'none', caretColor: 'transparent' }}
            onKeyDown={(e) => e.preventDefault()}
            value={formData.withdrawalDate.split('T')[0]}
            onChange={e => setFormData({ ...formData, withdrawalDate: e.target.value })} 
          />
        </div>
        <div className="mb-3">
          <label htmlFor="quantity" className="form-label">Quantidade</label>
          <input type="number" className="form-control" id="quantity" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} />
        </div>
        <button type="submit" className="btn btn-primary">Atualizar</button>
      </form>
    </div>
  )
};

export default AtualizaSaida;