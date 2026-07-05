import React, { useState, useEffect, useContext } from "react";
import CountUp from "react-countup";
import Chart from "react-apexcharts";
import ImageWithBasePath from "../../core/img/imagewithbasebath";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const Dashboard = () => {
  const { selectedStore } = useContext(StoreContext);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [dateRange, setDateRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    monthRevenue: 0,
    todayVisitors: 0,
    todayRestoOrders: 0
  });
  
  // Data Grafik Dinamis
  const [donutData, setDonutData] = useState({ series: [], labels: [] });
  const [paymentData, setPaymentData] = useState({ series: [], labels: [] });
  
  // Data Grafik Garis (Bulan Ini)
  const [monthData, setMonthData] = useState({
    categories: [],
    salesSeries: [],
    transactionCountSeries: []
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedStore, dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      const todayStart = new Date(now.setHours(0,0,0,0)).toISOString();
      
      const startDateIso = dateRange[0].startOf('day').toISOString();
      const endDateIso = dateRange[1].endOf('day').toISOString();
      
      let query = supabase
        .from('transactions')
        .select(`
          id,
          total_amount,
          payment_method,
          cashier_name,
          created_at,
          branches (name, type)
        `)
        .gte('created_at', startDateIso)
        .lte('created_at', endDateIso)
        .order('created_at', { ascending: false });

      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }
        
      const { data: monthTrx, error: trxError } = await query;
        
      if (trxError) throw trxError;
      
      const allTrx = monthTrx || [];
      
      // 1. Riwayat Transaksi Terbaru (hanya ambil 5 teratas)
      setRecentTransactions(allTrx.slice(0, 5));

      // 2. Kalkulasi Kartu Metrik Atas & Grafik Donut & Grafik Area
      let tRev = 0;
      let mRev = 0;
      let tVis = 0;
      let tResto = 0;
      
      const branchTotals = {};
      const paymentTotals = {};
      
      const daysDiff = dateRange[1].diff(dateRange[0], 'day') + 1;
      const periodCategories = [];
      const periodSales = new Array(daysDiff).fill(0);
      const periodTxCount = new Array(daysDiff).fill(0);
      const periodMap = {};
      
      // Buat template tanggal untuk periode terpilih
      for(let i=0; i<daysDiff; i++) {
        const dObj = dateRange[0].add(i, 'day');
        const dateKey = dObj.format('YYYY-MM-DD');
        periodCategories.push(dObj.format('DD MMM'));
        periodMap[dateKey] = { index: i, resto: 0, ticket: 0 };
      }

      // Loop semua transaksi untuk dihitung
      allTrx.forEach(trx => {
        mRev += trx.total_amount;
        
        const dateKey = trx.created_at.split('T')[0];
        
        if (periodMap[dateKey]) {
          const idx = periodMap[dateKey].index;
          periodSales[idx] += trx.total_amount;
          periodTxCount[idx] += 1;
          if (trx.branches?.type === 'resto') periodMap[dateKey].resto += trx.total_amount;
          if (trx.branches?.type === 'ticket') periodMap[dateKey].ticket += trx.total_amount;
        }
        
        if (trx.created_at >= todayStart) {
          tRev += trx.total_amount;
          if (trx.branches?.type === 'ticket') tVis += 1;
          if (trx.branches?.type === 'resto') tResto += 1;
        }

        const bName = trx.branches?.name || 'Cabang Tidak Diketahui';
        branchTotals[bName] = (branchTotals[bName] || 0) + trx.total_amount;

        const pMethod = (trx.payment_method || 'LAINNYA').toUpperCase();
        paymentTotals[pMethod] = (paymentTotals[pMethod] || 0) + trx.total_amount;
      });

      setMetrics({
        todayRevenue: tRev, 
        monthRevenue: mRev, 
        todayVisitors: tVis,
        todayRestoOrders: tResto
      });

      setDonutData({
        labels: Object.keys(branchTotals),
        series: Object.values(branchTotals)
      });
      
      setPaymentData({
        labels: Object.keys(paymentTotals),
        series: Object.values(paymentTotals)
      });
      
      setMonthData({
        categories: periodCategories,
        salesSeries: periodSales,
        transactionCountSeries: periodTxCount
      });
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const lineChartSalesOptions = {
    chart: { type: "area", height: 320, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: 3 },
    colors: ["#EA5455"], // Sesuai dengan warna orange/merah di referensi
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    xaxis: { 
      categories: monthData.categories, 
      labels: { 
        hideOverlappingLabels: false, 
        rotate: -45, 
        style: { fontSize: '10px' } 
      } 
    },
    yaxis: { labels: { formatter: (value) => { return "Rp " + (value/1000).toFixed(0) + "K" } } },
    markers: { size: 0, hover: { size: 6 } },
    tooltip: { y: { formatter: (value) => "Rp " + value.toLocaleString('id-ID') } },
    grid: { padding: { bottom: 15 } }
  };

  const lineChartCountOptions = {
    chart: { type: "area", height: 320, toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: 3 },
    colors: ["#28C76F"], // Menggunakan warna hijau agar kontras dan fresh
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    xaxis: { 
      categories: monthData.categories, 
      labels: { 
        hideOverlappingLabels: false, 
        rotate: -45, 
        style: { fontSize: '10px' } 
      } 
    },
    yaxis: { labels: { formatter: (value) => { return Math.round(value) } }, min: 0 },
    markers: { size: 0, hover: { size: 6 } },
    tooltip: { y: { formatter: (value) => value + " Transaksi" } },
    grid: { padding: { bottom: 15 } }
  };

  const donutChartOptions = {
    labels: donutData.labels,
    chart: { type: "donut", height: 320 },
    colors: ["#28C76F", "#00CFE8", "#FF9F43", "#EA5455", "#6610f2", "#fd7e14"],
    legend: { position: "bottom" },
    plotOptions: { pie: { donut: { size: '65%' } } }
  };

  const paymentChartOptions = {
    labels: paymentData.labels,
    chart: { type: "donut", height: 320 },
    colors: ["#6610f2", "#FF9F43", "#EA5455", "#28C76F", "#00CFE8"],
    legend: { position: "bottom" },
    plotOptions: { pie: { donut: { size: '65%' } } }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="page-wrapper">
        <div className="content">
          
          <div className="page-header">
            <div className="page-title">
              <h4>Dashboard Analitik BUMDes</h4>
              <h6>Ringkasan performa seluruh unit usaha (Resto & Tiket)</h6>
            </div>
            <div className="page-btn d-flex align-items-center gap-2">
               <RangePicker 
                 value={dateRange} 
                 onChange={(dates) => { if(dates) setDateRange(dates) }}
                 format="DD MMM YYYY"
                 allowClear={false}
                 style={{ width: '250px', height: '40px', borderRadius: '5px' }}
               />
               <button onClick={fetchDashboardData} className="btn btn-added d-flex align-items-center justify-content-center" style={{ height: '40px', padding: '0 20px', margin: 0 }}>
                 Muat Ulang
               </button>
            </div>
          </div>

          {/* Top Metrics Row */}
          <div className="row">
            {/* Card 1: Pendapatan Hari Ini (Orange) */}
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card w-100 text-white" style={{ backgroundColor: '#ff9f43', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px 0 rgba(255, 159, 67, 0.2)' }}>
                <div className="card-body d-flex align-items-center p-3">
                  <div className="me-3 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#fff', width: '48px', height: '48px', borderRadius: '10px' }}>
                    <ImageWithBasePath src="assets/img/icons/dash1.svg" alt="img" style={{ filter: 'brightness(0) saturate(100%) invert(64%) sepia(51%) saturate(2462%) hue-rotate(345deg) brightness(101%) contrast(104%)' }} />
                  </div>
                  <div>
                    <h6 className="mb-1 text-white" style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9 }}>Pendapatan Hari Ini</h6>
                    <div className="d-flex align-items-center">
                      <h4 className="mb-0 text-white fw-bold me-2">Rp <CountUp start={0} end={metrics.todayRevenue} duration={1} separator="." /></h4>
                      <span className="badge bg-white" style={{ color: '#ff9f43' }}>Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Pendapatan Bulan Ini (Navy Blue) */}
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card w-100 text-white" style={{ backgroundColor: '#102a43', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px 0 rgba(16, 42, 67, 0.2)' }}>
                <div className="card-body d-flex align-items-center p-3">
                  <div className="me-3 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#fff', width: '48px', height: '48px', borderRadius: '10px' }}>
                    <ImageWithBasePath src="assets/img/icons/dash2.svg" alt="img" style={{ filter: 'brightness(0) saturate(100%) invert(13%) sepia(18%) saturate(3501%) hue-rotate(185deg) brightness(97%) contrast(92%)' }} />
                  </div>
                  <div>
                    <h6 className="mb-1 text-white" style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9 }}>Pendapatan Periode Ini</h6>
                    <div className="d-flex align-items-center">
                      <h4 className="mb-0 text-white fw-bold me-2">Rp <CountUp start={0} end={metrics.monthRevenue} duration={1} separator="." /></h4>
                      <span className="badge bg-white" style={{ color: '#102a43' }}>Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Pengunjung Hari Ini (Teal/Green) */}
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card w-100 text-white" style={{ backgroundColor: '#1abc9c', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px 0 rgba(26, 188, 156, 0.2)' }}>
                <div className="card-body d-flex align-items-center p-3">
                  <div className="me-3 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#fff', width: '48px', height: '48px', borderRadius: '10px' }}>
                    <ImageWithBasePath src="assets/img/icons/dash3.svg" alt="img" style={{ filter: 'brightness(0) saturate(100%) invert(67%) sepia(35%) saturate(5427%) hue-rotate(124deg) brightness(93%) contrast(85%)' }} />
                  </div>
                  <div>
                    <h6 className="mb-1 text-white" style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9 }}>Pengunjung Hari Ini</h6>
                    <div className="d-flex align-items-center">
                      <h4 className="mb-0 text-white fw-bold me-2"><CountUp start={0} end={metrics.todayVisitors} duration={1} /> Orang</h4>
                      <span className="badge bg-white" style={{ color: '#1abc9c' }}>Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Pesanan Resto (Blue) */}
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card w-100 text-white" style={{ backgroundColor: '#0d6efd', borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px 0 rgba(13, 110, 253, 0.2)' }}>
                <div className="card-body d-flex align-items-center p-3">
                  <div className="me-3 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#fff', width: '48px', height: '48px', borderRadius: '10px' }}>
                    <ImageWithBasePath src="assets/img/icons/dash4.svg" alt="img" style={{ filter: 'brightness(0) saturate(100%) invert(32%) sepia(76%) saturate(2222%) hue-rotate(209deg) brightness(101%) contrast(106%)' }} />
                  </div>
                  <div>
                    <h6 className="mb-1 text-white" style={{ fontSize: '13px', fontWeight: '500', opacity: 0.9 }}>Pesanan Resto Hari Ini</h6>
                    <div className="d-flex align-items-center">
                      <h4 className="mb-0 text-white fw-bold me-2"><CountUp start={0} end={metrics.todayRestoOrders} duration={1} /> Nota</h4>
                      <span className="badge bg-white" style={{ color: '#0d6efd' }}>Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Charts Row (Full Width Bulan Ini) */}
          <div className="row">
            <div className="col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Penjualan Periode Ini</h5>
                  <button className="btn btn-sm text-success fw-bold" style={{ border: 'none', background: 'transparent' }}>
                    ↓ Download
                  </button>
                </div>
                <div className="card-body">
                  {loading ? <div className="text-center p-5">Memuat Grafik...</div> : 
                    <Chart options={lineChartSalesOptions} series={[{name: 'Penjualan', data: monthData.salesSeries}]} type="area" height={320} />
                  }
                </div>
              </div>
            </div>
          </div>
          
          <div className="row">
            <div className="col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Jumlah Transaksi Periode Ini</h5>
                  <button className="btn btn-sm text-success fw-bold" style={{ border: 'none', background: 'transparent' }}>
                    ↓ Download
                  </button>
                </div>
                <div className="card-body">
                  {loading ? <div className="text-center p-5">Memuat Grafik...</div> : 
                    <Chart options={lineChartCountOptions} series={[{name: 'Total Transaksi', data: monthData.transactionCountSeries}]} type="area" height={320} />
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Donut Charts Row */}
          <div className="row">
            <div className="col-xl-6 col-sm-12 col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Komposisi Pendapatan (Periode Ini)</h5>
                </div>
                <div className="card-body d-flex align-items-center justify-content-center">
                  {loading ? <div className="text-center p-5">Memuat Grafik...</div> :
                    donutData.series.length > 0 ? (
                      <Chart options={donutChartOptions} series={donutData.series} type="donut" height={320} />
                    ) : (
                      <div className="text-muted">Belum ada data pendapatan di periode ini</div>
                    )
                  }
                </div>
              </div>
            </div>

            <div className="col-xl-6 col-sm-12 col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Metode Pembayaran (Periode Ini)</h5>
                </div>
                <div className="card-body d-flex align-items-center justify-content-center">
                  {loading ? <div className="text-center p-5">Memuat Grafik...</div> :
                    paymentData.series.length > 0 ? (
                      <Chart options={paymentChartOptions} series={paymentData.series} type="donut" height={320} />
                    ) : (
                      <div className="text-muted">Belum ada data transaksi di periode ini</div>
                    )
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="row">
            <div className="col-xl-7 col-sm-12 col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Transaksi Terbaru</h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    {loading ? (
                      <div className="text-center p-3">Memuat...</div>
                    ) : (
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Waktu</th>
                            <th>Cabang</th>
                            <th>Kasir</th>
                            <th>Total</th>
                            <th>Metode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentTransactions.length === 0 ? (
                            <tr><td colSpan="5" className="text-center">Belum ada transaksi</td></tr>
                          ) : recentTransactions.map((trx) => (
                            <tr key={trx.id}>
                              <td>{formatTime(trx.created_at)}</td>
                              <td>{trx.branches?.name || '-'}</td>
                              <td>{trx.cashier_name || 'Admin'}</td>
                              <td>Rp {trx.total_amount?.toLocaleString('id-ID')}</td>
                              <td>
                                <span className={"badges " + (trx.payment_method === 'qris' ? 'bg-lightgreen' : 'bg-lightred')}>
                                  {trx.payment_method?.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-5 col-sm-12 col-12 d-flex">
              <div className="card flex-fill">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Menu Paling Laris</h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nama Menu</th>
                          <th>Terjual</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td>Nasi Goreng Spesial</td><td style={{fontWeight: 'bold', color: '#28C76F'}}>Data Dummy</td></tr>
                        <tr><td>Es Teh Manis</td><td style={{fontWeight: 'bold', color: '#28C76F'}}>Data Dummy</td></tr>
                        <tr><td>Tiket Anak Umbul</td><td style={{fontWeight: 'bold', color: '#28C76F'}}>Data Dummy</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
