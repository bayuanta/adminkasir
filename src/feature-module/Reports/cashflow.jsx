import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { DatePicker, Spin, Select } from 'antd';
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import dayjs from 'dayjs';
import * as Icon from "react-feather";
import ImageWithBasePath from "../../core/img/imagewithbasebath";

const { Option } = Select;

const CashFlow = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(true);
  
  // Nuta Style Filters
  const [startDate, setStartDate] = useState(dayjs().startOf('day'));
  const [endDate, setEndDate] = useState(dayjs().endOf('day'));
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  
  const [mutasiData, setMutasiData] = useState([]);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [selectedStore]);

  useEffect(() => {
    fetchCashFlow();
  }, [accounts]);

  const fetchAccounts = async () => {
    try {
      let query = supabase.from('accounts').select('id, account_name, balance');
      if (selectedStore) query = query.eq('branch_id', selectedStore);
      
      const { data, error } = await query;
      if (error) throw error;
      setAccounts(data || []);
      if (data && data.length > 0 && selectedAccount === 'all') {
         // Default to all
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    }
  };

  const handleApplyFilter = () => {
    fetchCashFlow();
  };

  const fetchCashFlow = async () => {
    setLoading(true);
    try {
      const startDateIso = startDate.startOf('day').toISOString();

      // 1. Dapatkan Saldo Saat Ini (Current Balance)
      let currentBalance = 0;
      if (selectedAccount === 'all') {
        currentBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
      } else {
        const acc = accounts.find(a => a.id === selectedAccount);
        if (acc) currentBalance = acc.balance || 0;
      }

      // 2. Tarik SEMUA mutasi mulai dari startDate sampai SEKARANG (untuk mencari Saldo Awal)
      let salesQuery = supabase
        .from('transactions')
        .select(`id, created_at, total_amount, payment_method, customer_name`)
        .eq('status', 'completed')
        .gte('created_at', startDateIso);
      
      if (selectedStore) salesQuery = salesQuery.eq('branch_id', selectedStore);
      if (selectedAccount !== 'all') salesQuery = salesQuery.eq('account_id', selectedAccount);
      
      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      let expenseQuery = supabase
        .from('expenses')
        .select(`id, expense_date, amount, expense_for, expense_category`)
        .gte('expense_date', startDateIso);
      
      if (selectedStore) expenseQuery = expenseQuery.eq('branch_id', selectedStore);
      if (selectedAccount !== 'all') expenseQuery = expenseQuery.eq('account_id', selectedAccount);

      const { data: expenseData, error: expenseError } = await expenseQuery;
      if (expenseError) throw expenseError;

      // Gabungkan semua data
      const allTransactions = [];

      (salesData || []).forEach(trx => {
        const d = new Date(trx.created_at);
        const yy = d.getFullYear().toString().slice(2);
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        const formattedId = `S/${yy}${mm}${dd}/${trx.id.substring(0,4).toUpperCase()}`;

        allTransactions.push({
          key: `in_${trx.id}`,
          date: trx.created_at,
          dateObj: d,
          type: 'in',
          transaksiName: 'Penjualan',
          nomor: formattedId,
          masuk: trx.total_amount || 0,
          keluar: 0,
          keterangan: trx.customer_name ? `Pelanggan: ${trx.customer_name}` : 'Pelanggan: -'
        });
      });

      (expenseData || []).forEach(exp => {
        const d = new Date(exp.expense_date);
        allTransactions.push({
          key: `out_${exp.id}`,
          date: exp.expense_date,
          dateObj: d,
          type: 'out',
          transaksiName: 'Biaya',
          nomor: '-',
          masuk: 0,
          keluar: exp.amount || 0,
          keterangan: `${exp.expense_category} - ${exp.expense_for}`
        });
      });

      // Hitung Saldo Awal (sebelum startDate)
      let totalMasukSejakStart = 0;
      let totalKeluarSejakStart = 0;
      allTransactions.forEach(t => {
         totalMasukSejakStart += t.masuk;
         totalKeluarSejakStart += t.keluar;
      });

      let saldoAwal = currentBalance - totalMasukSejakStart + totalKeluarSejakStart;

      // Filter transaksi HANYA yang berada dalam rentang startDate sampai endDate
      const filteredTransactions = allTransactions.filter(t => t.dateObj <= endDate.endOf('day').toDate());

      // Urutkan secara kronologis (dari yang paling lama ke terbaru)
      filteredTransactions.sort((a, b) => a.dateObj - b.dateObj);

      // Siapkan array final dengan baris Saldo Awal & Saldo Akhir (Gaya Nuta)
      const finalData = [];
      
      // 1. Saldo Awal Row
      finalData.push({
        key: 'saldo_awal',
        dateStr: startDate.format('YYYY-MM-DD, 00:00'),
        transaksiName: 'Saldo Awal',
        nomor: '',
        masuk: 0,
        keluar: 0,
        saldo: saldoAwal,
        keterangan: '-',
        isSpecial: true
      });

      let runningBalance = saldoAwal;

      // 2. Baris Transaksi
      filteredTransactions.forEach(t => {
         runningBalance += t.masuk;
         runningBalance -= t.keluar;
         
         const timeStr = t.dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
         const dateFormatted = t.dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD
         
         finalData.push({
            key: t.key,
            dateStr: `${dateFormatted}, ${timeStr}`,
            transaksiName: t.transaksiName,
            nomor: t.nomor,
            masuk: t.masuk,
            keluar: t.keluar,
            saldo: runningBalance,
            keterangan: t.keterangan,
            isSpecial: false
         });
      });

      // 3. Saldo Akhir Row
      finalData.push({
        key: 'saldo_akhir',
        dateStr: endDate.format('YYYY-MM-DD, 23:59'),
        transaksiName: 'Saldo Akhir',
        nomor: '',
        masuk: 0,
        keluar: 0,
        saldo: runningBalance,
        keterangan: '-',
        isSpecial: true
      });

      setMutasiData(finalData);

    } catch (err) {
      console.error("Error fetching Cash Flow data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        
        {/* Standard Template Page Header */}
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Arus Kas</h4>
              <h6>Mutasi Kas / Rekening</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <a data-bs-toggle="tooltip" data-bs-placement="top" title="Pdf">
                <Icon.FileText />
              </a>
            </li>
            <li>
              <a data-bs-toggle="tooltip" data-bs-placement="top" title="Excel">
                <Icon.File />
              </a>
            </li>
            <li>
              <a data-bs-toggle="tooltip" data-bs-placement="top" title="Print">
                <Icon.Printer />
              </a>
            </li>
            <li>
              <a data-bs-toggle="tooltip" data-bs-placement="top" title="Refresh" onClick={fetchCashFlow} style={{cursor: 'pointer'}}>
                <Icon.RotateCcw />
              </a>
            </li>
            <li>
              <a
                data-bs-toggle="tooltip"
                data-bs-placement="top"
                title="Collapse"
                id="collapse-header"
              >
                <Icon.ChevronUp />
              </a>
            </li>
          </ul>
        </div>

        {/* Mutasi Table and Filters */}
        <div className="card table-list-card">
          <div className="card-body">
            
            {/* Template Standard Filter Toggle Header */}
            <div className="table-top">
              <div className="search-path">
                <Link
                  className={`btn btn-filter ${isFilterVisible ? "setclose" : ""}`}
                  id="filter_search"
                  onClick={() => setIsFilterVisible(!isFilterVisible)}
                >
                  <Icon.Filter className="filter-icon" />
                  <span>
                    <ImageWithBasePath src="assets/img/icons/closes.svg" alt="img" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Template Standard Filter Inputs (Hidden by default, toggleable via filter icon) */}
            <div className={`card ${isFilterVisible ? "d-block" : "d-none"}`} id="filter_inputs">
              <div className="card-body pb-0">
                <div className="row">
                  <div className="col-lg-4 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label style={{fontSize: '13px', color: '#666', marginBottom: '5px', display: 'block'}}>Kas/Rekening</label>
                      <Select 
                         className="w-100" 
                         size="large"
                         value={selectedAccount}
                         onChange={(val) => setSelectedAccount(val)}
                       >
                         <Option value="all">Semua Kas & Rekening</Option>
                         {accounts.map(acc => (
                            <Option key={acc.id} value={acc.id}>{acc.account_name}</Option>
                         ))}
                      </Select>
                    </div>
                  </div>
                  <div className="col-lg-3 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label style={{fontSize: '13px', color: '#666', marginBottom: '5px', display: 'block'}}>Mulai</label>
                      <DatePicker 
                         style={{ width: '100%', height: '40px' }}
                         value={startDate} 
                         onChange={(date) => { if(date) setStartDate(date) }}
                         format="D MMMM YYYY"
                         allowClear={false}
                      />
                    </div>
                  </div>
                  <div className="col-lg-3 col-sm-6 col-12">
                    <div className="input-blocks">
                      <label style={{fontSize: '13px', color: '#666', marginBottom: '5px', display: 'block'}}>Sampai</label>
                      <DatePicker 
                         style={{ width: '100%', height: '40px' }}
                         value={endDate} 
                         onChange={(date) => { if(date) setEndDate(date) }}
                         format="D MMMM YYYY"
                         allowClear={false}
                      />
                    </div>
                  </div>
                  <div className="col-lg-2 col-sm-6 col-12 d-flex align-items-end">
                    <div className="input-blocks w-100">
                      <button 
                         className="btn btn-filters w-100 d-flex justify-content-center align-items-center gap-2" 
                         style={{ height: '40px' }}
                         onClick={handleApplyFilter}
                      >
                         <Icon.Search size={16} /> Terapkan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="table-responsive">
              {loading ? (
                <div className="text-center p-5">
                  <Spin size="large" />
                </div>
              ) : (
                <table className="table datanew table-bordered mb-0">
                  <thead style={{backgroundColor: '#fff'}}>
                    <tr>
                      <th className="text-center text-muted fw-bold">Tanggal</th>
                      <th className="text-center text-muted fw-bold">Nama Transaksi</th>
                      <th className="text-center text-muted fw-bold">Nomor</th>
                      <th className="text-center text-muted fw-bold">Masuk</th>
                      <th className="text-center text-muted fw-bold">Keluar</th>
                      <th className="text-center text-muted fw-bold">Saldo</th>
                      <th className="text-center text-muted fw-bold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mutasiData.map((record) => (
                      <tr key={record.key} style={record.isSpecial ? {backgroundColor: '#f8f9fa'} : {}}>
                        <td className="text-secondary align-middle">{record.dateStr}</td>
                        <td className="text-secondary align-middle">{record.transaksiName}</td>
                        <td className="text-secondary align-middle">{record.nomor}</td>
                        <td className="text-end text-secondary align-middle" style={record.masuk > 0 ? {color: '#28c76f'} : {}}>
                           {record.masuk > 0 ? `Rp. ${record.masuk.toLocaleString('id-ID')}` : 'Rp. 0'}
                        </td>
                        <td className="text-end text-secondary align-middle" style={record.keluar > 0 ? {color: '#ea5455'} : {}}>
                           {record.keluar > 0 ? `Rp. ${record.keluar.toLocaleString('id-ID')}` : 'Rp. 0'}
                        </td>
                        <td className="text-end align-middle" style={{fontWeight: '600', color: '#555'}}>
                           Rp. {record.saldo.toLocaleString('id-ID')}
                        </td>
                        <td className="text-secondary align-middle">{record.keterangan}</td>
                      </tr>
                    ))}
                    {mutasiData.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-4 text-muted">Belum ada data mutasi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default CashFlow;
