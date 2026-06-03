import { readFile, writeFile } from 'fs';
import { parse, format } from 'date-fns';

// Função para ler os dados do arquivo CSV
// Função para ler os dados do arquivo CSV
function readCSV(filename) {
    return new Promise((resolve, reject) => {
        readFile(filename, 'utf8', (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            // Remover os caracteres de retorno de carro
            data = data.replace(/\r/g, '');
            // Parse the CSV data
            const rows = data.trim().split('\n').map(row => row.split(';'));
            // Extract headers
            const headers = rows.shift();
            // Convert rows into objects using headers
            const objects = rows.map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index];
                });
                return obj;
            });
            resolve({ headers, objects });
        });
    });
}


// Função para converter datas para o formato ISO-8601 DateTime
function convertToISODateTime(dateString) {
    console.log('Data original:', dateString);
    // Verifica se é o primeiro formato: DD/MM/YYYY
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const isoDateTime = format(parse(dateString, 'dd/MM/yyyy', new Date()), "yyyy-MM-dd'T'HH:mm:ss.SSS") + 'Z';
        console.log('Data convertida:', isoDateTime);
        return isoDateTime;
    }
    // Verifica se é o segundo formato: DD/MM/YYYY HH:mm:ss
    else if (dateString.match(/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/)) {
        const isoDateTime = format(parse(dateString, 'dd/MM/yyyy HH:mm', new Date()), "yyyy-MM-dd'T'HH:mm:ss.SSS") + 'Z';
        console.log('Data convertida:', isoDateTime);
        return isoDateTime;
    }
    else if (dateString.match(/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2}$/)) {
        const isoDateTime = format(parse(dateString, 'dd/MM/yyyy HH:mm:ss', new Date()), "yyyy-MM-dd'T'HH:mm:ss.SSS") + 'Z';
        console.log('Data convertida:', isoDateTime);
        return isoDateTime;
    }
    else if (dateString === '') {
        console.log('Data vazia, não é possível converter.');
        return;
    }
    // Formato inválido
    else {
        throw new Error('Formato de data inválido: ' + dateString);
    }
}

// Função para escrever os dados convertidos em um novo arquivo CSV
function writeCSV(filename, headers, data) {
    const rows = data.map(row => headers.map(header => row[header] || '').join(';'));
    const content = [headers.join(';'), ...rows].join('\n');
    writeFile(filename, content, err => {
        if (err) {
            console.error(`Erro ao escrever o arquivo CSV: ${err}`);
        } else {
            console.log(`Dados convertidos foram escritos em ${filename} com sucesso!`);
        }
    });
}

// Função principal
async function main() {
    const inputFilename = 'cabinets.csv';
    const outputFilename = 'datas_convertidas.csv';
    try {
        const { headers, objects } = await readCSV(inputFilename);
        console.log('Dados lidos do arquivo CSV:', objects);
        const convertedData = objects.map(row => {
            if (row.hasOwnProperty('date')) {
                // Converte a data para o formato ISO-8601 DateTime
                const isoDateTime = convertToISODateTime(row.date);
                return { ...row, date: isoDateTime };
            } else {
                return row;
            }
        });
        console.log('Dados convertidos:', convertedData);
        writeCSV(outputFilename, headers, convertedData);
    } catch (error) {
        console.error(`Erro ao ler o arquivo CSV: ${error}`);
    }
}

// Chamada da função principal
main();
