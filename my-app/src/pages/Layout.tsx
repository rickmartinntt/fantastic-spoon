import React, { useState } from 'react';
import { Outlet, Link, useRouterState } from '@tanstack/react-router';
import clsx from 'clsx';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../components/ui/accordion';               
import Logo from '../assets/NTT-DATA-Logo-HumanBlue.png';

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  /* ---------------------------------------------
   *  NAV STRUCTURE (4 groups / accordion items)
   * --------------------------------------------*/
  const navGroups: {
    label: string;
    items: { to: string; label: string }[]; 
  }[] = [
    {
      label: 'Home',               
      items: [
        { to: '/', label: 'Introduction to DocMiner' },
      ],                   
    },
    {
      label: 'Document Analysis',  // Group 2
      items: [
        { to: '/upload', label: 'Document Upload' },
        { to: '/query', label: 'Results Analysis' },    // make sure this route exists
        { to: '/quality', label: 'Quality Review' },    // make sure this route exists
      ],
    },
    {
      label: 'Batch Processing',   // Group 3
      items: [
        { to: '/batch', label: 'Batch Upload' },
        { to: '/summary', label: 'Results Summary' }
      ],                  
    },
    {
      label: 'Settings',           // Group 4
      items: [
                { to: '/persona', label: 'Create/Edit Persona' },
                { to: '/prompts', label: 'Create/Edit Prompt Lists' },
                { to: '/settings', label: 'Application Settings' },

      ],
    },
  ];

  /* ---------------------------------------------
   *  Single navigation link component
   * --------------------------------------------*/
  const NavItem = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
        pathname === to
          ? 'bg-gray-300 dark:bg-gray-700'
          : 'hover:bg-gray-200 dark:hover:bg-gray-800',
        collapsed && 'justify-center'
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col h-screen">
      {/* ------------  HEADER  ------------ */}
      <header className="flex-none h-14 bg-blue-900 text-white px-4 flex items-center gap-4">
        <img src={Logo} alt="Logo" className="h-10 w-auto" />
        <span className="text-2xl font-bold tracking-tight">
          Document Miner
        </span>
      </header>

      {/* ------------  MAIN  ------------ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ----------- SIDEBAR ------------ */}
        <aside
          className={clsx(
            'hidden md:flex flex-col bg-gray-100 dark:bg-gray-900 border-r dark:border-gray-800 transition-all duration-300',
            collapsed ? 'w-16' : 'w-72'
          )}
        >
          {/* Collapse / expand button */}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className={clsx(
              'h-10 w-10 self-end m-2 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-800',
              collapsed && 'rotate-180'
            )}
          >
            {collapsed ? '▶' : '◀'}
          </button>

          {/* Navigation */}
          <nav className="flex-1 px-2 pb-4 overflow-y-auto">
            <Accordion
              type="single"
              collapsible
              className="space-y-1"
              /* When sidebar is collapsed, keep all groups closed */
              defaultValue={collapsed ? undefined : 'item-0'}
            >
              {navGroups.map((group, idx) => (
                <AccordionItem key={group.label} value={`item-${idx}`}>
                  <AccordionTrigger
                    className={clsx(
                      'text-sm font-semibold',
                      collapsed && 'justify-center'
                    )}
                  >
                    {group.label}
                  </AccordionTrigger>

                  <AccordionContent className="pt-1">
                    {group.items.length === 0 ? (
                      <div className="px-3 py-2 text-xs italic text-muted-foreground">
                        Coming soon
                      </div>
                    ) : (
                      group.items.map((item) => (
                        <NavItem
                          key={item.to}
                          to={item.to}
                          label={item.label}
                        />
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </nav>
        </aside>

        {/* -------- Content Outlet -------- */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* ------------  FOOTER  ------------ */}
      <footer className="flex-none h-10 bg-blue-900 text-white flex items-center pl-4 text-sm">
        © 2025 NTT Data Inc.
      </footer>
    </div>
  );
}

export default Layout;