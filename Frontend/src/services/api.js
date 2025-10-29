const API_BASE_URL = 'http://localhost:5000';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Something went wrong');
  }
  return response.json();
};

// Auth API functions
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // Login user
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },
};

// Applications API functions
export const applicationsAPI = {
  // Get all applications for a user
  getAll: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/applications?user_id=${userId}`);
    return handleResponse(response);
  },

  // Add new application
  add: async (applicationData) => {
    const response = await fetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(applicationData),
    });
    return handleResponse(response);
  },

  // Update application
  update: async (applicationId, updateData) => {
    const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  },

  // Delete application
  delete: async (applicationId) => {
    const response = await fetch(`${API_BASE_URL}/applications/${applicationId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// User/Account API functions
export const userAPI = {
  // Get user profile
  getProfile: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/accounts/${userId}`);
    return handleResponse(response);
  },

  // Update user profile
  updateProfile: async (userId, userData) => {
    const response = await fetch(`${API_BASE_URL}/accounts/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },
};

// Email accounts API functions
export const emailAccountsAPI = {
  // Get all email accounts for a user
  getAll: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/email-accounts/${userId}`);
    return handleResponse(response);
  },

  // Add new email account
  add: async (emailAccountData) => {
    const response = await fetch(`${API_BASE_URL}/email-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailAccountData),
    });
    return handleResponse(response);
  },

  // Delete email account
  delete: async (emailAccountId) => {
    const response = await fetch(`${API_BASE_URL}/email-accounts/${emailAccountId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },
};