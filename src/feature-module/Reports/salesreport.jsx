import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, DollarSign, ShoppingBag } from "feather-icons-react/build/IconComponents";
import Table from "../../core/pagination/datatable";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";

const SalesReport = () => {
  const { selectedStore } = useContext(StoreContext);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState({
    totalOmset: 0,
    totalTrxCount: 0,
    totalItemsSold: 0
  });

  useEffect(() => {
    fetchSalesReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchSalesReport = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select(`
          id,
          total_amount,
          subtotal_amount,
          discount_amount,
          payment_method,
          cashier_name,
          customer_name,
          created_at,
          branch_id,
          branches (name),
          transaction_items (
            quantity,
            price_at_time,
            subtotal,
            products (name, category)
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching sales report:", error);
      } else {
        let totalRev = 0;
        let totalItems = 0;

        const processed = (data || []).map((trx) => {
          const d = new Date(trx.created_at);
          trx.formattedDate = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
          trx.formattedTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          trx.displayId = trx.id.slice(0, 8).toUpperCase();

          const itemsCount = (trx.transaction_items || []).reduce((acc, item) => acc + (item.quantity || 1), 0);
          totalItems += itemsCount;
          trx.itemsCount = itemsCount;

          const itemNames = (trx.transaction_items || []).map(i => {
            const pName = i.products?.name || 'Produk';
            return `${pName} (x${i.quantity || 1})`;
          }).join(', ');
          trx.itemsSummary = itemNames || 'Penjualan Kasir POS';

          totalRev += (trx.total_amount || 0);
          return trx;
        });

        setReportData(processed);
        setSummaryStats({
          totalOmset: totalRev,
          totalTrxCount: processed.length,
          totalItemsSold: totalItems
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "ID Transaksi",
      dataIndex: "displayId",
      render: (text) => <span className="fw-bold text-primary">#{text}</span>,
      sorter: (a, b) => (a.displayId || "").localeCompare(b.displayId || ""),
    },
    {
      title: "Tanggal & Waktu",
      dataIndex: "formattedDate",
      render: (text, record) => (
        <div>
          <div>{record.formattedDate}</div>
          <small className="text-muted">{record.formattedTime}</small>
        </div>
      ),
    },
    {
      title: "Loket / Cabang",
      dataIndex: "branches",
      render: (text, record) => (
        <span className="badge bg-light text-primary border">
          {record.branches?.name || 'Semua Cabang / Pusat'}
        </span>
      ),
    },
    {
      title: "Kasir",
      dataIndex: "cashier_name",
      render: (text) => text || 'Kasir',
    },
    {
      title: "Pelanggan",
      dataIndex: "customer_name",
      render: (text) => text || 'Pelanggan Umum',
    },
    {
      title: "Item Dibeli",
      dataIndex: "itemsSummary",
      render: (text) => <span className="fw-semibold text-dark">{text}</span>,
    },
    {
      title: "Metode",
      dataIndex: "payment_method",
      render: (text) => (
        <span className={`badges ${text === 'cash' ? 'bg-lightgreen' : 'bg-lightblue'}`}>
          {(text || 'cash').toUpperCase()}
        </span>
      ),
    },
    {
      title: "Total Omset",
      dataIndex: "total_amount",
      render: (text) => (
        <span className="fw-bold text-success">
          Rp {(text || 0).toLocaleString('id-ID')}
        </span>
      ),
      sorter: (a, b) => (a.total_amount || 0) - (b.total_amount || 0),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Laporan Ringkasan Penjualan</h4>
              <h6>Audit lengkap transaksi penjualan & omset dari aplikasi kasir</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <Link to="#" onClick={(e) => { e.preventDefault(); fetchSalesReport(); }} title="Refresh Data">
                <RotateCcw />
              </Link>
            </li>
          </ul>
        </div>

        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card bg-success text-white shadow-sm border-0">
              <div className="card-body d-flex align-items-center">
                <div className="me-3 p-3 bg-white bg-opacity-25 rounded-circle">
                  <DollarSign size={28} />
                </div>
                <div>
                  <h6 className="text-white-50 mb-1">Total Omset Penjualan</h6>
                  <h3 className="text-white fw-bold mb-0">Rp {summaryStats.totalOmset.toLocaleString('id-ID')}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card bg-primary text-white shadow-sm border-0">
              <div className="card-body d-flex align-items-center">
                <div className="me-3 p-3 bg-white bg-opacity-25 rounded-circle">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h6 className="text-white-50 mb-1">Total Transaksi Selesai</h6>
                  <h3 className="text-white fw-bold mb-0">{summaryStats.totalTrxCount} Nota</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card bg-info text-white shadow-sm border-0">
              <div className="card-body d-flex align-items-center">
                <div className="me-3 p-3 bg-white bg-opacity-25 rounded-circle">
                  <ShoppingBag size={28} />
                </div>
                <div>
                  <h6 className="text-white-50 mb-1">Total Produk/Tiket Terjual</h6>
                  <h3 className="text-white fw-bold mb-0">{summaryStats.totalItemsSold} Item</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="card table-list-card">
          <div className="card-body">
            <div className="table-responsive">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h6 className="mt-3">Mengambil data laporan penjualan...</h6>
                </div>
              ) : (
                <Table columns={columns} dataSource={reportData} />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SalesReport;
