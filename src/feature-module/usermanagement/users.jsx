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
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "kasir",
    branch_id: ""
  });
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
          email,
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

    if (!formData.email || !formData.password) {
      alert("Harap isi email dan password untuk akun login kasir!");
      return;
    }

    if (formData.password.length < 6) {
      alert("Password minimal harus 6 karakter!");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Buat Akun Auth di Supabase
      const { error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password.trim(),
        options: {
          data: {
            full_name: formData.name,
            role: formData.role,
          }
        }
      });

      if (authError && !authError.message.includes('already registered')) {
        console.warn("Auth Notice:", authError.message);
      }

      // 2. Simpan Data Pegawai/Kasir ke Tabel Employees & Users
      const { error: dbError } = await supabase
        .from('employees')
        .insert([{
          name: formData.name,
          email: formData.email.trim(),
          role: formData.role,
          branch_id: formData.branch_id || null,
          status: 'active'
        }]);
        
      if (dbError) throw dbError;
      
      alert(`Akun Kasir ${formData.name} berhasil dibuat!\nEmail: ${formData.email}\nPassword: ${formData.password}`);
      setShowForm(false);
      setFormData({ name: "", email: "", password: "", role: "kasir", branch_id: branches[0]?.id || "" });
      fetchEmployees();
    } catch (err) {
      alert("Gagal menyimpan akun kasir: " + err.message);
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
      title: "Email Akun Login",
      dataIndex: "email",
      render: (text) => text || <span className="text-muted">admin@poskasir.com</span>,
      sorter: (a, b) => (a.email || "").localeCompare(b.email || ""),
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
      title: "Status Akun",
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
              <h4>Manajemen Pengguna & Akun Kasir</h4>
              <h6>Buat dan kelola akun login kasir & pegawai yang bertugas di masing-masing unit</h6>
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
              {showForm ? "Tutup Form" : "Tambah Akun Kasir"}
            </button>
          </div>
        </div>

        {/* Form Tambah Pegawai & Akun Login (Inline) */}
        {showForm && (
          <div className="card mb-4 border-primary">
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0 text-white">Form Tambah Akun Kasir & Pegawai Baru</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nama Lengkap Kasir / Pegawai <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      placeholder="Contoh: Budi Santoso"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email Akun Login <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      placeholder="kasir1@dewaemas.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Password / Kata Sandi <span className="text-danger">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      placeholder="Minimal 6 karakter"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Peran (Role) <span className="text-danger">*</span></label>
                    <select className="form-select" name="role" value={formData.role} onChange={handleChange} required>
                      <option value="kasir">Kasir POS</option>
                      <option value="admin">Admin Utama</option>
                      <option value="manager">Manager Unit</option>
                    </select>
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Penempatan Cabang <span className="text-danger">*</span></label>
                    <select className="form-select" name="branch_id" value={formData.branch_id} onChange={handleChange}>
                      <option value="">-- Semua Cabang / Pusat --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-end mt-2">
                  <button type="button" className="btn btn-secondary me-2" onClick={() => setShowForm(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Membuat Akun Supabase..." : "Simpan & Buat Akun Login"}
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
                  <h6 className="mt-3">Mengambil data akun dari Supabase...</h6>
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
