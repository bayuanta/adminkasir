import React, { useState, useEffect, useContext } from "react";
import { Table, Select, DatePicker, Button, message, Card, Typography } from 'antd';
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
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    fetchCOA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchCOA = async () => {
    try {
      let query = supabase.from('coa').select('*').eq('is_active', true).order('account_code');
      if (selectedStore) {
        query = query.or(`branch_id.eq.${selectedStore},branch_id.is.null`);
      }
      const { data, error } = await query;
      if (!error) setCoasList(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    if (!selectedCoa) {
      return message.warning("Silakan pilih Buku Besar (Akun) terlebih dahulu.");
    }
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return message.warning("Silakan pilih rentang tanggal.");
    }

    setLoading(true);
    try {
      const startDate = dateRange[0].startOf('day').toISOString();
      const endDate = dateRange[1].endOf('day').toISOString();
      
      const selectedAccount = coasList.find(c => c.id === selectedCoa);
      const isAssetOrExpense = selectedAccount?.account_type === 'Asset' || selectedAccount?.account_type === 'Expense';

      // 1. Ambil data Saldo Awal (transaksi sebelum startDate)
      let initialQuery = supabase
        .from('journal_lines')
        .select(`debit, credit, journal_entries!inner(entry_date, branch_id)`)
        .eq('account_id', selectedCoa)
        .lt('journal_entries.entry_date', startDate);

      if (selectedStore) {
        initialQuery = initialQuery.eq('journal_entries.branch_id', selectedStore);
      }

      const { data: initialData, error: initialError } = await initialQuery;
      if (initialError) throw initialError;

      let saldoAwal = 0;
      if (initialData) {
        initialData.forEach(line => {
          if (isAssetOrExpense) {
            saldoAwal += (Number(line.debit) || 0) - (Number(line.credit) || 0);
          } else {
            saldoAwal += (Number(line.credit) || 0) - (Number(line.debit) || 0);
          }
        });
      }
      setOpeningBalance(saldoAwal);

      // 2. Ambil data Transaksi dalam rentang tanggal
      let currentQuery = supabase
        .from('journal_lines')
        .select(`
          id, debit, credit, 
          journal_entries!inner(entry_date, reference, description, branch_id)
        `)
        .eq('account_id', selectedCoa)
        .gte('journal_entries.entry_date', startDate)
        .lte('journal_entries.entry_date', endDate);

      if (selectedStore) {
        currentQuery = currentQuery.eq('journal_entries.branch_id', selectedStore);
      }

      const { data: currentData, error: currentError } = await currentQuery;
      if (currentError) throw currentError;

      // Sort data by date di Javascript (karena order by relasi tabel kadang rumit di supabase)
      const sortedData = (currentData || []).sort((a, b) => {
        return new Date(a.journal_entries.entry_date) - new Date(b.journal_entries.entry_date);
      });

      // Hitung Saldo Berjalan (Running Balance)
      let runningBal = saldoAwal;
      const formattedData = sortedData.map(item => {
        if (isAssetOrExpense) {
          runningBal += (Number(item.debit) || 0) - (Number(item.credit) || 0);
        } else {
          runningBal += (Number(item.credit) || 0) - (Number(item.debit) || 0);
        }
        return {
          id: item.id,
          date: item.journal_entries.entry_date,
          reference: item.journal_entries.reference,
          description: item.journal_entries.description,
          debit: item.debit,
          credit: item.credit,
          balance: runningBal
        };
      });

      setLedgerData(formattedData);
    } catch (err) {
      console.error("Error fetching ledger:", err);
      message.error("Gagal mengambil data buku besar");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
      render: (text) => dayjs(text).format('DD MMM YYYY, HH:mm')
    },
    {
      title: 'No. Ref',
      dataIndex: 'reference',
      key: 'reference',
      render: (text) => text || '-'
    },
    {
      title: 'Keterangan',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Debit',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right',
      render: (val) => val > 0 ? new Intl.NumberFormat('id-ID').format(val) : '-'
    },
    {
      title: 'Kredit',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right',
      render: (val) => val > 0 ? new Intl.NumberFormat('id-ID').format(val) : '-'
    },
    {
      title: 'Saldo Berjalan',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (val) => (
        <span className="fw-bold text-primary">
          {new Intl.NumberFormat('id-ID').format(val)}
        </span>
      )
    },
  ];

  const totalDebit = ledgerData.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredit = ledgerData.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  const endingBalance = ledgerData.length > 0 ? ledgerData[ledgerData.length - 1].balance : openingBalance;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="row align-items-center w-100">
            <div className="col-lg-12 col-sm-12">
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Laporan Buku Besar (General Ledger)</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Rincian mutasi transaksi per akun</h6>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <Card className="mb-4 shadow-sm border-0" style={{borderRadius: '8px'}}>
          <div className="row align-items-end">
            <div className="col-lg-4 mb-3 mb-lg-0">
              <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Pilih Akun (COA) <span className="text-danger">*</span></label>
              <Select
                className="w-100"
                value={selectedCoa}
                onChange={setSelectedCoa}
                placeholder="Pilih Akun"
                showSearch
                optionFilterProp="label"
                options={coasList.map(coa => ({ value: coa.id, label: `${coa.account_code} - ${coa.account_name} (${coa.account_type})` }))}
              />
            </div>
            <div className="col-lg-4 mb-3 mb-lg-0">
              <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Rentang Tanggal <span className="text-danger">*</span></label>
              <RangePicker 
                className="w-100" 
                value={dateRange} 
                onChange={setDateRange}
                format="DD MMM YYYY"
                allowClear={false}
              />
            </div>
            <div className="col-lg-2">
              <Button type="primary" block onClick={fetchLedger} loading={loading} style={{background: '#ff9f43', borderColor: '#ff9f43', height: '38px', fontWeight: 'bold'}}>
                <Icon.Filter size={16} className="me-2"/> Tampilkan
              </Button>
            </div>
          </div>
        </Card>

        {/* Report Section */}
        {selectedCoa && !loading && (
          <Card className="shadow-sm border-0" style={{borderRadius: '8px'}}>
            <div className="mb-4 text-center">
              <Title level={4} className="m-0" style={{color: '#2c3e50'}}>Buku Besar</Title>
              <Text type="secondary" className="d-block mb-1">
                {coasList.find(c => c.id === selectedCoa)?.account_code} - {coasList.find(c => c.id === selectedCoa)?.account_name}
              </Text>
              <Text type="secondary" style={{fontSize: '12px'}}>
                Periode: {dateRange[0].format('DD MMM YYYY')} s/d {dateRange[1].format('DD MMM YYYY')}
              </Text>
            </div>

            <div className="d-flex justify-content-between bg-light p-3 mb-3 rounded" style={{border: '1px solid #f0f0f0'}}>
              <Text strong>Saldo Awal (Per {dateRange[0].format('DD MMM YYYY')}):</Text>
              <Text strong className="text-primary">Rp {new Intl.NumberFormat('id-ID').format(openingBalance)}</Text>
            </div>

            <Table 
              columns={columns} 
              dataSource={ledgerData} 
              rowKey="id" 
              pagination={false}
              bordered
              size="middle"
              summary={() => (
                <Table.Summary.Row style={{background: '#f8f9fa', fontWeight: 'bold'}}>
                  <Table.Summary.Cell colSpan={3} index={0} className="text-end">Total Mutasi Periode Ini:</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">{new Intl.NumberFormat('id-ID').format(totalDebit)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">{new Intl.NumberFormat('id-ID').format(totalCredit)}</Table.Summary.Cell>
                  <Table.Summary.Cell index={3}></Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            <div className="d-flex justify-content-between bg-dark p-3 mt-3 rounded" style={{border: '1px solid #333', color: '#fff'}}>
              <span style={{fontWeight: 'bold'}}>Saldo Akhir (Per {dateRange[1].format('DD MMM YYYY')}):</span>
              <span style={{fontWeight: 'bold', fontSize: '16px'}}>Rp {new Intl.NumberFormat('id-ID').format(endingBalance)}</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GeneralLedger;
