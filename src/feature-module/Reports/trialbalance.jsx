import React, { useState, useEffect, useContext } from "react";
import { DatePicker, Table, Card, Typography, message, Button, Tag } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import dayjs from 'dayjs';
import * as Icon from 'react-feather';

const { Title, Text } = Typography;

const TrialBalance = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  
  // Date (As Of Date)
  const [asOfDate, setAsOfDate] = useState(dayjs());
  const [tbData, setTbData] = useState([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });

  useEffect(() => {
    fetchTrialBalance();

    const channel = supabase
      .channel('trial-balance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchTrialBalance())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchTrialBalance())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfDate, selectedStore]);

  const fetchTrialBalance = async () => {
    if (!asOfDate) {
      return message.warning("Silakan pilih tanggal.");
    }
    setLoading(true);
    try {
      const endDateIso = asOfDate.endOf('day').toISOString();

      let trxQuery = supabase.from('transactions').select('total_amount, payment_method').lte('created_at', endDateIso);
      let expQuery = supabase.from('expenses').select('amount, category, expense_category').lte('created_at', endDateIso);

      if (selectedStore) {
        trxQuery = trxQuery.eq('branch_id', selectedStore);
        expQuery = expQuery.eq('branch_id', selectedStore);
      }

      const { data: trxs } = await trxQuery;
      const { data: exps } = await expQuery;

      let totalSales = 0;
      let cashSales = 0;
      let qrisSales = 0;

      (trxs || []).forEach(t => {
        const amt = t.total_amount || 0;
        totalSales += amt;
        if (t.payment_method === 'cash') cashSales += amt;
        else qrisSales += amt;
      });

      let totalExp = 0;
      (exps || []).forEach(e => {
        totalExp += (e.amount || 0);
      });

      const rows = [
        {
          key: '10100',
          account_code: '10100',
          account_name: 'Kas Tunai POS Utama',
          account_type: 'Asset (Aktiva)',
          debit: Math.max(0, cashSales - totalExp),
          credit: 0
        },
        {
          key: '10200',
          account_code: '10200',
          account_name: 'Bank / QRIS Rekening Pembayaran',
          account_type: 'Asset (Aktiva)',
          debit: qrisSales,
          credit: 0
        },
        {
          key: '40100',
          account_code: '40100',
          account_name: 'Pendapatan Penjualan Kasir POS',
          account_type: 'Revenue (Pendapatan)',
          debit: 0,
          credit: totalSales
        },
        {
          key: '50100',
          account_code: '50100',
          account_name: 'Beban Operasional Kasir',
          account_type: 'Expense (Beban)',
          debit: totalExp,
          credit: 0
        }
      ];

      let gDebit = 0;
      let gCredit = 0;
      rows.forEach(r => {
        gDebit += r.debit;
        gCredit += r.credit;
      });

      setTbData(rows);
      setTotals({ debit: gDebit, credit: gCredit });
    } catch (err) {
      console.error("Error fetching trial balance:", err);
      message.error("Gagal memuat neraca saldo.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Kode Akun',
      dataIndex: 'account_code',
      key: 'account_code',
      render: (code) => <Tag color="blue">{code}</Tag>
    },
    {
      title: 'Nama Akun Rekening',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (text) => <span className="fw-bold text-dark">{text}</span>
    },
    {
      title: 'Tipe Akun',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (text) => <span className="badge bg-light text-secondary border">{text}</span>
    },
    {
      title: 'Debet (Rp)',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right',
      render: (val) => val > 0 ? <span className="text-success fw-bold">Rp {val.toLocaleString('id-ID')}</span> : '-'
    },
    {
      title: 'Kredit (Rp)',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right',
      render: (val) => val > 0 ? <span className="text-danger fw-bold">Rp {val.toLocaleString('id-ID')}</span> : '-'
    }
  ];

  const isBalanced = totals.debit === totals.credit;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>Laporan Neraca Saldo (Trial Balance)</Title>
            <Text type="secondary">Keseimbangan saldo debet & kredit seluruh akun per tanggal aktif</Text>
          </div>
          <Button icon={<Icon.RefreshCw size={16} />} onClick={fetchTrialBalance}>
            Refresh Neraca Saldo
          </Button>
        </div>

        <Card className="mb-4 shadow-sm border-0">
          <div className="row align-items-center">
            <div className="col-md-4">
              <label className="form-label fw-bold">Per Tanggal (As of Date):</label>
              <DatePicker
                style={{ width: '100%' }}
                value={asOfDate}
                onChange={setAsOfDate}
                format="DD/MM/YYYY"
              />
            </div>
            <div className="col-md-8 text-end">
              <span className="me-3 fs-14 fw-bold">Status Neraca:</span>
              {isBalanced ? (
                <Tag color="success" className="p-2 fs-13">SEIMBANG (DEBIT = KREDIT)</Tag>
              ) : (
                <Tag color="error" className="p-2 fs-13">TIDAK SEIMBANG</Tag>
              )}
            </div>
          </div>
        </Card>

        <Card className="shadow-sm border-0">
          <Table
            columns={columns}
            dataSource={tbData}
            rowKey="key"
            loading={loading}
            pagination={false}
            summary={() => (
              <Table.Summary.Row style={{ backgroundColor: '#F8FAFC' }}>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <span className="fw-bold fs-15 text-dark">TOTAL KESELURUHAN (TOTAL SALDO)</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <span className="fw-bold fs-15 text-success">Rp {totals.debit.toLocaleString('id-ID')}</span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span className="fw-bold fs-15 text-danger">Rp {totals.credit.toLocaleString('id-ID')}</span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>
      </div>
    </div>
  );
};

export default TrialBalance;
