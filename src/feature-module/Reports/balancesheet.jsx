import React, { useState, useEffect, useContext } from "react";
import { DatePicker, Table, Card, Typography, Spin, message, Button, Row, Col, Tag } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import dayjs from 'dayjs';
import * as Icon from 'react-feather';

const { Title, Text } = Typography;

const BalanceSheet = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  
  const [asOfDate, setAsOfDate] = useState(dayjs());
  
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [equities, setEquities] = useState([]);
  const [netIncome, setNetIncome] = useState(0);

  const [totalAsset, setTotalAsset] = useState(0);
  const [totalLiability, setTotalLiability] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);

  useEffect(() => {
    fetchBalanceSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchBalanceSheet = async () => {
    if (!asOfDate) return message.warning("Silakan pilih tanggal.");
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

      // 3. Aggregate balances
      const balMap = {};
      (lines || []).forEach(line => {
        const accId = line.account_id;
        if (!balMap[accId]) {
          balMap[accId] = { debit: 0, credit: 0 };
        }
        balMap[accId].debit += (Number(line.debit) || 0);
        balMap[accId].credit += (Number(line.credit) || 0);
      });

      const tempAssets = [];
      const tempLiabilities = [];
      const tempEquities = [];
      
      let totAsset = 0;
      let totLiab = 0;
      let totEq = 0;
      
      let totRev = 0;
      let totExp = 0;

      coaData.forEach(coa => {
        const b = balMap[coa.id] || { debit: 0, credit: 0 };
        
        let bal = 0;
        if (coa.account_type === 'Asset' || coa.account_type === 'Expense') {
          bal = b.debit - b.credit;
        } else {
          bal = b.credit - b.debit;
        }

        if (bal !== 0) {
          const item = {
            id: coa.id,
            code: coa.account_code,
            name: coa.account_name,
            amount: bal
          };

          if (coa.account_type === 'Asset') {
            tempAssets.push(item);
            totAsset += bal;
          } else if (coa.account_type === 'Liability') {
            tempLiabilities.push(item);
            totLiab += bal;
          } else if (coa.account_type === 'Equity') {
            tempEquities.push(item);
            totEq += bal;
          } else if (coa.account_type === 'Revenue') {
            totRev += bal;
          } else if (coa.account_type === 'Expense') {
            totExp += bal;
          }
        }
      });

      const calculatedNetIncome = totRev - totExp;

      setAssets(tempAssets);
      setLiabilities(tempLiabilities);
      setEquities(tempEquities);
      
      setNetIncome(calculatedNetIncome);
      setTotalAsset(totAsset);
      setTotalLiability(totLiab);
      setTotalEquity(totEq + calculatedNetIncome); // Tambah laba bersih ke total modal

    } catch (err) {
      console.error("Error fetching Balance Sheet:", err);
      message.error("Gagal memuat Neraca Keuangan");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Akun',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <span>{record.code} - {text}</span>
      )
    },
    {
      title: 'Jumlah (Rp)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val) => <span>{new Intl.NumberFormat('id-ID').format(val)}</span>
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        
        {/* Header Section */}
        <div className="page-header mb-4">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Neraca Keuangan (Balance Sheet)</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Laporan posisi aset, kewajiban, dan modal perusahaan</h6>
            </div>
            <div className="col-lg-6 d-flex justify-content-end gap-2 mt-3 mt-lg-0">
              <DatePicker 
                value={asOfDate} 
                onChange={setAsOfDate}
                format="DD MMM YYYY"
                allowClear={false}
                style={{height: '38px'}}
              />
              <Button type="primary" onClick={fetchBalanceSheet} loading={loading} style={{background: '#ff9f43', borderColor: '#ff9f43', height: '38px', fontWeight: 'bold'}}>
                <Icon.Filter size={16} className="me-2"/> Tampilkan
              </Button>
            </div>
          </div>
        </div>

        <Spin spinning={loading}>
          <div className="text-center mb-4">
            <Title level={3} className="m-0" style={{color: '#2c3e50'}}>Laporan Neraca</Title>
            <Text type="secondary" style={{fontSize: '14px'}}>Per Tanggal: {asOfDate.format('DD MMMM YYYY')}</Text>
          </div>

          <Row gutter={[24, 24]}>
            {/* Sisi Aset (Kiri) */}
            <Col xs={24} lg={12}>
              <Card className="shadow-sm border-0 h-100" style={{borderRadius: '8px', borderTop: '4px solid #00cfe8'}} title={<span style={{color: '#00cfe8', fontWeight: 'bold'}}>ASET (HARTA)</span>}>
                <Table 
                  columns={columns} 
                  dataSource={assets} 
                  rowKey="id" 
                  pagination={false}
                  size="small"
                />
                <div className="d-flex justify-content-between p-3 mt-4 rounded" style={{background: '#e0f9fc', color: '#00cfe8', fontWeight: 'bold', fontSize: '16px'}}>
                  <span>TOTAL ASET:</span>
                  <span>Rp {new Intl.NumberFormat('id-ID').format(totalAsset)}</span>
                </div>
              </Card>
            </Col>

            {/* Sisi Kewajiban & Modal (Kanan) */}
            <Col xs={24} lg={12}>
              <Card className="shadow-sm border-0 h-100 d-flex flex-column" style={{borderRadius: '8px', borderTop: '4px solid #ea5455'}}>
                
                {/* Kewajiban */}
                <div className="mb-4">
                  <h5 style={{color: '#ea5455', fontWeight: 'bold', padding: '0 16px', marginBottom: '16px'}}>KEWAJIBAN (HUTANG)</h5>
                  <Table 
                    columns={columns} 
                    dataSource={liabilities} 
                    rowKey="id" 
                    pagination={false}
                    size="small"
                  />
                  <div className="d-flex justify-content-between p-2 mt-2 border-bottom">
                    <span className="fw-bold text-muted">Total Kewajiban:</span>
                    <span className="fw-bold">Rp {new Intl.NumberFormat('id-ID').format(totalLiability)}</span>
                  </div>
                </div>

                {/* Modal */}
                <div className="mt-4">
                  <h5 style={{color: '#28c76f', fontWeight: 'bold', padding: '0 16px', marginBottom: '16px'}}>MODAL (EKUITAS)</h5>
                  <Table 
                    columns={columns} 
                    dataSource={equities} 
                    rowKey="id" 
                    pagination={false}
                    size="small"
                  />
                  {/* Tambahan Laba Ditahan / Laba Berjalan */}
                  <div className="d-flex justify-content-between p-2 px-3 border-bottom" style={{fontSize: '13px'}}>
                    <span>Laba Bersih Tahun Berjalan (Net Income)</span>
                    <span className={netIncome < 0 ? 'text-danger' : 'text-success'}>
                      {new Intl.NumberFormat('id-ID').format(netIncome)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between p-2 mt-2 border-bottom">
                    <span className="fw-bold text-muted">Total Modal:</span>
                    <span className="fw-bold">Rp {new Intl.NumberFormat('id-ID').format(totalEquity)}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="d-flex justify-content-between p-3 mt-4 rounded" style={{background: '#fceaea', color: '#ea5455', fontWeight: 'bold', fontSize: '16px'}}>
                    <span>TOTAL KEWAJIBAN & MODAL:</span>
                    <span>Rp {new Intl.NumberFormat('id-ID').format(totalLiability + totalEquity)}</span>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Balance Check Indicator */}
          <div className="mt-4 mb-4 text-center">
            {totalAsset === (totalLiability + totalEquity) ? (
              <Tag color="success" className="px-4 py-2" style={{fontSize: '14px', borderRadius: '20px'}}>
                <Icon.CheckCircle size={16} className="me-2"/>
                <strong>Seimbang (Balanced)</strong>
              </Tag>
            ) : (
              <Tag color="error" className="px-4 py-2" style={{fontSize: '14px', borderRadius: '20px'}}>
                <Icon.AlertTriangle size={16} className="me-2"/>
                <strong>Tidak Seimbang!</strong> Selisih: Rp {new Intl.NumberFormat('id-ID').format(Math.abs(totalAsset - (totalLiability + totalEquity)))}
              </Tag>
            )}
          </div>
        </Spin>
      </div>
    </div>
  );
};

export default BalanceSheet;
