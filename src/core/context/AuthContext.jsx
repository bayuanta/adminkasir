import React, { createContext, useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
      } else {
        // Fallback: check local stored user if demo login was used
        const localUser = localStorage.getItem("kasir_pos_user");
        if (localUser) {
          try {
            setUser(JSON.parse(localUser));
          } catch (e) {
            setUser(null);
          }
        }
      }
      setLoading(false);
    });

    // Listen to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        localStorage.setItem("kasir_pos_user", JSON.stringify(session.user));
      } else {
        const localUser = localStorage.getItem("kasir_pos_user");
        if (!localUser) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginDemo = (email) => {
    const demoUser = {
      id: "demo-admin-id",
      email: email || "admin@poskasir.com",
      user_metadata: { name: "Admin Kasir" }
    };
    setUser(demoUser);
    localStorage.setItem("kasir_pos_user", JSON.stringify(demoUser));
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Error signing out from Supabase:", e);
    }
    localStorage.removeItem("kasir_pos_user");
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
