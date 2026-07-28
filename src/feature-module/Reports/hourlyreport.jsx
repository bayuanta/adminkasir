import React, { useState, useEffect, useContext } from "react";
import { Table, DatePicker, Button, Card, Typography, Tag, Row, Col, Space } from 'antd';
import Chart from "react-apexcharts";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import * as Icon from 'react-feather';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const HourlyReport = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);
  
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
  }, [dateRange, selectedStore]);

  const fetchHourlyReport = async () => {
    setLoading(true);
    try {
      const startDate = dateRange && dateRange[0] ? dateRange[0].startOf('day').toISOString() : dayjs().startOf('month').toISOString();
      const endDate = dateRange && dateRange[1] ? dateRange[1].endOf('day').toISOString() : dayjs().endOf('day').toISOString();

      // Query transactions & items for selected date range
      let trxQuery = supabase
        .from('transactions')
        .select('*, transaction_items(*, products(*))')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'completed');

      let expQuery = supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

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

  const apexChartOptions = {
    chart: { type: 'bar', height: 320, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    colors: ['#3B82F6', '#10B981'],
    xaxis: {
      categories: hourlyData.map(h => `${h.hour.toString().padStart(2, '0')}:00`),
      labels: { style: { fontSize: '11px', colors: '#6B7280' } }
    },
    yaxis: [
      {
        title: { text: 'Omset (Rp)', style: { color: '#3B82F6', fontSize: '12px' } },
        labels: { formatter: (val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val }
      },
      {
        opposite: true,
        title: { text: 'Trx', style: { color: '#10B981', fontSize: '12px' } },
        labels: { formatter: (val) => Math.round(val) }
      }
    ],
    tooltip: {
      y: {
        formatter: (val, { seriesIndex }) => seriesIndex === 0 ? `Rp ${val.toLocaleString('id-ID')}` : `${val} Transaksi`
      }
    },
    legend: { position: 'top', horizontalAlign: 'right' }
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
        <Card className="mb-4 shadow-sm border-0 rounded-3">
          <div className="row align-items-center">
            <div className="col-md-6">
              <label className="form-label fw-bold">Pilih Rentang Tanggal Laporan (Dari - Sampai):</label>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates || [dayjs().startOf('day'), dayjs().endOf('day')])}
                format="DD/MM/YYYY"
                allowClear={false}
              />
            </div>
            <div className="col-md-6 text-end mt-3 mt-md-0">
              <Tag color="cyan" className="fs-13 p-2 fw-bold">
                🗓️ Periode: {dateRange && dateRange[0] ? dateRange[0].format('DD MMM YYYY') : '-'} s/d {dateRange && dateRange[1] ? dateRange[1].format('DD MMM YYYY') : '-'}
              </Tag>
            </div>
          </div>
        </Card>

        {/* DreamsPOS Modern Stat Cards (Identical Height & Circular Icon Widgets) */}
        <Row gutter={[16, 16]} className="mb-4">
          {/* Card 1: Peak Hour */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-dark">{summary.peakHour}</span>
                    {summary.peakTrxCount > 0 && (
                      <span className="badge bg-danger-light text-danger ms-2 fw-bold fs-11">🔥 Peak</span>
                    )}
                  </div>
                  <div className="text-muted fs-13">Jam Teramai Penjualan</div>
                  <small className="text-secondary fs-11 mt-1 d-block">
                    {summary.peakTrxCount > 0 ? `${summary.peakTrxCount} Transaksi Selesai` : 'Belum ada transaksi'}
                  </small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.Clock size={22} />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 2: Total Omset */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-dark">Rp {summary.totalRevenue.toLocaleString('id-ID')}</span>
                    <span className="badge bg-success-light text-success ms-2 fw-bold fs-11">Omset</span>
                  </div>
                  <div className="text-muted fs-13">Total Omset Penjualan</div>
                  <small className="text-secondary fs-11 mt-1 d-block">{summary.totalTrx} Transaksi Selesai</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.DollarSign size={22} />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 3: Total Pcs */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-dark">{summary.totalPcs} pcs</span>
                    <span className="badge bg-info-light text-info ms-2 fw-bold fs-11">Items</span>
                  </div>
                  <div className="text-muted fs-13">Total Pcs Barang Terjual</div>
                  <small className="text-secondary fs-11 mt-1 d-block">Rata-rata {(summary.totalPcs / 24).toFixed(1)} pcs/jam</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FFEDD5', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.Package size={22} />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 4: Pengeluaran */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-dark">Rp {summary.totalExpense.toLocaleString('id-ID')}</span>
                    <span className="badge bg-warning-light text-warning ms-2 fw-bold fs-11">Beban</span>
                  </div>
                  <div className="text-muted fs-13">Total Pengeluaran</div>
                  <small className="text-secondary fs-11 mt-1 d-block">Laba Net: Rp {(summary.totalRevenue - summary.totalExpense).toLocaleString('id-ID')}</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.TrendingUp size={22} />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Visual Hourly ApexChart & DreamsPOS Top Selling Items Widget */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={16}>
            <Card title="📊 Grafik Omset Penjualan & Transaksi Per Jam (00:00 - 23:00)" className="border-0 shadow-sm rounded-3 h-100">
              <Chart
                options={apexChartOptions}
                series={[
                  { name: 'Omset Penjualan (Rp)', data: hourlyData.map(h => h.totalRevenue) },
                  { name: 'Jumlah Transaksi', data: hourlyData.map(h => h.trxCount) }
                ]}
                type="bar"
                height={330}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="🏆 Top Selling Items (Menu Terlaris)" className="border-0 shadow-sm rounded-3 h-100">
              {topProducts.length === 0 ? (
                <div className="text-center py-5 text-muted">Belum ada data penjualan pada periode ini</div>
              ) : (
                <div>
                  {/* Most Ordered Green Highlight Banner (matching DreamsPOS template) */}
                  <div className="p-3 mb-3 rounded-3 d-flex align-items-center" style={{ backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7' }}>
                    <span className="me-2 fs-16">🔥</span>
                    <div>
                      <small className="text-success fw-bold d-block fs-11">MOST ORDERED</small>
                      <span className="fw-bold text-dark fs-13">{topProducts[0]?.name}</span>
                    </div>
                  </div>

                  {/* Top Products List with Rank #1, #2, #3, #4, #5 */}
                  {topProducts.map((p, idx) => {
                    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899'];
                    const color = colors[idx % colors.length];
                    const maxQty = topProducts[0]?.qty || 1;
                    const progressPercent = Math.min(Math.round((p.qty / maxQty) * 100), 100);

                    return (
                      <div key={idx} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold text-dark fs-13">
                            <span className="text-muted me-1">#{idx + 1}</span> {p.name}
                          </span>
                          <span className="fw-bold text-dark fs-13">{p.qty} pcs</span>
                        </div>
                        <div className="progress" style={{ height: '6px', borderRadius: '4px', backgroundColor: '#F3F4F6' }}>
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${progressPercent}%`, backgroundColor: color, borderRadius: '4px' }}
                          />
                        </div>
                        <div className="text-end mt-1">
                          <small className="text-muted fs-11">Rp {p.total.toLocaleString('id-ID')}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Detailed Table Data */}
        <Card title="📋 Tabel Rincian Data Omset & Transaksi Per Jam" className="border-0 shadow-sm rounded-3">
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
