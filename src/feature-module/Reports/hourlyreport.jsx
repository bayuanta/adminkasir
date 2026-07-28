import React, { useState, useEffect, useContext } from "react";
import { Table, DatePicker, Button, Card, Typography, Tag, Row, Col, Statistic, Progress, Space } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import * as Icon from 'react-feather';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const HourlyReport = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  
  // Aggregated Hourly Data (0 to 23)
  const [hourlyData, setHourlyData] = useState([]);
  const [summary, setSummary] = useState({
    totalTrx: 0,
    totalPcs: 0,
    totalRevenue: 0,
    totalExpense: 0,
    peakHour: '-',
    peakTrxCount: 0
  });
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    fetchHourlyReport();

    const channel = supabase
      .channel('hourly-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchHourlyReport())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_items' }, () => fetchHourlyReport())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchHourlyReport())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedStore]);

  const fetchHourlyReport = async () => {
    setLoading(true);
    try {
      const targetDate = selectedDate || dayjs();
      const startOfDay = targetDate.startOf('day').toISOString();
      const endOfDay = targetDate.endOf('day').toISOString();

      // Query transactions & items for selected date
      let trxQuery = supabase
        .from('transactions')
        .select('*, transaction_items(*, products(*))')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .eq('status', 'completed');

      let expQuery = supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (selectedStore) {
        trxQuery = trxQuery.eq('branch_id', selectedStore);
        expQuery = expQuery.eq('branch_id', selectedStore);
      }

      const { data: trxs } = await trxQuery;
      const { data: exps } = await expQuery;

      // Initialize 24 Hours Structure (00:00 to 23:00)
      const hoursMap = Array.from({ length: 24 }, (_, i) => {
        const hStr = i.toString().padStart(2, '0');
        return {
          hour: i,
          timeWindow: `${hStr}:00 - ${hStr}:59`,
          trxCount: 0,
          pcsCount: 0,
          cashTotal: 0,
          qrisTotal: 0,
          totalRevenue: 0,
          totalExpense: 0,
          netIncome: 0,
        };
      });

      let grandTrx = 0;
      let grandPcs = 0;
      let grandRevenue = 0;
      let grandExpense = 0;
      const productSalesMap = {};

      // Process Transactions per Hour
      (trxs || []).forEach(t => {
        const dt = dayjs(t.created_at);
        const hour = dt.hour();
        const amt = t.total_amount || 0;
        const pMethod = (t.payment_method || 'cash').toLowerCase();

        hoursMap[hour].trxCount += 1;
        hoursMap[hour].totalRevenue += amt;
        grandTrx += 1;
        grandRevenue += amt;

        if (pMethod === 'qris') {
          hoursMap[hour].qrisTotal += amt;
        } else {
          hoursMap[hour].cashTotal += amt;
        }

        // Process Items
        const items = t.transaction_items || [];
        items.forEach(it => {
          const qty = Number(it.quantity) || 1;
          hoursMap[hour].pcsCount += qty;
          grandPcs += qty;

          const prodName = it.products?.name || 'Produk';
          if (!productSalesMap[prodName]) {
            productSalesMap[prodName] = { name: prodName, qty: 0, total: 0 };
          }
          productSalesMap[prodName].qty += qty;
          productSalesMap[prodName].total += (it.subtotal || (qty * (it.price_at_time || 0)));
        });
      });

      // Process Expenses per Hour
      (exps || []).forEach(e => {
        const dt = dayjs(e.created_at || e.expense_date);
        const hour = dt.hour();
        const amt = e.amount || 0;

        hoursMap[hour].totalExpense += amt;
        grandExpense += amt;
      });

      // Calculate Net Income & Peak Hour
      let maxTrx = 0;
      let peakH = '-';

      hoursMap.forEach(h => {
        h.netIncome = h.totalRevenue - h.totalExpense;
        if (h.trxCount > maxTrx) {
          maxTrx = h.trxCount;
          peakH = h.timeWindow;
        }
      });

      // Sort Top 5 Products
      const topProdList = Object.values(productSalesMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      setHourlyData(hoursMap);
      setSummary({
        totalTrx: grandTrx,
        totalPcs: grandPcs,
        totalRevenue: grandRevenue,
        totalExpense: grandExpense,
        peakHour: maxTrx > 0 ? peakH : 'Belum Ada Transaksi',
        peakTrxCount: maxTrx
      });
      setTopProducts(topProdList);

    } catch (err) {
      console.error("Error fetching hourly report:", err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Rentang Jam (WIB)',
      dataIndex: 'timeWindow',
      key: 'timeWindow',
      render: (text) => {
        const isPeak = summary.peakHour === text && summary.peakTrxCount > 0;
        return (
          <Space>
            <span className="fw-bold">{text}</span>
            {isPeak && <Tag color="error" className="fw-bold">🔥 RENTANG TERAMAI</Tag>}
          </Space>
        );
      }
    },
    {
      title: 'Jml Transaksi',
      dataIndex: 'trxCount',
      key: 'trxCount',
      align: 'center',
      render: (val) => val > 0 ? <Tag color="blue" className="fw-bold fs-13">{val} Transaksi</Tag> : <Text type="secondary">0</Text>
    },
    {
      title: 'Pcs Terjual',
      dataIndex: 'pcsCount',
      key: 'pcsCount',
      align: 'center',
      render: (val) => val > 0 ? <span className="fw-bold">{val} pcs</span> : '-'
    },
    {
      title: 'Penjualan Cash (Rp)',
      dataIndex: 'cashTotal',
      key: 'cashTotal',
      align: 'right',
      render: (val) => val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '-'
    },
    {
      title: 'Penjualan QRIS (Rp)',
      dataIndex: 'qrisTotal',
      key: 'qrisTotal',
      align: 'right',
      render: (val) => val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '-'
    },
    {
      title: 'Total Omset (Rp)',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right',
      render: (val) => (
        <span className={`fw-bold ${val > 0 ? 'text-success' : 'text-muted'}`}>
          Rp {val.toLocaleString('id-ID')}
        </span>
      )
    },
    {
      title: 'Pengeluaran (Rp)',
      dataIndex: 'totalExpense',
      key: 'totalExpense',
      align: 'right',
      render: (val) => val > 0 ? <span className="text-danger fw-bold">Rp {val.toLocaleString('id-ID')}</span> : '-'
    },
    {
      title: 'Status Keramaian',
      key: 'status',
      align: 'center',
      render: (_, record) => {
        if (record.trxCount === 0) return <Tag color="default">☕ Sepi / Tutup</Tag>;
        if (summary.peakHour === record.timeWindow) return <Tag color="red">🔥 Sangat Ramai</Tag>;
        if (record.trxCount >= 5) return <Tag color="orange">⚡ Ramai</Tag>;
        return <Tag color="green">🌱 Normal</Tag>;
      }
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>Laporan Penjualan Per Jam (Hourly Analytics) ⏱️</Title>
            <Text type="secondary">Analisis jam sibuk kasir, omset per jam, dan grafik keramaian harian</Text>
          </div>
          <Button icon={<Icon.RefreshCw size={16} />} onClick={fetchHourlyReport}>
            Refresh Data
          </Button>
        </div>

        {/* Filter Date Bar */}
        <Card className="mb-4 shadow-sm border-0">
          <div className="row align-items-center">
            <div className="col-md-5">
              <label className="form-label fw-bold">Pilih Tanggal Laporan:</label>
              <DatePicker
                style={{ width: '100%' }}
                value={selectedDate}
                onChange={(d) => setSelectedDate(d || dayjs())}
                format="DD MMMM YYYY"
                allowClear={false}
              />
            </div>
            <div className="col-md-7 text-end mt-3 mt-md-0">
              <Tag color="cyan" className="fs-13 p-2 fw-bold">
                🗓️ Laporan Tanggal: {selectedDate.format('DD MMMM YYYY')}
              </Tag>
            </div>
          </div>
        </Card>

        {/* Summary Statistics Cards */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm border-0 border-start border-4 border-primary">
              <Statistic
                title="Jam Teramai Penjualan (Peak Hour)"
                value={summary.peakHour}
                valueStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}
                prefix={<Icon.Clock size={18} className="me-2 text-primary" />}
              />
              {summary.peakTrxCount > 0 && (
                <Text type="secondary" className="fs-12">Sub-total: {summary.peakTrxCount} Transaksi</Text>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm border-0 border-start border-4 border-success">
              <Statistic
                title="Total Omset Hari Ini"
                value={summary.totalRevenue}
                precision={0}
                prefix="Rp "
                valueStyle={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}
              />
              <Text type="secondary" className="fs-12">{summary.totalTrx} Transaksi Selesai</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm border-0 border-start border-4 border-info">
              <Statistic
                title="Total Pcs Barang Terjual"
                value={summary.totalPcs}
                suffix="pcs"
                valueStyle={{ fontSize: '20px', fontWeight: 'bold', color: '#13c2c2' }}
              />
              <Text type="secondary" className="fs-12">Rata-rata {(summary.totalPcs / 24).toFixed(1)} pcs/jam</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="shadow-sm border-0 border-start border-4 border-warning">
              <Statistic
                title="Total Pengeluaran Operasional"
                value={summary.totalExpense}
                precision={0}
                prefix="Rp "
                valueStyle={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}
              />
              <Text type="secondary" className="fs-12">Laba Net: Rp {(summary.totalRevenue - summary.totalExpense).toLocaleString('id-ID')}</Text>
            </Card>
          </Col>
        </Row>

        {/* Visual Hourly Chart Bars & Top Products Side-by-Side */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={16}>
            <Card title="📊 Visual Intensitas Omset Penjualan Per Jam (00:00 - 23:00)" className="shadow-sm border-0">
              <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
                {hourlyData.map(h => {
                  const maxRevenue = Math.max(...hourlyData.map(d => d.totalRevenue), 1);
                  const percent = Math.min(Math.round((h.totalRevenue / maxRevenue) * 100), 100);
                  const isPeak = summary.peakHour === h.timeWindow && summary.peakTrxCount > 0;

                  return (
                    <div key={h.hour} className="mb-3">
                      <div className="d-flex justify-content-between mb-1 fs-13">
                        <span>
                          <strong>{h.timeWindow}</strong> {isPeak && <Tag color="red">🔥</Tag>}
                        </span>
                        <span>
                          <strong>Rp {h.totalRevenue.toLocaleString('id-ID')}</strong> ({h.trxCount} trx, {h.pcsCount} pcs)
                        </span>
                      </div>
                      <Progress
                        percent={percent}
                        status={isPeak ? "exception" : (h.totalRevenue > 0 ? "active" : "normal")}
                        strokeColor={isPeak ? "#ff4d4f" : (h.totalRevenue > 0 ? "#1890ff" : "#d9d9d9")}
                        showInfo={false}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="🏆 Top 5 Menu Terlaris Tanggal Ini" className="shadow-sm border-0">
              {topProducts.length === 0 ? (
                <div className="text-center py-4 text-muted">Belum ada data penjualan</div>
              ) : (
                topProducts.map((p, idx) => (
                  <div key={idx} className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                    <div className="d-flex align-items-center">
                      <span className="badge bg-primary rounded-circle me-2">{idx + 1}</span>
                      <div>
                        <div className="fw-bold">{p.name}</div>
                        <small className="text-muted">Terjual {p.qty} pcs</small>
                      </div>
                    </div>
                    <span className="fw-bold text-success">Rp {p.total.toLocaleString('id-ID')}</span>
                  </div>
                ))
              )}
            </Card>
          </Col>
        </Row>

        {/* Detailed Table Data */}
        <Card title="📋 Tabel Rincian Data Omset & Transaksi Per Jam" className="shadow-sm border-0">
          <Table
            columns={columns}
            dataSource={hourlyData}
            rowKey="hour"
            loading={loading}
            pagination={false}
            bordered
          />
        </Card>
      </div>
    </div>
  );
};

export default HourlyReport;
