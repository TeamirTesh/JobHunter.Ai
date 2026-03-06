import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

const UserDropdown = ({ user, onLogout, compact }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitials = (String(user?.name ?? '').trim()[0] || user?.email?.[0] || 'U').toString().toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 text-jobhunter-text hover:bg-jobhunter-sidebarHover rounded transition-all duration-150 ${
          compact ? 'p-1.5' : 'p-1.5 pr-2'
        }`}
      >
        {!compact && (
          <>
            <div className="w-8 h-8 rounded-full bg-jobhunter-surfaceAlt border border-jobhunter-border flex items-center justify-center text-jobhunter-text text-[13px] font-medium">
              {userInitials}
            </div>
            <span className="hidden sm:block text-[13px] font-medium text-jobhunter-text max-w-[120px] truncate">
              {user?.name || 'User'}
            </span>
          </>
        )}
        <ChevronDown className={`w-4 h-4 text-jobhunter-textMuted transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={`absolute mt-2 w-56 bg-jobhunter-surface border border-jobhunter-border rounded-lg shadow-soft py-2 z-50 ${compact ? 'left-full ml-2' : 'right-0'}`}
          >
            <div className="px-3 py-2 border-b border-jobhunter-border">
              <p className="text-[13px] font-medium text-jobhunter-text truncate">{user?.name || 'User'}</p>
              <p className="text-[12px] text-jobhunter-textMuted truncate">{user?.email || ''}</p>
            </div>
            <div className="py-1">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-jobhunter-textMuted hover:text-jobhunter-text hover:bg-jobhunter-surfaceAlt transition-colors duration-150"
              >
                <User className="w-3.5 h-3.5" />
                Profile
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-jobhunter-textMuted hover:text-jobhunter-text hover:bg-jobhunter-surfaceAlt transition-colors duration-150"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </button>
            </div>
            <div className="border-t border-jobhunter-border my-1" />
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-jobhunter-textMuted hover:text-red-400 hover:bg-jobhunter-surfaceAlt transition-colors duration-150"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDropdown;
