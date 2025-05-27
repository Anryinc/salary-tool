// Моковые данные для демонстрации
let mockData = {
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
    'Product Manager',
    'Шеф-повар',
    'Повар',
    'Су-повар',
    'Повар-кондитер'
  ],
  salaryData: {
    vacancies: [
      { position: 'Python Developer', date: '2024-01', salary: 150000 },
      { position: 'Python Developer', date: '2024-02', salary: 155000 },
      { position: 'Python Developer', date: '2024-03', salary: 160000 },
      { position: 'Java Developer', date: '2024-01', salary: 145000 },
      { position: 'Java Developer', date: '2024-02', salary: 150000 },
      { position: 'Java Developer', date: '2024-03', salary: 155000 },
      { position: 'Шеф-повар', date: '2024-01', salary: 120000 },
      { position: 'Шеф-повар', date: '2024-02', salary: 125000 },
      { position: 'Шеф-повар', date: '2024-03', salary: 130000 },
      { position: 'Повар', date: '2024-01', salary: 80000 },
      { position: 'Повар', date: '2024-02', salary: 85000 },
      { position: 'Повар', date: '2024-03', salary: 90000 }
    ],
    resumes: [
      { position: 'Python Developer', date: '2024-01', salary: 140000 },
      { position: 'Python Developer', date: '2024-02', salary: 145000 },
      { position: 'Python Developer', date: '2024-03', salary: 150000 },
      { position: 'Java Developer', date: '2024-01', salary: 135000 },
      { position: 'Java Developer', date: '2024-02', salary: 140000 },
      { position: 'Java Developer', date: '2024-03', salary: 145000 },
      { position: 'Шеф-повар', date: '2024-01', salary: 110000 },
      { position: 'Шеф-повар', date: '2024-02', salary: 115000 },
      { position: 'Шеф-повар', date: '2024-03', salary: 120000 },
      { position: 'Повар', date: '2024-01', salary: 75000 },
      { position: 'Повар', date: '2024-02', salary: 80000 },
      { position: 'Повар', date: '2024-03', salary: 85000 }
    ]
  },
  gradeRanges: {
    Intern: { min: 0, max: 60000 },
    Junior: { min: 60000, max: 150000 },
    Middle: { min: 150000, max: 260000 },
    Senior: { min: 260000, max: 350000 },
    Lead: { min: 350000, max: 470000 }
  }
};

// Функция для расчета перцентиля
const calculatePercentile = (data, percentile) => {
  if (!data || !data.length) return 0;
  const sorted = [...data].sort((a, b) => (a || 0) - (b || 0));
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper === lower) return sorted[lower] || 0;
  return ((sorted[lower] || 0) * (1 - weight) + (sorted[upper] || 0) * weight);
};

// Функция для генерации диапазонов
const generateRanges = (step, maxSalary = 700000) => {
  if (!step || step <= 0) step = 10000;
  const ranges = [];
  for (let i = 0; i < maxSalary; i += step) {
    ranges.push({
      min: i,
      max: i + step,
      label: `${i.toLocaleString()} - ${(i + step).toLocaleString()} ₽`
    });
  }
  ranges.push({
    min: maxSalary,
    max: Infinity,
    label: `${maxSalary.toLocaleString()}+ ₽`
  });
  return ranges;
};

// Функция для подсчета процентов значений в диапазонах
const countInRanges = (data, ranges) => {
  if (!data || !data.length) return ranges.map(() => 0);
  const totalCount = data.length;

  return ranges.map(range => {
    const count = data.filter(item => {
      const salary = item?.salary || 0;
      if (range.max === Infinity) {
        return salary >= range.min;
      }
      return salary >= range.min && salary < range.max;
    }).length;
    return (count / totalCount) * 100;
  });
};

