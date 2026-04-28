import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Dashboard from '../pages/Dashboard'
import NuevaVenta from '../pages/NuevaVenta'
import Clientes from '../pages/Clientes'
import Stock from '../pages/Stock'
import Cobros from '../pages/Cobros'
import Insumos from '../pages/Insumos'
import Fabricacion from '../pages/Fabricacion'
import Reportes from '../pages/Reportes'
import styles from './Layout.module.css'

const NAV = [
  {
    section: 'Principal',
    items: [
      { path: '/',          label: 'Dashboard',   icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z' },
      { path: '/ventas',    label: 'Nueva venta', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2 2.3c-.6.6-.2 1.7.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
      { path: '/cobros',    label: 'Cobros',      icon: 'M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8c1.1 0 2.1.4 2.6 1M12 8V7m0 9v1m0-1c-1.1 0-2.1-.4-2.6-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
      { path: '/clientes',  label: 'Clientes',    icon: 'M17 20h5v-2a3 3 0 00-5.4-1.9M17 20H7m10 0v-2c0-.7-.1-1.3-.4-1.9M7 20H2v-2a3 3 0 015.4-1.9M7 20v-2c0-.7.1-1.3.4-1.9m0 0a5 5 0 019.2 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    ]
  },
  {
    section: 'Inventario',
    items: [
      { path: '/stock',       label: 'Stock',       icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { path: '/fabricacion', label: 'Fabricación', icon: 'M19.4 15.4a2 2 0 00-1-.5l-2.4-.5a6 6 0 00-3.9.5l-.3.2a6 6 0 01-3.9.5L6 15.2a2 2 0 00-1.8.5M8 4h8l-1 1v5.2a2 2 0 00.6 1.4l5 5c1.3 1.3.4 3.4-1.4 3.4H4.8c-1.8 0-2.7-2.2-1.4-3.4l5-5A2 2 0 009 10.2V5L8 4z' },
      { path: '/insumos',     label: 'Insumos',     icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    ]
  },
  {
    section: 'Análisis',
    items: [
      { path: '/reportes', label: 'Reportes', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6a1 1 0 01.7.3l5.4 5.4a1 1 0 01.3.7V19a2 2 0 01-2 2z' },
    ]
  },
]

function NavIcon({ d }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  )
}

export default function Layout({ session }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [user, setUser] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('usuarios_roles')
        .select('rol, nombre')
        .eq('user_id', session.user.id)
        .single()
      setUser({ email: session.user.email, rol: data?.rol || 'Admin', nombre: data?.nombre || 'Usuario' })
    }
    load()
  }, [session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const initials = user?.nombre?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || 'U'

  const Sidebar = () => (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <div className={styles.logoName}>Mi negocio</div>
          <div className={styles.logoSub}>Sistema de ventas</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV.map(group => (
          <div key={group.section}>
            <div className={styles.sectionLabel}>{group.section}</div>
            {group.items.map(item => {
              const active = location.pathname === item.path
              return (
                <div
                  key={item.path}
                  className={`${styles.navItem} ${active ? styles.active : ''}`}
                  onClick={() => { navigate(item.path); setMobileOpen(false) }}
                >
                  <NavIcon d={item.icon} />
                  {item.label}
                </div>
              )
            })}
          </div>
        ))}
      </nav>

      <div className={styles.userArea}>
        <div className={styles.avatar}>{initials}</div>
        <div style={{flex:1, minWidth:0}}>
          <div className={styles.userName}>{user?.nombre || '...'}</div>
          <div className={styles.userRole}>{user?.rol}</div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </div>
  )

  const currentLabel = NAV.flatMap(g => g.items).find(i => i.path === location.pathname)?.label || 'Dashboard'

  return (
    <div className={styles.app}>
      {/* Mobile overlay */}
      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      {/* Sidebar desktop */}
      <div className={styles.sidebarWrap}>
        <Sidebar />
      </div>

      {/* Sidebar mobile */}
      <div className={`${styles.sidebarMobile} ${mobileOpen ? styles.open : ''}`}>
        <Sidebar />
      </div>

      <div className={styles.main}>
        <div className={styles.topbar}>
          <button className={styles.hamburger} onClick={() => setMobileOpen(o => !o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className={styles.pageTitle}>{currentLabel}</span>
          <button className="btn btn-primary" style={{fontSize:12,padding:'6px 14px'}} onClick={() => navigate('/ventas')}>
            + Nueva venta
          </button>
        </div>

        <div className={styles.content}>
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/ventas"     element={<NuevaVenta />} />
            <Route path="/cobros"     element={<Cobros />} />
            <Route path="/clientes"   element={<Clientes />} />
            <Route path="/stock"      element={<Stock />} />
            <Route path="/fabricacion"element={<Fabricacion />} />
            <Route path="/insumos"    element={<Insumos />} />
            <Route path="/reportes"   element={<Reportes />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

function Placeholder({ title, msg }) {
  return (
    <div style={{padding:32}}>
      <h2 style={{color:'var(--text)', marginBottom:8}}>{title}</h2>
      <p style={{color:'var(--text2)'}}>{msg}</p>
    </div>
  )
}
