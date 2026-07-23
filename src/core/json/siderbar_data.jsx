import React from 'react';
import * as Icon from 'react-feather';

export const SidebarData = [
    {
        label: "Main",
        submenuOpen: true,
        showSubRoute: false,
        submenuHdr: "Main",
        submenuItems: [
            {
                label: "Dashboard",
                icon: <Icon.Grid />,
                submenu: false,
                showSubRoute: false,
                link: "/"
            }
        ]
    },
    {
        label: "Menu & Tiket",
        submenuOpen: true,
        showSubRoute: false,
        submenuHdr: "Menu & Tiket",
        submenuItems: [
            { label: "Daftar Produk", link: "/product-list", icon: <Icon.Box />, showSubRoute: false, submenu: false },
            { label: "Kategori", link: "/category-list", icon: <Icon.Codepen />, showSubRoute: false, submenu: false }
        ]
    },
    {
        label: "Transaksi",
        submenuOpen: true,
        submenuHdr: "Transaksi",
        submenu: false,
        showSubRoute: false,
        submenuItems: [
            { label: "Laporan Transaksi", link: "/sales-list", icon: <Icon.ShoppingCart />, showSubRoute: false, submenu: false },
            { label: "Kalender Booking", link: "/calendar", icon: <Icon.Calendar />, showSubRoute: false, submenu: false },
            { label: "Pengeluaran", link: "/expense-list", icon: <Icon.DollarSign />, showSubRoute: false, submenu: false }
        ]
    },
    {
        label: "Akuntansi",
        submenuOpen: true,
        submenuHdr: "Akuntansi",
        submenu: false,
        showSubRoute: false,
        submenuItems: [
            { label: "Rekening & Kas", link: "/accounts", icon: <Icon.Briefcase />, showSubRoute: false, submenu: false },
            { label: "Buku Besar (COA)", link: "/coa", icon: <Icon.Book />, showSubRoute: false, submenu: false },
            { label: "Laba / Rugi", link: "/profit-loss", icon: <Icon.PieChart />, showSubRoute: false, submenu: false },
            { label: "Arus Kas", link: "/cash-flow", icon: <Icon.Repeat />, showSubRoute: false, submenu: false }
        ]
    },
    {
        label: "Manajemen",
        submenuOpen: true,
        submenuHdr: "Manajemen",
        submenu: false,
        showSubRoute: false,
        submenuItems: [
            { label: "Pengguna & Kasir", link: "/users", icon: <Icon.Users />, showSubRoute: false, submenu: false },
            { label: "Pengaturan Cabang", link: "/general-settings", icon: <Icon.Settings />, showSubRoute: false, submenu: false }
        ]
    }
];
