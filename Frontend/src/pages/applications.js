import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { applicationsAPI } from '../services/api';
import CompanyLogo from '../components/CompanyLogo';

const Applications = ({ applications = [], onAddApplication, onUpdateApplication, onDeleteApplication, user }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const statusOptions = [
    { value: 'all', label: 'All Applications', count: applications.length },
    { value: 'Applied', label: 'Applied', count: applications.filter(app => app.status === 'Applied').length },
    { value: 'Interview', label: 'Interview', count: applications.filter(app => app.status === 'Interview').length },
    { value: 'Offer', label: 'Offer', count: applications.filter(app => app.status === 'Offer').length },
    { value: 'Rejected', label: 'Rejected', count: applications.filter(app => app.status === 'Rejected').length }
  ];

  const filteredApplications = applications.filter(app => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch = (app.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (app.role || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleEdit = (app) => {
    setEditingApp(app);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setEditingApp(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    if (editingApp) {
      await handleUpdateApplication(editingApp.id, formData);
    } else {
      await handleAddApplication(formData);
    }
    setShowForm(false);
    setEditingApp(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      await handleDeleteApplication(id);
    }
  };

  const handleAddApplication = async (appData) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const newApp = await applicationsAPI.add({
        user_id: user.id,
        ...appData
      });
      onAddApplication(newApp.application);
    } catch (err) {
      setError('Failed to add application: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateApplication = async (id, appData) => {
    setIsLoading(true);
    try {
      await applicationsAPI.update(id, appData);
      onUpdateApplication(id, appData);
    } catch (err) {
      setError('Failed to update application: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApplication = async (id) => {
    setIsLoading(true);
    try {
      await applicationsAPI.delete(id);
      onDeleteApplication(id);
    } catch (err) {
      setError('Failed to delete application: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };


  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'applied': return 'status-applied';
      case 'interview': return 'status-interview';
      case 'offer': return 'status-offer';
      case 'rejected': return 'status-rejected';
      default: return 'status-applied';
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold text-jobhunter-text tracking-tight">Applications</h1>
          <p className="text-[13px] text-jobhunter-textMuted mt-0.5">Manage your job applications</p>
        </div>
        <button type="button" onClick={handleAddNew} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add Application
        </button>
      </div>

      {error && (
        <div className="p-4 bg-jobhunter-surface border border-jobhunter-border rounded-lg text-red-400 text-[13px]">
          {error}
        </div>
      )}

      <div className="card p-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-jobhunter-textMuted" />
            <input
              type="text"
              placeholder="Search applications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`px-3 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all duration-150 ${
                  filter === option.value
                    ? 'bg-jobhunter-surfaceAlt text-jobhunter-accent border border-jobhunter-accent'
                    : 'bg-jobhunter-surfaceAlt text-jobhunter-textMuted border border-jobhunter-border hover:border-jobhunter-accent hover:text-jobhunter-text'
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-2 border-jobhunter-border border-t-jobhunter-accent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[13px] text-jobhunter-textMuted">Loading applications...</p>
          </div>
        ) : filteredApplications.length > 0 ? (
          filteredApplications.map((app) => (
            <div
              key={app.id}
              className="card card-hover p-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <CompanyLogo company_domain={app.company_domain} company={app.company} size={12} />
                  <div>
                    <h3 className="text-base font-medium text-jobhunter-text">{app.company ?? 'Unknown company'}</h3>
                    <p className="text-[13px] text-jobhunter-textMuted">{app.role ?? 'Unknown role'}</p>
                    <div className="flex items-center gap-4 mt-2 text-[12px] text-jobhunter-textMuted">
                      {app.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {app.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {app.source}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`status-badge ${getStatusColor(app.status)}`}>{app.status}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleEdit(app)}
                      className="p-2 text-jobhunter-textMuted hover:text-jobhunter-accent hover:bg-jobhunter-surfaceAlt rounded-lg transition-colors duration-150"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(app.id)}
                      className="p-2 text-jobhunter-textMuted hover:text-red-400 hover:bg-jobhunter-surfaceAlt rounded-lg transition-colors duration-150"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 bg-jobhunter-surfaceAlt border border-jobhunter-border rounded-lg flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-jobhunter-textMuted" />
            </div>
            <p className="text-base font-medium text-jobhunter-text mb-1">
              {searchTerm || filter !== 'all' ? 'No applications found' : 'No applications yet'}
            </p>
            <p className="text-[13px] text-jobhunter-textMuted mb-4">
              {searchTerm || filter !== 'all' ? 'Try adjusting your search or filter' : 'Start by adding your first job application'}
            </p>
            <button type="button" onClick={handleAddNew} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Add Application
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-jobhunter-surface border border-jobhunter-border rounded-[10px] p-6"
            >
              <ApplicationForm
                application={editingApp}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Application Form Component
const ApplicationForm = ({ application, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    company: application?.company ?? '',
    role: application?.role ?? '',
    company_domain: application?.company_domain ?? '',
    location: application?.location || '',
    status: application?.status || 'Applied',
    source: application?.source || 'manual'
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div>
      <h2 className="text-base font-medium text-jobhunter-text mb-6">
        {application ? 'Edit Application' : 'Add New Application'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">Company</label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter company name (optional)"
          />
        </div>

        <div>
          <label className="form-label">Role/Position</label>
          <input
            type="text"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter job title (optional)"
          />
        </div>

        <div>
          <label className="form-label">Company domain (for logo)</label>
          <input
            type="text"
            name="company_domain"
            value={formData.company_domain}
            onChange={handleChange}
            className="form-input"
            placeholder="e.g. wellsfargo.com (optional)"
          />
        </div>

        <div>
          <label className="form-label">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter location (e.g., San Francisco, CA or Remote)"
          />
        </div>

        <div>
          <label className="form-label">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="form-input"
          >
            <option value="Applied">Applied</option>
            <option value="Interview">Interview</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="form-label">Source</label>
          <select
            name="source"
            value={formData.source}
            onChange={handleChange}
            className="form-input"
          >
            <option value="manual">Manual</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Indeed">Indeed</option>
            <option value="Company Website">Company Website</option>
            <option value="Referral">Referral</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 btn btn-primary"
          >
            {application ? 'Update' : 'Add'} Application
          </button>
        </div>
      </form>
    </div>
  );
};

export default Applications;