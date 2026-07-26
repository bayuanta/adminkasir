import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, DollarSign } from "feather-icons-react/build/IconComponents";
import Table from "../../core/pagination/datatable";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";

const ExpenseReport = () => {
  const { selectedStore } = useContext(StoreContext);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalExpenseAmount, setTotalExpenseAmount] = useState(0);

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('expenses')
        .select(`
          id,
          category,
          description,
          amount,
          created_at,
          branch_id,
          branches (name)
        `)
        .order('created_at', { ascending: false });

      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching expenses:", error);
      } else {
        let total = 0;
        const processed = (data || []).map((exp) => {
          const d = new Date(exp.created_at);
          exp.formattedDate = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
          exp.formattedTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          total += (exp.amount || 0);
          return exp;
        });

        setExpenses(processed);
        setTotalExpenseAmount(total);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Kategori Pengeluaran",
      dataIndex: "category",
      render: (text) => <span className="badge bg-light text-danger border">{text || 'Operasional'}</span>,
      sorter: (a, b) => (a.category || "").localeCompare(b.category || ""),
    },
    {
      title: "Keterangan / Deskripsi",
      dataIndex: "description",
      render: (text) => text || '-',
    },
    {
      title: "Loket / Cabang",
      dataIndex: "branches",
      render: (text, record) => record.branches?.name || 'Semua Cabang / Pusat',
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
      title: "Jumlah Pengeluaran",
      dataIndex: "amount",
      render: (text) => (
        <span className="fw-bold text-danger">
          Rp {(text || 0).toLocaleString('id-ID')}
        </span>
      ),
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Laporan Pengeluaran Operasional</h4>
              <h6>Kelola dan audit riwayat pengeluaran kasir & operasional unit</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <Link to="#" onClick={(e) => { e.preventDefault(); fetchExpenses(); }} title="Refresh Data">
                <RotateCcw />
              </Link>
            </li>
          </ul>
        </div>

        {/* Summary Banner */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card bg-danger text-white shadow-sm border-0">
              <div className="card-body d-flex align-items-center">
                <div className="me-3 p-3 bg-white bg-opacity-25 rounded-circle">
                  <DollarSign size={28} />
                </div>
                <div>
                  <h6 className="text-white-50 mb-1">Total Biaya Pengeluaran</h6>
                  <h3 className="text-white fw-bold mb-0">Rp {totalExpenseAmount.toLocaleString('id-ID')}</h3>
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
                  <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h6 className="mt-3">Mengambil data pengeluaran...</h6>
                </div>
              ) : (
                <Table columns={columns} dataSource={expenses} />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExpenseReport;
