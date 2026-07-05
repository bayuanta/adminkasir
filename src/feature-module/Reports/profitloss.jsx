import React, { useState, useEffect, useContext } from "react";
import { DatePicker, Table, Card, Row, Col, Typography, Statistic, Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import dayjs from 'dayjs';
import * as Icon from 'react-feather';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const ProfitLoss = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(true);
  
  // Date Range (Default: This Month)
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  
  const [summary, setSummary] = useState({
    grossIncome: 0,
    totalExpenses: 0,
    netProfit: 0
  });

  const [expenseBreakdown, setExpenseBreakdown] = useState([]);

  useEffect(() => {
    fetchProfitAndLoss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, dateRange]);

  const fetchProfitAndLoss = async () => {
    setLoading(true);
    try {
      const startDateIso = dateRange[0].startOf('day').toISOString();
      const endDateIso = dateRange[1].endOf('day').toISOString();

      // 1. Fetch Income (Completed Transactions)
      let salesQuery = supabase
        .from('transactions')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('created_at', startDateIso)
        .lte('created_at', endDateIso);

      if (selectedStore) salesQuery = salesQuery.eq('branch_id', selectedStore);
      
      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      const totalIncome = (salesData || []).reduce((sum, item) => sum + (item.total_amount || 0), 0);

      // 2. Fetch Expenses
      let expenseQuery = supabase
        .from('expenses')
        .select('amount, expense_category')
        .gte('expense_date', startDateIso)
        .lte('expense_date', endDateIso);

      if (selectedStore) expenseQuery = expenseQuery.eq('branch_id', selectedStore);

      const { data: expenseData, error: expenseError } = await expenseQuery;
      if (expenseError) throw expenseError;

      const totalExpenseAmount = (expenseData || []).reduce((sum, item) => sum + (item.amount || 0), 0);

      // 3. Group Expenses by Category
      const expensesByCategory = (expenseData || []).reduce((acc, curr) => {
        const cat = curr.expense_category || 'Tidak Berkategori';
        acc[cat] = (acc[cat] || 0) + (curr.amount || 0);
        return acc;
      }, {});

      const breakdownArray = Object.keys(expensesByCategory).map(key => ({
        category: key,
        amount: expensesByCategory[key],
        percentage: totalExpenseAmount > 0 ? (expensesByCategory[key] / totalExpenseAmount) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      setSummary({
        grossIncome: totalIncome,
        totalExpenses: totalExpenseAmount,
        netProfit: totalIncome - totalExpenseAmount
      });
      setExpenseBreakdown(breakdownArray);

    } catch (err) {
      console.error("Error fetching Profit & Loss data:", err);
    } finally {
      setLoading(false);
    }
  };

  const isProfit = summary.netProfit >= 0;

  const expenseColumns = [
    {
      title: 'Kategori Pengeluaran',
      dataIndex: 'category',
      key: 'category',
      render: (text) => <span className="fw-bold">{text}</span>
    },
    {
      title: 'Persentase',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (val) => (
        <div className="d-flex align-items-center">
          <div className="progress w-100 me-2" style={{height: '6px'}}>
            <div className="progress-bar bg-danger" role="progressbar" style={{width: `${val}%`}}></div>
          </div>
          <span style={{fontSize: '12px', minWidth: '40px'}}>{val.toFixed(1)}%</span>
        </div>
      )
    },
    {
      title: 'Total (Rp)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val) => <span className="text-danger fw-bold">Rp {val.toLocaleString('id-ID')}</span>
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        
        {/* Header Section */}
        <div className="page-header d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Dasbor Laba / Rugi</h3>
            <h6 className="text-muted" style={{fontSize: '13px'}}>Analisis pendapatan vs pengeluaran bisnis Anda</h6>
          </div>
          <div className="d-flex gap-2">
            <RangePicker 
              value={dateRange} 
              onChange={(dates) => { if(dates) setDateRange(dates) }}
              format="DD MMM YYYY"
              allowClear={false}
              style={{ width: '260px', height: '40px', borderRadius: '6px' }}
            />
          </div>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{height: '50vh'}}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <Row gutter={[20, 20]} className="mb-4">
              <Col xs={24} md={8}>
                <Card bordered={false} className="shadow-sm" style={{borderRadius: '12px'}}>
                  <Statistic
                    title={<span className="text-muted fw-bold">TOTAL PENDAPATAN</span>}
                    value={summary.grossIncome}
                    precision={0}
                    valueStyle={{ color: '#28c76f', fontWeight: 'bold' }}
                    prefix={<Icon.TrendingUp size={20} className="me-2" />}
                    formatter={(val) => `Rp ${Number(val).toLocaleString('id-ID')}`}
                  />
                  <div className="mt-2 text-muted" style={{fontSize: '12px'}}>
                    Total dari semua transaksi berstatus selesai.
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card bordered={false} className="shadow-sm" style={{borderRadius: '12px'}}>
                  <Statistic
                    title={<span className="text-muted fw-bold">TOTAL PENGELUARAN</span>}
                    value={summary.totalExpenses}
                    precision={0}
                    valueStyle={{ color: '#ea5455', fontWeight: 'bold' }}
                    prefix={<Icon.TrendingDown size={20} className="me-2" />}
                    formatter={(val) => `Rp ${Number(val).toLocaleString('id-ID')}`}
                  />
                  <div className="mt-2 text-muted" style={{fontSize: '12px'}}>
                    Total dari semua pencatatan operasional.
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card bordered={false} className="shadow-sm" style={{borderRadius: '12px', background: isProfit ? '#e9fbee' : '#fceaea'}}>
                  <Statistic
                    title={<span className="text-muted fw-bold">{isProfit ? 'LABA BERSIH (PROFIT)' : 'RUGI BERSIH (LOSS)'}</span>}
                    value={Math.abs(summary.netProfit)}
                    precision={0}
                    valueStyle={{ color: isProfit ? '#28c76f' : '#ea5455', fontWeight: 'bold', fontSize: '32px' }}
                    prefix={isProfit ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    formatter={(val) => `Rp ${Number(val).toLocaleString('id-ID')}`}
                  />
                  <div className="mt-2" style={{fontSize: '12px', color: isProfit ? '#28c76f' : '#ea5455'}}>
                    {isProfit ? 'Bisnis Anda menghasilkan keuntungan di periode ini.' : 'Pengeluaran lebih besar dari pendapatan di periode ini.'}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Expense Breakdown Table */}
            <Row gutter={[20, 20]}>
              <Col xs={24} lg={12}>
                <Card bordered={false} className="shadow-sm" style={{borderRadius: '12px'}} title="Rincian Pengeluaran Terbesar">
                  <Table 
                    columns={expenseColumns} 
                    dataSource={expenseBreakdown} 
                    rowKey="category" 
                    pagination={false}
                    size="middle"
                  />
                  {expenseBreakdown.length === 0 && (
                    <div className="text-center text-muted my-3">Belum ada data pengeluaran di periode ini.</div>
                  )}
                </Card>
              </Col>
              
              <Col xs={24} lg={12}>
                <Card bordered={false} className="shadow-sm h-100" style={{borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                    <DollarCircleOutlined style={{fontSize: '80px', color: '#e0e0e0', marginBottom: '20px'}} />
                    <Title level={4} className="text-muted">Analisis Keuangan</Title>
                    <Text type="secondary" className="text-center px-4">
                      Dasbor ini menghitung secara otomatis seluruh penjualan kotor dari transaksi yang berstatus sukses, 
                      dikurangi dengan seluruh beban biaya yang Anda catat di menu Pengeluaran.
                    </Text>
                </Card>
              </Col>
            </Row>

          </>
        )}
      </div>
    </div>
  );
};

export default ProfitLoss;
