import React, { useState, useEffect, useContext } from "react";
import { Table, Select, DatePicker, Button, message, Card, Typography, Tag } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import * as Icon from 'react-feather';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const GeneralLedger = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  const [coasList, setCoasList] = useState([]);
  
  // Filters
  const [selectedCoa, setSelectedCoa] = useState(null);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  
  // Data
  const [ledgerData, setLedgerData] = useState([]);

  useEffect(() => {
    fetchCOA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  useEffect(() => {
    fetchLedger();

    const channel = supabase
      .channel('ledger-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchLedger())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchLedger())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoa, dateRange, selectedStore]);

  const fetchCOA = async () => {
    try {
      let query = supabase.from('coa').select('*').eq('is_active', true).order('account_code');
      if (selectedStore) {
        query = query.or(`branch_id.eq.${selectedStore},branch_id.is.null`);
      }
      const { data } = await query;
      const list = data || [
        { id: '10100', account_code: '10100', account_name: 'Kas & Bank (Aktiva Lancar)', account_type: 'Asset' },
        { id: '40100', account_code: '40100', account_name: 'Pendapatan Penjualan POS', account_type: 'Revenue' },
        { id: '50100', account_code: '50100', account_name: 'Beban Operasional & Kasir', account_type: 'Expense' },
      ];
      setCoasList(list);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const startDate = dateRange && dateRange[0] ? dateRange[0].startOf('day').toISOString() : dayjs().startOf('year').toISOString();
      const endDate = dateRange && dateRange[1] ? dateRange[1].endOf('day').toISOString() : dayjs().endOf('year').toISOString();

      let trxQuery = supabase.from('transactions').select('*').gte('created_at', startDate).lte('created_at', endDate).order('created_at', { ascending: true });
      let expQuery = supabase.from('expenses').select('*').gte('created_at', startDate).lte('created_at', endDate).order('created_at', { ascending: true });

      if (selectedStore) {
        trxQuery = trxQuery.eq('branch_id', selectedStore);
        expQuery = expQuery.eq('branch_id', selectedStore);
      }

      const { data: trxs } = await trxQuery;
      const { data: exps } = await expQuery;

      let entries = [];

      // Build postings from POS sales transactions
      (trxs || []).forEach(t => {
        const shortId = t.id.slice(0, 8).toUpperCase();
        const amt = t.total_amount || 0;
        const pMethod = (t.payment_method || 'cash').toUpperCase();
        
        entries.push({
          id: `trx-${t.id}`,
          date: t.created_at,
          ref: `POS-${shortId}`,
          account: `Kas & Bank (${pMethod})`,
          description: `Penjualan Kasir POS (${pMethod})`,
          debit: amt,
          credit: 0,
          type: 'sales'
        });

        entries.push({
          id: `trx-rev-${t.id}`,
          date: t.created_at,
          ref: `POS-${shortId}`,
          account: `Pendapatan Penjualan POS`,
          description: `Pendapatan Penjualan POS (${pMethod})`,
          debit: 0,
          credit: amt,
          type: 'sales'
        });
      });

      // Build postings from operational expenses
      (exps || []).forEach(e => {
        const shortId = e.id.slice(0, 8).toUpperCase();
        const amt = e.amount || 0;
        const cat = e.category || e.expense_category || 'Operasional';

        entries.push({
          id: `exp-deb-${e.id}`,
          date: e.created_at || e.expense_date,
          ref: `EXP-${shortId}`,
          account: `Beban Operasional (${cat})`,
          description: e.description || e.notes || `Pengeluaran ${cat}`,
          debit: amt,
          credit: 0,
          type: 'expense'
        });

        entries.push({
          id: `exp-cred-${e.id}`,
          date: e.created_at || e.expense_date,
          ref: `EXP-${shortId}`,
          account: `Kas Tunai / Bank`,
          description: e.description || e.notes || `Pengeluaran ${cat}`,
          debit: 0,
          credit: amt,
          type: 'expense'
        });
      });

      // Filter by COA if selected
      if (selectedCoa) {
        const selObj = coasList.find(c => c.id === selectedCoa);
        if (selObj) {
          const accNameLower = selObj.account_name.toLowerCase();
          entries = entries.filter(item => item.account.toLowerCase().includes(accNameLower) || item.account.includes(selObj.account_code));
        }
      }

      // Sort by date ascending
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate running balance (saldo berjalan)
      let running = 0;
      const processed = entries.map(item => {
        running += (item.debit - item.credit);
        return {
          ...item,
          balance: running
        };
      });

      setLedgerData(processed);
    } catch (err) {
      console.error("Error building general ledger:", err);
      message.error("Gagal memuat buku besar.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tanggal & Waktu',
      dataIndex: 'date',
      key: 'date',
      render: (d) => d ? dayjs(d).format('DD MMM YYYY HH:mm') : '-'
    },
    {
      title: 'No. Referensi',
      dataIndex: 'ref',
      key: 'ref',
      render: (ref) => <Tag color="blue">{ref}</Tag>
    },
    {
      title: 'Akun / Rekening Buku Besar',
      dataIndex: 'account',
      key: 'account',
      render: (acc) => <span className="fw-bold text-dark">{acc}</span>
    },
    {
      title: 'Keterangan Transaksi',
      dataIndex: 'description',
      key: 'description'
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
    },
    {
      title: 'Saldo Berjalan (Rp)',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (val) => (
        <span className={`fw-bold ${val >= 0 ? 'text-primary' : 'text-danger'}`}>
          Rp {val.toLocaleString('id-ID')}
        </span>
      )
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>Laporan Buku Besar (General Ledger)</Title>
            <Text type="secondary">Rincian mutasi debet & kredit dari seluruh transaksi penjualan POS & pengeluaran</Text>
          </div>
          <Button icon={<Icon.RefreshCw size={16} />} onClick={fetchLedger}>
            Refresh Ledger
          </Button>
        </div>

        {/* Filter Bar */}
        <Card className="mb-4 shadow-sm border-0">
          <div className="row align-items-center">
            <div className="col-md-4 mb-3 mb-md-0">
              <label className="form-label fw-bold">Filter Akun Buku Besar:</label>
              <Select
                style={{ width: '100%' }}
                placeholder="Semua Akun (Jurnal Utama)"
                value={selectedCoa}
                onChange={setSelectedCoa}
                allowClear
              >
                {coasList.map(c => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.account_code ? `[${c.account_code}] ` : ''}{c.account_name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div className="col-md-5 mb-3 mb-md-0">
              <label className="form-label fw-bold">Rentang Tanggal Mutasi:</label>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={setDateRange}
                format="DD/MM/YYYY"
              />
            </div>
          </div>
        </Card>

        {/* Data Table */}
        <Card className="shadow-sm border-0">
          <Table
            columns={columns}
            dataSource={ledgerData}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 15 }}
          />
        </Card>
      </div>
    </div>
  );
};

export default GeneralLedger;
