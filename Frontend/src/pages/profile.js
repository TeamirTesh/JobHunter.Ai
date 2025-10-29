import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Settings, Bell, Shield, Plus, Trash2, Edit } from 'lucide-react';
import { userAPI, emailAccountsAPI } from '../services/api';

const Profile = ({ user }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [showAddEmailForm, setShowAddEmailForm] = useState(false);
  const [newEmailData, setNewEmailData] = useState({
    provider: '',
    email_address: ''
  });

  const profileSections = [
    {
      title: 'Account Information',
      icon: User,
      items: [
        { label: 'Full Name', value: user?.name || 'John Doe' },
        { label: 'Email', value: user?.email || 'john@example.com' },
        { label: 'Member Since', value: 'January 2024' }
      ]
    },
    {
      title: 'Preferences',
      icon: Settings,
      items: [
        { label: 'Email Notifications', value: 'Enabled' },
        { label: 'Theme', value: 'Light' },
        { label: 'Language', value: 'English' }
      ]
    },
    {
      title: 'Security',
      icon: Shield,
      items: [
        { label: 'Two-Factor Auth', value: 'Disabled' },
        { label: 'Last Login', value: 'Today' },
        { label: 'Password', value: '••••••••' }
      ]
    }
  ];

  const loadUserData = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError('');
    try {
      const userData = await userAPI.getProfile(user.id);
      const emailAccounts = await emailAccountsAPI.getAll(user.id);
      setEmailAccounts(emailAccounts);
    } catch (err) {
      setError('Failed to load profile data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmailAccount = async (e) => {
    e.preventDefault();
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const newEmailAccount = await emailAccountsAPI.add({
        user_id: user.id,
        ...newEmailData
      });
      setEmailAccounts(prev => [...prev, newEmailAccount.email_account]);
      setNewEmailData({ provider: '', email_address: '' });
      setShowAddEmailForm(false);
    } catch (err) {
      setError('Failed to add email account: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEmailAccount = async (emailAccountId) => {
    if (!window.confirm('Are you sure you want to delete this email account?')) return;
    
    setIsLoading(true);
    try {
      await emailAccountsAPI.delete(emailAccountId);
      setEmailAccounts(prev => prev.filter(account => account.id !== emailAccountId));
    } catch (err) {
      setError('Failed to delete email account: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data when component mounts
  useEffect(() => {
    loadUserData();
  }, [user?.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center lg:text-left"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Profile</h1>
        <p className="text-xl text-gray-600">Manage your account settings and preferences</p>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="card p-8"
      >
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6">
          <div className="w-24 h-24 bg-gradient-primary rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {user?.name || 'John Doe'}
            </h2>
            <p className="text-gray-600 mb-4">{user?.email || 'john@example.com'}</p>
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
                Premium Member
              </span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-full">
                Active
              </span>
            </div>
          </div>
          <button className="btn btn-primary">
            Edit Profile
          </button>
        </div>
      </motion.div>

      {/* Email Accounts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Email Accounts</h3>
          </div>
          <button
            onClick={() => setShowAddEmailForm(!showAddEmailForm)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Email
          </button>
        </div>

        {/* Add Email Form */}
        {showAddEmailForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 bg-gray-50 rounded-lg"
          >
            <form onSubmit={handleAddEmailAccount} className="space-y-4">
              <div>
                <label className="form-label">Provider</label>
                <select
                  value={newEmailData.provider}
                  onChange={(e) => setNewEmailData({ ...newEmailData, provider: e.target.value })}
                  className="form-input"
                  required
                >
                  <option value="">Select provider</option>
                  <option value="Gmail">Gmail</option>
                  <option value="Outlook">Outlook</option>
                  <option value="Yahoo">Yahoo</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  value={newEmailData.email_address}
                  onChange={(e) => setNewEmailData({ ...newEmailData, email_address: e.target.value })}
                  className="form-input"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddEmailForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? 'Adding...' : 'Add Email'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Email Accounts List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading email accounts...</p>
          </div>
        ) : emailAccounts.length > 0 ? (
          <div className="space-y-3">
            {emailAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{account.email_address}</p>
                    <p className="text-sm text-gray-600">{account.provider}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEmailAccount(account.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No email accounts</h3>
            <p className="text-gray-600 mb-4">
              Add your email accounts to track applications from different sources
            </p>
            <button
              onClick={() => setShowAddEmailForm(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Your First Email
            </button>
          </div>
        )}
      </motion.div>

      {/* Profile Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profileSections.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + sectionIndex * 0.1, duration: 0.6 }}
              className="card p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
              </div>
              <div className="space-y-4">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex justify-between items-center py-2">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 btn btn-ghost text-sm">
                Edit {section.title}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Notification Settings</span>
          </button>
          <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <Shield className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Security Settings</span>
          </button>
          <button className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">General Settings</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;