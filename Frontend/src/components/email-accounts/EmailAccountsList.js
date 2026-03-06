import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, Trash2, CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
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
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'syncing':
        return <Loader className="w-4 h-4 text-jobhunter-accent animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-jobhunter-textMuted" />;
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
        <div className="p-4 bg-jobhunter-bg border border-jobhunter-border rounded-lg text-emerald-400 text-[13px] mb-4">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-jobhunter-bg border border-jobhunter-border rounded-lg text-red-400 text-[13px] mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-base font-medium text-jobhunter-text">Connected Email Accounts</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConnectGmail}
            className="btn btn-primary text-[13px]"
            disabled={isLoading}
          >
            <Mail className="w-4 h-4" />
            Connect Gmail
          </button>
          <button
            type="button"
            onClick={handleConnectMicrosoft}
            className="border border-jobhunter-border rounded-lg px-4 py-2 text-[13px] font-medium text-jobhunter-text hover:border-jobhunter-accent transition-colors duration-150 bg-jobhunter-surface"
            disabled={isLoading}
          >
            <Mail className="w-4 h-4" />
            Connect Outlook
          </button>
        </div>
      </div>

      {isLoading && accounts.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-jobhunter-border border-t-jobhunter-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] text-jobhunter-textMuted">Loading email accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 bg-jobhunter-surface border border-jobhunter-border border-dashed rounded-[10px]">
          <div className="w-12 h-12 bg-jobhunter-surfaceAlt rounded-lg flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-jobhunter-textMuted" />
          </div>
          <h3 className="text-base font-medium text-jobhunter-text mb-2">No email accounts connected</h3>
          <p className="text-[13px] text-jobhunter-textMuted mb-6 max-w-md mx-auto">
            Connect your email accounts to automatically track job applications from your inbox
          </p>
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={handleConnectGmail} className="btn btn-primary">
              <Mail className="w-4 h-4" />
              Connect Gmail
            </button>
            <button
              type="button"
              onClick={handleConnectMicrosoft}
              className="border border-jobhunter-border rounded-lg px-4 py-2 text-jobhunter-text font-medium hover:border-jobhunter-accent transition-colors duration-150"
            >
              <Mail className="w-4 h-4" />
              Connect Outlook
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="p-4 bg-jobhunter-surface border border-jobhunter-border rounded-[10px] hover:border-jobhunter-border transition-colors duration-150"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    account.provider === 'Gmail'
                      ? 'bg-jobhunter-surfaceAlt'
                      : account.provider === 'Outlook'
                      ? 'bg-jobhunter-surfaceAlt'
                      : 'bg-jobhunter-surfaceAlt'
                  }`}>
                    <Mail className="w-5 h-5 text-jobhunter-textMuted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-jobhunter-text truncate text-[13px]">
                        {account.email_address}
                      </p>
                      {getStatusIcon(account.sync_status)}
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-jobhunter-textMuted flex-wrap">
                      <span className="font-medium">{account.provider}</span>
                      <span>{getStatusText(account.sync_status)}</span>
                      {account.last_synced_at && (
                        <span>Last synced: {formatDate(account.last_synced_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSync(account.id)}
                    disabled={syncingAccounts.has(account.id) || account.sync_status === 'syncing'}
                    className="p-2 text-jobhunter-textMuted hover:text-jobhunter-accent hover:border-jobhunter-accent border border-transparent rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sync now"
                  >
                    {syncingAccounts.has(account.id) || account.sync_status === 'syncing' ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(account.id)}
                    className="p-2 text-jobhunter-textMuted hover:text-red-400 rounded-lg transition-colors duration-150"
                    title="Disconnect"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {accounts.length > 0 && (
        <p className="text-[13px] text-jobhunter-textMuted mt-4">
          Email accounts are automatically synced every 30 minutes. You can also manually sync at any time.
        </p>
      )}
    </div>
  );
};

export default EmailAccountsList;

