const API_BASE_URL = 'http://localhost:5000';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('auth_token');
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    // Handle 401 Unauthorized (token expired)
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const error = await response.json();
    throw new Error(error.error || 'Something went wrong');
  }
  return response.json();
};

// Helper function to make authenticated requests
const authenticatedFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
};

// Auth API functions
export const authAPI = {
  // Register new user (keep for now, but will be deprecated)
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

  // Login user (keep for now, but will be deprecated)
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

  // OAuth: Get Google authorization URL
  getGoogleAuthUrl: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/google`);
    return handleResponse(response);
  },

  // OAuth: Get Microsoft authorization URL (for later)
  getMicrosoftAuthUrl: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/microsoft`);
    return handleResponse(response);
  },
};

// Applications API functions (update to use authenticatedFetch)
export const applicationsAPI = {
  getAll: async (userId) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/applications?user_id=${userId}`);
    return handleResponse(response);
  },

  add: async (applicationData) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/applications`, {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
    return handleResponse(response);
  },

  update: async (applicationId, updateData) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    return handleResponse(response);
  },

  delete: async (applicationId) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/applications/${applicationId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// User/Account API functions (update to use authenticatedFetch)
export const userAPI = {
  getProfile: async (userId) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/accounts/${userId}`);
    return handleResponse(response);
  },

  updateProfile: async (userId, userData) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/accounts/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },
};

// Email accounts API functions
export const emailAccountsAPI = {
  // Get all connected email accounts
  getAll: async () => {
    const response = await authenticatedFetch(`${API_BASE_URL}/gmail/accounts`);
    return handleResponse(response);
  },

  // Connect Gmail account (redirects to OAuth)
  connectGmail: async () => {
    const response = await authenticatedFetch(`${API_BASE_URL}/gmail/connect?provider=gmail`);
    const data = await handleResponse(response);
    // Redirect to OAuth URL
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
    return data;
  },

  // Connect Outlook/Microsoft account (redirects to OAuth)
  connectMicrosoft: async () => {
    const response = await authenticatedFetch(`${API_BASE_URL}/gmail/connect?provider=outlook`);
    const data = await handleResponse(response);
    // Redirect to OAuth URL
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
    return data;
  },

  // Trigger manual sync for an account
  syncAccount: async (accountId) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/gmail/sync/${accountId}`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  // Get sync status for an account
  getStatus: async (accountId) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/gmail/status/${accountId}`);
    return handleResponse(response);
  },

  // Disconnect an email account
  disconnectAccount: async (accountId) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/gmail/accounts/${accountId}`, {
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