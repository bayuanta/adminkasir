import React from "react";
import { Link } from "react-router-dom";
import { PlusCircle, RotateCcw } from "feather-icons-react/build/IconComponents";
import Table from "../../core/pagination/datatable";

const CategoryList = () => {
  // Untuk BUMDes POS, kategori bersifat statis/fixed agar pembukuan seragam.
  const categories = [
    { id: 1, name: "Makanan", code: "makanan", description: "Semua jenis makanan berat dan ringan", status: "Aktif" },
    { id: 2, name: "Minuman", code: "minuman", description: "Semua jenis minuman", status: "Aktif" },
    { id: 3, name: "Tiket Dewasa", code: "tiket_dewasa", description: "Tiket masuk khusus orang dewasa", status: "Aktif" },
    { id: 4, name: "Tiket Anak", code: "tiket_anak", description: "Tiket masuk khusus anak-anak", status: "Aktif" },
    { id: 5, name: "Snack", code: "snack", description: "Makanan ringan kemasan", status: "Aktif" }
  ];

  const columns = [
    {
      title: "Nama Kategori",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Kode Sistem",
      dataIndex: "code",
      render: (text) => <span>{text}</span>,
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: "Deskripsi",
      dataIndex: "description",
      sorter: (a, b) => a.description.localeCompare(b.description),
    },
    {
      title: "Status",
      render: () => (
        <span>Aktif</span>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Daftar Kategori</h4>
              <h6>Kelola kategori produk dan tiket Anda</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <Link to="#" data-bs-toggle="tooltip" title="Refresh Data">
                <RotateCcw />
              </Link>
            </li>
          </ul>
          <div className="page-btn">
            {/* Tombol dimatikan sementara karena kategori bersifat fixed */}
            <Link to="#" className="btn btn-added" onClick={(e) => {
              e.preventDefault();
              alert("Untuk menjaga konsistensi laporan BUMDes, penambahan kategori baru harus melalui persetujuan Super Admin.");
            }}>
              <PlusCircle className="me-2 iconsize" />
              Tambah Kategori
            </Link>
          </div>
        </div>
        <div className="card table-list-card">
          <div className="card-body">
            <div className="table-responsive">
              <Table columns={columns} dataSource={categories} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryList;
