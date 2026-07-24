import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Printer, Trash2 } from "feather-icons-react/build/IconComponents";
import Table from "../../core/pagination/datatable";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import { DatePicker, message, Popconfirm, Modal } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const TransactionHistory = () => {
  const { selectedStore } = useContext(StoreContext);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore, dateRange]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const startDateIso = dateRange[0].startOf('day').toISOString();
      const endDateIso = dateRange[1].endOf('day').toISOString();
      
      let query = supabase
        .from('transactions')
        .select(`
          id,
          total_amount,
          payment_method,
          cashier_name,
          created_at,
          branch_id,
          branches (name, type),
          accounts (account_name)
        `)
        .gte('created_at', startDateIso)
        .lte('created_at', endDateIso)
        .order('created_at', { ascending: false }); 
      
      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }
      
      const { data, error } = await query;
      
      if (error) {
        message.error("Gagal mengambil data transaksi");
        console.error("Error fetching transactions:", error);
      } else {
        const processed = (data || []).map((trx) => {
          const d = new Date(trx.created_at);
          trx.formattedDate = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
          trx.formattedTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          trx.displayId = trx.id.slice(0,8).toUpperCase(); // Short ID
          return trx;
        });
        setTransactions(processed);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      message.success('Transaksi berhasil dihapus');
      fetchTransactions();
    } catch (err) {
      console.error(err);
      message.error('Gagal menghapus transaksi');
    }
  };

  const handlePrint = (record) => {
    setSelectedTransaction(record);
    setIsPrintModalVisible(true);
  };

  const handlePrintAction = () => {
    const printContent = document.getElementById("print-receipt").innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); 
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "displayId",
      render: (text) => <span className="fw-bold text-secondary">{text}</span>,
    },
    {
      title: "Tanggal & Waktu",
      render: (_, record) => (
        <div>
          <div>{record.formattedDate}</div>
          <small className="text-muted">{record.formattedTime}</small>
        </div>
      ),
    },
    {
      title: "Total",
      dataIndex: "total_amount",
      render: (text) => <span className="fw-bold">Rp {text.toLocaleString('id-ID')}</span>,
      sorter: (a, b) => a.total_amount - b.total_amount,
    },
    {
      title: "Pembayaran",
      render: (_, record) => (
        <span className="badge bg-light text-primary border px-2 py-1">
          {record.accounts?.account_name || (record.payment_method === 'cash' ? 'Cash / Tunai' : 'QRIS')}
        </span>
      ),
    },
    {
      title: "Kasir",
      dataIndex: "cashier_name",
      render: (text) => text || "-",
    },
    {
      title: "Aksi",
      render: (_, record) => (
        <div className="d-flex align-items-center gap-2">
           <button onClick={() => handlePrint(record)} className="btn btn-sm btn-outline-info d-flex align-items-center justify-content-center p-2" title="Cetak Struk">
             <Printer size={14} />
           </button>
           <Popconfirm title="Yakin menghapus transaksi ini? Data akan hilang permanen." onConfirm={() => handleDelete(record.id)} okText="Ya, Hapus" cancelText="Batal">
             <button className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center p-2" title="Hapus">
               <Trash2 size={14} />
             </button>
           </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Riwayat Transaksi</h4>
              <h6>Kelola, Hapus, dan Cetak Ulang Transaksi</h6>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
             <RangePicker 
               value={dateRange} 
               onChange={(dates) => { if(dates) setDateRange(dates) }}
               format="DD MMM YYYY"
               allowClear={false}
               style={{ height: '40px', borderRadius: '5px' }}
             />
             <ul className="table-top-head mb-0">
               <li>
                 <Link to="#" data-bs-toggle="tooltip" title="Refresh Data" onClick={(e) => { e.preventDefault(); fetchTransactions(); }}>
                   <RotateCcw />
                 </Link>
               </li>
             </ul>
          </div>
        </div>
        <div className="card table-list-card">
          <div className="card-body">
            <div className="table-responsive">
              <Table columns={columns} dataSource={transactions} loading={loading} />
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="Pratinjau Struk"
        open={isPrintModalVisible}
        onCancel={() => setIsPrintModalVisible(false)}
        footer={[
           <button key="print" className="btn btn-primary" onClick={handlePrintAction}>
             <Printer size={16} className="me-2"/> Cetak Sekarang
           </button>
        ]}
      >
        {selectedTransaction && (
           <div id="print-receipt" style={{ width: '80mm', margin: '0 auto', fontFamily: 'monospace', color: '#000', padding: '10px', background: '#fff' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '1px dashed #000', paddingBottom: '10px' }}>
                 <h4 style={{ margin: 0, fontWeight: 'bold' }}>{selectedTransaction.branches?.name || 'Toko Kita'}</h4>
                 <div style={{ fontSize: '12px' }}>Struk Pembayaran (Salinan)</div>
              </div>
              <div style={{ fontSize: '12px', marginBottom: '10px' }}>
                 <div>Tanggal : {selectedTransaction.formattedDate} {selectedTransaction.formattedTime}</div>
                 <div>Kasir   : {selectedTransaction.cashier_name || '-'}</div>
                 <div>ID TRX  : {selectedTransaction.displayId}</div>
              </div>
              <div style={{ borderBottom: '1px dashed #000', marginBottom: '10px' }}></div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                 <span>TOTAL</span>
                 <span>Rp {selectedTransaction.total_amount.toLocaleString('id-ID')}</span>
              </div>
              <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                 <span>PEMBAYARAN</span>
                 <span>{selectedTransaction.accounts?.account_name || (selectedTransaction.payment_method === 'cash' ? 'Tunai' : 'QRIS')}</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                 Terima kasih atas kunjungan Anda!
              </div>
           </div>
        )}
      </Modal>

    </div>
  );
};

export default TransactionHistory;
