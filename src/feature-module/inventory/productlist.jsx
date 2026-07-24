import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, RotateCcw, Edit, Trash2 } from "feather-icons-react/build/IconComponents";
import { Popconfirm, message, Select, Modal, Form, Input, InputNumber, Upload } from "antd";
const { Option } = Select;
import Table from "../../core/pagination/datatable";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";

const ProductList = () => {
  const { selectedStore } = useContext(StoreContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [branches, setBranches] = useState([]);
  const [form] = Form.useForm();
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('id, name');
    if (data) setBranches(data);
  };

  const handleAddClick = () => {
    setEditingProduct(null);
    setImageFile(null);
    setPreviewImage("");
    form.resetFields();
    if (branches.length > 0) {
      form.setFieldsValue({ branch_id: branches[0].id });
    }
    setIsModalVisible(true);
  };

  const handleEditClick = (record) => {
    setEditingProduct(record);
    setImageFile(null);
    setPreviewImage(record.image_url || "");
    form.setFieldsValue({
      name: record.name,
      category: record.category,
      price: record.price,
      sku: record.sku,
      branch_id: record.branch_id
    });
    setIsModalVisible(true);
  };

  const handleModalSubmit = async (values) => {
    setSubmitLoading(true);
    try {
      let uploadedImageUrl = previewImage;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) {
          throw new Error('Gagal mengunggah gambar. Pastikan bucket "product-images" sudah dibuat dan disetel public di Storage Supabase.');
        }

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedImageUrl = publicUrlData.publicUrl;
      }

      const payload = { ...values, image_url: uploadedImageUrl };

      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
        message.success('Produk berhasil diubah');
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        message.success('Produk berhasil ditambahkan');
      }
      setIsModalVisible(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Gagal menyimpan produk');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      message.success('Produk berhasil dihapus');
      fetchProducts();
    } catch (err) {
      console.error(err);
      message.error('Gagal menghapus produk');
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Fetch products and their related branch names
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          category,
          price,
          sku,
          image_url,
          branch_id,
          branches (
            name
          )
        `);

      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Foto",
      dataIndex: "image_url",
      render: (text, record) => (
        <img 
          src={record.image_url || "https://via.placeholder.com/40"} 
          alt={record.name} 
          style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eaeaea'}} 
        />
      )
    },
    {
      title: "Nama Produk / Tiket",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "SKU",
      dataIndex: "sku",
      render: (text, record) => record.sku || "-",
      sorter: (a, b) => (a.sku || "").localeCompare(b.sku || ""),
    },
    {
      title: "Kategori",
      dataIndex: "category",
      render: (text) => <span>{text ? text.replace(/_/g, ' ').toUpperCase() : "-"}</span>,
      sorter: (a, b) => (a.category || "").localeCompare(b.category || ""),
    },
    {
      title: "Harga",
      dataIndex: "price",
      render: (text, record) => `Rp ${record.price.toLocaleString('id-ID')}`,
      sorter: (a, b) => a.price - b.price,
    },
    {
      title: "Cabang / Lokasi",
      dataIndex: "branches",
      render: (text, record) => record.branches?.name || "Tidak ada cabang",
      sorter: (a, b) => (a.branches?.name || "").localeCompare(b.branches?.name || ""),
    },
    {
      title: "Status",
      render: () => (
        <span className="badges bg-lightgreen">Aktif</span>
      ),
    },
    {
      title: "Aksi",
      render: (_, record) => (
        <div className="d-flex align-items-center gap-2">
           <button onClick={() => handleEditClick(record)} className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center p-2" title="Edit">
             <Edit size={14} />
           </button>
           <Popconfirm title="Yakin ingin menghapus produk ini?" onConfirm={() => handleDelete(record.id)}>
             <button className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center p-2" title="Hapus">
               <Trash2 size={14} />
             </button>
           </Popconfirm>
        </div>
      )
    },
  ];

  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.category === selectedCategory);
  
  const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Daftar Menu & Tiket</h4>
              <h6>Kelola harga dan daftar produk Anda (Terkoneksi ke Supabase)</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li className="me-2">
              <Select 
                value={selectedCategory} 
                onChange={setSelectedCategory} 
                style={{ width: 160 }}
              >
                <Option value="all">Semua Kategori</Option>
                {uniqueCategories.map(cat => (
                  <Option key={cat} value={cat}>{cat.replace(/_/g, ' ').toUpperCase()}</Option>
                ))}
              </Select>
            </li>
            <li>
              <Link to="#" onClick={(e) => { e.preventDefault(); fetchProducts(); }} data-bs-toggle="tooltip" title="Refresh Data">
                <RotateCcw />
              </Link>
            </li>
          </ul>
          <div className="page-btn">
            <button onClick={handleAddClick} className="btn btn-added">
              <PlusCircle className="me-2 iconsize" />
              Tambah Produk
            </button>
          </div>
        </div>
        {/* product list */}
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
                <Table columns={columns} dataSource={filteredProducts} />
              )}
            </div>
          </div>
        </div>
        {/* /product list */}
      </div>

      <Modal
        title={editingProduct ? "Ubah Produk" : "Tambah Produk"}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleModalSubmit}>
          <div className="row mb-3">
            <div className="col-12">
              <label className="form-label d-block mb-2">Foto Produk / Tiket (Opsional)</label>
              <div className="d-flex align-items-center gap-3">
                {previewImage && (
                  <img src={previewImage} alt="Preview" style={{width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd'}} />
                )}
                <Upload
                  beforeUpload={(file) => {
                    const isImage = file.type.startsWith('image/');
                    if (!isImage) {
                      message.error('Hanya bisa mengunggah file gambar!');
                      return Upload.LIST_IGNORE;
                    }
                    setImageFile(file);
                    setPreviewImage(URL.createObjectURL(file));
                    return false;
                  }}
                  showUploadList={false}
                >
                  <button type="button" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2">
                    <i className="fas fa-upload"></i> Pilih Gambar
                  </button>
                </Upload>
              </div>
            </div>
          </div>

          <Form.Item label="Nama Produk / Tiket" name="name" rules={[{ required: true, message: 'Harap isi nama produk!' }]}>
            <Input placeholder="Contoh: Nasi Goreng Spesial" />
          </Form.Item>
          
          <div className="row">
            <div className="col-md-6">
              <Form.Item label="Kategori" name="category" rules={[{ required: true, message: 'Pilih kategori!' }]}>
                <Select>
                  <Option value="makanan">Makanan</Option>
                  <Option value="minuman">Minuman</Option>
                  <Option value="tiket_dewasa">Tiket Dewasa</Option>
                  <Option value="tiket_anak">Tiket Anak</Option>
                  <Option value="snack">Snack</Option>
                </Select>
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Harga (Rp)" name="price" rules={[{ required: true, message: 'Harap isi harga!' }]}>
                <InputNumber style={{ width: '100%' }} placeholder="Contoh: 15000" />
              </Form.Item>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <Form.Item label="SKU / Barcode" name="sku">
                <Input placeholder="Opsional" />
              </Form.Item>
            </div>
            <div className="col-md-6">
              <Form.Item label="Cabang / Lokasi" name="branch_id" rules={[{ required: true, message: 'Pilih cabang!' }]}>
                <Select>
                  {branches.map(b => (
                    <Option key={b.id} value={b.id}>{b.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setIsModalVisible(false)}>Batal</button>
            <button type="submit" className="btn btn-primary text-white" disabled={submitLoading}>
              {submitLoading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </Form>
      </Modal>

    </div>
  );
};

export default ProductList;
