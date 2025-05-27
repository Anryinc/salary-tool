// API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com'  // Замените на реальный URL вашего бэкенда
  : 'http://localhost:5000';

export const API_URLS = {
  SEARCH_POSITIONS: `${API_BASE_URL}/api/search_positions`,
  ADD_DATA: `${API_BASE_URL}/api/add_data`,
  GET_SALARY_DATA: `${API_BASE_URL}/api/get_salary_data`,
  GET_GRADE_STATS: `${API_BASE_URL}/api/get_grade_stats`
}; 