import React, { useState, useEffect, useContext } from "react";
import { Table, Select, DatePicker, Button, message, Card, Typography, Tag, Row, Col, Statistic } from 'antd';
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
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, finalBalance: 0 });

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_entries' }, () => fetchLedger())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_lines' }, () => fetchLedger())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_purchases' }, () => fetchLedger())
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
      setCoasList(data || []);
    } catch (err) {
      console.error("Error fetching COA:", err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      // Fetch active COAs locally for mapping
      let coaQuery = supabase.from('coa').select('*').eq('is_active', true).order('account_code');
      if (selectedStore) {
        coaQuery = coaQuery.or(`branch_id.eq.${selectedStore},branch_id.is.null`);
      }
      const { data: coaData } = await coaQuery;
      const activeCoas = coaData || coasList;

      const startDate = dateRange && dateRange[0] ? dateRange[0].startOf('day').toISOString() : dayjs().startOf('year').toISOString();
      const endDate = dateRange && dateRange[1] ? dateRange[1].endOf('day').toISOString() : dayjs().endOf('year').toISOString();

      let trxQuery = supabase.from('transactions').select('*').gte('created_at', startDate).lte('created_at', endDate).order('created_at', { ascending: true });
      let expQuery = supabase.from('expenses').select('*').gte('created_at', startDate).lte('created_at', endDate).order('created_at', { ascending: true });
      let jlQuery = supabase.from('journal_lines').select('*, journal_entries!inner(*), coa(*)').order('created_at', { ascending: true });
      let purQuery = supabase.from('supplier_purchases').select('*').gte('purchase_date', startDate).lte('purchase_date', endDate).order('purchase_date', { ascending: true });

      if (selectedStore) {
        trxQuery = trxQuery.eq('branch_id', selectedStore);
        expQuery = expQuery.eq('branch_id', selectedStore);
        purQuery = purQuery.eq('branch_id', selectedStore);
      }

      const { data: trxs } = await trxQuery;
      const { data: exps } = await expQuery;
      const { data: jLines } = await jlQuery;
      const { data: purs } = await purQuery;

      // Find standard COA objects from loaded COA list
      const kasKasirCoa = activeCoas.find(c => c.account_code === '1-1000') || { id: 'kas-1', account_code: '1-1000', account_name: 'Kas Tunai POS Utama' };
      const bankQrisCoa = activeCoas.find(c => c.account_code === '1-1100') || { id: 'bank-1', account_code: '1-1100', account_name: 'Bank BCA / QRIS Pembayaran' };
      const hutangUsahaCoa = activeCoas.find(c => c.account_code === '2-1000') || { id: 'hut-1', account_code: '2-1000', account_name: 'Hutang Usaha' };
      const pendapatanCoa = activeCoas.find(c => c.account_code === '4-1000') || { id: 'rev-1', account_code: '4-1000', account_name: 'Pendapatan Penjualan' };
      const bebanKasirCoa = activeCoas.find(c => c.account_code === '6-4000') || { id: 'exp-1', account_code: '6-4000', account_name: 'Beban Operasional Kasir' };
      const bebanBahanBakuCoa = activeCoas.find(c => c.account_code === '6-5000') || { id: 'exp-2', account_code: '6-5000', account_name: 'Beban Pembelian Bahan Baku' };
      const bebanGajiCoa = activeCoas.find(c => c.account_code === '6-1000') || { id: 'exp-3', account_code: '6-1000', account_name: 'Beban Gaji Karyawan' };
      const bebanListrikCoa = activeCoas.find(c => c.account_code === '6-2000') || { id: 'exp-4', account_code: '6-2000', account_name: 'Beban Listrik & Air' };
      const bebanSewaCoa = activeCoas.find(c => c.account_code === '6-3000') || { id: 'exp-5', account_code: '6-3000', account_name: 'Beban Sewa' };
      const bebanLainCoa = activeCoas.find(c => c.account_code === '6-9999') || { id: 'exp-6', account_code: '6-9999', account_name: 'Beban Lain-Lain' };

      let entries = [];

      // 1. Build postings from POS sales transactions
      (trxs || []).forEach(t => {
        const shortId = t.id.slice(0, 8).toUpperCase();
        const amt = t.total_amount || 0;
        const pMethod = (t.payment_method || 'cash').toLowerCase();
        
        const assetCoa = pMethod === 'qris' ? bankQrisCoa : kasKasirCoa;

        // Debit Asset (Kas / Bank)
        entries.push({
          id: `trx-deb-${t.id}`,
          date: t.created_at,
          ref: `POS-${shortId}`,
          coa_id: assetCoa.id,
          account_code: assetCoa.account_code,
          account_name: assetCoa.account_name,
          account: `[${assetCoa.account_code}] ${assetCoa.account_name}`,
          description: `Penjualan Kasir POS (${pMethod.toUpperCase()})`,
          debit: amt,
          credit: 0,
        });

        // Credit Revenue (Pendapatan Penjualan)
        entries.push({
          id: `trx-cred-${t.id}`,
          date: t.created_at,
          ref: `POS-${shortId}`,
          coa_id: pendapatanCoa.id,
          account_code: pendapatanCoa.account_code,
          account_name: pendapatanCoa.account_name,
          account: `[${pendapatanCoa.account_code}] ${pendapatanCoa.account_name}`,
          description: `Pendapatan Penjualan Kasir (${pMethod.toUpperCase()})`,
          debit: 0,
          credit: amt,
        });
      });

      // 2. Build postings from operational expenses
      (exps || []).forEach(e => {
        const shortId = e.id.slice(0, 8).toUpperCase();
        const amt = e.amount || 0;
        const cat = (e.category || e.expense_category || 'Operasional').toLowerCase();

        let expCoa = bebanKasirCoa;
        if (cat.includes('bahan') || cat.includes('baku')) expCoa = bebanBahanBakuCoa;
        else if (cat.includes('gaji')) expCoa = bebanGajiCoa;
        else if (cat.includes('listrik') || cat.includes('air')) expCoa = bebanListrikCoa;
        else if (cat.includes('sewa')) expCoa = bebanSewaCoa;
        else if (cat.includes('lain')) expCoa = bebanLainCoa;

        // Debit Expense
        entries.push({
          id: `exp-deb-${e.id}`,
          date: e.created_at || e.expense_date,
          ref: `EXP-${shortId}`,
          coa_id: expCoa.id,
          account_code: expCoa.account_code,
          account_name: expCoa.account_name,
          account: `[${expCoa.account_code}] ${expCoa.account_name}`,
          description: e.description || e.notes || `Pengeluaran ${expCoa.account_name}`,
          debit: amt,
          credit: 0,
        });

        // Credit Asset (Kas Tunai POS Utama)
        entries.push({
          id: `exp-cred-${e.id}`,
          date: e.created_at || e.expense_date,
          ref: `EXP-${shortId}`,
          coa_id: kasKasirCoa.id,
          account_code: kasKasirCoa.account_code,
          account_name: kasKasirCoa.account_name,
          account: `[${kasKasirCoa.account_code}] ${kasKasirCoa.account_name}`,
          description: e.description || e.notes || `Pengeluaran ${expCoa.account_name}`,
          debit: 0,
          credit: amt,
        });
      });

      // Collect existing journal references to avoid duplicates
      const jrnRefs = new Set((jLines || []).map(jl => jl.journal_entries?.reference).filter(Boolean));

      // 3. Build postings from Supplier Purchases & Hutang (ONLY if not already present in journal_lines)
      (purs || []).forEach(p => {
        const refStr = p.reference_no || `PUR-${p.id.slice(0, 8).toUpperCase()}`;
        if (jrnRefs.has(refStr) || jrnRefs.has(p.reference_no)) {
          // Skip because journal_lines already has the exact postings for this purchase!
          return;
        }

        const amt = Number(p.total_amount) || 0;
        const isPaid = p.payment_status === 'paid';
        const pMethod = (p.payment_method || 'cash').toLowerCase();
        const assetCoa = pMethod === 'bank' ? bankQrisCoa : kasKasirCoa;

        // Debit: Beban Pembelian Bahan Baku
        entries.push({
          id: `pur-deb-${p.id}`,
          date: p.purchase_date,
          ref: refStr,
          coa_id: bebanBahanBakuCoa.id,
          account_code: bebanBahanBakuCoa.account_code,
          account_name: bebanBahanBakuCoa.account_name,
          account: `[${bebanBahanBakuCoa.account_code}] ${bebanBahanBakuCoa.account_name}`,
          description: `Pembelian Bahan Baku - ${p.supplier_name} (${p.description || ''})`,
          debit: amt,
          credit: 0,
        });

        if (!isPaid) {
          // Credit: Hutang Usaha
          entries.push({
            id: `pur-cred-hut-${p.id}`,
            date: p.purchase_date,
            ref: refStr,
            coa_id: hutangUsahaCoa.id,
            account_code: hutangUsahaCoa.account_code,
            account_name: hutangUsahaCoa.account_name,
            account: `[${hutangUsahaCoa.account_code}] ${hutangUsahaCoa.account_name}`,
            description: `Hutang Supplier - ${p.supplier_name} (${p.description || ''})`,
            debit: 0,
            credit: amt,
          });
        } else {
          // Credit: Kas/Bank
          entries.push({
            id: `pur-cred-kas-${p.id}`,
            date: p.purchase_date,
            ref: refStr,
            coa_id: assetCoa.id,
            account_code: assetCoa.account_code,
            account_name: assetCoa.account_name,
            account: `[${assetCoa.account_code}] ${assetCoa.account_name}`,
            description: `Pembelian Bahan Baku Tunai - ${p.supplier_name}`,
            debit: 0,
            credit: amt,
          });
        }

        // If debt paid later (Pelunasan Hutang)
        if (isPaid && p.payment_date && p.payment_date !== p.purchase_date) {
          // Debit: Hutang Usaha (Mengurangi Hutang)
          entries.push({
            id: `pay-deb-hut-${p.id}`,
            date: p.payment_date,
            ref: `PAY-${p.id.slice(0, 8).toUpperCase()}`,
            coa_id: hutangUsahaCoa.id,
            account_code: hutangUsahaCoa.account_code,
            account_name: hutangUsahaCoa.account_name,
            account: `[${hutangUsahaCoa.account_code}] ${hutangUsahaCoa.account_name}`,
            description: `Pelunasan Hutang Supplier - ${p.supplier_name}`,
            debit: amt,
            credit: 0,
          });

          // Credit: Kas/Bank (Mengurangi Kas)
          entries.push({
            id: `pay-cred-kas-${p.id}`,
            date: p.payment_date,
            ref: `PAY-${p.id.slice(0, 8).toUpperCase()}`,
            coa_id: assetCoa.id,
            account_code: assetCoa.account_code,
            account_name: assetCoa.account_name,
            account: `[${assetCoa.account_code}] ${assetCoa.account_name}`,
            description: `Pelunasan Hutang Supplier - ${p.supplier_name}`,
            debit: 0,
            credit: amt,
          });
        }
      });

      // 3. Build postings from Manual Journal Entries (journal_lines)
      (jLines || []).forEach(jl => {
        const header = jl.journal_entries || {};
        const coaObj = jl.coa || {};
        const shortId = (header.id || jl.id).slice(0, 8).toUpperCase();

        entries.push({
          id: `jl-${jl.id}`,
          date: header.entry_date || jl.created_at,
          ref: header.reference || `JRN-${shortId}`,
          coa_id: jl.account_id,
          account_code: coaObj.account_code || 'COA',
          account_name: coaObj.account_name || 'Buku Besar',
          account: `[${coaObj.account_code || '-'}] ${coaObj.account_name || 'Buku Besar'}`,
          description: header.description || 'Jurnal Umum',
          debit: Number(jl.debit) || 0,
          credit: Number(jl.credit) || 0,
        });
      });

      // Filter by selected COA if user picked one
      let filteredEntries = entries;
      if (selectedCoa) {
        const selObj = coasList.find(c => c.id === selectedCoa);
        if (selObj) {
          filteredEntries = entries.filter(item => item.coa_id === selectedCoa || item.account_code === selObj.account_code);
        }
      }

      // Sort by date ascending
      filteredEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate running balance and totals
      let running = 0;
      let sumDeb = 0;
      let sumCred = 0;

      const processed = filteredEntries.map(item => {
        running += (item.debit - item.credit);
        sumDeb += item.debit;
        sumCred += item.credit;
        return {
          ...item,
          balance: running
        };
      });

      setLedgerData(processed);
      setSummary({
        totalDebit: sumDeb,
        totalCredit: sumCred,
        finalBalance: running
      });
    } catch (err) {
      console.error("Error building general ledger:", err);
      message.error("Gagal memuat buku besar.");
    } finally {
      setLoading(false);
    }
  };

  const selectedAccountObj = coasList.find(c => c.id === selectedCoa);

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
      title: 'Akun Buku Besar (COA)',
      dataIndex: 'account',
      key: 'account',
      render: (acc) => <span className="badge bg-light text-purple border fw-bold">{acc}</span>
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
            <Text type="secondary">Rincian mutasi debet & kredit dari seluruh transaksi penjualan POS, pengeluaran, & jurnal</Text>
          </div>
          <Button icon={<Icon.RefreshCw size={16} />} onClick={fetchLedger}>
            Refresh Ledger
          </Button>
        </div>

        {/* Filter Bar */}
        <Card className="mb-4 shadow-sm border-0">
          <div className="row align-items-center">
            <div className="col-md-5 mb-3 mb-md-0">
              <label className="form-label fw-bold">Pilih Akun Buku Besar (COA):</label>
              <Select
                style={{ width: '100%' }}
                placeholder="Semua Akun Buku Besar (Jurnal Lengkap)"
                value={selectedCoa}
                onChange={setSelectedCoa}
                allowClear
              >
                {coasList.map(c => (
                  <Select.Option key={c.id} value={c.id}>
                    [{c.account_code}] {c.account_name} ({c.account_type})
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

        {/* Account Summary Stats */}
        {selectedAccountObj && (
          <Card className="mb-4 shadow-sm border-0 bg-light">
            <Row gutter={16}>
              <Col span={6}>
                <Text type="secondary">Kode & Nama Akun:</Text>
                <div className="fw-bold fs-16 text-primary">[{selectedAccountObj.account_code}] {selectedAccountObj.account_name}</div>
                <Tag color="purple">{selectedAccountObj.account_type}</Tag>
              </Col>
              <Col span={6}>
                <Statistic title="Total Mutasi Debet" value={summary.totalDebit} precision={0} prefix="Rp " valueStyle={{ color: '#10B981', fontWeight: 'bold' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Total Mutasi Kredit" value={summary.totalCredit} precision={0} prefix="Rp " valueStyle={{ color: '#EF4444', fontWeight: 'bold' }} />
              </Col>
              <Col span={6}>
                <Statistic title="Saldo Akhir Akun" value={summary.finalBalance} precision={0} prefix="Rp " valueStyle={{ color: summary.finalBalance >= 0 ? '#3B82F6' : '#EF4444', fontWeight: 'bold' }} />
              </Col>
            </Row>
          </Card>
        )}

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
