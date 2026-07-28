import React, { useState, useEffect, useContext } from "react";
import { Table, DatePicker, Button, Card, Typography, Tag, Row, Col, Space, Select, Tabs, Progress } from 'antd';
import Chart from "react-apexcharts";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import * as Icon from 'react-feather';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const HourlyReport = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  
  // Custom Hour Filter (00:00 - 23:59)
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(23);

  // States
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyBreakdown, setDailyBreakdown] = useState([]);
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
  }, [dateRange, selectedStore, startHour, endHour]);

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

      // 1. Initialize 24 Hours Structure (Aggregated 00:00 to 23:00)
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

      // 2. Initialize Daily Map for Date Breakdown (YYYY-MM-DD)
      const dailyMap = {};
      let cur = dayjs(startDate);
      const end = dayjs(endDate);
      while (cur.isBefore(end) || cur.isSame(end, 'day')) {
        const dKey = cur.format('YYYY-MM-DD');
        dailyMap[dKey] = {
          dateStr: dKey,
          dateFormatted: cur.format('dddd, DD MMM YYYY'),
          trxCount: 0,
          pcsCount: 0,
          cashTotal: 0,
          qrisTotal: 0,
          totalRevenue: 0,
        };
        cur = cur.add(1, 'day');
      }

      let grandTrx = 0;
      let grandPcs = 0;
      let grandRevenue = 0;
      let grandExpense = 0;
      const productSalesMap = {};

      // Process Transactions
      (trxs || []).forEach(t => {
        const dt = dayjs(t.created_at);
        const hour = dt.hour();
        const dKey = dt.format('YYYY-MM-DD');
        const amt = t.total_amount || 0;
        const pMethod = (t.payment_method || 'cash').toLowerCase();

        // 24-Hour Map Update
        hoursMap[hour].trxCount += 1;
        hoursMap[hour].totalRevenue += amt;

        if (pMethod === 'qris') {
          hoursMap[hour].qrisTotal += amt;
        } else {
          hoursMap[hour].cashTotal += amt;
        }

        // Process Items
        const items = t.transaction_items || [];
        let tPcs = 0;
        items.forEach(it => {
          const qty = Number(it.quantity) || 1;
          hoursMap[hour].pcsCount += qty;
          tPcs += qty;

          const prodName = it.products?.name || 'Produk';
          if (!productSalesMap[prodName]) {
            productSalesMap[prodName] = { name: prodName, qty: 0, total: 0 };
          }
          productSalesMap[prodName].qty += qty;
          productSalesMap[prodName].total += (it.subtotal || (qty * (it.price_at_time || 0)));
        });

        // Filter for Selected Custom Hour Range in Daily Breakdown & Summary Stat
        if (hour >= startHour && hour <= endHour) {
          grandTrx += 1;
          grandRevenue += amt;
          grandPcs += tPcs;

          if (dailyMap[dKey]) {
            dailyMap[dKey].trxCount += 1;
            dailyMap[dKey].pcsCount += tPcs;
            dailyMap[dKey].totalRevenue += amt;
            if (pMethod === 'qris') {
              dailyMap[dKey].qrisTotal += amt;
            } else {
              dailyMap[dKey].cashTotal += amt;
            }
          }
        }
      });

      // Process Expenses per Hour
      (exps || []).forEach(e => {
        const dt = dayjs(e.created_at || e.expense_date);
        const hour = dt.hour();
        const amt = e.amount || 0;

        hoursMap[hour].totalExpense += amt;
        if (hour >= startHour && hour <= endHour) {
          grandExpense += amt;
        }
      });

      // Calculate Net Income & Peak Hour in Selected Window
      let maxTrx = 0;
      let peakH = '-';

      hoursMap.forEach(h => {
        h.netIncome = h.totalRevenue - h.totalExpense;
        if (h.hour >= startHour && h.hour <= endHour && h.trxCount > maxTrx) {
          maxTrx = h.trxCount;
          peakH = h.timeWindow;
        }
      });

      // Sort Top 5 Products
      const topProdList = Object.values(productSalesMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      // Convert dailyMap to Array (descending by date)
      const dailyList = Object.values(dailyMap).sort((a, b) => b.dateStr.localeCompare(a.dateStr));

      setHourlyData(hoursMap);
      setDailyBreakdown(dailyList);
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

  // ApexCharts Config for 24-Hour Bar Chart
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

  // Table Columns for Daily Breakdown (List Per Tanggal)
  const dailyColumns = [
    {
      title: 'Tanggal Transaksi',
      dataIndex: 'dateFormatted',
      key: 'dateFormatted',
      render: (text, record) => (
        <div>
          <span className="fw-bold text-dark fs-14">{text}</span>
          <div className="fs-12 text-muted">{record.dateStr}</div>
        </div>
      )
    },
    {
      title: 'Rentang Jam Filter',
      key: 'hourRange',
      align: 'center',
      render: () => (
        <Tag color="purple" className="fw-bold fs-12 px-2 py-1">
          ⏱️ {startHour.toString().padStart(2, '0')}:00 - {endHour.toString().padStart(2, '0')}:59 WIB
        </Tag>
      )
    },
    {
      title: 'Jumlah Transaksi',
      dataIndex: 'trxCount',
      key: 'trxCount',
      align: 'center',
      render: (val) => val > 0 ? (
        <Tag color="blue" className="fw-bold fs-13 px-2 py-1">{val} Transaksi</Tag>
      ) : (
        <Text type="secondary">0</Text>
      )
    },
    {
      title: 'Total Pcs Terjual',
      dataIndex: 'pcsCount',
      key: 'pcsCount',
      align: 'center',
      render: (val) => val > 0 ? <span className="fw-bold text-dark">{val} pcs</span> : '-'
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
      title: 'Total Omset Tanggal Tsb (Rp)',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      align: 'right',
      render: (val) => (
        <span className={`fw-bold fs-14 ${val > 0 ? 'text-success' : 'text-muted'}`}>
          Rp {val.toLocaleString('id-ID')}
        </span>
      )
    },
    {
      title: 'Kontribusi Omset Periode',
      key: 'contribution',
      width: 180,
      render: (_, record) => {
        const pct = summary.totalRevenue > 0 ? Math.round((record.totalRevenue / summary.totalRevenue) * 100) : 0;
        return (
          <div>
            <div className="d-flex justify-content-between fs-12 mb-1">
              <span className="text-muted">Share:</span>
              <span className="fw-bold text-dark">{pct}%</span>
            </div>
            <Progress percent={pct} size="small" status="active" strokeColor="#10B981" showInfo={false} />
          </div>
        );
      }
    }
  ];

  // Table Columns for 24-Hour Breakdown (Hourly Aggregated)
  const hourlyColumns = [
    {
      title: 'Rentang Jam (WIB)',
      dataIndex: 'timeWindow',
      key: 'timeWindow',
      render: (text, record) => {
        const isPeak = summary.peakHour === text && summary.peakTrxCount > 0;
        const inSelected = record.hour >= startHour && record.hour <= endHour;
        return (
          <Space>
            <span className={`fw-bold ${inSelected ? 'text-primary' : 'text-dark'}`}>{text}</span>
            {isPeak && <Tag color="error" className="fw-bold">🔥 RENTANG TERAMAI</Tag>}
            {inSelected && <Tag color="cyan">Filter Terpilih</Tag>}
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
            <Text type="secondary">Filter fleksibel tanggal & jam kerja, analisis jam sibuk kasir, dan laporan list per tanggal</Text>
          </div>
          <Button icon={<Icon.RefreshCw size={16} />} onClick={fetchHourlyReport} loading={loading}>
            Refresh Data
          </Button>
        </div>

        {/* Filter Controls Card: Date Range & Hour Range Picker */}
        <Card className="mb-4 shadow-sm border-0 rounded-3" bodyStyle={{ padding: '20px' }}>
          <Row gutter={[16, 16]} className="align-items-center">
            {/* Filter Tanggal */}
            <Col xs={24} md={10} lg={7}>
              <label className="form-label fw-bold mb-1">📅 Pilih Rentang Tanggal:</label>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => setDateRange(dates || [dayjs().startOf('month'), dayjs().endOf('month')])}
                format="DD/MM/YYYY"
                allowClear={false}
              />
            </Col>

            {/* Filter Jam Start & End */}
            <Col xs={12} md={7} lg={4}>
              <label className="form-label fw-bold mb-1">🕒 Jam Mulai:</label>
              <Select
                style={{ width: '100%' }}
                value={startHour}
                onChange={setStartHour}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <Select.Option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00 WIB
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col xs={12} md={7} lg={4}>
              <label className="form-label fw-bold mb-1">🕒 Jam Selesai:</label>
              <Select
                style={{ width: '100%' }}
                value={endHour}
                onChange={setEndHour}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <Select.Option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:59 WIB
                  </Select.Option>
                ))}
              </Select>
            </Col>

            {/* Quick Shift Presets */}
            <Col xs={24} lg={9}>
              <label className="form-label fw-bold mb-1 d-block">⚡ Tombol Preset Jam Cepat:</label>
              <Space wrap>
                <Button 
                  size="small" 
                  type={startHour === 8 && endHour === 15 ? 'primary' : 'default'}
                  onClick={() => { setStartHour(8); setEndHour(15); }}
                >
                  ☀️ Shift Pagi (08:00 - 15:59)
                </Button>
                <Button 
                  size="small"
                  type={startHour === 11 && endHour === 14 ? 'primary' : 'default'}
                  onClick={() => { setStartHour(11); setEndHour(14); }}
                >
                  🍲 Makan Siang (11:00 - 14:59)
                </Button>
                <Button 
                  size="small"
                  type={startHour === 15 && endHour === 22 ? 'primary' : 'default'}
                  onClick={() => { setStartHour(15); setEndHour(22); }}
                >
                  🌙 Shift Sore/Malam (15:00 - 22:59)
                </Button>
                <Button 
                  size="small"
                  type={startHour === 0 && endHour === 23 ? 'primary' : 'default'}
                  onClick={() => { setStartHour(0); setEndHour(23); }}
                >
                  🕒 24 Jam Penuh
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* DreamsPOS Modern Stat Cards */}
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
                  <div className="text-muted fs-13">Omset Jam ({startHour}:00 - {endHour}:59)</div>
                  <small className="text-secondary fs-11 mt-1 d-block">{summary.totalTrx} Transaksi Selesai</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.DollarSign size={22} />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 3: Total Pcs Terjual */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-dark">{summary.totalPcs} Pcs</span>
                    <span className="badge bg-warning-light text-warning ms-2 fw-bold fs-11">Produk</span>
                  </div>
                  <div className="text-muted fs-13">Item Terjual Jam Tsb</div>
                  <small className="text-secondary fs-11 mt-1 d-block">Jumlah Barang Keluar</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FFEDD5', color: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.ShoppingCart size={22} />
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
                    <span className="badge bg-danger-light text-danger ms-2 fw-bold fs-11">Beban</span>
                  </div>
                  <div className="text-muted fs-13">Pengeluaran Jam Tsb</div>
                  <small className="text-secondary fs-11 mt-1 d-block">Biaya Operasional Jam Tsb</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.Calendar size={22} />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Dual Column Section: ApexChart & DreamsPOS Top Selling Items */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} lg={16}>
            <Card title="📊 Visualisasi Grafis Keramaian Penjualan Per Jam (24-Jam)" className="border-0 shadow-sm rounded-3 h-100">
              <Chart
                options={apexChartOptions}
                series={[
                  { name: 'Omset Penjualan (Rp)', data: hourlyData.map(h => h.totalRevenue) },
                  { name: 'Jumlah Transaksi', data: hourlyData.map(h => h.trxCount) }
                ]}
                type="bar"
                height={320}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="🔥 Top 5 Produk Terlaris Periode Ini" className="border-0 shadow-sm rounded-3 h-100">
              <div className="bg-success-light p-2 rounded mb-3 text-center">
                <span className="fw-bold text-success fs-13">🔥 MOST ORDERED ITEMS</span>
              </div>
              {topProducts.length > 0 ? (
                topProducts.map((p, idx) => {
                  const maxQty = topProducts[0]?.qty || 1;
                  const pct = Math.round((p.qty / maxQty) * 100);
                  const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
                  return (
                    <div key={idx} className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold text-dark fs-13">#{idx + 1} {p.name}</span>
                        <span className="badge bg-light text-dark fw-bold">{p.qty} Pcs (Rp {p.total.toLocaleString('id-ID')})</span>
                      </div>
                      <Progress percent={pct} size="small" strokeColor={colors[idx % colors.length]} showInfo={false} />
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted py-4">Belum ada data penjualan produk</div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Tabbed Detailed View: 📅 List Per Tanggal vs ⏱️ Rincian 24 Jam */}
        <Card className="border-0 shadow-sm rounded-3">
          <Tabs
            defaultActiveKey="daily"
            items={[
              {
                key: 'daily',
                label: (
                  <span className="fw-bold fs-14">
                    📅 List Laporan Per Tanggal ({startHour.toString().padStart(2, '0')}:00 - {endHour.toString().padStart(2, '0')}:59 WIB)
                  </span>
                ),
                children: (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <span className="fw-bold text-dark fs-15">
                          Rincian Penjualan Harian Khusus Jam {startHour.toString().padStart(2, '0')}:00 s/d {endHour.toString().padStart(2, '0')}:59 WIB
                        </span>
                        <Text type="secondary" className="d-block fs-12">
                          Menampilkan performa transaksi per hari pada rentang jam kerja yang dipilih
                        </Text>
                      </div>
                      <Tag color="green" className="fw-bold p-1 px-3 fs-13">
                        Total {dailyBreakdown.length} Hari Terdaftar
                      </Tag>
                    </div>
                    <Table
                      columns={dailyColumns}
                      dataSource={dailyBreakdown}
                      rowKey="dateStr"
                      loading={loading}
                      pagination={{ pageSize: 15 }}
                    />
                  </div>
                )
              },
              {
                key: 'hourly',
                label: (
                  <span className="fw-bold fs-14">
                    ⏱️ Breakdown Agregat 24 Jam Penuh
                  </span>
                ),
                children: (
                  <div>
                    <div className="mb-3">
                      <span className="fw-bold text-dark fs-15">Rincian Total Penjualan & Pengeluaran Per Jam (00:00 - 23:59 WIB)</span>
                    </div>
                    <Table
                      columns={hourlyColumns}
                      dataSource={hourlyData}
                      rowKey="hour"
                      loading={loading}
                      pagination={false}
                    />
                  </div>
                )
              }
            ]}
          />
        </Card>
      </div>
    </div>
  );
};

export default HourlyReport;
