import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, RotateCcw } from "feather-icons-react/build/IconComponents";
import Table from "../../../core/pagination/datatable";
import { supabase } from "../../../supabaseClient";

const GeneralSettings = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "resto" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*');
      
      if (error) {
        console.error("Error fetching branches:", error);
      } else {
        setBranches(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
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
        .from('branches')
        .insert([{
          name: formData.name,
          type: formData.type
        }]);
        
      if (error) throw error;
      
      alert("Cabang berhasil ditambahkan!");
      setShowForm(false);
      setFormData({ name: "", type: "resto" });
      fetchBranches();
    } catch (err) {
      alert("Gagal menyimpan cabang: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "Nama Cabang / Lokasi",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Tipe Cabang",
      dataIndex: "type",
      render: (text) => {
        let badgeColor = "bg-lightyellow";
        if (text === "resto") badgeColor = "bg-lightgreen";
        if (text === "ticket") badgeColor = "bg-lightblue";
        return <span className={`badges ${badgeColor}`}>{text.toUpperCase()}</span>;
      },
      sorter: (a, b) => a.type.localeCompare(b.type),
    },
    {
      title: "ID Database (UUID)",
      dataIndex: "id",
      render: (text) => <small className="text-muted">{text}</small>,
      sorter: (a, b) => a.id.localeCompare(b.id),
    },
    {
      title: "Status",
      render: () => (
        <span className="badges bg-lightgreen">Aktif</span>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Daftar Cabang & Lokasi</h4>
              <h6>Kelola lokasi Resto dan Loket Tiket Anda (Terkoneksi ke Supabase)</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <Link to="#" onClick={(e) => { e.preventDefault(); fetchBranches(); }} data-bs-toggle="tooltip" title="Refresh Data">
                <RotateCcw />
              </Link>
            </li>
          </ul>
          <div className="page-btn">
            <button className="btn btn-added" onClick={() => setShowForm(!showForm)}>
              <PlusCircle className="me-2 iconsize" />
              {showForm ? "Tutup Form" : "Tambah Cabang"}
            </button>
          </div>
        </div>

        {/* Form Tambah Cabang (Inline) */}
        {showForm && (
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Tambah Cabang Baru</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nama Cabang / Lokasi <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} required placeholder="Contoh: Resto Kolam Barat" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Tipe Unit Usaha <span className="text-danger">*</span></label>
                    <select className="form-select" name="type" value={formData.type} onChange={handleChange} required>
                      <option value="resto">Restoran / Kios Makanan</option>
                      <option value="ticket">Loket Tiket</option>
                    </select>
                  </div>
                </div>
                <div className="text-end">
                  <button type="submit" className="btn btn-submit" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "Simpan Cabang"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                <Table columns={columns} dataSource={branches} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
