import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShoppingBag, CheckCircle, ArrowRight, ShieldCheck } from "feather-icons-react/build/IconComponents";
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
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes floatGlow1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(25px, -20px) scale(1.15);
          }
        }

        @keyframes floatGlow2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, 25px) scale(1.1);
          }
        }

        @keyframes pulseIcon {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% {
            transform: scale(1.06);
            box-shadow: 0 0 20px 8px rgba(16, 185, 129, 0.2);
          }
        }

        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .login-card-container {
          animation: fadeInUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animated-glow-1 {
          position: absolute;
          width: 320px;
          height: 320px;
          top: -80px;
          left: -80px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, rgba(15, 23, 42, 0) 70%);
          border-radius: 50%;
          animation: floatGlow1 8s infinite ease-in-out;
          pointer-events: none;
        }

        .animated-glow-2 {
          position: absolute;
          width: 380px;
          height: 380px;
          bottom: -100px;
          right: -100px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(15, 23, 42, 0) 70%);
          border-radius: 50%;
          animation: floatGlow2 10s infinite ease-in-out;
          pointer-events: none;
        }

        .pulse-logo-box {
          animation: pulseIcon 3.5s infinite ease-in-out;
          transition: all 0.3s ease;
        }

        .feature-item {
          opacity: 0;
          animation: fadeInUp 0.6s ease-out forwards;
        }

        .feature-item-1 { animation-delay: 0.2s; }
        .feature-item-2 { animation-delay: 0.3s; }
        .feature-item-3 { animation-delay: 0.4s; }
        .feature-item-4 { animation-delay: 0.5s; }

        .form-input-animated {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .form-input-animated:focus-within {
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
          border-color: #10B981 !important;
          transform: translateY(-1px);
        }

        .btn-submit-animated {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
        }

        .btn-submit-animated:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 22px -4px rgba(16, 185, 129, 0.45) !important;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }

        .btn-submit-animated:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      <div className="main-wrapper min-vh-100 d-flex align-items-center justify-content-center py-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xxl-10 col-xl-11">
              <div className="card border-0 shadow-lg overflow-hidden login-card-container" style={{ borderRadius: "24px" }}>
                <div className="row g-0">
                  
                  {/* Left Side Banner with Dynamic Animated Lighting */}
                  <div className="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative overflow-hidden" 
                       style={{ background: '#0F172A' }}>
                    
                    {/* Animated Ambient Glow Effects */}
                    <div className="animated-glow-1"></div>
                    <div className="animated-glow-2"></div>
                    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.04, backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
                    
                    <div className="position-relative z-1">
                      <div className="d-flex align-items-center gap-3 mb-4">
                        <div className="p-3 bg-success bg-opacity-20 rounded-4 d-flex align-items-center justify-content-center pulse-logo-box" style={{ width: "56px", height: "56px", backgroundColor: "rgba(16, 185, 129, 0.18)" }}>
                          <ShoppingBag size={30} className="text-success" />
                        </div>
                        <div>
                          <h4 className="fw-bold text-white mb-0" style={{ letterSpacing: '0.5px' }}>Kasir POS System</h4>
                          <small style={{ color: '#94A3B8' }}>Aplikasi Kasir &amp; Tiketing Integrasi</small>
                        </div>
                      </div>

                      <div className="mt-5">
                        <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30 px-3 py-2 rounded-pill mb-3" style={{ fontSize: '0.82rem' }}>
                          <ShieldCheck size={14} className="me-1" /> Transaksi Aman &amp; Terkendali
                        </span>
                        <h2 className="fw-bold text-white display-6 mb-3" style={{ fontSize: '2.1rem', lineHeight: '1.25' }}>
                          Kelola Transaksi &amp; Stok Toko Lebih Cepat.
                        </h2>
                        <p className="lead" style={{ color: '#94A3B8', fontSize: '1.02rem', lineHeight: '1.6' }}>
                          Platform kasir modern untuk kemudahan penjualan tiket, pencatatan produk, dan laporan keuangan real-time.
                        </p>
                      </div>
                    </div>

                    <div className="position-relative z-1 mt-4 pt-4 border-top border-secondary border-opacity-25">
                      <div className="row g-3">
                        <div className="col-6 feature-item feature-item-1">
                          <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} className="text-success flex-shrink-0" />
                            <span className="small text-light">Penjualan Tiket &amp; Produk</span>
                          </div>
                        </div>
                        <div className="col-6 feature-item feature-item-2">
                          <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} className="text-success flex-shrink-0" />
                            <span className="small text-light">Riwayat &amp; Cetak Struk</span>
                          </div>
                        </div>
                        <div className="col-6 feature-item feature-item-3">
                          <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} className="text-success flex-shrink-0" />
                            <span className="small text-light">Multi-Cabang &amp; Akun</span>
                          </div>
                        </div>
                        <div className="col-6 feature-item feature-item-4">
                          <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} className="text-success flex-shrink-0" />
                            <span className="small text-light">Laporan Otomatis</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Form */}
                  <div className="col-lg-6 bg-white p-4 p-sm-5 d-flex flex-column justify-content-between position-relative z-1">
                    <div>
                      <div className="d-lg-none d-flex align-items-center gap-2 mb-4">
                        <div className="p-2.5 rounded-3 bg-success text-white d-flex align-items-center justify-content-center">
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
                          <div className="input-group form-input-animated rounded-3 overflow-hidden border">
                            <span className="input-group-text bg-light border-0 text-muted px-3">
                              <Mail size={18} />
                            </span>
                            <input
                              type="email"
                              className="form-control bg-light border-0 py-2.5"
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
                          <div className="input-group form-input-animated rounded-3 overflow-hidden border">
                            <span className="input-group-text bg-light border-0 text-muted px-3">
                              <Lock size={18} />
                            </span>
                            <input
                              type={showPassword ? "text" : "password"}
                              className="form-control bg-light border-0 py-2.5"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="input-group-text bg-light border-0 text-muted px-3"
                              onClick={() => setShowPassword(!showPassword)}
                              tabIndex="-1"
                              style={{ cursor: 'pointer' }}
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
                              style={{ cursor: 'pointer' }}
                            />
                            <label className="form-check-label small text-muted user-select-none" htmlFor="rememberCheck" style={{ cursor: 'pointer' }}>
                              Ingat saya di perangkat ini
                            </label>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="btn btn-success btn-submit-animated w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 border-0"
                          style={{ height: '48px', fontSize: '1rem', borderRadius: '10px' }}
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
    </>
  );
};

export default Signin;
