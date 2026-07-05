import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, RotateCcw } from "feather-icons-react/build/IconComponents";
import Table from "../../core/pagination/datatable";
import { supabase } from "../../supabaseClient";

const Users = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({ name: "", role: "kasir", branch_id: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select(`
          id,
          name,
          role,
          status,
          branch_id,
          branches (name)
        `);
      
      if (error) {
        console.error("Error fetching employees:", error);
      } else {
        setEmployees(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('id, name');
    if (data && data.length > 0) {
      setBranches(data);
      setFormData(prev => ({ ...prev, branch_id: data[0].id }));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('employees')
        .insert([{
          name: formData.name,
          role: formData.role,
          branch_id: formData.branch_id
        }]);
        
      if (error) throw error;
      
      alert("Pegawai/Kasir berhasil ditambahkan!");
      setShowForm(false);
      setFormData({ ...formData, name: "" }); // reset nama saja
      fetchEmployees();
    } catch (err) {
      alert("Gagal menyimpan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Nama Lengkap",
      dataIndex: "name",
      sorter: (a, b) => (a.name || "").localeCompare(b.name || ""),
    },
    {
      title: "Peran (Role)",
      dataIndex: "role",
      render: (text) => {
        const r = (text || '').toLowerCase();
        return <span className={`badges ${r === 'admin' ? 'bg-lightred' : 'bg-lightblue'}`}>{r.toUpperCase()}</span>;
      },
      sorter: (a, b) => (a.role || "").localeCompare(b.role || ""),
    },
    {
      title: "Bertugas di Cabang",
      dataIndex: "branches",
      render: (text, record) => record.branches?.name || "Semua Cabang / Pusat",
    },
    {
      title: "Status",
      dataIndex: "status",
      render: () => <span className="badges bg-lightgreen">Aktif</span>,
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Manajemen Pengguna & Kasir</h4>
              <h6>Kelola akun pegawai yang bertugas di masing-masing unit</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <Link to="#" onClick={(e) => { e.preventDefault(); fetchEmployees(); }} data-bs-toggle="tooltip" title="Refresh Data">
                <RotateCcw />
              </Link>
            </li>
          </ul>
          <div className="page-btn">
            <button className="btn btn-added" onClick={() => setShowForm(!showForm)}>
              <PlusCircle className="me-2 iconsize" />
              {showForm ? "Tutup Form" : "Tambah Kasir"}
            </button>
          </div>
        </div>

        {/* Form Tambah Pegawai (Inline) */}
        {showForm && (
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Tambah Pegawai Baru</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Nama Pegawai <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Peran <span className="text-danger">*</span></label>
                    <select className="form-select" name="role" value={formData.role} onChange={handleChange} required>
                      <option value="kasir">Kasir</option>
                      <option value="admin">Admin Pusat</option>
                      <option value="manager">Manager Unit</option>
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Penempatan Cabang <span className="text-danger">*</span></label>
                    <select className="form-select" name="branch_id" value={formData.branch_id} onChange={handleChange}>
                      <option value="">-- Pilih Cabang --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-end">
                  <button type="submit" className="btn btn-submit" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "Simpan Pegawai"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tabel Pegawai */}
        <div className="card table-list-card">
          <div className="card-body">
            <div className="table-responsive">
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h6 className="mt-3">Mengambil data dari Supabase...</h6>
                </div>
              ) : (
                <Table columns={columns} dataSource={employees} />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Users;
