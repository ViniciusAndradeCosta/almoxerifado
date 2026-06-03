import { parse, format } from 'date-fns';
import fs from 'fs';


// Função para converter a data
function converterDataParaISO(data) {
  // Dividir a data em dia, mês e ano
  const [dia, mes, ano] = data.split('/').map(Number);

  // Construir uma nova data
  const dataConvertida = new Date(ano, mes, dia); // Mês começa de 0

  // Verificar se a data é válida
  if (isNaN(dataConvertida.getTime())) {
      throw new Error('Data inválida: ' + data);
  }

  // Formatar a data para o formato ISO
  const formatoSaida = "yyyy-MM-dd'T'HH:mm:sss'Z'";
  const dataISO = format(dataConvertida, formatoSaida);

  return dataISO;
}


// Função para processar o CSV
function processarCSV(csv) {
  // Dividir o CSV em linhas
  const linhas = csv.trim().split('\n');

  // Remover a primeira linha (cabeçalho)
  const dados = linhas.slice(1);

  // Mapear as linhas para objetos
  const objetos = dados.map((linha) => {
      const valores = linha.split(';');
      // Converter a data se estiver na quarta coluna
      if (valores.length >= 4) {
          valores[3] = converterDataParaISO(valores[3]);
      }
      return valores.join(';');
  });

  return objetos.join('\n');
}

// Ler o conteúdo do arquivo CSV
const csv = fs.readFileSync('employees.csv', 'utf8');
// Processar o CSV e obter os objetos com datas convertidas
const csvConvertido = processarCSV(csv);
// Salvar o novo conteúdo CSV em um arquivo 'convertidas.csv'
fs.writeFileSync('convertidas.csv', csvConvertido, 'utf8');



