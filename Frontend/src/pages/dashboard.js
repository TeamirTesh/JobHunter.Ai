import React from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Calendar, 
  TrendingUp, 
  CheckCircle,
  Clock,
  AlertCircle,
  Plus
} from 'lucide-react';

const Dashboard = ({ applications = [] }) => {
  // Calculate statistics
  const totalApplications = applications.length;
  const interviews = applications.filter(app => app.status === 'Interview').length;
  const offers = applications.filter(app => app.status === 'Offer').length;
  const rejected = applications.filter(app => app.status === 'Rejected').length;
  const applied = applications.filter(app => app.status === 'Applied').length;

  // Get recent applications (last 5)
  const recentApplications = applications
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const stats = [
    {
      label: 'Total Applications',
      value: totalApplications,
      icon: Briefcase,
      color: 'indigo',
      change: '+12%'
    },
    {
      label: 'Interviews',
      value: interviews,
      icon: Calendar,
      color: 'blue',
      change: '+8%'
    },
    {
      label: 'Offers',
      value: offers,
      icon: CheckCircle,
      color: 'emerald',
      change: '+3%'
    },
    {
      label: 'Applied',
      value: applied,
      icon: Clock,
      color: 'amber',
      change: '+15%'
    }
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'applied': return 'status-applied';
      case 'interview': return 'status-interview';
      case 'offer': return 'status-offer';
      case 'rejected': return 'status-rejected';
      default: return 'status-applied';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'applied': return Clock;
      case 'interview': return Calendar;
      case 'offer': return CheckCircle;
      case 'rejected': return AlertCircle;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center lg:text-left"
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-xl text-gray-600">
          Here's your job application overview
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="card card-hover p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${stat.color}-50`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <span className="text-sm font-medium text-emerald-600">
                  {stat.change}
                </span>
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Applications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Recent Applications</h2>
            <p className="text-gray-600">Your latest job applications</p>
          </div>
          <button className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Add Application
          </button>
        </div>

        {recentApplications.length > 0 ? (
          <div className="space-y-4">
            {recentApplications.map((app, index) => {
              const StatusIcon = getStatusIcon(app.status);
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Briefcase className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{app.company}</h3>
                      <p className="text-gray-600">{app.role}</p>
                      <p className="text-sm text-gray-500">
                        Applied {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`status-badge ${getStatusColor(app.status)}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {app.status}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-center py-12"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No applications yet
            </h3>
            <p className="text-gray-600 mb-6">
              Start by adding your first job application to track your progress
            </p>
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Add Your First Application
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Track Progress</h3>
          <p className="text-sm text-gray-600 mb-4">
            Monitor your application success rate and identify patterns
          </p>
          <button className="btn btn-ghost text-sm">View Analytics</button>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Schedule Interviews</h3>
          <p className="text-sm text-gray-600 mb-4">
            Keep track of upcoming interviews and important dates
          </p>
          <button className="btn btn-ghost text-sm">View Calendar</button>
        </div>

        <div className="card p-6 text-center">
          <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-6 h-6 text-cyan-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Manage Applications</h3>
          <p className="text-sm text-gray-600 mb-4">
            Add, edit, and organize all your job applications in one place
          </p>
          <button className="btn btn-ghost text-sm">View All</button>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;