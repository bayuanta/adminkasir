import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, RotateCcw, Edit, Trash2, X } from "feather-icons-react/build/IconComponents";
import Table from "../../core/pagination/datatable";
import { supabase } from "../../supabaseClient";

const Users = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

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
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "kasir",
      branch_id: branches[0]?.id || ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setIsEditMode(true);
    setEditingId(record.id);
    setFormData({
      name: record.name || "",
      email: record.email || "",
      password: "", // Kosongkan password saat edit, diisi hanya jika ingin diubah
      role: record.role || "kasir",
      branch_id: record.branch_id || (branches[0]?.id || "")
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      alert("Nama kasir/pegawai wajib diisi!");
      return;
    }

    if (!isEditMode && (!formData.email || !formData.password)) {
      alert("Email dan Password wajib diisi untuk membuat akun login baru!");
      return;
    }

    if (!isEditMode && formData.password.length < 6) {
      alert("Password minimal 6 karakter!");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        // UPDATE AKUN
        const { error } = await supabase
          .from('employees')
          .update({
            name: formData.name,
            email: formData.email.trim(),
            role: formData.role,
            branch_id: formData.branch_id || null
          })
          .eq('id', editingId);

        if (error) throw error;
        alert("Data kasir berhasil diperbarui!");
      } else {
        // BUAT AKUN BARU
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
        alert(`Akun Kasir ${formData.name} berhasil dibuat!`);
      }

      closeModal();
      fetchEmployees();
    } catch (err) {
      alert("Gagal menyimpan data kasir: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus akun kasir "${record.name}"?`)) {
      try {
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', record.id);

        if (error) throw error;

        alert("Akun kasir berhasil dihapus!");
        fetchEmployees();
      } catch (err) {
        alert("Gagal menghapus kasir: " + err.message);
      }
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
    {
      title: "Aksi",
      dataIndex: "action",
      render: (text, record) => (
        <div className="action-table-data d-flex align-items-center">
          <button
            className="btn btn-sm btn-outline-primary me-2 d-flex align-items-center"
            onClick={() => openEditModal(record)}
            title="Edit Kasir"
          >
            <Edit className="iconsize me-1" style={{ width: 14, height: 14 }} />
            Edit
          </button>

          <button
            className="btn btn-sm btn-outline-danger d-flex align-items-center"
            onClick={() => handleDelete(record)}
            title="Hapus Kasir"
          >
            <Trash2 className="iconsize me-1" style={{ width: 14, height: 14 }} />
            Hapus
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Manajemen Pengguna & Akun Kasir</h4>
              <h6>Kelola akun login kasir & pegawai (Tambah, Edit, dan Hapus)</h6>
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
            <button className="btn btn-added" onClick={openAddModal}>
              <PlusCircle className="me-2 iconsize" />
              Tambah Akun Kasir
            </button>
          </div>
        </div>

        {/* Tabel Pegawai & Kasir */}
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

        {/* Modal Pop Up Add / Edit Kasir */}
        {isModalOpen && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title text-white">
                    {isEditMode ? "Edit Data Kasir / Pegawai" : "Tambah Akun Kasir Baru"}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Nama Lengkap <span className="text-danger">*</span></label>
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

                      {!isEditMode && (
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
                      )}

                      <div className={isEditMode ? "col-md-6 mb-3" : "col-md-4 mb-3"}>
                        <label className="form-label">Peran (Role) <span className="text-danger">*</span></label>
                        <select className="form-select" name="role" value={formData.role} onChange={handleChange} required>
                          <option value="kasir">Kasir POS</option>
                          <option value="admin">Admin Utama</option>
                          <option value="manager">Manager Unit</option>
                        </select>
                      </div>

                      <div className={isEditMode ? "col-md-6 mb-3" : "col-md-4 mb-3"}>
                        <label className="form-label">Penempatan Cabang</label>
                        <select className="form-select" name="branch_id" value={formData.branch_id} onChange={handleChange}>
                          <option value="">-- Semua Cabang / Pusat --</option>
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      <X className="me-1 iconsize" /> Batal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? "Memproses..." : isEditMode ? "Simpan Perubahan" : "Buat Akun Kasir"}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Users;
