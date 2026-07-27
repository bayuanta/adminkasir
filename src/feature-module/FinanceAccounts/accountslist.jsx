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
  const [coaId, setCoaId] = useState(null);
  const [coasList, setCoasList] = useState([]);

  useEffect(() => {
    fetchAccounts();
    fetchCOA();

    const channel = supabase
      .channel('accounts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchAccounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchAccounts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => fetchAccounts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchCOA = async () => {
    try {
      let query = supabase.from('coa').select('*').eq('account_type', 'Asset').eq('is_active', true);
      if (selectedStore) query = query.or(`branch_id.eq.${selectedStore},branch_id.is.null`);
      const { data } = await query;
      setCoasList(data || []);
    } catch (err) {
      console.error("Error fetching COA:", err);
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      let accQuery = supabase.from('accounts').select('*').order('account_type', { ascending: true });
      let trxQuery = supabase.from('transactions').select('total_amount, payment_method, branch_id');
      let expQuery = supabase.from('expenses').select('amount, branch_id');

      if (selectedStore) {
        accQuery = accQuery.eq('branch_id', selectedStore);
        trxQuery = trxQuery.eq('branch_id', selectedStore);
        expQuery = expQuery.eq('branch_id', selectedStore);
      }

      const { data: accData } = await accQuery;
      const { data: trxData } = await trxQuery;
      const { data: expData } = await expQuery;

      let cashSales = 0;
      let qrisSales = 0;
      (trxData || []).forEach(t => {
        const amt = t.total_amount || 0;
        if (t.payment_method === 'cash') cashSales += amt;
        else qrisSales += amt;
      });

      let totalExp = 0;
      (expData || []).forEach(e => {
        totalExp += (e.amount || 0);
      });

      // Calculate live calculated balance per account type/name
      const processed = (accData || []).map(acc => {
        const nameLower = (acc.account_name || '').toLowerCase();
        let currentBal = acc.balance || 0;

        if (nameLower.includes('kas') || nameLower.includes('tunai') || acc.account_type === 'Kas & Bank') {
          currentBal = (acc.balance || 0) + cashSales - totalExp;
        } else if (nameLower.includes('qris') || nameLower.includes('bank')) {
          currentBal = (acc.balance || 0) + qrisSales;
        }

        return {
          ...acc,
          liveBalance: currentBal
        };
      });

      // If no account row exists yet, provide default live Kas & QRIS accounts
      if (processed.length === 0) {
        setAccounts([
          {
            id: 'acc-kas-1',
            account_name: 'Kas Tunai POS Utama',
            account_number: '101-01',
            account_type: 'Kas & Bank',
            balance: 0,
            liveBalance: cashSales - totalExp
          },
          {
            id: 'acc-qris-1',
            account_name: 'Bank / QRIS Rekening Pembayaran',
            account_number: '102-01',
            account_type: 'Kas & Bank',
            balance: 0,
            liveBalance: qrisSales
          }
        ]);
      } else {
        setAccounts(processed);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setAccounts([]);
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
    setCoaId(null);
    setIsModalVisible(true);
  };

  const openEditModal = (record) => {
    setIsEditMode(true);
    setSelectedAccount(record);
    setAccountName(record.account_name || "");
    setAccountNumber(record.account_number || "");
    setAccountType(record.account_type || "Kas & Bank");
    setBalance(record.balance || 0);
    setCoaId(record.coa_id || null);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      fetchAccounts();
    } catch (err) {
      console.error("Error deleting:", err);
      alert(`Gagal menghapus data: ${err.message}`);
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
      coa_id: coaId,
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
      alert(`Gagal menyimpan data!\n\nPesan Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Nama Akun / Rekening',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (text) => <span className="fw-bold text-dark">{text}</span>
    },
    {
      title: 'Kode / No. Rekening',
      dataIndex: 'account_number',
      key: 'account_number',
      render: (text) => text || '-'
    },
    {
      title: 'Tipe Akun',
      dataIndex: 'account_type',
      key: 'account_type',
      render: (text) => <span className="badge bg-light text-primary border">{text || 'Kas & Bank'}</span>
    },
    {
      title: 'Saldo Awal',
      dataIndex: 'balance',
      key: 'balance',
      render: (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`
    },
    {
      title: 'Saldo Real-Time Saat Ini',
      dataIndex: 'liveBalance',
      key: 'liveBalance',
      render: (val) => (
        <span className={`fw-bold fs-14 ${(val || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
          Rp {(val || 0).toLocaleString('id-ID')}
        </span>
      )
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<Icon.Edit size={16} />} onClick={() => openEditModal(record)} />
          <Popconfirm title="Yakin ingin menghapus rekening ini?" onConfirm={() => handleDelete(record.id)} okText="Ya" cancelText="Batal">
            <Button type="text" danger icon={<Icon.Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center">
          <div>
            <h4>Rekening & Kas Keuangan</h4>
            <h6>Kelola saldo kas tunai, rekening bank, & saldo real-time POS</h6>
          </div>
          <Button type="primary" icon={<Icon.Plus size={16} />} onClick={openAddModal}>
            Tambah Rekening Baru
          </Button>
        </div>

        <div className="card border-0 shadow-sm">
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

        {/* Modal Form Add/Edit */}
        <Modal
          title={isEditMode ? "Edit Rekening" : "Tambah Rekening Baru"}
          open={isModalVisible}
          onOk={handleSave}
          confirmLoading={submitting}
          onCancel={() => setIsModalVisible(false)}
          okText="Simpan"
          cancelText="Batal"
        >
          <div className="mb-3 mt-3">
            <label className="form-label">Nama Akun / Rekening *</label>
            <Input placeholder="Contoh: Kas Loket Tiket / Bank BCA POS" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">Nomor Rekening / Kode</label>
            <Input placeholder="Contoh: 101-01" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">Tipe Akun</label>
            <Select style={{ width: '100%' }} value={accountType} onChange={setAccountType}>
              <Select.Option value="Kas & Bank">Kas & Bank</Select.Option>
              <Select.Option value="Piutang Usaha">Piutang Usaha</Select.Option>
              <Select.Option value="Aktiva Lancar">Aktiva Lancar</Select.Option>
            </Select>
          </div>
          <div className="mb-3">
            <label className="form-label">Saldo Awal (Rp)</label>
            <InputNumber style={{ width: '100%' }} value={balance} onChange={(v) => setBalance(v || 0)} formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={value => value.replace(/Rp\s?|(\.*)/g, '')} />
          </div>
          {coasList.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Bagan Akun (COA)</label>
              <Select style={{ width: '100%' }} value={coaId} onChange={setCoaId} placeholder="Pilih Bagan Akun" allowClear>
                {coasList.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.account_code} - {c.account_name}</Select.Option>
                ))}
              </Select>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default AccountsList;
