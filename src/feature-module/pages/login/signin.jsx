import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShoppingBag, CheckCircle, ArrowRight } from "feather-icons-react/build/IconComponents";
import { all_routes } from "../../../Router/all_routes";

const Signin = () => {
  const route = all_routes;
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate(route.dashboard);
    }, 600);
  };

  return (
    <div className="main-wrapper min-vh-100 d-flex align-items-center justify-content-center py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xxl-10 col-xl-11">
            <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: "20px" }}>
              <div className="row g-0">
                {/* Left Side Banner */}
                <div className="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white" 
                     style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.05, backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  <div className="position-relative z-1">
                    <div className="d-flex align-items-center gap-3 mb-4">
                      <div className="p-3 bg-success bg-opacity-20 rounded-4 d-flex align-items-center justify-content-center" style={{ width: "52px", height: "52px", backgroundColor: "rgba(16, 185, 129, 0.15)" }}>
                        <ShoppingBag size={28} className="text-success" />
                      </div>
                      <div>
                        <h4 className="fw-bold text-white mb-0" style={{ letterSpacing: '0.5px' }}>Kasir POS System</h4>
                        <small style={{ color: '#94A3B8' }}>Aplikasi Kasir &amp; Tiketing Integrasi</small>
                      </div>
                    </div>

                    <div className="mt-5">
                      <h2 className="fw-bold text-white display-6 mb-3" style={{ fontSize: '2.1rem', lineHeight: '1.2' }}>
                        Kelola Transaksi &amp; Stok Toko Lebih Cepat.
                      </h2>
                      <p className="lead" style={{ color: '#94A3B8', fontSize: '1.05rem' }}>
                        Platform kasir modern untuk kemudahan penjualan tiket, pencatatan produk, dan laporan keuangan real-time.
                      </p>
                    </div>
                  </div>

                  <div className="position-relative z-1 mt-4 pt-4 border-top border-secondary border-opacity-25">
                    <div className="row g-3">
                      <div className="col-6">
                        <div className="d-flex align-items-center gap-2">
                          <CheckCircle size={18} className="text-success" />
                          <span className="small text-light">Penjualan Tiket &amp; Produk</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex align-items-center gap-2">
                          <CheckCircle size={18} className="text-success" />
                          <span className="small text-light">Riwayat &amp; Cetak Struk</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex align-items-center gap-2">
                          <CheckCircle size={18} className="text-success" />
                          <span className="small text-light">Multi-Cabang &amp; Akun</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex align-items-center gap-2">
                          <CheckCircle size={18} className="text-success" />
                          <span className="small text-light">Laporan Otomatis</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side Form */}
                <div className="col-lg-6 bg-white p-4 p-sm-5 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-lg-none d-flex align-items-center gap-2 mb-4">
                      <div className="p-2 rounded-3 bg-success text-white d-flex align-items-center justify-content-center">
                        <ShoppingBag size={22} />
                      </div>
                      <h5 className="fw-bold mb-0">Kasir POS System</h5>
                    </div>

                    <div className="mb-4">
                      <h3 className="fw-bold text-dark mb-2">Selamat Datang! 👋</h3>
                      <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                        Masukkan email dan kata sandi Anda untuk mengakses dashboard kasir.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                      <div className="mb-3">
                        <label className="form-label fw-semibold text-secondary small mb-1">Email / Username</label>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0 text-muted px-3">
                            <Mail size={18} />
                          </span>
                          <input
                            type="email"
                            className="form-control bg-light border-start-0 py-2"
                            placeholder="admin@poskasir.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label fw-semibold text-secondary small mb-0">Kata Sandi</label>
                          <Link to={route.forgotPassword} className="text-decoration-none small text-success fw-semibold">
                            Lupa kata sandi?
                          </Link>
                        </div>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0 text-muted px-3">
                            <Lock size={18} />
                          </span>
                          <input
                            type={showPassword ? "text" : "password"}
                            className="form-control bg-light border-start-0 border-end-0 py-2"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="input-group-text bg-light border-start-0 text-muted px-3"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex="-1"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="rememberCheck"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <label className="form-check-label small text-muted user-select-none" htmlFor="rememberCheck">
                            Ingat saya di perangkat ini
                          </label>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-success w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                        style={{ height: '46px', fontSize: '1rem', borderRadius: '8px' }}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <span>Masuk ke Akun</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 pt-3 text-center border-top">
                    <p className="text-muted small mb-0">
                      © 2026 <strong>Kasir POS System</strong>. Seluruh Hak Cipta Dilindungi.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signin;
