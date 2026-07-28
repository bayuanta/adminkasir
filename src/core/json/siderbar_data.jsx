import React from 'react';
import * as Icon from 'react-feather';

export const SidebarData = [
    {
        label: "Main",
        submenuOpen: true,
        showSubRoute: false,
        submenuHdr: "Main Navigation",
        submenuItems: [
            {
                label: "Dashboard",
                icon: <Icon.Grid />,
                submenu: false,
                showSubRoute: false,
                link: "/"
            },
            {
                label: "Menu & Produk",
                icon: <Icon.Box />,
                submenu: true,
                showSubRoute: false,
                submenuItems: [
                    { label: "Daftar Produk", link: "/product-list" },
                    { label: "Kategori", link: "/category-list" }
                ]
            },
            {
                label: "Penjualan & Kasir",
                icon: <Icon.ShoppingCart />,
                submenu: true,
                showSubRoute: false,
                submenuItems: [
                    { label: "Riwayat Transaksi", link: "/transaction-history" },
                    { label: "Kalender Booking", link: "/calendar" }
                ]
            },
            {
                label: "Keuangan & Kas",
                icon: <Icon.DollarSign />,
                submenu: true,
                showSubRoute: false,
                submenuItems: [
                    { label: "Hutang & Bahan Baku", link: "/supplier-purchases" },
                    { label: "Pengeluaran", link: "/expense-list" },
                    { label: "Rekening & Kas", link: "/accounts" },
                    { label: "Buku Besar (COA)", link: "/coa" },
                    { label: "Input Jurnal", link: "/journal-entry" }
                ]
            },
            {
                label: "Laporan",
                icon: <Icon.FileText />,
                submenu: true,
                showSubRoute: false,
                submenuItems: [
                    { label: "Laporan Transaksi", link: "/sales-list" },
                    { label: "Laporan Per Jam", link: "/hourly-report" },
                    { label: "Laporan Buku Besar", link: "/general-ledger" },
                    { label: "Neraca Saldo", link: "/trial-balance" },
                    { label: "Laporan Laba Rugi", link: "/profit-loss" },
                    { label: "Neraca Keuangan", link: "/balance-sheet" }
                ]
            },
            {
                label: "Manajemen",
                icon: <Icon.Settings />,
                submenu: true,
                showSubRoute: false,
                submenuItems: [
                    { label: "Pengguna & Kasir", link: "/users" },
                    { label: "Pengaturan Cabang", link: "/general-settings" }
                ]
            }
        ]
    }
];
