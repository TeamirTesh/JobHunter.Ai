import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Plus, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
import { emailAccountsAPI } from '../../services/api';

const EmailAccountsList = () => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncingAccounts, setSyncingAccounts] = useState(new Set());

  const loadAccounts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await emailAccountsAPI.getAll();
      setAccounts(response.accounts || []);
    } catch (err) {
      setError('Failed to load email accounts: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    
    // Check for success/error messages from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'email_connected') {
      setSuccess('Email account connected successfully!');
      // Reload accounts to show the newly connected account
      setTimeout(() => {
        loadAccounts();
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      }, 500);
    } else if (urlParams.get('error')) {
      const errorMsg = urlParams.get('error');
      setError('Failed to connect email account: ' + errorMsg);
      console.error('Email account connection error:', errorMsg);
    }
  }, []);

  const handleConnectGmail = async () => {
    try {
      await emailAccountsAPI.connectGmail();
      // Will redirect to OAuth, so no need to handle response
    } catch (err) {
      setError('Failed to initiate Gmail connection: ' + err.message);
    }
  };

  const handleConnectMicrosoft = async () => {
    try {
      await emailAccountsAPI.connectMicrosoft();
      // Will redirect to OAuth, so no need to handle response
    } catch (err) {
      setError('Failed to initiate Microsoft connection: ' + err.message);
    }
  };

  const handleSync = async (accountId) => {
    if (syncingAccounts.has(accountId)) return;
    
    setSyncingAccounts(prev => new Set(prev).add(accountId));
    setError('');
    try {
      await emailAccountsAPI.syncAccount(accountId);
      // Reload accounts to get updated status
      setTimeout(() => {
        loadAccounts();
        setSyncingAccounts(prev => {
          const next = new Set(prev);
          next.delete(accountId);
          return next;
        });
      }, 1000);
    } catch (err) {
      setError('Failed to sync account: ' + err.message);
      setSyncingAccounts(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const handleDisconnect = async (accountId) => {
    if (!window.confirm('Are you sure you want to disconnect this email account? This will stop automatic syncing.')) {
      return;
    }
    
    setError('');
    try {
      await emailAccountsAPI.disconnectAccount(accountId);
      setAccounts(prev => prev.filter(account => account.id !== accountId));
    } catch (err) {
      setError('Failed to disconnect account: ' + err.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'syncing':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Error';
      case 'idle':
        return 'Idle';
      default:
        return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Success Display */}
      {success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm mb-4"
        >
          {success}
        </motion.div>
      )}

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4"
        >
          {error}
        </motion.div>
      )}

      {/* Header with Connect Buttons */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Connected Email Accounts</h3>
        <div className="flex gap-2">
          <button
            onClick={handleConnectGmail}
            className="btn btn-primary text-sm"
            disabled={isLoading}
          >
            <Mail className="w-4 h-4" />
            Connect Gmail
          </button>
          <button
            onClick={handleConnectMicrosoft}
            className="btn btn-secondary text-sm"
            disabled={isLoading}
          >
            <Mail className="w-4 h-4" />
            Connect Outlook
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && accounts.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading email accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No email accounts connected</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your email accounts to automatically track job applications from your inbox
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleConnectGmail}
              className="btn btn-primary"
            >
              <Mail className="w-4 h-4" />
              Connect Gmail
            </button>
            <button
              onClick={handleConnectMicrosoft}
              className="btn btn-secondary"
            >
              <Mail className="w-4 h-4" />
              Connect Outlook
            </button>
          </div>
        </div>
      ) : (
        /* Accounts List */
        <div className="space-y-3">
          {accounts.map((account) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {/* Provider Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    account.provider === 'Gmail' 
                      ? 'bg-red-50' 
                      : account.provider === 'Outlook'
                      ? 'bg-blue-50'
                      : 'bg-gray-50'
                  }`}>
                    <Mail className={`w-6 h-6 ${
                      account.provider === 'Gmail'
                        ? 'text-red-600'
                        : account.provider === 'Outlook'
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`} />
                  </div>

                  {/* Account Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">
                        {account.email_address}
                      </p>
                      {getStatusIcon(account.sync_status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="font-medium">{account.provider}</span>
                      <span className="text-gray-400">•</span>
                      <span className={account.sync_status === 'error' ? 'text-red-600' : ''}>
                        {getStatusText(account.sync_status)}
                      </span>
                      {account.last_synced_at && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span>Last synced: {formatDate(account.last_synced_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleSync(account.id)}
                    disabled={syncingAccounts.has(account.id) || account.sync_status === 'syncing'}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sync now"
                  >
                    {syncingAccounts.has(account.id) || account.sync_status === 'syncing' ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Disconnect"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Text */}
      {accounts.length > 0 && (
        <p className="text-sm text-gray-500 mt-4">
          Email accounts are automatically synced every 30 minutes. You can also manually sync at any time.
        </p>
      )}
    </div>
  );
};

export default EmailAccountsList;

