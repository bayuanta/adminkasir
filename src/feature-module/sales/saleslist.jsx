import React, { useState, useEffect, useContext } from "react";
import { Calendar, DollarSign } from "feather-icons-react/build/IconComponents";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";
import { DatePicker } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const SalesList = () => {
  const { selectedStore } = useContext(StoreContext);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for Date Range Filter
  const [dateRange, setDateRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

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
        .order('created_at', { ascending: true }); // Ascending to generate sequential IDs properly
      
      if (selectedStore) {
        query = query.eq('branch_id', selectedStore);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching transactions:", error);
      } else {
        // Process data: Assign sequential ID and format dates
        const processed = (data || []).map((trx, index) => {
          const d = new Date(trx.created_at);
          const yy = d.getFullYear().toString().slice(2);
          const mm = (d.getMonth() + 1).toString().padStart(2, '0');
          const dd = d.getDate().toString().padStart(2, '0');
          
          // Generate sequential index (0001, 0002, dll)
          const seq = (index + 1).toString().padStart(4, '0');
          trx.formattedId = `S/${yy}${mm}${dd}/${seq}`;
          
          // Format e.g., "Sabtu, 04 Juli 2026"
          const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
          trx.dateGroup = d.toLocaleDateString('id-ID', options);
          
          // Format e.g., "10:35:47"
          trx.timeString = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return trx;
        });
        
        // Reverse so the newest transaction (e.g. 0010) is on top
        setTransactions(processed.reverse());
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Grouping logic by dateGroup
  const groupedData = transactions.reduce((groups, trx) => {
    const groupName = trx.dateGroup;
    if (!groups[groupName]) {
      groups[groupName] = { transactions: [], total: 0 };
    }
    groups[groupName].transactions.push(trx);
    groups[groupName].total += (trx.total_amount || 0);
    return groups;
  }, {});

  const grandTotal = transactions.reduce((sum, trx) => sum + (trx.total_amount || 0), 0);
  const totalCount = transactions.length;

  return (
    <div className="page-wrapper">
      <div className="content h-100" style={{minHeight: 'calc(100vh - 60px)'}}>
        
        <div className="card table-list-card border-0 shadow-sm d-flex flex-column m-0" style={{borderRadius: '8px', height: 'calc(100vh - 110px)'}}>
          <div className="card-body p-4 d-flex flex-column" style={{height: '100%', overflow: 'hidden'}}>
            
            {/* Filter Section (UI Only for visual match) */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0">
               <div>
                  <h4 className="fw-bold mb-1" style={{fontSize: '18px', color: '#2C3E50'}}>Laporan Transaksi</h4>
                  <p className="text-muted mb-0" style={{fontSize: '13px'}}>Pilih periode tanggal untuk melihat riwayat</p>
               </div>
               <div className="d-flex align-items-center gap-2">
                 <RangePicker 
                   value={dateRange} 
                   onChange={(dates) => { if(dates) setDateRange(dates) }}
                   format="DD MMM YYYY"
                   allowClear={false}
                   style={{ width: '250px', height: '40px', borderRadius: '5px' }}
                 />
                 <button onClick={fetchTransactions} className="btn btn-success d-flex align-items-center justify-content-center fw-bold" style={{ height: '40px', padding: '0 20px', margin: 0 }}>
                   Terapkan
                 </button>
               </div>
            </div>

            {/* Table Section */}
            <div className="table-responsive flex-grow-1" style={{overflowX: 'auto', overflowY: 'auto'}}>
              {loading ? (
                <div className="text-center p-5">
                  <div className="spinner-border text-success" role="status"><span className="visually-hidden">Loading...</span></div>
                </div>
              ) : (
                <table className="table border-0 mb-0" style={{minWidth: '1000px'}}>
                  <thead style={{position: 'sticky', top: 0, zIndex: 10, background: '#fff'}}>
                    <tr style={{borderBottom: '2px solid #eef2f5'}}>
                      <th className="border-0 text-muted" style={{fontWeight: 600, fontSize: '12px', padding: '15px 10px', width: '60px'}}></th>
                      <th className="border-0 text-muted" style={{fontWeight: 600, fontSize: '12px', padding: '15px 10px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>JAM</th>
                      <th className="border-0 text-muted" style={{fontWeight: 600, fontSize: '12px', padding: '15px 10px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>NOMOR</th>
                      <th className="border-0 text-muted" style={{fontWeight: 600, fontSize: '12px', padding: '15px 10px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>AKUN TUJUAN</th>
                      <th className="border-0 text-muted" style={{fontWeight: 600, fontSize: '12px', padding: '15px 10px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>PELANGGAN</th>
                      <th className="border-0 text-muted" style={{fontWeight: 600, fontSize: '12px', padding: '15px 10px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>MEJA</th>
                      <th className="border-0 text-muted" style={{fontWeight: 600, fontSize: '12px', padding: '15px 10px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>ITEM</th>
                      <th className="border-0 text-muted text-end" style={{fontWeight: 600, fontSize: '12px', padding: '15px 10px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(groupedData).map((dateKey, index) => (
                      <React.Fragment key={index}>
                        {/* Group Header (Date & Total per day) */}
                        <tr style={{background: '#f8f9fa', borderBottom: '1px solid #eef2f5'}}>
                          <td colSpan="7" className="fw-bold text-dark border-0" style={{padding: '12px 15px', fontSize: '14px', borderRadius: '4px 0 0 4px'}}>{dateKey}</td>
                          <td className="fw-bold text-dark text-end border-0" style={{padding: '12px 15px', fontSize: '14px', borderRadius: '0 4px 4px 0'}}>
                            Rp. {groupedData[dateKey].total.toLocaleString('id-ID')}
                          </td>
                        </tr>
                        
                        {/* Group Items */}
                        {groupedData[dateKey].transactions.map((trx) => (
                          <tr key={trx.id} style={{borderBottom: '1px solid #f2f2f2', transition: 'all 0.2s'}}>
                            <td className="border-0 text-center align-middle" style={{padding: '12px 10px'}}>
                              <div style={{border: '1px solid #ddd', display: 'inline-flex', padding: '4px 6px', borderRadius: '4px', color: '#888'}}>
                                <DollarSign size={13} />
                              </div>
                            </td>
                            <td className="border-0 text-secondary align-middle" style={{padding: '12px 10px', fontSize: '13px'}}>{trx.timeString}</td>
                            <td className="border-0 text-secondary align-middle" style={{padding: '12px 10px', fontSize: '13px'}}>{trx.formattedId}</td>
                            <td className="border-0 text-secondary align-middle" style={{padding: '12px 10px', fontSize: '13px'}}>
                              <span className="badge bg-light text-primary border px-2 py-1">
                                {trx.accounts?.account_name || (trx.payment_method === 'cash' ? 'Cash / Tunai' : 'QRIS')}
                              </span>
                            </td>
                            <td className="border-0 text-secondary align-middle" style={{padding: '12px 10px', fontSize: '13px'}}>-</td>
                            <td className="border-0 text-secondary align-middle" style={{padding: '12px 10px', fontSize: '13px'}}>-</td>
                            <td className="border-0 text-secondary align-middle" style={{padding: '12px 10px', fontSize: '13px'}}>
                              <span style={{color: '#777'}}><em>Contoh: Nasi ayam penyet, es teh manis, dll</em></span>
                            </td>
                            <td className="border-0 text-end text-dark align-middle" style={{padding: '12px 10px', fontSize: '13.5px'}}>
                              Rp. {(trx.total_amount || 0).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    
                    {Object.keys(groupedData).length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center py-5">
                            <div className="text-muted mb-2">
                              <Calendar size={48} style={{opacity: 0.3}} />
                            </div>
                            <h6 className="text-muted fw-bold">Tidak ada Transaksi Penjualan di periode ini</h6>
                            <small className="text-muted">Silahkan ubah periode untuk melihat daftar transaksi</small>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Fixed Footer Outside Table */}
            <div className="flex-shrink-0 d-flex align-items-center border-top pt-3 pb-1 mt-2" style={{background: '#fff'}}>
               <div style={{flex: '0 0 20%', fontSize: '15px', fontWeight: 'bold', color: '#333'}}>Total</div>
               <div style={{flex: '1', textAlign: 'center', fontSize: '15px', fontWeight: 'bold', color: '#6c757d'}}>{totalCount} Transaksi</div>
               <div style={{flex: '0 0 40%', textAlign: 'right', fontSize: '15px', fontWeight: 'bold', color: '#333'}}>
                  <span className="me-4 text-secondary">Grand Total</span>
                  <span style={{fontSize: '16px'}}>Rp. {grandTotal.toLocaleString('id-ID')}</span>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesList;
