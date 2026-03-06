import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './sidebar';

const Layout = ({ children, user, currentPage, onPageChange, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-jobhunter-bg">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed inset-y-0 left-0 z-50 w-[230px] bg-jobhunter-sidebar border-r border-jobhunter-border lg:hidden"
      >
        <Sidebar
          user={user}
          onLogout={onLogout}
          currentPage={currentPage}
          onPageChange={onPageChange}
          onClose={() => setSidebarOpen(false)}
          isMobile
        />
      </motion.div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-[230px] bg-jobhunter-sidebar border-r border-jobhunter-border">
        <Sidebar
          user={user}
          onLogout={onLogout}
          currentPage={currentPage}
          onPageChange={onPageChange}
          onClose={() => setSidebarOpen(false)}
          isMobile={false}
        />
      </aside>

      {/* Main content — no top bar */}
      <div className="lg:pl-[230px] min-h-screen flex flex-col">
        <main className="flex-1 p-4 lg:p-5">
          {/* Mobile: hamburger to open sidebar */}
          <div className="lg:hidden fixed top-3 left-3 z-30">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-jobhunter-textMuted hover:text-jobhunter-text hover:bg-jobhunter-sidebarHover rounded-lg transition-colors duration-150"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="max-w-[1200px] mx-auto pt-10 lg:pt-0"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
