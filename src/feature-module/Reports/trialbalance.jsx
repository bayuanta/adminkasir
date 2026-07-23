import React, { useState, useEffect, useContext } from "react";
import { DatePicker, Table, Card, Typography, Spin, message, Button } from 'antd';
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchTrialBalance = async () => {
    if (!asOfDate) {
      return message.warning("Silakan pilih tanggal.");
    }
    setLoading(true);
    try {
      const endDateIso = asOfDate.endOf('day').toISOString();

      // 1. Fetch ALL COA
      const { data: coaData, error: coaError } = await supabase
        .from('coa')
        .select('id, account_code, account_name, account_type')
        .eq('is_active', true)
        .order('account_code');

      if (coaError) throw coaError;

      // 2. Fetch Journal Lines up to the date
      let query = supabase
        .from('journal_lines')
        .select('account_id, debit, credit, journal_entries!inner(entry_date, branch_id)')
        .lte('journal_entries.entry_date', endDateIso);

      if (selectedStore) {
        query = query.eq('journal_entries.branch_id', selectedStore);
      }

      const { data: lines, error: linesError } = await query;
      if (linesError) throw linesError;

      // 3. Calculate balances per account
      const balMap = {};
      (lines || []).forEach(line => {
        const accId = line.account_id;
        if (!balMap[accId]) {
          balMap[accId] = { totalDebit: 0, totalCredit: 0 };
        }
        balMap[accId].totalDebit += (Number(line.debit) || 0);
        balMap[accId].totalCredit += (Number(line.credit) || 0);
      });

      let grandTotalDebit = 0;
      let grandTotalCredit = 0;

      const formattedData = coaData.map(coa => {
        const b = balMap[coa.id] || { totalDebit: 0, totalCredit: 0 };
        let debitBal = 0;
        let creditBal = 0;

        if (coa.account_type === 'Asset' || coa.account_type === 'Expense') {
          const bal = b.totalDebit - b.totalCredit;
          if (bal > 0) debitBal = bal;
          else if (bal < 0) creditBal = Math.abs(bal);
        } else {
          // Liability, Equity, Revenue
          const bal = b.totalCredit - b.totalDebit;
          if (bal > 0) creditBal = bal;
          else if (bal < 0) debitBal = Math.abs(bal);
        }

        grandTotalDebit += debitBal;
        grandTotalCredit += creditBal;

        return {
          id: coa.id,
          code: coa.account_code,
          name: coa.account_name,
          type: coa.account_type,
          debit: debitBal,
          credit: creditBal
        };
      }).filter(item => item.debit !== 0 || item.credit !== 0); // Hanya tampilkan yang ada saldonya

      setTbData(formattedData);
      setTotals({ debit: grandTotalDebit, credit: grandTotalCredit });

    } catch (err) {
      console.error("Error fetching Trial Balance:", err);
      message.error("Gagal memuat Neraca Saldo");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Kode Akun',
      dataIndex: 'code',
      key: 'code',
      width: '15%',
    },
    {
      title: 'Nama Akun',
      dataIndex: 'name',
      key: 'name',
      width: '45%',
      render: (text, record) => (
        <div>
          <span className="fw-bold d-block">{text}</span>
          <span className="text-muted" style={{fontSize: '11px'}}>{record.type}</span>
        </div>
      )
    },
    {
      title: 'Debit (Rp)',
      dataIndex: 'debit',
      key: 'debit',
      align: 'right',
      render: (val) => val > 0 ? <span className="text-primary fw-bold">{new Intl.NumberFormat('id-ID').format(val)}</span> : '-'
    },
    {
      title: 'Kredit (Rp)',
      dataIndex: 'credit',
      key: 'credit',
      align: 'right',
      render: (val) => val > 0 ? <span className="text-danger fw-bold">{new Intl.NumberFormat('id-ID').format(val)}</span> : '-'
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        
        {/* Header Section */}
        <div className="page-header mb-4">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Neraca Saldo (Trial Balance)</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Daftar saldo akhir seluruh buku besar untuk validasi kesimbangan (Balance)</h6>
            </div>
            <div className="col-lg-6 d-flex justify-content-end gap-2 mt-3 mt-lg-0">
              <DatePicker 
                value={asOfDate} 
                onChange={setAsOfDate}
                format="DD MMM YYYY"
                allowClear={false}
                style={{height: '38px'}}
              />
              <Button type="primary" onClick={fetchTrialBalance} loading={loading} style={{background: '#ff9f43', borderColor: '#ff9f43', height: '38px', fontWeight: 'bold'}}>
                <Icon.Filter size={16} className="me-2"/> Tampilkan
              </Button>
            </div>
          </div>
        </div>

        <Spin spinning={loading}>
          <Card className="shadow-sm border-0 mb-4" style={{borderRadius: '8px'}}>
            <div className="text-center mb-4">
              <Title level={4} className="m-0" style={{color: '#2c3e50'}}>Neraca Saldo</Title>
              <Text type="secondary">Per Tanggal: {asOfDate.format('DD MMMM YYYY')}</Text>
            </div>

            <Table 
              columns={columns} 
              dataSource={tbData} 
              rowKey="id" 
              pagination={false}
              bordered
              size="middle"
              summary={() => (
                <Table.Summary.Row style={{background: '#f8f9fa', fontWeight: 'bold'}}>
                  <Table.Summary.Cell colSpan={2} index={0} className="text-end">Total Keseluruhan:</Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right">
                    <span className={totals.debit !== totals.credit ? 'text-danger' : 'text-success'}>
                      {new Intl.NumberFormat('id-ID').format(totals.debit)}
                    </span>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2} align="right">
                    <span className={totals.debit !== totals.credit ? 'text-danger' : 'text-success'}>
                      {new Intl.NumberFormat('id-ID').format(totals.credit)}
                    </span>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            {totals.debit !== totals.credit && (
              <div className="alert alert-danger mt-3 mb-0" role="alert">
                <Icon.AlertTriangle size={16} className="me-2"/>
                <strong>Peringatan!</strong> Total Debit dan Kredit tidak seimbang (Selisih: Rp {new Intl.NumberFormat('id-ID').format(Math.abs(totals.debit - totals.credit))}). Silakan periksa entri jurnal Anda.
              </div>
            )}
            {totals.debit === totals.credit && totals.debit > 0 && (
              <div className="alert alert-success mt-3 mb-0" role="alert">
                <Icon.CheckCircle size={16} className="me-2"/>
                Neraca Saldo Anda <strong>Seimbang (Balanced)</strong>.
              </div>
            )}
          </Card>
        </Spin>
      </div>
    </div>
  );
};

export default TrialBalance;
