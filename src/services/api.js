// ═══════════════════════════════════════════════════════════════════
// API Service for CBT App
// This file handles all communication with the MongoDB backend
// ═══════════════════════════════════════════════════════════════════

// Configure this to your server URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// ═══════════════════════════════════════════════════════════════════
// Helper function for API requests
// ═══════════════════════════════════════════════════════════════════

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
  
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUESTIONS API
// ═══════════════════════════════════════════════════════════════════

export const questionsAPI = {
  // Get all questions
  async getAll() {
    const data = await apiRequest('/questions');
    // Transform MongoDB _id to id for consistency with existing code
    return data.map(q => ({
      ...q,
      id: q._id,
      at: q.createdAt
    }));
  },

  // Get filtered questions for exam
  async getFiltered(section, year, subject, type, track = null) {
    const params = new URLSearchParams({
      section,
      year: year.toString(),
      subject,
      type
    });
    
    if (track) {
      params.append('track', track);
    }
    
    const data = await apiRequest(`/questions/filter?${params}`);
    return data.map(q => ({
      ...q,
      id: q._id,
      at: q.createdAt
    }));
  },

  // Add a single question
  async add(question) {
    const data = await apiRequest('/questions', {
      method: 'POST',
      body: question,
    });
    return {
      ...data,
      id: data._id,
      at: data.createdAt
    };
  },

  // Bulk upload questions
  async addBulk(questions) {
    const data = await apiRequest('/questions/bulk', {
      method: 'POST',
      body: questions,
    });
    return data.questions.map(q => ({
      ...q,
      id: q._id,
      at: q.createdAt
    }));
  },

  // Update a question
  async update(id, updates) {
    const data = await apiRequest(`/questions/${id}`, {
      method: 'PUT',
      body: updates,
    });
    return {
      ...data,
      id: data._id
    };
  },

  // Delete a question
  async delete(id) {
    await apiRequest(`/questions/${id}`, {
      method: 'DELETE',
    });
  },

  // Delete multiple questions
  async deleteMany(ids) {
    await apiRequest('/questions/delete-many', {
      method: 'POST',
      body: { ids },
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// RESULTS API
// ═══════════════════════════════════════════════════════════════════

export const resultsAPI = {
  // Get all results
  async getAll() {
    const data = await apiRequest('/results');
    return data.map(r => ({
      ...r,
      id: r._id,
      ts: r.createdAt
    }));
  },

  // Get results for a specific student
  async getByStudent(studentId) {
    const data = await apiRequest(`/results/student/${studentId}`);
    return data.map(r => ({
      ...r,
      id: r._id,
      ts: r.createdAt
    }));
  },

  // Get statistics
  async getStats() {
    return await apiRequest('/results/stats');
  },

  // Save a result
  async save(result) {
    const data = await apiRequest('/results', {
      method: 'POST',
      body: result,
    });
    return {
      ...data,
      id: data._id,
      ts: data.createdAt
    };
  },

  // Delete a result
  async delete(id) {
    await apiRequest(`/results/${id}`, {
      method: 'DELETE',
    });
  },

  // Clear all results
  async clearAll() {
    await apiRequest('/results/clear/all', {
      method: 'DELETE',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// STUDENTS API
// ═══════════════════════════════════════════════════════════════════

export const studentsAPI = {
  // Get all students
  async getAll() {
    const data = await apiRequest('/students');
    return data.map(s => ({
      ...s,
      id: s.studentId,
      at: s.createdAt
    }));
  },

  // Get a specific student
  async get(studentId) {
    const data = await apiRequest(`/students/${studentId}`);
    return {
      ...data,
      id: data.studentId,
      at: data.createdAt
    };
  },

  // Login (register if new, update if existing)
  async login(studentData) {
    const data = await apiRequest('/students/login', {
      method: 'POST',
      body: {
        studentId: studentData.id,
        name: studentData.name,
        role: studentData.role || 'student',
        section: studentData.section
      },
    });
    return {
      ...data,
      id: data.studentId,
      at: data.createdAt
    };
  },

  // Update student
  async update(studentId, updates) {
    const data = await apiRequest(`/students/${studentId}`, {
      method: 'PUT',
      body: updates,
    });
    return {
      ...data,
      id: data.studentId
    };
  },

  // Delete student
  async delete(studentId) {
    await apiRequest(`/students/${studentId}`, {
      method: 'DELETE',
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

export async function checkServerHealth() {
  try {
    const data = await apiRequest('/health');
    return { connected: true, ...data };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

// Export all APIs as a single object for convenience
export default {
  questions: questionsAPI,
  results: resultsAPI,
  students: studentsAPI,
  checkHealth: checkServerHealth
};
