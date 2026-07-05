import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "feather-icons-react/build/IconComponents";
import { supabase } from "../../supabaseClient";

const AddProduct = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "makanan",
    price: "",
    branch_id: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data, error } = await supabase.from('branches').select('id, name');
    if (!error && data) {
      setBranches(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, branch_id: data[0].id }));
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('products')
        .insert([
          {
            name: formData.name,
            category: formData.category,
            price: parseInt(formData.price),
            branch_id: formData.branch_id
          }
        ]);
        
      if (error) throw error;
      
      alert("Produk berhasil ditambahkan!");
      navigate("/product-list"); // Redirect back to product list
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan produk: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Tambah Produk / Tiket Baru</h4>
              <h6>Buat menu baru atau tiket baru ke dalam sistem</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <div className="page-btn">
                <Link to="/product-list" className="btn btn-secondary">
                  <ArrowLeft className="me-2" />
                  Kembali
                </Link>
              </div>
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-body add-product pb-0">
              <div className="accordion-card-one accordion" id="accordionExample">
                <div className="accordion-item">
                  <div className="accordion-header" id="headingOne">
                    <div className="accordion-button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-controls="collapseOne">
                      <div className="addproduct-icon">
                        <h5><i data-feather="info" className="add-info" />Informasi Dasar</h5>
                      </div>
                    </div>
                  </div>
                  <div id="collapseOne" className="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
                    <div className="accordion-body">
                      <div className="row">
                        <div className="col-lg-4 col-sm-6 col-12">
                          <div className="mb-3 add-product">
                            <label className="form-label">Nama Menu / Tiket <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} required placeholder="Contoh: Nasi Goreng Spesial" />
                          </div>
                        </div>
                        <div className="col-lg-4 col-sm-6 col-12">
                          <div className="mb-3 add-product">
                            <label className="form-label">Kategori <span className="text-danger">*</span></label>
                            <select className="form-select" name="category" value={formData.category} onChange={handleChange} required>
                              <option value="makanan">Makanan</option>
                              <option value="minuman">Minuman</option>
                              <option value="tiket_dewasa">Tiket Dewasa</option>
                              <option value="tiket_anak">Tiket Anak</option>
                              <option value="snack">Snack</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="row">
                        <div className="col-lg-4 col-sm-6 col-12">
                          <div className="mb-3 add-product">
                            <label className="form-label">Harga (Rp) <span className="text-danger">*</span></label>
                            <input type="number" className="form-control" name="price" value={formData.price} onChange={handleChange} required placeholder="Contoh: 15000" />
                          </div>
                        </div>
                        <div className="col-lg-4 col-sm-6 col-12">
                          <div className="mb-3 add-product">
                            <label className="form-label">Tersedia di Cabang <span className="text-danger">*</span></label>
                            <select className="form-select" name="branch_id" value={formData.branch_id} onChange={handleChange} required>
                              {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-12">
            <div className="btn-addproduct mb-4">
              <button type="button" className="btn btn-cancel me-2" onClick={() => navigate('/product-list')}>Batal</button>
              <button type="submit" className="btn btn-submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Produk"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;
