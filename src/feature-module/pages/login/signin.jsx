import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShoppingBag, CheckCircle, ArrowRight, Shield, AlertCircle } from "feather-icons-react/build/IconComponents";
import { all_routes } from "../../../Router/all_routes";
import { supabase } from "../../../supabaseClient";

const Signin = () => {
  const route = all_routes;
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      // Real Supabase Auth sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        setErrorMessage(error.message === "Invalid login credentials" 
          ? "Email atau kata sandi tidak cocok. Silakan periksa kembali." 
          : error.message);
      } else if (data?.user) {
        navigate(route.dashboard);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMessage("Gagal menghubungkan ke server Supabase. Silakan periksa jaringan Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
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
            transform: translate(25px, -20px) scale(1.12);
          }
        }

        @keyframes floatGlow2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-25px, 20px) scale(1.08);
          }
        }

        @keyframes pulseIcon {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.35);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 18px 6px rgba(16, 185, 129, 0.25);
          }
        }

        .login-card-container {
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.15) !important;
        }

        .animated-glow-1 {
          position: absolute;
          width: 300px;
          height: 300px;
          top: -60px;
          left: -60px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(15, 23, 42, 0) 70%);
          border-radius: 50%;
          animation: floatGlow1 8s infinite ease-in-out;
          pointer-events: none;
        }

        .animated-glow-2 {
          position: absolute;
          width: 350px;
          height: 350px;
          bottom: -80px;
          right: -80px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(15, 23, 42, 0) 70%);
          border-radius: 50%;
          animation: floatGlow2 10s infinite ease-in-out;
          pointer-events: none;
        }

        .pulse-logo-box {
          animation: pulseIcon 3.5s infinite ease-in-out;
        }

        .feature-item {
          opacity: 0;
          animation: fadeInUp 0.5s ease-out forwards;
        }

        .feature-item-1 { animation-delay: 0.15s; }
        .feature-item-2 { animation-delay: 0.25s; }
        .feature-item-3 { animation-delay: 0.35s; }
        .feature-item-4 { animation-delay: 0.45s; }

        .form-input-box {
          transition: all 0.25s ease;
          background-color: #F8FAFC !important;
          border: 1px solid #E2E8F0 !important;
        }

        .form-input-box:focus-within {
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18) !important;
          border-color: #10B981 !important;
          background-color: #FFFFFF !important;
          transform: translateY(-1px);
        }

        .btn-submit-custom {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
          color: #ffffff !important;
          border: none !important;
        }

        .btn-submit-custom:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -4px rgba(16, 185, 129, 0.4) !important;
          background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
        }

        .btn-submit-custom:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* Page outer background: Light modern slate background for high contrast with dark left card */}
      <div className="main-wrapper min-vh-100 d-flex align-items-center justify-content-center py-5 px-3" 
           style={{ background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 50%, #CBD5E1 100%)' }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xxl-10 col-xl-11">
              <div className="card border-0 overflow-hidden login-card-container" style={{ borderRadius: "24px" }}>
                <div className="row g-0">
                  
                  {/* Left Side Banner: Dark Midnight Slate */}
                  <div className="col-lg-6 d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative overflow-hidden" 
                       style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E293B 100%)' }}>
                    
                    {/* Animated Ambient Glow Effects */}
                    <div className="animated-glow-1"></div>
                    <div className="animated-glow-2"></div>
                    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.04, backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
                    
                    <div className="position-relative z-1">
                      {/* Logo Header */}
                      <div className="d-flex align-items-center gap-3 mb-4">
                        <div className="pulse-logo-box" 
                             style={{ 
                               width: "52px", 
                               height: "52px", 
                               borderRadius: "14px", 
                               background: "rgba(16, 185, 129, 0.15)", 
                               border: "1px solid rgba(16, 185, 129, 0.3)", 
                               display: "flex", 
                               alignItems: "center", 
                               justifyContent: "center" 
                             }}>
                          <ShoppingBag size={28} style={{ color: "#10B981" }} />
                        </div>
                        <div>
                          <h4 className="fw-bold text-white mb-0" style={{ letterSpacing: '0.5px', fontSize: '1.25rem' }}>Kasir POS System</h4>
                          <small style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Aplikasi Kasir &amp; Tiketing Integrasi</small>
                        </div>
                      </div>

                      {/* Main Headline & Pill Badge */}
                      <div className="mt-5">
                        <div className="mb-3" style={{ display: 'inline-block' }}>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            background: 'rgba(16, 185, 129, 0.15)', 
                            border: '1px solid rgba(16, 185, 129, 0.35)', 
                            color: '#34D399', 
                            padding: '6px 14px', 
                            borderRadius: '20px', 
                            fontSize: '0.83rem', 
                            fontWeight: 600 
                          }}>
                            <Shield size={14} style={{ color: "#34D399" }} /> Transaksi Aman &amp; Terkendali
                          </span>
                        </div>
                        <h2 className="fw-bold text-white mb-3" style={{ fontSize: '2.1rem', lineHeight: '1.25' }}>
                          Kelola Transaksi &amp; Stok Toko Lebih Cepat.
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '1.02rem', lineHeight: '1.6' }}>
                          Platform kasir modern untuk kemudahan penjualan tiket, pencatatan produk, dan laporan keuangan real-time.
                        </p>
                      </div>
                    </div>

                    {/* Features List at bottom */}
                    <div className="position-relative z-1 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div className="row g-3">
                        <div className="col-6 feature-item feature-item-1">
                          <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} style={{ color: "#10B981" }} className="flex-shrink-0" />
                            <span className="small text-light">Penjualan Tiket &amp; Produk</span>
                          </div>
                        </div>
                        <div className="col-6 feature-item feature-item-2">
                          <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} style={{ color: "#10B981" }} className="flex-shrink-0" />
                            <span className="small text-light">Riwayat &amp; Cetak Struk</span>
                          </div>
                        </div>
                        <div className="col-6 feature-item feature-item-3">
                          <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} style={{ color: "#10B981" }} className="flex-shrink-0" />
                            <span className="small text-light">Multi-Cabang &amp; Akun</span>
                          </div>
                        </div>
                        <div className="col-6 feature-item feature-item-4">
                          <div className="d-flex align-items-center gap-2">
                            <CheckCircle size={18} style={{ color: "#10B981" }} className="flex-shrink-0" />
                            <span className="small text-light">Laporan Otomatis</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Form */}
                  <div className="col-lg-6 bg-white p-4 p-sm-5 d-flex flex-column justify-content-between position-relative z-1">
                    <div>
                      {/* Mobile Logo */}
                      <div className="d-lg-none d-flex align-items-center gap-2 mb-4">
                        <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                          <ShoppingBag size={20} />
                        </div>
                        <h5 className="fw-bold mb-0 text-dark">Kasir POS System</h5>
                      </div>

                      <div className="mb-4">
                        <h3 className="fw-bold text-dark mb-2">Selamat Datang! 👋</h3>
                        <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                          Masukkan email dan kata sandi Anda untuk mengakses dashboard kasir.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit}>
                        {errorMessage && (
                          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-3 rounded-3" style={{ fontSize: '0.88rem' }}>
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{errorMessage}</span>
                          </div>
                        )}
                        <div className="mb-3">
                          <label className="form-label fw-semibold text-secondary small mb-1">Email / Username</label>
                          <div className="input-group form-input-box rounded-3 overflow-hidden">
                            <span className="input-group-text bg-transparent border-0 text-muted px-3">
                              <Mail size={18} />
                            </span>
                            <input
                              type="email"
                              className="form-control bg-transparent border-0 py-2.5"
                              placeholder="bumdes.kalem@gmail.com"
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
                          <div className="input-group form-input-box rounded-3 overflow-hidden">
                            <span className="input-group-text bg-transparent border-0 text-muted px-3">
                              <Lock size={18} />
                            </span>
                            <input
                              type={showPassword ? "text" : "password"}
                              className="form-control bg-transparent border-0 py-2.5"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="input-group-text bg-transparent border-0 text-muted px-3"
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
                          className="btn btn-submit-custom w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2"
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
