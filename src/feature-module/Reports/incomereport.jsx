import React, { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, DollarSign, TrendingUp, TrendingDown } from "feather-icons-react/build/IconComponents";
import { supabase } from "../../supabaseClient";
import { StoreContext } from "../../core/context/StoreContext";

const IncomeReport = () => {
  const { selectedStore } = useContext(StoreContext);
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    totalIncome: 0,
    cashIncome: 0,
    qrisIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    trxCount: 0,
    expenseCount: 0
  });

  useEffect(() => {
    fetchIncomeData();

    const channel = supabase
      .channel('income-report-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchIncomeData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchIncomeData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStore]);

  const fetchIncomeData = async () => {
    try {
      setLoading(true);

      let trxQuery = supabase.from('transactions').select('total_amount, payment_method, branch_id');
      let expQuery = supabase.from('expenses').select('amount, branch_id');

      if (selectedStore) {
        trxQuery = trxQuery.eq('branch_id', selectedStore);
        expQuery = expQuery.eq('branch_id', selectedStore);
      }

      const { data: trxs, error: trxErr } = await trxQuery;
      const { data: exps, error: expErr } = await expQuery;

      if (trxErr) console.error("Trx fetch error:", trxErr);
      if (expErr) console.error("Exp fetch error:", expErr);

      let incomeSum = 0;
      let cashSum = 0;
      let qrisSum = 0;
      (trxs || []).forEach(t => {
        const amt = t.total_amount || 0;
        incomeSum += amt;
        if (t.payment_method === 'cash') cashSum += amt;
        else qrisSum += amt;
      });

      let expSum = 0;
      (exps || []).forEach(e => {
        expSum += (e.amount || 0);
      });

      setFinanceData({
        totalIncome: incomeSum,
        cashIncome: cashSum,
        qrisIncome: qrisSum,
        totalExpenses: expSum,
        netProfit: incomeSum - expSum,
        trxCount: (trxs || []).length,
        expenseCount: (exps || []).length
      });
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-header">
          <div className="add-item d-flex">
            <div className="page-title">
              <h4>Laporan Pendapatan & Laba Rugi Bersih</h4>
              <h6>Ringkasan keuangan real-time dari seluruh transaksi dan pengeluaran</h6>
            </div>
          </div>
          <ul className="table-top-head">
            <li>
              <Link to="#" onClick={(e) => { e.preventDefault(); fetchIncomeData(); }} title="Refresh Data">
                <RotateCcw />
              </Link>
            </li>
          </ul>
        </div>

        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h6 className="mt-3">Kalkulasi data laporan keuangan...</h6>
          </div>
        ) : (
          <div className="row">
            {/* Laba Rugi Bersih */}
            <div className="col-md-12 mb-4">
              <div className={`card ${financeData.netProfit >= 0 ? 'bg-success' : 'bg-danger'} text-white shadow border-0`}>
                <div className="card-body p-4 d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="text-white-50 mb-1">TOTAL LABA / RUGI BERSIH (NET PROFIT)</h5>
                    <h1 className="text-white fw-bold mb-0">
                      Rp {financeData.netProfit.toLocaleString('id-ID')}
                    </h1>
                    <small className="text-white-50">
                      (Total Pendapatan Penjualan: Rp {financeData.totalIncome.toLocaleString('id-ID')} - Total Pengeluaran: Rp {financeData.totalExpenses.toLocaleString('id-ID')})
                    </small>
                  </div>
                  <div className="p-3 bg-white bg-opacity-25 rounded-circle">
                    {financeData.netProfit >= 0 ? <TrendingUp size={48} /> : <TrendingDown size={48} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Pendapatan */}
            <div className="col-md-6 mb-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="p-3 bg-light-success text-success rounded-circle me-3">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <h6 className="text-muted mb-0">Total Pendapatan Kotor</h6>
                      <h4 className="fw-bold text-success mb-0">Rp {financeData.totalIncome.toLocaleString('id-ID')}</h4>
                    </div>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between text-muted fs-13">
                    <span>Kasir Tunai (Cash):</span>
                    <span className="fw-bold text-dark">Rp {financeData.cashIncome.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="d-flex justify-content-between text-muted fs-13 mt-2">
                    <span>Non-Tunai (QRIS):</span>
                    <span className="fw-bold text-dark">Rp {financeData.qrisIncome.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="d-flex justify-content-between text-muted fs-13 mt-2">
                    <span>Total Transaksi POS:</span>
                    <span className="fw-bold text-dark">{financeData.trxCount} Transaksi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Pengeluaran */}
            <div className="col-md-6 mb-4">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-3">
                    <div className="p-3 bg-light-danger text-danger rounded-circle me-3">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <h6 className="text-muted mb-0">Total Pengeluaran Operasional</h6>
                      <h4 className="fw-bold text-danger mb-0">Rp {financeData.totalExpenses.toLocaleString('id-ID')}</h4>
                    </div>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between text-muted fs-13">
                    <span>Jumlah Catatan Biaya:</span>
                    <span className="fw-bold text-dark">{financeData.expenseCount} Item Biaya</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default IncomeReport;
