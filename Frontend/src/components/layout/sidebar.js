import React from 'react';
import { LayoutDashboard, Briefcase, User, X } from 'lucide-react';
import UserDropdown from './user-dropdown';

const Sidebar = ({ user, onLogout, currentPage, onPageChange, onClose, isMobile }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications', icon: Briefcase },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar header: avatar, workspace name, user, dropdown */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-jobhunter-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-jobhunter-surfaceAlt border border-jobhunter-border flex items-center justify-center text-jobhunter-text text-[11px] font-medium flex-shrink-0">
            {(String(user?.name ?? '').trim()[0] || user?.email?.[0] || 'U').toString().toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-jobhunter-text truncate whitespace-nowrap" title={user?.name ? `${user.name}'s Jobhunt` : "User's Jobhunt"}>
              {user?.name ? `${user.name}'s Jobhunt` : "User's Jobhunt"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <UserDropdown user={user} onLogout={onLogout} compact />
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-jobhunter-textMuted hover:text-jobhunter-text hover:bg-jobhunter-sidebarHover rounded transition-colors duration-150"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onPageChange(item.id);
                onClose?.();
              }}
              className={`group w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-md transition-all duration-150 relative ${
                isActive
                  ? 'text-jobhunter-text bg-jobhunter-sidebarHover'
                  : 'text-jobhunter-textMuted hover:text-jobhunter-text hover:bg-jobhunter-sidebarHover'
              }`}
            >
              {isActive ? (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-jobhunter-accent rounded-r" aria-hidden />
              ) : (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-transparent group-hover:bg-jobhunter-accent rounded-r transition-colors duration-150" aria-hidden />
              )}
              <Icon className="w-4 h-4 flex-shrink-0 ml-0.5" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
