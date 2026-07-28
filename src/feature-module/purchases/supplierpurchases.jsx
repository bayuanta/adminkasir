import React, { useState, useEffect, useContext } from "react";
import { Table, Button, Card, Typography, Tag, Row, Col, Modal, Form, Input, InputNumber, DatePicker, Select, message, Popconfirm, Space } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import * as Icon from 'react-feather';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const SupplierPurchases = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [branches, setBranches] = useState([]);
  const [coasList, setCoasList] = useState([]);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const [addForm] = Form.useForm();
  const [payForm] = Form.useForm();

  useEffect(() => {
    fetchInitialData();
  }, [selectedStore]);

  useEffect(() => {
    fetchPurchases();

    const channel = supabase
      .channel('purchases-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'supplier_purchases' }, () => fetchPurchases())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, statusFilter]);

  const fetchInitialData = async () => {
    try {
      const { data: bData } = await supabase.from('branches').select('*').order('name');
      const { data: cData } = await supabase.from('coa').select('*').eq('is_active', true).order('account_code');
      setBranches(bData || []);
      setCoasList(cData || []);
    } catch (err) {
      console.error("Error initial data:", err);
    }
  };

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('supplier_purchases')
        .select('*, branches(name)')
        .order('created_at', { ascending: false });

      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }

      if (statusFilter !== 'all') {
        query = query.eq('payment_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPurchases(data || []);
    } catch (err) {
      console.error("Error fetching purchases:", err);
      message.error("Gagal memuat data pembelian bahan baku.");
    } finally {
      setLoading(false);
    }
  };

  // Helper COA Finder
  const findCoa = (code) => coasList.find(c => c.account_code === code) || null;

  // Handle Create New Raw Material Purchase
  const handleAddPurchase = async (values) => {
    try {
      const refNo = `PUR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const amount = values.total_amount;
      const isPaid = values.payment_status === 'paid';

      const purchasePayload = {
        branch_id: values.branch_id || selectedStore || branches[0]?.id,
        supplier_name: values.supplier_name,
        purchase_date: values.purchase_date ? values.purchase_date.toISOString() : new Date().toISOString(),
        due_date: values.due_date ? values.due_date.toISOString() : null,
        description: values.description,
        total_amount: amount,
        paid_amount: isPaid ? amount : 0,
        payment_status: isPaid ? 'paid' : 'unpaid',
        payment_method: isPaid ? values.payment_method : null,
        payment_date: isPaid ? new Date().toISOString() : null,
        reference_no: refNo,
        notes: values.notes || null,
      };

      const { data: newPur, error: purErr } = await supabase
        .from('supplier_purchases')
        .insert([purchasePayload])
        .select()
        .single();

      if (purErr) throw purErr;

      // Create Accounting Journal Entry & Lines
      const coaBebanBahan = findCoa('6-5000');
      const coaHutang = findCoa('2-1000');
      const coaKas = values.payment_method === 'bank' ? findCoa('1-1100') : findCoa('1-1000');

      const journalHeader = {
        branch_id: purchasePayload.branch_id,
        entry_date: purchasePayload.purchase_date,
        reference: refNo,
        description: `Pembelian Bahan Baku - ${values.supplier_name} (${isPaid ? 'Lunas' : 'Hutang'})`,
        status: 'posted'
      };

      const { data: newJrn, error: jrnErr } = await supabase
        .from('journal_entries')
        .insert([journalHeader])
        .select()
        .single();

      if (!jrnErr && newJrn) {
        const jLines = [
          // Debit: Beban Pembelian Bahan Baku (6-5000)
          {
            journal_entry_id: newJrn.id,
            account_id: coaBebanBahan?.id || '02c36258-74ad-4b48-9781-3d6f83df718c',
            debit: amount,
            credit: 0
          },
          // Credit: Hutang Usaha (2-1000) if Unpaid OR Kas/Bank (1-1000/1-1100) if Paid
          {
            journal_entry_id: newJrn.id,
            account_id: isPaid 
              ? (coaKas?.id || '58fed6b0-8030-4815-95df-fe3be3e6f906') 
              : (coaHutang?.id || '34b504aa-b1db-4ac9-818f-2502a0649709'),
            debit: 0,
            credit: amount
          }
        ];

        await supabase.from('journal_lines').insert(jLines);
      }

      message.success("Transaksi Pembelian Bahan Baku Berhasil Dicatat & Terintegrasi Akuntansi!");
      setIsAddModalOpen(false);
      addForm.resetFields();
      fetchPurchases();
    } catch (err) {
      console.error("Error add purchase:", err);
      message.error("Gagal mencatat transaksi pembelian.");
    }
  };

  // Handle Pay Debt (Pelunasan Hutang Supplier)
  const handlePayDebt = async (values) => {
    if (!selectedPurchase) return;
    try {
      const amount = selectedPurchase.total_amount;
      const refNo = `PAY-${selectedPurchase.reference_no || selectedPurchase.id.slice(0, 6).toUpperCase()}`;

      // Update Purchase Status to Paid
      const { error: purErr } = await supabase
        .from('supplier_purchases')
        .update({
          payment_status: 'paid',
          paid_amount: amount,
          payment_method: values.payment_method,
          payment_date: values.payment_date ? values.payment_date.toISOString() : new Date().toISOString(),
          notes: values.notes || selectedPurchase.notes
        })
        .eq('id', selectedPurchase.id);

      if (purErr) throw purErr;

      // Accounting Entry for Debt Payment:
      // Debit: Hutang Usaha (2-1000) -> Mengurangi Kewajiban
      // Credit: Kas Tunai (1-1000) / Bank BCA (1-1100) -> Mengurangi Aset Kas
      const coaHutang = findCoa('2-1000');
      const coaKasBank = values.payment_method === 'bank' ? findCoa('1-1100') : findCoa('1-1000');

      const journalHeader = {
        branch_id: selectedPurchase.branch_id,
        entry_date: values.payment_date ? values.payment_date.toISOString() : new Date().toISOString(),
        reference: refNo,
        description: `Pelunasan Hutang Supplier ${selectedPurchase.supplier_name} (${refNo})`,
        status: 'posted'
      };

      const { data: newJrn, error: jrnErr } = await supabase
        .from('journal_entries')
        .insert([journalHeader])
        .select()
        .single();

      if (!jrnErr && newJrn) {
        const jLines = [
          // Debit: Hutang Usaha (2-1000)
          {
            journal_entry_id: newJrn.id,
            account_id: coaHutang?.id || '34b504aa-b1db-4ac9-818f-2502a0649709',
            debit: amount,
            credit: 0
          },
          // Credit: Kas/Bank (1-1000 / 1-1100)
          {
            journal_entry_id: newJrn.id,
            account_id: coaKasBank?.id || '58fed6b0-8030-4815-95df-fe3be3e6f906',
            debit: 0,
            credit: amount
          }
        ];

        await supabase.from('journal_lines').insert(jLines);
      }

      message.success(`Pelunasan Hutang Rp ${amount.toLocaleString('id-ID')} Kepada ${selectedPurchase.supplier_name} Berhasil!`);
      setIsPayModalOpen(false);
      setSelectedPurchase(null);
      payForm.resetFields();
      fetchPurchases();
    } catch (err) {
      console.error("Error pay debt:", err);
      message.error("Gagal memproses pelunasan hutang.");
    }
  };

  // Delete Purchase Record
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('supplier_purchases').delete().eq('id', id);
      if (error) throw error;
      message.success("Catatan transaksi berhasil dihapus.");
      fetchPurchases();
    } catch (err) {
      console.error("Error delete purchase:", err);
      message.error("Gagal menghapus transaksi.");
    }
  };

  // Calculate Summaries
  const unpaidPurchases = purchases.filter(p => p.payment_status === 'unpaid');
  const paidPurchases = purchases.filter(p => p.payment_status === 'paid');
  const totalUnpaid = unpaidPurchases.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);
  const totalPurchases = purchases.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);
  const totalPaid = paidPurchases.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);

  // Filter Data by Search Text
  const filteredData = purchases.filter(p => {
    const text = searchText.toLowerCase();
    return (
      (p.supplier_name || '').toLowerCase().includes(text) ||
      (p.description || '').toLowerCase().includes(text) ||
      (p.reference_no || '').toLowerCase().includes(text)
    );
  });

  const columns = [
    {
      title: 'No. Ref & Tanggal',
      key: 'ref',
      render: (_, record) => (
        <div>
          <Tag color="blue" className="fw-bold">{record.reference_no || `PUR-${record.id.slice(0, 6)}`}</Tag>
          <div className="fs-12 text-muted mt-1">{dayjs(record.purchase_date).format('DD MMM YYYY')}</div>
          {record.due_date && record.payment_status === 'unpaid' && (
            <small className="text-danger fw-bold d-block">Jatuh Tempo: {dayjs(record.due_date).format('DD MMM YYYY')}</small>
          )}
        </div>
      )
    },
    {
      title: 'Cabang / Outlet',
      dataIndex: ['branches', 'name'],
      key: 'branch',
      render: (name) => <Tag color="purple">{name || 'Utama'}</Tag>
    },
    {
      title: 'Nama Supplier / Vendor',
      dataIndex: 'supplier_name',
      key: 'supplier',
      render: (name) => <span className="fw-bold text-dark fs-14">{name}</span>
    },
    {
      title: 'Rincian Bahan Baku',
      dataIndex: 'description',
      key: 'description',
      render: (desc) => desc || '-'
    },
    {
      title: 'Total Pembelian (Rp)',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      render: (val) => <span className="fw-bold text-primary fs-14">Rp {Number(val).toLocaleString('id-ID')}</span>
    },
    {
      title: 'Status Pembayaran',
      key: 'status',
      align: 'center',
      render: (_, record) => {
        if (record.payment_status === 'unpaid') {
          return <Tag color="error" className="fw-bold p-1 px-2">🔴 TEMPO / HUTANG</Tag>;
        }
        return (
          <Tag color="success" className="fw-bold p-1 px-2">
            🟢 LUNAS ({(record.payment_method || 'kas').toUpperCase()})
          </Tag>
        );
      }
    },
    {
      title: 'Aksi / Pelunasan',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space>
          {record.payment_status === 'unpaid' ? (
            <Button
              type="primary"
              danger
              icon={<Icon.CreditCard size={15} />}
              onClick={() => {
                setSelectedPurchase(record);
                payForm.setFieldsValue({
                  payment_method: 'cash',
                  payment_date: dayjs()
                });
                setIsPayModalOpen(true);
              }}
            >
              Bayar Hutang
            </Button>
          ) : (
            <Tag color="cyan" className="fs-12">Lunas {record.payment_date ? dayjs(record.payment_date).format('DD/MM/YY') : ''}</Tag>
          )}
          <Popconfirm
            title="Hapus Catatan Pembelian?"
            description="Tindakan ini tidak dapat dibatalkan."
            onConfirm={() => handleDelete(record.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Button icon={<Icon.Trash2 size={15} />} danger type="text" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header d-flex justify-content-between align-items-center mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>Hutang & Pembelian Bahan Baku Supplier 🛒</Title>
            <Text type="secondary">Pencatatan transaksi pembelian tempo/hutang supplier, pelunasan kas/bank, dan integrasi akuntansi</Text>
          </div>
          <Space>
            <Button icon={<Icon.RefreshCw size={16} />} onClick={fetchPurchases}>
              Refresh
            </Button>
            <Button type="primary" icon={<Icon.Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
              + Catat Pembelian Bahan Baku
            </Button>
          </Space>
        </div>

        {/* DreamsPOS Modern Stat Cards */}
        <Row gutter={[16, 16]} className="mb-4">
          {/* Card 1: Total Hutang Supplier */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-danger">Rp {totalUnpaid.toLocaleString('id-ID')}</span>
                    <span className="badge bg-danger-light text-danger ms-2 fw-bold fs-11">⚠️ Hutang</span>
                  </div>
                  <div className="text-muted fs-13">Total Hutang Supplier</div>
                  <small className="text-secondary fs-11 mt-1 d-block">{unpaidPurchases.length} Transaksi Belum Lunas</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.AlertCircle size={22} />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 2: Total Pembelian */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-dark">Rp {totalPurchases.toLocaleString('id-ID')}</span>
                    <span className="badge bg-blue-light text-primary ms-2 fw-bold fs-11">Total</span>
                  </div>
                  <div className="text-muted fs-13">Total Pembelian Bahan Baku</div>
                  <small className="text-secondary fs-11 mt-1 d-block">{purchases.length} Total Transaksi</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.ShoppingCart size={22} />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 3: Total Pelunasan */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-success">Rp {totalPaid.toLocaleString('id-ID')}</span>
                    <span className="badge bg-success-light text-success ms-2 fw-bold fs-11">Lunas</span>
                  </div>
                  <div className="text-muted fs-13">Total Pelunasan Dibayar</div>
                  <small className="text-secondary fs-11 mt-1 d-block">{paidPurchases.length} Transaksi Lunas</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.CheckCircle size={22} />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 4: Supplier Aktif */}
          <Col xs={24} sm={12} xl={6}>
            <Card className="border-0 shadow-sm rounded-3 h-100" bodyStyle={{ padding: '20px' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="d-flex align-items-center mb-1">
                    <span className="fs-18 fw-bold text-dark">
                      {Array.from(new Set(purchases.map(p => p.supplier_name))).length} Vendor
                    </span>
                    <span className="badge bg-purple-light text-purple ms-2 fw-bold fs-11">Mitra</span>
                  </div>
                  <div className="text-muted fs-13">Jumlah Supplier Aktif</div>
                  <small className="text-secondary fs-11 mt-1 d-block">Pemasok Bahan Baku</small>
                </div>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.Truck size={22} />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Filter Controls */}
        <Card className="mb-4 shadow-sm border-0 rounded-3">
          <div className="row align-items-center">
            <div className="col-md-4 mb-3 mb-md-0">
              <label className="form-label fw-bold">Filter Status Pembayaran:</label>
              <Select
                style={{ width: '100%' }}
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Select.Option value="all">Semua Status Pembelian</Select.Option>
                <Select.Option value="unpaid">🔴 Hutang / Belum Lunas (Unpaid)</Select.Option>
                <Select.Option value="paid">🟢 Lunas (Paid)</Select.Option>
              </Select>
            </div>
            <div className="col-md-6 mb-3 mb-md-0">
              <label className="form-label fw-bold">Cari Supplier / Deskripsi / No Ref:</label>
              <Input
                placeholder="Cari nama supplier atau bahan baku..."
                prefix={<Icon.Search size={16} className="text-muted" />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                allowClear
              />
            </div>
          </div>
        </Card>

        {/* Table Data */}
        <Card title="📋 Daftar Pembelian Bahan Baku & Catatan Hutang Supplier" className="border-0 shadow-sm rounded-3">
          <Table
            columns={columns}
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>

      {/* Modal 1: + Catat Pembelian Bahan Baku */}
      <Modal
        title="🛒 Catat Pembelian Bahan Baku Baru"
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddPurchase}
          initialValues={{
            purchase_date: dayjs(),
            payment_status: 'unpaid',
            payment_method: 'cash'
          }}
        >
          <Form.Item name="supplier_name" label="Nama Supplier / Vendor" rules={[{ required: true, message: 'Masukkan nama supplier' }]}>
            <Input placeholder="Contoh: CV Segar Jaya / Pak Budi Beras" />
          </Form.Item>

          <Form.Item name="branch_id" label="Cabang / Outlet">
            <Select placeholder="Pilih Cabang (Default: Utama)">
              {branches.map(b => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="purchase_date" label="Tanggal Pembelian" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label="Tanggal Jatuh Tempo (Hutang)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Pilih tenggat bayar" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Rincian Bahan Baku & Jumlah" rules={[{ required: true, message: 'Masukkan deskripsi bahan baku' }]}>
            <Input.TextArea rows={2} placeholder="Contoh: Beras 100 kg, Minyak Goreng 50 Liter, Daging Ayam 30 kg" />
          </Form.Item>

          <Form.Item name="total_amount" label="Total Nominal Pembelian (Rp)" rules={[{ required: true, message: 'Masukkan total nominal' }]}>
            <InputNumber
              style={{ width: '100%' }}
              formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={value => value.replace(/Rp\s?|(\.)/g, '')}
              min={1}
              placeholder="0"
            />
          </Form.Item>

          <Form.Item name="payment_status" label="Status Pembayaran Awal" rules={[{ required: true }]}>
            <Select onChange={() => addForm.validateFields(['payment_method'])}>
              <Select.Option value="unpaid">⏳ HUTANG / TEMPO (Bayar Nanti ke Supplier)</Select.Option>
              <Select.Option value="paid">⚡ LANGSUNG LUNAS (Bayar Sekarang)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, current) => prev.payment_status !== current.payment_status}
          >
            {({ getFieldValue }) =>
              getFieldValue('payment_status') === 'paid' ? (
                <Form.Item name="payment_method" label="Sumber Kas / Rekening Pembayaran" rules={[{ required: true }]}>
                  <Select>
                    <Select.Option value="cash">[1-1000] Kas Tunai POS Utama</Select.Option>
                    <Select.Option value="bank">[1-1100] Bank BCA / QRIS Pembayaran</Select.Option>
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name="notes" label="Catatan Tambahan (Opsional)">
            <Input.TextArea rows={2} placeholder="Catatan pengiriman atau instruksi supplier..." />
          </Form.Item>

          <div className="text-end">
            <Space>
              <Button onClick={() => setIsAddModalOpen(false)}>Batal</Button>
              <Button type="primary" htmlType="submit">Simpan & Posting Akuntansi</Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal 2: 💳 Pelunasan Hutang Supplier */}
      <Modal
        title="💳 Pelunasan Hutang Supplier"
        open={isPayModalOpen}
        onCancel={() => {
          setIsPayModalOpen(false);
          setSelectedPurchase(null);
        }}
        footer={null}
        destroyOnClose
      >
        {selectedPurchase && (
          <Form
            form={payForm}
            layout="vertical"
            onFinish={handlePayDebt}
          >
            <div className="p-3 mb-3 bg-light rounded border">
              <div className="text-muted fs-12">Supplier:</div>
              <div className="fw-bold fs-15 text-dark">{selectedPurchase.supplier_name}</div>
              <div className="text-muted fs-12 mt-1">Ref Transaksi: {selectedPurchase.reference_no}</div>
              <div className="text-muted fs-12">Deskripsi: {selectedPurchase.description}</div>
              <hr className="my-2" />
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">Total Hutang Dibayar:</span>
                <span className="fw-bold fs-18 text-danger">Rp {Number(selectedPurchase.total_amount).toLocaleString('id-ID')}</span>
              </div>
            </div>

            <Form.Item name="payment_method" label="Pilih Sumber Dana Pelunasan Kas / Bank" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="cash">[1-1000] Kas Tunai POS Utama</Select.Option>
                <Select.Option value="bank">[1-1100] Bank BCA / QRIS Pembayaran</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="payment_date" label="Tanggal Pembayaran / Pelunasan" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item name="notes" label="Catatan / No. Bukti Transfer (Opsional)">
              <Input placeholder="Contoh: Bukti Trf BCA 98218042" />
            </Form.Item>

            <div className="text-end">
              <Space>
                <Button onClick={() => setIsPayModalOpen(false)}>Batal</Button>
                <Button type="primary" danger htmlType="submit">
                  Simpan Pelunasan Hutang
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default SupplierPurchases;
