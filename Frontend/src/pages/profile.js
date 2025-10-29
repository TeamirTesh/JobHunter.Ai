import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Settings, Bell, Shield } from 'lucide-react';

const Profile = ({ user }) => {
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

      {/* Profile Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {profileSections.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + sectionIndex * 0.1, duration: 0.6 }}
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

