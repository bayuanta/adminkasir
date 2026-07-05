import React, { useState, useEffect, useContext } from "react";
import { Table, Modal, Select, Input, Button, Space, Popconfirm, Switch, Tag } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import * as Icon from 'react-feather';

const COAList = () => {
  const { selectedStore } = useContext(StoreContext);
  const [coaData, setCoaData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCoa, setSelectedCoa] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("Asset");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchCOA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchCOA = async () => {
    setLoading(true);
    try {
      // Ambil COA khusus cabang ini ATAU COA default (branch_id is null)
      let query = supabase.from('coa').select('*').order('account_code', { ascending: true });
      
      if (selectedStore) {
        query = query.or(`branch_id.eq.${selectedStore},branch_id.is.null`);
      } else {
        query = query.is('branch_id', null);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching COA:", error);
        setCoaData([]);
      } else {
        setCoaData(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedCoa(null);
    setAccountCode("");
    setAccountName("");
    setAccountType("Asset");
    setIsActive(true);
    setIsModalVisible(true);
  };

  const openEditModal = (record) => {
    setIsEditMode(true);
    setSelectedCoa(record);
    setAccountCode(record.account_code || "");
    setAccountName(record.account_name || "");
    setAccountType(record.account_type || "Asset");
    setIsActive(record.is_active !== false); // default true if undefined
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('coa').delete().eq('id', id);
      if (error) throw error;
      fetchCOA();
    } catch (err) {
      console.error("Error deleting:", err);
      alert(`Gagal menghapus data.\n\nPesan Error: ${err.message || 'Unknown Error'}`);
    }
  };

  const handleSave = async () => {
    if (!accountCode.trim()) return alert("Kode akun wajib diisi.");
    if (!accountName.trim()) return alert("Nama akun wajib diisi.");

    setSubmitting(true);
    const payload = {
      account_code: accountCode,
      account_name: accountName,
      account_type: accountType,
      is_active: isActive,
      branch_id: selectedStore || null
    };

    try {
      if (isEditMode && selectedCoa) {
        const { error } = await supabase.from('coa').update(payload).eq('id', selectedCoa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('coa').insert([payload]);
        if (error) throw error;
      }
      setIsModalVisible(false);
      fetchCOA();
    } catch (err) {
      console.error("Error saving COA:", err);
      alert(`Gagal menyimpan data!\n\nPesan Error: ${err.message || err.details || err.hint || 'Terjadi kesalahan'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountTypeColor = (type) => {
    switch(type) {
      case 'Asset': return 'blue';
      case 'Liability': return 'volcano';
      case 'Equity': return 'purple';
      case 'Revenue': return 'green';
      case 'Expense': return 'orange';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Kode Akun',
      dataIndex: 'account_code',
      key: 'account_code',
      render: (text) => <span className="fw-bold">{text}</span>
    },
    {
      title: 'Nama Akun',
      dataIndex: 'account_name',
      key: 'account_name',
    },
    {
      title: 'Kategori',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (type) => (
        <Tag color={getAccountTypeColor(type)}>{type}</Tag>
      )
    },
    {
      title: 'Tipe Cabang',
      dataIndex: 'branch_id',
      key: 'branch_id',
      render: (val) => (
         val ? <span className="badge bg-primary text-white">Cabang Ini</span> : <span className="badge bg-secondary text-white">Global/Pusat</span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive) => (
         isActive ? <span className="badge bg-success text-white border">Aktif</span> : <span className="badge bg-danger text-white border">Nonaktif</span>
      )
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" className="text-primary p-0" onClick={() => openEditModal(record)}>
            <Icon.Edit size={16} />
          </Button>
          <Popconfirm title="Hapus akun COA ini?" onConfirm={() => handleDelete(record.id)} okText="Ya" cancelText="Batal">
            <Button type="text" className="text-danger p-0">
              <Icon.Trash2 size={16} />
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="row align-items-center w-100">
            <div className="col-lg-10 col-sm-12">
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Chart of Accounts (Buku Besar)</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Kelola daftar akun standar (Aset, Kewajiban, Ekuitas, Pendapatan, Beban)</h6>
            </div>
            <div className="col-lg-2 col-sm-12 d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center p-2" onClick={fetchCOA}>
                <Icon.RefreshCcw size={16}/>
              </button>
              <button className="btn text-white fw-bold d-flex align-items-center justify-content-center gap-2" style={{background: '#ff9f43', borderRadius: '6px'}} onClick={openAddModal}>
                <Icon.PlusCircle size={16} />
                Tambah Akun
              </button>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-12">
            <div className="card bg-white shadow-sm border-0" style={{borderRadius: '8px'}}>
              <div className="card-body">
                <Table 
                  columns={columns} 
                  dataSource={coaData} 
                  rowKey="id" 
                  loading={loading}
                  pagination={{ pageSize: 15 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={<span className="fw-bold" style={{fontSize: '18px'}}>{isEditMode ? "Ubah Data Akun COA" : "Tambah Akun COA Baru"}</span>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        closeIcon={<div style={{background: '#ea5455', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><i className="fas fa-times" style={{fontSize: '12px'}}/></div>}
      >
        <div className="row mt-4">
          <div className="col-lg-12 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Kategori Akun <span className="text-danger">*</span></label>
            <Select
              className="w-100"
              value={accountType}
              onChange={setAccountType}
              options={[
                { value: 'Asset', label: 'Asset (Harta)' },
                { value: 'Liability', label: 'Liability (Kewajiban/Hutang)' },
                { value: 'Equity', label: 'Equity (Modal)' },
                { value: 'Revenue', label: 'Revenue (Pendapatan)' },
                { value: 'Expense', label: 'Expense (Beban/Pengeluaran)' },
              ]}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6 mb-4">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Kode Akun <span className="text-danger">*</span></label>
            <Input 
              className="form-control" 
              value={accountCode}
              onChange={(e) => setAccountCode(e.target.value)}
              placeholder="Contoh: 1-1000"
            />
          </div>
          <div className="col-lg-6 mb-4">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Nama Akun <span className="text-danger">*</span></label>
            <Input 
              className="form-control" 
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Contoh: Kas Utama"
            />
          </div>
        </div>
        
        <div className="row">
           <div className="col-12 mb-4 d-flex align-items-center gap-2">
             <Switch checked={isActive} onChange={setIsActive} />
             <span style={{fontSize: '13px', color: '#555'}}>Akun Aktif</span>
           </div>
        </div>

        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <button className="btn text-white fw-bold" style={{background: '#0f2650', padding: '8px 24px'}} onClick={() => setIsModalVisible(false)} disabled={submitting}>
            Batal
          </button>
          <button className="btn text-white fw-bold" style={{background: '#ff9f43', padding: '8px 24px'}} onClick={handleSave} disabled={submitting}>
            {submitting ? "Menyimpan..." : (isEditMode ? "Simpan Perubahan" : "Simpan Akun")}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default COAList;
