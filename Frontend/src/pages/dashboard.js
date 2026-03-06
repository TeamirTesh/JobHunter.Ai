import React, { useState } from 'react';
import { Briefcase, Calendar, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';

const Dashboard = ({ applications = [], user, onAddApplication, onPageChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const totalApplications = applications.length;
  const interviews = applications.filter((app) => app.status === 'Interview').length;
  const offers = applications.filter((app) => app.status === 'Offer').length;
  const rejected = applications.filter((app) => app.status === 'Rejected').length;
  const applied = applications.filter((app) => app.status === 'Applied').length;

  const recentApplications = applications
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const stats = [
    { label: 'Total Applications', value: totalApplications },
    { label: 'Interviews', value: interviews },
    { label: 'Offers', value: offers },
    { label: 'Rejected', value: rejected },
  ];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'status-applied';
      case 'interview': return 'status-interview';
      case 'offer': return 'status-offer';
      case 'rejected': return 'status-rejected';
      default: return 'status-applied';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return Clock;
      case 'interview': return Calendar;
      case 'offer': return CheckCircle;
      case 'rejected': return AlertCircle;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-semibold text-jobhunter-text tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-jobhunter-textMuted mt-0.5">Overview of your job applications</p>
      </div>

      {error && (
        <div className="p-3 bg-jobhunter-surface border border-jobhunter-border rounded-lg text-red-400 text-[13px]">
          {error}
        </div>
      )}

      {/* Stats grid — denser */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="bg-jobhunter-surface border border-jobhunter-border rounded-[10px] p-4 transition-colors duration-150 hover:border-jobhunter-border"
          >
            <p className="text-[11px] font-medium text-jobhunter-textMuted uppercase tracking-wide mb-0.5">
              {stat.label}
            </p>
            <p className="text-[28px] font-semibold text-jobhunter-text tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Applications — table-like panel */}
      <div className="bg-jobhunter-surface border border-jobhunter-border rounded-[12px] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-jobhunter-border">
          <h2 className="text-[16px] font-medium text-jobhunter-text">Recent Applications</h2>
          {onPageChange && (
            <button
              type="button"
              onClick={() => onPageChange('applications')}
              className="text-[13px] text-jobhunter-accent hover:underline transition-colors duration-150"
            >
              View all
            </button>
          )}
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-jobhunter-border border-t-jobhunter-accent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-[13px] text-jobhunter-textMuted">Loading applications...</p>
            </div>
          ) : recentApplications.length > 0 ? (
            <div className="space-y-2">
              {recentApplications.map((app) => {
                const StatusIcon = getStatusIcon(app.status);
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-jobhunter-bg border border-jobhunter-border transition-colors duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CompanyLogo company_domain={app.company_domain} company={app.company} size={10} className="border border-jobhunter-border flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-jobhunter-text text-[13px] truncate">{app.company ?? 'Unknown company'}</p>
                        <p className="text-jobhunter-textMuted text-[13px] truncate">{app.role ?? 'Unknown role'}</p>
                        <p className="text-jobhunter-textMuted text-[12px]">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`status-badge ${getStatusColor(app.status)} flex-shrink-0 ml-2`}>
                      <StatusIcon className="w-3 h-3 mr-1 inline" />
                      {app.status}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center">
              <div className="w-10 h-10 rounded-lg bg-jobhunter-surfaceAlt border border-jobhunter-border flex items-center justify-center mx-auto mb-3">
                <Briefcase className="w-5 h-5 text-jobhunter-textMuted" />
              </div>
              <p className="text-[13px] font-medium text-jobhunter-text mb-0.5">No applications yet</p>
              <p className="text-[13px] text-jobhunter-textMuted mb-3">Start by adding your first job application</p>
              {onPageChange && (
                <button
                  type="button"
                  onClick={() => onPageChange('applications')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-jobhunter-text border border-jobhunter-border rounded-lg hover:border-jobhunter-accent hover:text-jobhunter-accent transition-all duration-150"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Application
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
