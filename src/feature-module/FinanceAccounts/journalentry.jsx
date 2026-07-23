import React, { useState, useEffect, useContext } from "react";
import { Table, Modal, Select, Input, InputNumber, Button, Space, Popconfirm, DatePicker, message } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import * as Icon from 'react-feather';
import dayjs from 'dayjs';

const JournalEntry = () => {
  const { selectedStore } = useContext(StoreContext);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coasList, setCoasList] = useState([]);
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states (Header)
  const [entryDate, setEntryDate] = useState(dayjs());
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  
  // Form states (Lines)
  const [lines, setLines] = useState([
    { id: 1, account_id: null, debit: 0, credit: 0 },
    { id: 2, account_id: null, debit: 0, credit: 0 }
  ]);

  useEffect(() => {
    fetchJournals();
    fetchCOA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchCOA = async () => {
    try {
      let query = supabase.from('coa').select('*').eq('is_active', true).order('account_code');
      if (selectedStore) {
        query = query.or(`branch_id.eq.${selectedStore},branch_id.is.null`);
      }
      const { data, error } = await query;
      if (!error) setCoasList(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJournals = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('journal_entries')
        .select(`
          *,
          journal_lines (
            debit,
            credit
          )
        `)
        .order('entry_date', { ascending: false })
        .limit(100);
      
      if (selectedStore) {
        query = query.or(`branch_id.eq.${selectedStore},branch_id.is.null`);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      const formattedData = data.map(j => {
        const totalAmount = j.journal_lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
        return { ...j, totalAmount };
      });
      
      setJournals(formattedData);
    } catch (err) {
      console.error("Error fetching journals:", err);
      message.error("Gagal mengambil data jurnal");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEntryDate(dayjs());
    setReference("");
    setDescription("");
    setLines([
      { id: Date.now(), account_id: null, debit: 0, credit: 0 },
      { id: Date.now() + 1, account_id: null, debit: 0, credit: 0 }
    ]);
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('journal_entries').delete().eq('id', id);
      if (error) throw error;
      message.success("Jurnal berhasil dihapus");
      fetchJournals();
    } catch (err) {
      console.error("Error deleting:", err);
      message.error("Gagal menghapus jurnal");
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { id: Date.now(), account_id: null, debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (id) => {
    if (lines.length <= 2) {
      message.warning("Minimal harus ada 2 baris jurnal (Debit & Kredit)");
      return;
    }
    setLines(lines.filter(line => line.id !== id));
  };

  const handleLineChange = (id, field, value) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        if (field === 'debit' && value > 0) return { ...line, [field]: value, credit: 0 };
        if (field === 'credit' && value > 0) return { ...line, [field]: value, debit: 0 };
        return { ...line, [field]: value };
      }
      return line;
    }));
  };

  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

  const handleSave = async () => {
    if (!description.trim()) {
      return message.error("Deskripsi/Keterangan jurnal harus diisi");
    }
    if (!entryDate) {
      return message.error("Tanggal transaksi harus diisi");
    }

    const validLines = lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) {
      return message.error("Minimal harus ada 2 baris jurnal yang valid");
    }
    
    if (totalDebit !== totalCredit) {
      return message.error("Total Debit dan Kredit tidak seimbang (Balance)!");
    }
    
    if (totalDebit === 0) {
      return message.error("Total nilai jurnal tidak boleh 0");
    }

    setSubmitting(true);

    try {
      const headerPayload = {
        entry_date: entryDate.toISOString(),
        reference: reference,
        description: description,
        branch_id: selectedStore || null
      };

      const { data: headerData, error: headerError } = await supabase
        .from('journal_entries')
        .insert([headerPayload])
        .select()
        .single();

      if (headerError) throw headerError;

      const journalId = headerData.id;

      const linesPayload = validLines.map(line => ({
        journal_entry_id: journalId,
        account_id: line.account_id,
        debit: line.debit || 0,
        credit: line.credit || 0
      }));

      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(linesPayload);

      if (linesError) {
        await supabase.from('journal_entries').delete().eq('id', journalId);
        throw linesError;
      }

      message.success("Jurnal berhasil disimpan!");
      setIsModalVisible(false);
      fetchJournals();
    } catch (err) {
      console.error("Error saving journal:", err);
      message.error("Gagal menyimpan jurnal");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Tanggal',
      dataIndex: 'entry_date',
      key: 'entry_date',
      render: (text) => dayjs(text).format('DD MMM YYYY, HH:mm')
    },
    {
      title: 'No. Ref',
      dataIndex: 'reference',
      key: 'reference',
      render: (text) => text || '-'
    },
    {
      title: 'Keterangan',
      dataIndex: 'description',
      key: 'description',
      render: (text) => <span className="fw-bold">{text}</span>
    },
    {
      title: 'Total Nilai',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val) => (
        <span className="fw-bold text-primary">
          Rp {new Intl.NumberFormat('id-ID').format(val || 0)}
        </span>
      )
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Popconfirm title="Hapus Jurnal ini? (Seluruh baris terkait akan ikut terhapus)" onConfirm={() => handleDelete(record.id)} okText="Ya" cancelText="Batal">
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
              <h3 className="page-title fw-bold" style={{color: '#2c3e50'}}>Jurnal Umum (Manual Journal)</h3>
              <h6 className="text-muted" style={{fontSize: '13px'}}>Catat transaksi keuangan manual (Double-Entry)</h6>
            </div>
            <div className="col-lg-2 col-sm-12 d-flex justify-content-end gap-2">
              <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center p-2" onClick={fetchJournals}>
                <Icon.RefreshCcw size={16}/>
              </button>
              <button className="btn text-white fw-bold d-flex align-items-center justify-content-center gap-2" style={{background: '#28c76f', borderRadius: '6px'}} onClick={openAddModal}>
                <Icon.PlusCircle size={16} />
                Input Jurnal
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
                  dataSource={journals} 
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
        title={<span className="fw-bold" style={{fontSize: '18px'}}>Input Jurnal Baru</span>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
        closeIcon={<div style={{background: '#ea5455', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><i className="fas fa-times" style={{fontSize: '12px'}}/></div>}
      >
        <div className="row mt-4">
          <div className="col-lg-4 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Tanggal Transaksi <span className="text-danger">*</span></label>
            <DatePicker 
              className="w-100" 
              value={entryDate} 
              onChange={setEntryDate} 
              format="DD MMM YYYY"
              allowClear={false}
            />
          </div>
          <div className="col-lg-4 mb-3">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>No. Referensi / Bukti</label>
            <Input 
              className="form-control" 
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Misal: INV-001, BKK-001"
            />
          </div>
          <div className="col-lg-12 mb-4">
            <label className="form-label" style={{fontSize: '13px', color: '#555'}}>Keterangan Transaksi <span className="text-danger">*</span></label>
            <Input 
              className="form-control" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Misal: Pembayaran Biaya Listrik Bulan Ini"
            />
          </div>
        </div>

        <div className="mb-2 d-flex justify-content-between align-items-end">
          <h6 className="fw-bold m-0" style={{color: '#2c3e50'}}>Rincian Baris Jurnal (Debit & Kredit)</h6>
        </div>
        
        <div className="table-responsive mb-4" style={{border: '1px solid #f0f0f0', borderRadius: '6px'}}>
          <table className="table table-borderless m-0">
            <thead style={{background: '#f8f9fa', borderBottom: '1px solid #f0f0f0'}}>
              <tr>
                <th style={{width: '40%', fontSize: '13px'}}>Akun (Buku Besar)</th>
                <th style={{width: '25%', fontSize: '13px'}}>Debit (Rp)</th>
                <th style={{width: '25%', fontSize: '13px'}}>Kredit (Rp)</th>
                <th style={{width: '10%', textAlign: 'center'}}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} style={{borderBottom: '1px solid #f9f9f9'}}>
                  <td>
                    <Select
                      className="w-100"
                      value={line.account_id}
                      onChange={(val) => handleLineChange(line.id, 'account_id', val)}
                      placeholder="Pilih Akun"
                      showSearch
                      optionFilterProp="label"
                      options={coasList.map(coa => ({ value: coa.id, label: `${coa.account_code} - ${coa.account_name}` }))}
                    />
                  </td>
                  <td>
                    <InputNumber
                      className="w-100"
                      min={0}
                      value={line.debit}
                      onChange={(val) => handleLineChange(line.id, 'debit', val)}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    />
                  </td>
                  <td>
                    <InputNumber
                      className="w-100"
                      min={0}
                      value={line.credit}
                      onChange={(val) => handleLineChange(line.id, 'credit', val)}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/\$\s?|(,*)/g, '')}
                    />
                  </td>
                  <td className="text-center">
                    <Button type="text" danger onClick={() => handleRemoveLine(line.id)}>
                      <Icon.XCircle size={18} />
                    </Button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={4}>
                  <Button type="dashed" block onClick={handleAddLine} icon={<Icon.Plus size={14}/>}>
                    Tambah Baris
                  </Button>
                </td>
              </tr>
            </tbody>
            <tfoot style={{background: '#f8f9fa', borderTop: '2px solid #e9ecef'}}>
              <tr>
                <td className="text-end fw-bold">Total:</td>
                <td>
                  <span className={`fw-bold ${totalDebit !== totalCredit ? 'text-danger' : 'text-success'}`}>
                    {new Intl.NumberFormat('id-ID').format(totalDebit)}
                  </span>
                </td>
                <td>
                  <span className={`fw-bold ${totalDebit !== totalCredit ? 'text-danger' : 'text-success'}`}>
                    {new Intl.NumberFormat('id-ID').format(totalCredit)}
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {totalDebit !== totalCredit && (
          <div className="alert alert-danger p-2" style={{fontSize: '12px'}}>
            <Icon.AlertCircle size={14} className="me-1"/> Total Debit dan Kredit harus seimbang (Balance)! Selisih: Rp {new Intl.NumberFormat('id-ID').format(Math.abs(totalDebit - totalCredit))}
          </div>
        )}

        <div className="d-flex justify-content-end gap-2 pt-3 border-top">
          <button className="btn text-white fw-bold" style={{background: '#0f2650', padding: '8px 24px'}} onClick={() => setIsModalVisible(false)} disabled={submitting}>
            Batal
          </button>
          <button className="btn text-white fw-bold" style={{background: '#28c76f', padding: '8px 24px'}} onClick={handleSave} disabled={submitting || totalDebit !== totalCredit || totalDebit === 0}>
            {submitting ? "Menyimpan..." : "Posting Jurnal"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default JournalEntry;
