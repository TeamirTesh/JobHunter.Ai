import React, { useState, useEffect } from 'react';
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
    const matchesSearch = app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.role.toLowerCase().includes(searchTerm.toLowerCase());
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

  const loadApplications = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError('');
    try {
      const applications = await applicationsAPI.getAll(user.id);
      // Update the parent component's applications state
      applications.forEach(app => onAddApplication(app));
    } catch (err) {
      setError('Failed to load applications: ' + err.message);
    } finally {
      setIsLoading(false);
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

  // Load applications when component mounts
  useEffect(() => {
    loadApplications();
  }, [user?.id]);

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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Applications</h1>
          <p className="text-xl text-gray-600">Manage your job applications</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAddNew}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Add Application
        </motion.button>
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

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="card p-6"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === option.value
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Applications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="space-y-4"
      >
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading applications...</h3>
          </motion.div>
        ) : filteredApplications.length > 0 ? (
          filteredApplications.map((app, index) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className="card card-hover p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-white font-bold">
                    {app.company.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{app.company}</h3>
                    <p className="text-gray-600">{app.role}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
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
                  <span className={`status-badge ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(app)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="card p-12 text-center"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm || filter !== 'all' ? 'No applications found' : 'No applications yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Start by adding your first job application'
              }
            </p>
            <button onClick={handleAddNew} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Add Application
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl p-6"
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
    company: application?.company || '',
    role: application?.role || '',
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
      <h2 className="text-xl font-bold text-gray-900 mb-6">
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
            placeholder="Enter company name"
            required
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
            placeholder="Enter job title"
            required
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