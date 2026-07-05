-- 1. Membuat tabel Chart of Accounts (COA)
CREATE TABLE IF NOT EXISTS public.coa (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID, -- NULL = Transaksi Pusat / Semua Cabang / Default
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(branch_id, account_code)
);

-- 2. Membuat tabel Journal Entries (Jurnal Umum)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reference VARCHAR(50),
    description TEXT,
    branch_id UUID, -- NULL = Transaksi Pusat / Semua Cabang
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Membuat tabel Journal Lines (Baris Jurnal / Debit Kredit)
CREATE TABLE IF NOT EXISTS public.journal_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.coa(id) ON DELETE RESTRICT,
    debit NUMERIC(15,2) DEFAULT 0,
    credit NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Menambahkan relasi COA ke tabel accounts (Kas/Bank) yang sudah ada
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS coa_id UUID REFERENCES public.coa(id) ON DELETE SET NULL;

-- 5. Seed / Masukkan Data Master COA Standar
INSERT INTO public.coa (account_code, account_name, account_type)
VALUES
    ('1-1000', 'Kas Utama / Laci Kasir', 'Asset'),
    ('1-1100', 'Bank BCA', 'Asset'),
    ('1-1200', 'Bank Mandiri', 'Asset'),
    ('1-2000', 'Piutang Usaha', 'Asset'),
    ('1-3000', 'Persediaan Barang Dagang', 'Asset'),
    ('2-1000', 'Hutang Usaha', 'Liability'),
    ('3-1000', 'Modal Pemilik', 'Equity'),
    ('3-2000', 'Laba Ditahan', 'Equity'),
    ('4-1000', 'Pendapatan Penjualan', 'Revenue'),
    ('5-1000', 'Harga Pokok Penjualan (HPP)', 'Expense'),
    ('6-1000', 'Beban Gaji Karyawan', 'Expense'),
    ('6-2000', 'Beban Listrik & Air', 'Expense'),
    ('6-3000', 'Beban Sewa', 'Expense'),
    ('6-9999', 'Beban Lain-Lain', 'Expense')
ON CONFLICT (branch_id, account_code) DO NOTHING;

-- Buka RLS untuk ketiga tabel baru agar bisa diakses React App (Anon Key)
ALTER TABLE public.coa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.coa FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.coa FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.coa FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.journal_entries FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.journal_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.journal_entries FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.journal_lines FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.journal_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.journal_lines FOR UPDATE USING (true);
