import React, { useState, useEffect, useContext } from "react";
import { Table, Modal, DatePicker, Select, Input, InputNumber, Button, Space, Popconfirm } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import dayjs from 'dayjs';
import * as Icon from 'react-feather';

const { TextArea } = Input;

const ExpensesList = () => {
  const { selectedStore } = useContext(StoreContext);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [expenseCategory, setExpenseCategory] = useState("Lain-lain");
  const [expenseDate, setExpenseDate] = useState(dayjs());
  const [amount, setAmount] = useState(0);
  const [referenceNo, setReferenceNo] = useState("");
  const [expenseFor, setExpenseFor] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState(null); // New state for Sumber Dana
  const [accountsList, setAccountsList] = useState([]); // List of accounts

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchAccounts = async () => {
    try {
      let query = supabase.from('accounts').select('id, account_name').order('account_name', { ascending: true });
      if (selectedStore) query = query.eq('branch_id', selectedStore);
      const { data, error } = await query;
      if (!error && data) {
        setAccountsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Join with accounts to get account_name
      let query = supabase.from('expenses').select('*, accounts(account_name)').order('expense_date', { ascending: false });
      
      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }
      
      const { data, error } = await query;
      if (error) {
        // If table doesn't exist yet, it will throw an error, we catch it silently for the walkthrough.
        console.error("Error fetching expenses (Tabel mungkin belum dibuat):", error);
        setExpenses([]);
      } else {
        setExpenses(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedExpense(null);
    setExpenseCategory("Lain-lain");
    setExpenseDate(dayjs());
    setAmount(0);
    setReferenceNo("");
    setExpenseFor("");
    setDescription("");
    setAccountId(null);
    setIsModalVisible(true);
  };

  const openEditModal = (record) => {
    setIsEditMode(true);
    setSelectedExpense(record);
    setExpenseCategory(record.expense_category || "Lain-lain");
    setExpenseDate(record.expense_date ? dayjs(record.expense_date) : dayjs());
    setAmount(record.amount || 0);
    setReferenceNo(record.reference_no || "");
    setExpenseFor(record.expense_for || "");
    setDescription(record.description || "");
    setAccountId(record.account_id || null);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      fetchExpenses();
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Gagal menghapus data.");
    }
  };

  const handleSave = async () => {
    if (!amount || amount <= 0) return alert("Nominal pengeluaran tidak valid.");
    if (!expenseDate) return alert("Tanggal pengeluaran wajib diisi.");
    if (!accountId) return alert("Sumber Dana wajib dipilih.");

    setSubmitting(true);
    const payload = {
      expense_category: expenseCategory,
      expense_date: expenseDate.toISOString(),
      amount: amount,
      reference_no: referenceNo,
      expense_for: expenseFor,
      description: description,
      branch_id: selectedStore || null,
      account_id: accountId
    };

    try {
      if (isEditMode && selectedExpense) {
        const { error } = await supabase.from('expenses').update(payload).eq('id', selectedExpense.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert([payload]);
        if (error) throw error;
      }
      setIsModalVisible(false);
      fetchExpenses();
    } catch (err) {
      console.error("Error saving expense:", err);
      alert(`Gagal menyimpan data!\n\nPesan Error: ${err.message || err.details || err.hint || 'Pastikan Anda sudah menjalankan script SQL CREATE TABLE'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'expense_date',
      key: 'expense_date',
      render: (text) => text ? dayjs(text).format('DD MMM YYYY') : '-'
    },
    {
      title: 'Kategori',
      dataIndex: 'expense_category',
      key: 'expense_category',
      render: (text) => (
        <span className="badge bg-light text-dark border">{text}</span>
      )
    },
    {
      title: 'No. Referensi',
      dataIndex: 'reference_no',
      key: 'reference_no',
      render: (text) => text || '-'
    },
    {
      title: 'Sumber Dana',
      dataIndex: 'accounts',
      key: 'accounts',
      render: (acc) => acc ? <span className="fw-bold text-primary">{acc.account_name}</span> : '-'
    },
    {
      title: 'Dikeluarkan Untuk',
      dataIndex: 'expense_for',
      key: 'expense_for',
      render: (text) => text || '-'
    },
    {
      title: 'Nominal',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span className="fw-bold text-danger">
          Rp {new Intl.NumberFormat('id-ID').format(amount || 0)}
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
          <Popconfirm title="Hapus pengeluaran ini?" onConfirm={() => handleDelete(record.id)} okText="Ya" cancelText="Batal">
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
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Daftar Pengeluaran</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Kelola pencatatan biaya dan pengeluaran toko</h6>
            </div>
            <div className="col-lg-2 col-sm-12 d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center p-2" onClick={fetchExpenses}>
                <Icon.RefreshCcw size={16}/>
              </button>
              <button className="btn text-white fw-bold d-flex align-items-center justify-content-center gap-2" style={{background: '#ff9f43', borderRadius: '6px'}} onClick={openAddModal}>
                <Icon.PlusCircle size={16} />
                Tambah Baru
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
                  dataSource={expenses} 
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
        title={<span className="fw-bold" style={{fontSize: '18px'}}>{isEditMode ? "Ubah Pengeluaran" : "Tambah Pengeluaran Baru"}</span>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        destroyOnClose
        closeIcon={<div style={{background: '#ea5455', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><i className="fas fa-times" style={{fontSize: '12px'}}/></div>}
      >
        <div className="row mt-4">
          <div className="col-lg-6 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Sumber Dana <span className="text-danger">*</span></label>
            <Select
              className="w-100"
              value={accountId}
              onChange={setAccountId}
              placeholder="Pilih Kas / Bank"
              options={accountsList.map(acc => ({ value: acc.id, label: acc.account_name }))}
            />
          </div>
          <div className="col-lg-6 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Kategori Pengeluaran <span className="text-danger">*</span></label>
            <Select
              className="w-100"
              value={expenseCategory}
              onChange={setExpenseCategory}
              options={[
                { value: 'Bahan Baku', label: 'Bahan Baku' },
                { value: 'Gaji Karyawan', label: 'Gaji Karyawan' },
                { value: 'Listrik & Air', label: 'Listrik & Air' },
                { value: 'Sewa Tempat', label: 'Sewa Tempat' },
                { value: 'Pemasaran', label: 'Pemasaran' },
                { value: 'Transportasi', label: 'Transportasi' },
                { value: 'Lain-lain', label: 'Lain-lain' },
              ]}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Tanggal <span className="text-danger">*</span></label>
            <DatePicker 
              className="w-100 form-control" 
              format="DD/MM/YYYY"
              value={expenseDate}
              onChange={(date) => setExpenseDate(date)}
            />
          </div>
          <div className="col-lg-6 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Nominal (Rp) <span className="text-danger">*</span></label>
            <InputNumber 
              className="w-100 form-control" 
              value={amount}
              onChange={setAmount}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </div>
        </div>

        <div className="row">
          <div className="col-lg-6 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Dikeluarkan Untuk</label>
            <Input 
              className="form-control" 
              value={expenseFor}
              onChange={(e) => setExpenseFor(e.target.value)}
              placeholder="Misal: Toko Beras Jaya / PLN"
            />
          </div>
          <div className="col-lg-6 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>No. Referensi / Nota</label>
            <Input 
              className="form-control" 
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="Misal: INV-001"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Keterangan Tambahan</label>
          <TextArea 
            className="form-control" 
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <button className="btn text-white fw-bold" style={{background: '#0f2650', padding: '8px 24px'}} onClick={() => setIsModalVisible(false)} disabled={submitting}>
            Batal
          </button>
          <button className="btn text-white fw-bold" style={{background: '#ff9f43', padding: '8px 24px'}} onClick={handleSave} disabled={submitting}>
            {submitting ? "Menyimpan..." : (isEditMode ? "Simpan Perubahan" : "Simpan Pengeluaran")}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesList;
