import React, { useState, useEffect, useContext } from "react";
import { DatePicker, Table, Card, Typography, message, Button, Row, Col, Tag } from 'antd';
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

  const [totalAsset, setTotalAsset] = useState(0);
  const [totalLiability, setTotalLiability] = useState(0);
  const [totalEquity, setTotalEquity] = useState(0);

  useEffect(() => {
    fetchBalanceSheet();

    const channel = supabase
      .channel('balance-sheet-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchBalanceSheet())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchBalanceSheet())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asOfDate, selectedStore]);

  const fetchBalanceSheet = async () => {
    if (!asOfDate) return message.warning("Silakan pilih tanggal.");
    setLoading(true);
    
    try {
      const endDateIso = asOfDate.endOf('day').toISOString();

      let trxQuery = supabase.from('transactions').select('total_amount, payment_method').lte('created_at', endDateIso);
      let expQuery = supabase.from('expenses').select('amount').lte('created_at', endDateIso);

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

      const netIncome = totalSales - totalExp;

      const tempAssets = [
        {
          key: '10100',
          account_code: '10100',
          account_name: 'Kas Tunai POS (Saldo Kasir)',
          balance: Math.max(0, cashSales - totalExp)
        },
        {
          key: '10200',
          account_code: '10200',
          account_name: 'Rekening Bank / QRIS Pembayaran',
          balance: qrisSales
        }
      ];

      const tempLiabilities = [];
      const tempEquities = [
        {
          key: '30100',
          account_code: '30100',
          account_name: 'Laba Ditahan Periode Berjalan (Net Profit)',
          balance: netIncome
        }
      ];

      let totA = 0;
      tempAssets.forEach(a => totA += a.balance);
      let totL = 0;
      tempLiabilities.forEach(l => totL += l.balance);
      let totE = 0;
      tempEquities.forEach(e => totE += e.balance);

      setAssets(tempAssets);
      setLiabilities(tempLiabilities);
      setEquities(tempEquities);

      setTotalAsset(totA);
      setTotalLiability(totL);
      setTotalEquity(totE);
    } catch (err) {
      console.error("Error fetching balance sheet:", err);
      message.error("Gagal memuat neraca keuangan.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Kode',
      dataIndex: 'account_code',
      key: 'account_code',
      width: 100,
      render: (code) => <Tag color="blue">{code}</Tag>
    },
    {
      title: 'Nama Akun Rekening',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (name) => <span className="fw-bold text-dark">{name}</span>
    },
    {
      title: 'Saldo (Rp)',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      width: 180,
      render: (val) => (
        <span className={`fw-bold ${val >= 0 ? 'text-success' : 'text-danger'}`}>
          Rp {(val || 0).toLocaleString('id-ID')}
        </span>
      )
    }
  ];

  const totalPasiva = totalLiability + totalEquity;
  const isBalanced = totalAsset === totalPasiva;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>Laporan Neraca Keuangan (Balance Sheet)</Title>
            <Text type="secondary">Posisi Aset (Aktiva) vs Kewajiban & Modal (Pasiva)</Text>
          </div>
          <Button icon={<Icon.RefreshCw size={16} />} onClick={fetchBalanceSheet}>
            Refresh Neraca
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
              <span className="me-3 fs-14 fw-bold">Status Neraca Keuangan:</span>
              {isBalanced ? (
                <Tag color="success" className="p-2 fs-13">SEIMBANG (AKTIVA = PASIVA)</Tag>
              ) : (
                <Tag color="error" className="p-2 fs-13">TIDAK SEIMBANG</Tag>
              )}
            </div>
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          {/* SISI AKTIVA (ASSETS) */}
          <Col xs={24} lg={12}>
            <Card title="AKTIVA / ASET (ASSETS)" className="shadow-sm border-0 h-100" headStyle={{ backgroundColor: '#F1F5F9', fontWeight: 'bold' }}>
              <Table
                columns={columns}
                dataSource={assets}
                rowKey="key"
                loading={loading}
                pagination={false}
                summary={() => (
                  <Table.Summary.Row style={{ backgroundColor: '#E2E8F0' }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <span className="fw-bold fs-15 text-dark">TOTAL AKTIVA (ASET)</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span className="fw-bold fs-15 text-success">Rp {totalAsset.toLocaleString('id-ID')}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>
          </Col>

          {/* SISI PASIVA (LIABILITIES & EQUITY) */}
          <Col xs={24} lg={12}>
            <Card title="PASIVA (KEWAJIBAN & EKUITAS)" className="shadow-sm border-0 h-100" headStyle={{ backgroundColor: '#F1F5F9', fontWeight: 'bold' }}>
              <div className="mb-3">
                <Text className="fw-bold text-muted d-block mb-2">KEWAJIBAN (LIABILITIES)</Text>
                <Table
                  columns={columns}
                  dataSource={liabilities}
                  rowKey="key"
                  loading={loading}
                  pagination={false}
                  locale={{ emptyText: 'Tidak ada kewajiban / hutang aktif' }}
                />
              </div>

              <div>
                <Text className="fw-bold text-muted d-block mb-2">EKUITAS & MODAL (EQUITY)</Text>
                <Table
                  columns={columns}
                  dataSource={equities}
                  rowKey="key"
                  loading={loading}
                  pagination={false}
                  summary={() => (
                    <Table.Summary.Row style={{ backgroundColor: '#E2E8F0' }}>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <span className="fw-bold fs-15 text-dark">TOTAL PASIVA (KEWAJIBAN & EKUITAS)</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <span className="fw-bold fs-15 text-primary">Rp {totalPasiva.toLocaleString('id-ID')}</span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default BalanceSheet;
