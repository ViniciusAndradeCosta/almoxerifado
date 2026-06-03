import { useMemo, useState } from 'react';
import './SortedTable.css';

interface TableData {
  [key: string]: string | number;
}

interface SortableTableProps {
  data: TableData[];
  columns: string[];
  columnDisplayNames: { [key: string]: string };
  renderActions?: (row: TableData) => React.ReactNode;
}

const SortableTableLow: React.FC<SortableTableProps> = ({ data, columns, columnDisplayNames, renderActions }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);

  const sortedData = useMemo(() => {
    let sortableData = [...data];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (column: string) => {
    if (!sortConfig) {
      return null;
    }
    if (sortConfig.key === column) {
      return sortConfig.direction === 'ascending' ? (
        '▲'
      ) : (
        '▼'
      );
    }
    return null;
  };

  return (
    <div className="table-wrapper" style={{height: '600px', overflow:"auto", margin: '0 auto' }}>
      <table className='table table-striped table-bordered table-hover'>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} onClick={() => requestSort(column)} style={{ cursor: 'pointer' }}>
                {columnDisplayNames[column]} {getSortIcon(column)}
              </th>
            ))}
            {renderActions && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>{row[column]}</td>
              ))}
              {renderActions && <td>{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SortableTableLow;
