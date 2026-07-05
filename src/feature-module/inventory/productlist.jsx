import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { PlusCircle, RotateCcw } from "feather-icons-react/build/IconComponents";
import Table from "../../core/pagination/datatable";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";

const ProductList = () => {
  const { selectedStore } = useContext(StoreContext);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [selectedStore]);

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
      title: "Nama Produk / Tiket",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Kategori",
      dataIndex: "category",
      render: (text) => {
        let badgeColor = "bg-lightyellow";
        if (text === "makanan") badgeColor = "bg-lightgreen";
        if (text === "minuman") badgeColor = "bg-lightblue";
        if (text.includes("tiket")) badgeColor = "bg-lightred";
        return <span className={`badges ${badgeColor}`}>{text.toUpperCase()}</span>;
      },
      sorter: (a, b) => a.category.localeCompare(b.category),
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
  ];

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
            <li>
              <Link to="#" onClick={(e) => { e.preventDefault(); fetchProducts(); }} data-bs-toggle="tooltip" title="Refresh Data">
                <RotateCcw />
              </Link>
            </li>
          </ul>
          <div className="page-btn">
            <Link to="/add-product" className="btn btn-added">
              <PlusCircle className="me-2 iconsize" />
              Tambah Produk
            </Link>
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
                <Table columns={columns} dataSource={products} />
              )}
            </div>
          </div>
        </div>
        {/* /product list */}
      </div>
    </div>
  );
};

export default ProductList;
