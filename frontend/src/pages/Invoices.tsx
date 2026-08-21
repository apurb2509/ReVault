import React from 'react';
import { Header } from '../components/layout/Header';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface Invoice {
  id: string;
  company: string;
  amount: number;
  status: 'Unpaid' | 'PTP' | 'Escalated';
  daysOverdue: number;
}

const data: Invoice[] = [
  { id: 'INV-101', company: 'Acme Corp', amount: 4500000, status: 'Unpaid', daysOverdue: 15 },
  { id: 'INV-102', company: 'GlobalTech', amount: 1200000, status: 'PTP', daysOverdue: 32 },
  { id: 'INV-103', company: 'Initech', amount: 850000, status: 'Escalated', daysOverdue: 94 },
];

const columnHelper = createColumnHelper<Invoice>();

const columns = [
  columnHelper.accessor('id', {
    header: 'Invoice ID',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('company', {
    header: 'Company',
    cell: info => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
  }),
  columnHelper.accessor('amount', {
    header: 'Amount',
    cell: info => `₹${(info.getValue() / 100).toLocaleString('en-IN')}`,
  }),
  columnHelper.accessor('daysOverdue', {
    header: 'Days Overdue',
    cell: info => (
      <span className={info.getValue() > 90 ? 'text-danger' : info.getValue() > 30 ? 'text-warning' : ''}>
        {info.getValue()} days
      </span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const val = info.getValue();
      const badgeClass = val === 'Escalated' ? 'badge-danger' : val === 'PTP' ? 'badge-warning' : 'badge-success';
      return <span className={`badge ${badgeClass}`}>{val}</span>;
    },
  }),
];

export const Invoices: React.FC = () => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <Header 
        title="B2B Invoices" 
        subtitle="Receivables Pursuit Agent Status" 
      />
      <div className="panel">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} style={{ padding: '16px' }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
