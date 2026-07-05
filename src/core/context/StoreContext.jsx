/* eslint-disable react/prop-types */
import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export const StoreContext = createContext();

export const StoreProvider = ({ children }) => {
  // selectedStore: null means "Utama / Semua Cabang"
  const [selectedStore, setSelectedStore] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('branches').select('id, name, type');
      if (!error && data) {
        setBranches(data);
      }
    } catch (error) {
      console.error("Error fetching branches for context:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StoreContext.Provider value={{ selectedStore, setSelectedStore, branches, loading }}>
      {children}
    </StoreContext.Provider>
  );
};