// Функция для расчета перцентилей по диапазонам
const calculateRangePercentiles = (data, ranges) => {
  if (!data || !data.length) {
    return ranges.map(range => ({
      range: range.label,
      percentiles: {
        p10: 0,
        p25: 0,
        p50: 0,
        p75: 0,
        p90: 0
      }
    }));
  }

  return ranges.map(range => {
    const salariesInRange = data
      .filter(item => {
        const salary = item?.salary || 0;
        if (range.max === Infinity) {
          return salary >= range.min;
        }
        return salary >= range.min && salary < range.max;
      })
      .map(item => item?.salary || 0);

    return {
      range: range.label,
      percentiles: {
        p10: calculatePercentile(salariesInRange, 10),
        p25: calculatePercentile(salariesInRange, 25),
        p50: calculatePercentile(salariesInRange, 50),
        p75: calculatePercentile(salariesInRange, 75),
        p90: calculatePercentile(salariesInRange, 90)
      }
    };
  });
};

// Функция для расчета грейдов
const calculateGradePercentiles = (data, gradeRanges) => {
  if (!data || !data.length) {
    return Object.entries(gradeRanges).map(([grade, range]) => ({
      grade,
      range,
      percentiles: {
        grade1: 0,
        grade2: 0,
        grade3: 0
      }
    }));
  }

  return Object.entries(gradeRanges).map(([grade, range]) => {
    const salariesInRange = data
      .filter(item => {
        const salary = item?.salary || 0;
        return salary >= range.min && salary < range.max;
      })
      .map(item => item?.salary || 0);

    return {
      grade,
      range,
      percentiles: {
        grade1: calculatePercentile(salariesInRange, 15),
        grade2: calculatePercentile(salariesInRange, 50),
        grade3: calculatePercentile(salariesInRange, 85)
      }
    };
  });
};

// Функция для валидации входных данных
const validateParams = (params) => {
  if (!params) {
    throw new Error('Params are required');
  }
  if (params.step && (typeof params.step !== 'number' || params.step <= 0)) {
    throw new Error('Step must be a positive number');
  }
  if (params.position && typeof params.position !== 'string') {
    throw new Error('Position must be a string');
  }
  if (params.start_date && !Date.parse(params.start_date)) {
    throw new Error('Invalid start date');
  }
  if (params.end_date && !Date.parse(params.end_date)) {
    throw new Error('Invalid end date');
  }
};

// Функция для фильтрации данных по параметрам
const filterData = (data, params) => {
  let filtered = [...data];
  
  if (params.position) {
    // Разбиваем поисковый запрос на слова
    const searchWords = params.position.toLowerCase().split(/\s+/);
    
    filtered = filtered.filter(item => {
      if (!item.position) return false;
      
      // Разбиваем название должности на слова
      const positionWords = item.position.toLowerCase().split(/\s+/);
      
      // Проверяем, что все слова из поискового запроса присутствуют в названии должности
      return searchWords.every(searchWord => 
        positionWords.some(positionWord => 
          positionWord.includes(searchWord) || searchWord.includes(positionWord)
        )
      );
    });
  }
  
  if (params.start_date) {
    const startDate = new Date(params.start_date);
    filtered = filtered.filter(item => 
      new Date(item.date) >= startDate
    );
  }
  
  if (params.end_date) {
    const endDate = new Date(params.end_date);
    filtered = filtered.filter(item => 
      new Date(item.date) <= endDate
    );
  }
  
  return filtered;
};

// Функция для добавления новых данных
const addNewData = (position, newVacancies, newResumes) => {
  // Добавляем новую позицию, если её нет
  if (!mockData.positions.includes(position)) {
    mockData.positions.push(position);
  }

  // Добавляем новые вакансии
  newVacancies.forEach(vacancy => {
    // Проверяем, нет ли уже такой вакансии
    const exists = mockData.salaryData.vacancies.some(
      v => v.position === vacancy.position && 
           v.date === vacancy.date && 
           v.salary === vacancy.salary
    );
    if (!exists) {
      mockData.salaryData.vacancies.push(vacancy);
    }
  });

  // Добавляем новые резюме
  newResumes.forEach(resume => {
    // Проверяем, нет ли уже такого резюме
    const exists = mockData.salaryData.resumes.some(
      r => r.position === resume.position && 
           r.date === resume.date && 
           r.salary === resume.salary
    );
    if (!exists) {
      mockData.salaryData.resumes.push(resume);
    }
  });
};

