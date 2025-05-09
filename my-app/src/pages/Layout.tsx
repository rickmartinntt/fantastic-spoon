import React, { useState } from 'react';
import { Outlet, Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import Logo from '../assets/NTT-DATA-Logo-HumanBlue.png'; // Adjust path if necessary

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: state => state.location.pathname });

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/persona', label: 'Persona' },
    { to: '/prompts', label: 'Prompts' },
    { to: '/query', label: 'Run Query' },
    { to: '/settings', label: 'Settings' },
  ];

  const NavItem = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
        pathname === to ? 'bg-gray-300 dark:bg-gray-700' : 'hover:bg-gray-200 dark:hover:bg-gray-800',
        collapsed && 'justify-center'
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex-none h-14 bg-blue-900 text-white px-4 flex items-center justify-between gap-4">
        <img src={Logo} alt="Logo" className="h-10 w-auto" />
        <span className="text-2xl font-bold tracking-tight">Document Miner</span>
      </header>

      {/* Main content with collapsible sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (desktop only) */}
        <aside
          className={clsx(
            'hidden md:flex flex-col bg-gray-100 dark:bg-gray-900 border-r dark:border-gray-800 transition-all duration-300',
            collapsed ? 'w-16' : 'w-72'
          )}
        >
          <button
            onClick={() => setCollapsed(prev => !prev)}
            className={clsx(
              'h-10 w-10 self-end m-2 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-800',
              collapsed && 'rotate-180'
            )}
          >
            {collapsed ? '▶' : '◀'}
          </button>
          <nav className="flex-1 space-y-1 px-2 pb-4">
            {navItems.map(item => (
              <NavItem key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer className="flex-none h-10 bg-blue-900 text-white flex items-center justify-center text-sm">
        © 2025 NTT Data Inc.
      </footer>
    </div>
  );
}

export default Layout;