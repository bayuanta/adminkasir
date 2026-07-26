import React, { useState, useEffect, useContext } from "react";
import { DatePicker, Table, Card, Row, Col, Statistic, message, Button, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import dayjs from 'dayjs';
import * as Icon from 'react-feather';

const { RangePicker } = DatePicker;

const ProfitLoss = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  
  const [summary, setSummary] = useState({
    grossIncome: 0,
    totalExpenses: 0,
    netProfit: 0
  });

  const [revenueData, setRevenueData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);

  useEffect(() => {
    fetchProfitAndLoss();

    const channel = supabase
      .channel('profit-loss-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchProfitAndLoss())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchProfitAndLoss())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedStore]);

  const fetchProfitAndLoss = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return message.warning("Silakan pilih rentang tanggal.");
    }
    setLoading(true);
    try {
      const startDateIso = dateRange[0].startOf('day').toISOString();
      const endDateIso = dateRange[1].endOf('day').toISOString();

      let trxQuery = supabase.from('transactions').select('total_amount, payment_method').gte('created_at', startDateIso).lte('created_at', endDateIso);
      let expQuery = supabase.from('expenses').select('amount, category, expense_category, description').gte('created_at', startDateIso).lte('created_at', endDateIso);

      if (selectedStore) {
        trxQuery = trxQuery.eq('branch_id', selectedStore);
        expQuery = expQuery.eq('branch_id', selectedStore);
      }

      const { data: trxs } = await trxQuery;
      const { data: exps } = await expQuery;

      let cashSales = 0;
      let qrisSales = 0;
      let totalRev = 0;

      (trxs || []).forEach(t => {
        const amt = t.total_amount || 0;
        totalRev += amt;
        if (t.payment_method === 'cash') cashSales += amt;
        else qrisSales += amt;
      });

      const expCategories = {};
      let totalExp = 0;

      (exps || []).forEach(e => {
        const amt = e.amount || 0;
        totalExp += amt;
        const cat = e.category || e.expense_category || 'Operasional Kasir';
        expCategories[cat] = (expCategories[cat] || 0) + amt;
      });

      const revRows = [
        { key: 'rev-cash', code: '40101', name: 'Pendapatan Penjualan Kas (Tunai)', amount: cashSales },
        { key: 'rev-qris', code: '40102', name: 'Pendapatan Penjualan Non-Tunai (QRIS/Bank)', amount: qrisSales },
      ];

      const expRows = Object.keys(expCategories).map((catName, idx) => ({
        key: `exp-${idx}`,
        code: `5010${idx + 1}`,
        name: `Beban ${catName}`,
        amount: expCategories[catName]
      }));

      setRevenueData(revRows);
      setExpenseData(expRows.length > 0 ? expRows : [{ key: 'exp-empty', code: '50100', name: 'Beban Operasional', amount: totalExp }]);

      setSummary({
        grossIncome: totalRev,
        totalExpenses: totalExp,
        netProfit: totalRev - totalExp
      });
    } catch (err) {
      console.error("Error fetching profit and loss:", err);
      message.error("Gagal memuat laporan laba rugi.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Kode',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code) => <Tag color="blue">{code}</Tag>
    },
    {
      title: 'Keterangan Akun',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <span className="fw-bold text-dark">{name}</span>
    },
    {
      title: 'Jumlah (Rp)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 200,
      render: (val) => <span className="fw-bold fs-14">Rp {(val || 0).toLocaleString('id-ID')}</span>
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold mb-1">Laporan Laba Rugi (Profit & Loss Statement)</h3>
            <p className="text-muted mb-0">Rincian pendapatan penjualan POS vs pengeluaran operasional real-time</p>
          </div>
          <Button icon={<Icon.RefreshCw size={16} />} onClick={fetchProfitAndLoss}>
            Refresh Laporan
          </Button>
        </div>

        <Card className="mb-4 shadow-sm border-0">
          <div className="row align-items-center">
            <div className="col-md-6">
              <label className="form-label fw-bold">Periode Laporan:</label>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={setDateRange}
                format="DD/MM/YYYY"
              />
            </div>
          </div>
        </Card>

        {/* SUMMARY CARDS */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={8}>
            <Card className="shadow-sm border-0 text-center">
              <Statistic
                title="TOTAL PENDAPATAN KOTOR (GROSS REVENUE)"
                value={summary.grossIncome}
                precision={0}
                valueStyle={{ color: '#10B981', fontWeight: 'bold' }}
                prefix="Rp "
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="shadow-sm border-0 text-center">
              <Statistic
                title="TOTAL PENGELUARAN (TOTAL EXPENSES)"
                value={summary.totalExpenses}
                precision={0}
                valueStyle={{ color: '#EF4444', fontWeight: 'bold' }}
                prefix="Rp "
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card className="shadow-sm border-0 text-center" style={{ backgroundColor: summary.netProfit >= 0 ? '#ECFDF5' : '#FEF2F2' }}>
              <Statistic
                title="LABA BERSIH (NET PROFIT)"
                value={summary.netProfit}
                precision={0}
                valueStyle={{ color: summary.netProfit >= 0 ? '#059669' : '#DC2626', fontWeight: 'bold' }}
                prefix={summary.netProfit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                suffix={` Rp`}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="PENDAPATAN (REVENUE)" className="shadow-sm border-0 h-100" headStyle={{ backgroundColor: '#F1F5F9', fontWeight: 'bold' }}>
              <Table
                columns={columns}
                dataSource={revenueData}
                rowKey="key"
                loading={loading}
                pagination={false}
                summary={() => (
                  <Table.Summary.Row style={{ backgroundColor: '#E2E8F0' }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <span className="fw-bold fs-15 text-dark">TOTAL PENDAPATAN</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span className="fw-bold fs-15 text-success">Rp {summary.grossIncome.toLocaleString('id-ID')}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="PENGELUARAN BIAYA (EXPENSES)" className="shadow-sm border-0 h-100" headStyle={{ backgroundColor: '#F1F5F9', fontWeight: 'bold' }}>
              <Table
                columns={columns}
                dataSource={expenseData}
                rowKey="key"
                loading={loading}
                pagination={false}
                summary={() => (
                  <Table.Summary.Row style={{ backgroundColor: '#E2E8F0' }}>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <span className="fw-bold fs-15 text-dark">TOTAL PENGELUARAN</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <span className="fw-bold fs-15 text-danger">Rp {summary.totalExpenses.toLocaleString('id-ID')}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default ProfitLoss;
