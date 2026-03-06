import React, { useState, useEffect } from 'react';
import { User, Mail, Settings, Shield, Bell } from 'lucide-react';
import { userAPI } from '../services/api';
import EmailAccountsList from '../components/email-accounts/EmailAccountsList';

const Profile = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const profileSections = [
    {
      title: 'Account Information',
      icon: User,
      items: [
        { label: 'Full Name', value: user?.name || '—' },
        { label: 'Email', value: user?.email || '—' },
        { label: 'Member Since', value: '—' },
      ],
    },
    {
      title: 'Preferences',
      icon: Settings,
      items: [
        { label: 'Email Notifications', value: 'Enabled' },
        { label: 'Theme', value: 'Dark' },
        { label: 'Language', value: 'English' },
      ],
    },
    {
      title: 'Security',
      icon: Shield,
      items: [
        { label: 'Two-Factor Auth', value: 'Disabled' },
        { label: 'Last Login', value: '—' },
        { label: 'Password', value: '••••••••' },
      ],
    },
  ];

  const loadUserData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError('');
    try {
      await userAPI.getProfile(user.id);
    } catch (err) {
      setError('Failed to load profile data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [user?.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold text-jobhunter-text tracking-tight">Profile</h1>
        <p className="text-[13px] text-jobhunter-textMuted mt-0.5">Account settings and preferences</p>
      </div>

      {error && (
        <div className="p-4 bg-jobhunter-surface border border-jobhunter-border rounded-lg text-red-400 text-[13px]">
          {error}
        </div>
      )}

      <div className="bg-jobhunter-surface border border-jobhunter-border rounded-[10px] p-4">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-jobhunter-surfaceAlt border border-jobhunter-border flex items-center justify-center text-jobhunter-text text-base font-semibold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-base font-medium text-jobhunter-text">{user?.name || 'User'}</h2>
            <p className="text-[13px] text-jobhunter-textMuted mt-0.5">{user?.email || '—'}</p>
          </div>
        </div>
      </div>

      <div className="bg-jobhunter-surface border border-jobhunter-border rounded-[10px] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-jobhunter-textMuted" />
          <h3 className="text-[16px] font-medium text-jobhunter-text">Email Accounts</h3>
        </div>
        <EmailAccountsList />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {profileSections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="bg-jobhunter-surface border border-jobhunter-border rounded-[10px] p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-jobhunter-textMuted" />
                <h3 className="text-[16px] font-medium text-jobhunter-text">{section.title}</h3>
              </div>
              <div className="space-y-0">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-jobhunter-border last:border-0">
                    <span className="text-[13px] text-jobhunter-textMuted">{item.label}</span>
                    <span className="text-[13px] font-medium text-jobhunter-text">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-jobhunter-surface border border-jobhunter-border rounded-[10px] p-4">
        <h3 className="text-[16px] font-medium text-jobhunter-text mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <button type="button" className="flex items-center gap-2 p-3 bg-jobhunter-bg border border-jobhunter-border rounded-lg hover:border-jobhunter-accent transition-colors duration-150 text-left">
            <Bell className="w-4 h-4 text-jobhunter-textMuted" />
            <span className="text-[13px] font-medium text-jobhunter-text">Notifications</span>
          </button>
          <button type="button" className="flex items-center gap-2 p-3 bg-jobhunter-bg border border-jobhunter-border rounded-lg hover:border-jobhunter-accent transition-colors duration-150 text-left">
            <Shield className="w-4 h-4 text-jobhunter-textMuted" />
            <span className="text-[13px] font-medium text-jobhunter-text">Security</span>
          </button>
          <button type="button" className="flex items-center gap-2 p-3 bg-jobhunter-bg border border-jobhunter-border rounded-lg hover:border-jobhunter-accent transition-colors duration-150 text-left">
            <Settings className="w-4 h-4 text-jobhunter-textMuted" />
            <span className="text-[13px] font-medium text-jobhunter-text">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
