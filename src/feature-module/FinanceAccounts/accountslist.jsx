import React, { useState, useEffect, useContext } from "react";
import { Table, Modal, Select, Input, InputNumber, Button, Space, Popconfirm } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import * as Icon from 'react-feather';

const AccountsList = () => {
  const { selectedStore } = useContext(StoreContext);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("Kas & Bank");
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('accounts').select('*').order('account_type', { ascending: true });
      
      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error("Error fetching accounts:", error);
        setAccounts([]);
      } else {
        setAccounts(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedAccount(null);
    setAccountName("");
    setAccountNumber("");
    setAccountType("Kas & Bank");
    setBalance(0);
    setIsModalVisible(true);
  };

  const openEditModal = (record) => {
    setIsEditMode(true);
    setSelectedAccount(record);
    setAccountName(record.account_name || "");
    setAccountNumber(record.account_number || "");
    setAccountType(record.account_type || "Kas & Bank");
    setBalance(record.balance || 0);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      fetchAccounts();
    } catch (err) {
      console.error("Error deleting:", err);
      alert(`Gagal menghapus data.\n\nPesan Error: ${err.message || 'Unknown Error'}`);
    }
  };

  const handleSave = async () => {
    if (!accountName.trim()) return alert("Nama akun wajib diisi.");

    setSubmitting(true);
    const payload = {
      account_name: accountName,
      account_number: accountNumber,
      account_type: accountType,
      balance: balance,
      branch_id: selectedStore || null
    };

    try {
      if (isEditMode && selectedAccount) {
        const { error } = await supabase.from('accounts').update(payload).eq('id', selectedAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('accounts').insert([payload]);
        if (error) throw error;
      }
      setIsModalVisible(false);
      fetchAccounts();
    } catch (err) {
      console.error("Error saving account:", err);
      alert(`Gagal menyimpan data!\n\nPesan Error: ${err.message || err.details || err.hint || 'Pastikan Anda sudah menjalankan script SQL CREATE TABLE'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Tipe Akun',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (text) => (
        <span className="badge bg-light text-dark border">{text}</span>
      )
    },
    {
      title: 'Kode / No. Rekening',
      dataIndex: 'account_number',
      key: 'account_number',
      render: (text) => text || '-'
    },
    {
      title: 'Nama Akun',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (text) => <span className="fw-bold">{text}</span>
    },
    {
      title: 'Saldo Saat Ini',
      dataIndex: 'balance',
      key: 'balance',
      render: (val) => (
        <span className={val < 0 ? "fw-bold text-danger" : "fw-bold text-success"}>
          Rp {new Intl.NumberFormat('id-ID').format(val || 0)}
        </span>
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
          <Popconfirm title="Hapus akun ini?" onConfirm={() => handleDelete(record.id)} okText="Ya" cancelText="Batal">
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
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Daftar Akun Keuangan (Chart of Accounts)</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Kelola kas, rekening bank, piutang, dan dompet digital</h6>
            </div>
            <div className="col-lg-2 col-sm-12 d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center p-2" onClick={fetchAccounts}>
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
                  dataSource={accounts} 
                  rowKey="id" 
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title={<span className="fw-bold" style={{fontSize: '18px'}}>{isEditMode ? "Ubah Data Akun" : "Tambah Akun Baru"}</span>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        closeIcon={<div style={{background: '#ea5455', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><i className="fas fa-times" style={{fontSize: '12px'}}/></div>}
      >
        <div className="row mt-4">
          <div className="col-lg-6 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Tipe Akun <span className="text-danger">*</span></label>
            <Select
              className="w-100"
              value={accountType}
              onChange={setAccountType}
              options={[
                { value: 'Kas & Bank', label: 'Kas & Bank' },
                { value: 'Piutang', label: 'Piutang' },
                { value: 'Persediaan', label: 'Persediaan' },
                { value: 'Aset Tetap', label: 'Aset Tetap' },
                { value: 'Kewajiban / Hutang', label: 'Kewajiban / Hutang' },
                { value: 'Modal', label: 'Modal' },
                { value: 'Pendapatan', label: 'Pendapatan' },
                { value: 'Beban / Pengeluaran', label: 'Beban / Pengeluaran' },
              ]}
            />
          </div>
          <div className="col-lg-6 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Kode Akun / No. Rekening</label>
            <Input 
              className="form-control" 
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Opsional (Misal: 101 atau 0123...)"
            />
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6 mb-4">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Nama Akun <span className="text-danger">*</span></label>
            <Input 
              className="form-control" 
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Misal: Kas Laci, BCA, OVO"
            />
          </div>
          <div className="col-lg-6 mb-4">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Saldo (Rp) <span className="text-danger">*</span></label>
            <InputNumber 
              className="w-100 form-control" 
              value={balance}
              onChange={setBalance}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
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

export default AccountsList;
