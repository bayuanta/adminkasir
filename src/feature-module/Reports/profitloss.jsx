import React, { useState, useEffect, useContext } from "react";
import { DatePicker, Table, Card, Row, Col, Typography, Statistic, Spin, message, Button } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarCircleOutlined } from '@ant-design/icons';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import dayjs from 'dayjs';
import * as Icon from 'react-feather';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const ProfitLoss = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  
  // Date Range (Default: This Month)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]); // Only refetch when store changes, date range change uses a button

  const fetchProfitAndLoss = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      return message.warning("Silakan pilih rentang tanggal.");
    }
    setLoading(true);
    try {
      const startDateIso = dateRange[0].startOf('day').toISOString();
      const endDateIso = dateRange[1].endOf('day').toISOString();

      // 1. Fetch COA for Revenue & Expense
      const { data: coaData, error: coaError } = await supabase
        .from('coa')
        .select('id, account_code, account_name, account_type')
        .in('account_type', ['Revenue', 'Expense']);

      if (coaError) throw coaError;

      const coaMap = {};
      coaData.forEach(c => coaMap[c.id] = c);

      // 2. Fetch Journal Lines in period for those accounts
      const coaIds = coaData.map(c => c.id);
      
      let query = supabase
        .from('journal_lines')
        .select('account_id, debit, credit, journal_entries!inner(entry_date, branch_id)')
        .in('account_id', coaIds)
        .gte('journal_entries.entry_date', startDateIso)
        .lte('journal_entries.entry_date', endDateIso);

      if (selectedStore) {
        query = query.eq('journal_entries.branch_id', selectedStore);
      }

      const { data: lines, error: linesError } = await query;
      if (linesError) throw linesError;

      // 3. Aggregate Data
      const revMap = {};
      const expMap = {};
      let totalRev = 0;
      let totalExp = 0;

      (lines || []).forEach(line => {
        const coa = coaMap[line.account_id];
        if (!coa) return;
        
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;

        if (coa.account_type === 'Revenue') {
          // Pendapatan bertambah di Kredit
          const amount = credit - debit;
          revMap[coa.id] = (revMap[coa.id] || 0) + amount;
          totalRev += amount;
        } else if (coa.account_type === 'Expense') {
          // Beban bertambah di Debit
          const amount = debit - credit;
          expMap[coa.id] = (expMap[coa.id] || 0) + amount;
          totalExp += amount;
        }
      });

      const formattedRev = Object.keys(revMap).map(id => ({
        id,
        code: coaMap[id].account_code,
        name: coaMap[id].account_name,
        amount: revMap[id]
      })).filter(item => item.amount !== 0).sort((a,b) => b.amount - a.amount);

      const formattedExp = Object.keys(expMap).map(id => ({
        id,
        code: coaMap[id].account_code,
        name: coaMap[id].account_name,
        amount: expMap[id]
      })).filter(item => item.amount !== 0).sort((a,b) => b.amount - a.amount);

      setRevenueData(formattedRev);
      setExpenseData(formattedExp);
      
      setSummary({
        grossIncome: totalRev,
        totalExpenses: totalExp,
        netProfit: totalRev - totalExp
      });

    } catch (err) {
      console.error("Error fetching Profit & Loss data:", err);
      message.error("Gagal memuat Laba / Rugi");
    } finally {
      setLoading(false);
    }
  };

  const isProfit = summary.netProfit >= 0;

  const columns = [
    {
      title: 'Kode Akun',
      dataIndex: 'code',
      key: 'code',
      width: '20%',
    },
    {
      title: 'Nama Akun',
      dataIndex: 'name',
      key: 'name',
      width: '50%',
      render: (text) => <span className="fw-bold">{text}</span>
    },
    {
      title: 'Total (Rp)',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val) => <span>Rp {new Intl.NumberFormat('id-ID').format(val)}</span>
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        
        {/* Header Section */}
        <div className="page-header mb-4">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Laporan Laba / Rugi (P&L)</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Analisis pendapatan vs pengeluaran berbasis Jurnal (Double-Entry)</h6>
            </div>
            <div className="col-lg-6 d-flex justify-content-end gap-2 mt-3 mt-lg-0">
              <RangePicker 
                value={dateRange} 
                onChange={setDateRange}
                format="DD MMM YYYY"
                allowClear={false}
                style={{height: '38px'}}
              />
              <Button type="primary" onClick={fetchProfitAndLoss} loading={loading} style={{background: '#ff9f43', borderColor: '#ff9f43', height: '38px', fontWeight: 'bold'}}>
                <Icon.Filter size={16} className="me-2"/> Tampilkan
              </Button>
            </div>
          </div>
        </div>

        <Spin spinning={loading}>
          {/* Summary Cards */}
          <Row gutter={[16, 16]} className="mb-4">
            <Col xs={24} md={8}>
              <Card className="shadow-sm border-0" style={{borderRadius: '8px', borderLeft: '4px solid #28c76f'}}>
                <Statistic
                  title={<span style={{fontSize: '14px', fontWeight: 'bold', color: '#555'}}>Total Pendapatan (Revenue)</span>}
                  value={summary.grossIncome}
                  precision={0}
                  prefix="Rp"
                  valueStyle={{ color: '#28c76f', fontWeight: 'bold', fontSize: '24px' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm border-0" style={{borderRadius: '8px', borderLeft: '4px solid #ea5455'}}>
                <Statistic
                  title={<span style={{fontSize: '14px', fontWeight: 'bold', color: '#555'}}>Total Beban (Expenses)</span>}
                  value={summary.totalExpenses}
                  precision={0}
                  prefix="Rp"
                  valueStyle={{ color: '#ea5455', fontWeight: 'bold', fontSize: '24px' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="shadow-sm border-0" style={{borderRadius: '8px', borderLeft: `4px solid ${isProfit ? '#00cfe8' : '#ea5455'}`}}>
                <Statistic
                  title={<span style={{fontSize: '14px', fontWeight: 'bold', color: '#555'}}>Laba Bersih (Net Profit)</span>}
                  value={Math.abs(summary.netProfit)}
                  precision={0}
                  prefix="Rp"
                  valueStyle={{ color: isProfit ? '#00cfe8' : '#ea5455', fontWeight: 'bold', fontSize: '24px' }}
                  suffix={isProfit ? <ArrowUpOutlined style={{fontSize: '18px'}} /> : <ArrowDownOutlined style={{fontSize: '18px'}} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Breakdown Tables */}
          <Row gutter={[24, 24]}>
            {/* Pendapatan Table */}
            <Col xs={24} lg={12}>
              <Card className="shadow-sm border-0 h-100" style={{borderRadius: '8px'}} title={<span style={{color: '#28c76f'}}><Icon.TrendingUp size={18} className="me-2"/>Rincian Pendapatan</span>}>
                <Table 
                  columns={columns} 
                  dataSource={revenueData} 
                  rowKey="id" 
                  pagination={false}
                  size="middle"
                  summary={() => (
                    <Table.Summary.Row style={{background: '#f8f9fa', fontWeight: 'bold'}}>
                      <Table.Summary.Cell colSpan={2} index={0} className="text-end">Total Pendapatan:</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right" className="text-success">Rp {new Intl.NumberFormat('id-ID').format(summary.grossIncome)}</Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>

            {/* Beban Table */}
            <Col xs={24} lg={12}>
              <Card className="shadow-sm border-0 h-100" style={{borderRadius: '8px'}} title={<span style={{color: '#ea5455'}}><Icon.TrendingDown size={18} className="me-2"/>Rincian Beban</span>}>
                <Table 
                  columns={columns} 
                  dataSource={expenseData} 
                  rowKey="id" 
                  pagination={false}
                  size="middle"
                  summary={() => (
                    <Table.Summary.Row style={{background: '#f8f9fa', fontWeight: 'bold'}}>
                      <Table.Summary.Cell colSpan={2} index={0} className="text-end">Total Beban:</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right" className="text-danger">Rp {new Intl.NumberFormat('id-ID').format(summary.totalExpenses)}</Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Spin>
      </div>
    </div>
  );
};

export default ProfitLoss;
