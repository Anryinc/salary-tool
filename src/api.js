// Моковые данные для демонстрации
const mockData = {
  positions: [
    'Python Developer',
    'Java Developer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'DevOps Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'QA Engineer',
    'Product Manager'
  ],
  salaryData: {
    vacancies: [
      { date: '2024-01', salary: 150000 },
      { date: '2024-02', salary: 155000 },
      { date: '2024-03', salary: 160000 }
    ],
    resumes: [
      { date: '2024-01', salary: 140000 },
      { date: '2024-02', salary: 145000 },
      { date: '2024-03', salary: 150000 }
    ]
  },
  gradeStats: {
    vacancies: [
      { experience: 'Intern', count: 10, avg_salary: 80000 },
      { experience: 'Junior', count: 25, avg_salary: 120000 },
      { experience: 'Middle', count: 40, avg_salary: 180000 },
      { experience: 'Senior', count: 20, avg_salary: 250000 },
      { experience: 'Lead', count: 5, avg_salary: 350000 }
    ],
    resumes: [
      { grade: 'Intern', count: 15, avg_salary: 70000 },
      { grade: 'Junior', count: 30, avg_salary: 110000 },
      { grade: 'Middle', count: 45, avg_salary: 170000 },
      { grade: 'Senior', count: 25, avg_salary: 240000 },
      { grade: 'Lead', count: 8, avg_salary: 320000 }
    ]
  }
};

// Функции для работы с API
export const searchPositions = (query) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = mockData.positions.filter(pos => 
        pos.toLowerCase().includes(query.toLowerCase())
      );
      resolve(filtered);
    }, 300);
  });
};

export const getSalaryData = (params) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockData.salaryData);
    }, 300);
  });
};

export const getGradeStats = (params) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockData.gradeStats);
    }, 300);
  });
}; 