// Функция для генерации тестовых данных
const generateTestData = (position) => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const date = `${year}-${month.toString().padStart(2, '0')}`;

  // Генерируем случайную зарплату в диапазоне
  const getRandomSalary = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // Генерируем новые данные
  const newVacancies = [
    {
      position,
      date,
      salary: getRandomSalary(80000, 300000)
    }
  ];

  const newResumes = [
    {
      position,
      date,
      salary: getRandomSalary(70000, 280000)
    }
  ];

  return { newVacancies, newResumes };
};

// Функции для работы с API
export const searchPositions = (query) => {
  return new Promise((resolve, reject) => {
    try {
      if (!query || typeof query !== 'string') {
        throw new Error('Invalid search query');
      }

      console.log('Searching positions with query:', query);
      
      setTimeout(() => {
        const filtered = mockData.positions.filter(pos => 
          pos.toLowerCase().includes(query.toLowerCase())
        );
        console.log('Found positions:', filtered);
        resolve(filtered);
      }, 300);
    } catch (error) {
      console.error('Error in searchPositions:', error);
      reject(error);
    }
  });
};

export const getSalaryData = (params) => {
  return new Promise((resolve, reject) => {
    try {
      validateParams(params);
      console.log('Getting salary data with params:', params);

      // Генерируем и добавляем новые данные
      if (params.position) {
        const { newVacancies, newResumes } = generateTestData(params.position);
        addNewData(params.position, newVacancies, newResumes);
      }

      const step = params.step || 10000;
      const ranges = generateRanges(step);
      
      // Фильтруем данные по параметрам
      const filteredVacancies = filterData(mockData.salaryData.vacancies, params);
      const filteredResumes = filterData(mockData.salaryData.resumes, params);
      
      console.log('Filtered data:', {
        vacancies: filteredVacancies,
        resumes: filteredResumes
      });

      const vacancyPercentages = countInRanges(filteredVacancies, ranges);
      const resumePercentages = countInRanges(filteredResumes, ranges);
      const vacancyPercentiles = calculateRangePercentiles(filteredVacancies, ranges);
      const resumePercentiles = calculateRangePercentiles(filteredResumes, ranges);

      const result = {
        ranges: ranges.map(r => r.label),
        vacancies: vacancyPercentages,
        resumes: resumePercentages,
        percentiles: {
          vacancies: vacancyPercentiles,
          resumes: resumePercentiles
        }
      };

      console.log('Salary data result:', result);
      resolve(result);
    } catch (error) {
      console.error('Error in getSalaryData:', error);
      reject(error);
    }
  });
};

export const getGradeStats = (params) => {
  return new Promise((resolve, reject) => {
    try {
      validateParams(params);
      console.log('Getting grade stats with params:', params);

      // Фильтруем данные по параметрам
      const filteredVacancies = filterData(mockData.salaryData.vacancies, params);
      const filteredResumes = filterData(mockData.salaryData.resumes, params);

      const vacancyGrades = calculateGradePercentiles(filteredVacancies, mockData.gradeRanges);
      const resumeGrades = calculateGradePercentiles(filteredResumes, mockData.gradeRanges);

      const result = {
        vacancies: vacancyGrades,
        resumes: resumeGrades
      };

      console.log('Grade stats result:', result);
      resolve(result);
    } catch (error) {
      console.error('Error in getGradeStats:', error);
      reject(error);
    }
  });
};

export const updateGradeRange = (grade, minSalary, maxSalary) => {
  return new Promise((resolve, reject) => {
    try {
      if (!grade || !mockData.gradeRanges[grade]) {
        throw new Error('Invalid grade');
      }
      if (typeof minSalary !== 'number' || minSalary < 0) {
        throw new Error('Invalid min salary');
      }
      if (typeof maxSalary !== 'number' || maxSalary <= minSalary) {
        throw new Error('Invalid max salary');
      }

      console.log('Updating grade range:', { grade, minSalary, maxSalary });

      if (mockData.gradeRanges[grade]) {
        mockData.gradeRanges[grade] = { min: minSalary, max: maxSalary };
        console.log('Updated grade ranges:', mockData.gradeRanges);
        resolve(mockData.gradeRanges);
      } else {
        throw new Error('Grade not found');
      }
    } catch (error) {
      console.error('Error in updateGradeRange:', error);
      reject(error);
    }
  });
}; 