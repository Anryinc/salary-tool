import {
  initializeDatabase,
  getOrCreatePosition,
  addVacancies,
  addResumes,
  getAllPositions,
  getVacancies,
  getResumes
} from './db';

// Инициализация базы данных
let db = null;
initializeDatabase().then(database => {
  db = database;
  console.log('Database initialized');
}).catch(error => {
  console.error('Error initializing database:', error);
});

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

  // Генерируем больше данных для более реалистичной статистики
  const newVacancies = Array.from({ length: 20 }, () => ({
    position,
    date,
    salary: getRandomSalary(80000, 300000)
  }));

  const newResumes = Array.from({ length: 20 }, () => ({
    position,
    date,
    salary: getRandomSalary(70000, 280000)
  }));

  console.log('Generated test data:', {
    position,
    date,
    vacanciesCount: newVacancies.length,
    resumesCount: newResumes.length,
    sampleVacancy: newVacancies[0],
    sampleResume: newResumes[0]
  });

  return { newVacancies, newResumes };
};

// Функции для работы с API
export const searchPositions = async (query) => {
  try {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query');
    }

    console.log('Searching positions with query:', query);
    
    const response = await fetch(`/api/search_positions?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Failed to search positions');
    }
    
    const positions = await response.json();
    console.log('Found positions:', positions);
    return positions;
  } catch (error) {
    console.error('Error in searchPositions:', error);
    throw error;
  }
};

export const getSalaryData = async (params) => {
  try {
    validateParams(params);
    console.log('Getting salary data with params:', params);

    // Генерируем и добавляем новые данные
    if (params.position) {
      const { newVacancies, newResumes } = generateTestData(params.position);
      console.log('Adding new data to database:', {
        position: params.position,
        vacanciesCount: newVacancies.length,
        resumesCount: newResumes.length
      });

      // Отправляем данные на сервер
      const response = await fetch('/api/add_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          position: params.position,
          vacancies: newVacancies,
          resumes: newResumes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add data');
      }

      console.log('Data added successfully');
    }

    // Получаем данные из базы
    const response = await fetch(`/api/get_salary_data?${new URLSearchParams(params)}`);
    if (!response.ok) {
      throw new Error('Failed to get salary data');
    }

    const data = await response.json();
    console.log('Data from database:', data);

    const step = params.step || 10000;
    const ranges = generateRanges(step);
    
    const vacancyPercentages = countInRanges(data.vacancies, ranges);
    const resumePercentages = countInRanges(data.resumes, ranges);
    const vacancyPercentiles = calculateRangePercentiles(data.vacancies, ranges);
    const resumePercentiles = calculateRangePercentiles(data.resumes, ranges);

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
    return result;
  } catch (error) {
    console.error('Error in getSalaryData:', error);
    throw error;
  }
};

export const getGradeStats = async (params) => {
  try {
    validateParams(params);
    console.log('Getting grade stats with params:', params);

    const response = await fetch(`/api/get_grade_stats?${new URLSearchParams(params)}`);
    if (!response.ok) {
      throw new Error('Failed to get grade stats');
    }

    const data = await response.json();
    console.log('Grade stats result:', data);
    return data;
  } catch (error) {
    console.error('Error in getGradeStats:', error);
    throw error;
  }
};

export const updateGradeRange = async (grade, minSalary, maxSalary) => {
  try {
    if (!grade) {
      throw new Error('Invalid grade');
    }
    if (typeof minSalary !== 'number' || minSalary < 0) {
      throw new Error('Invalid min salary');
    }
    if (typeof maxSalary !== 'number' || maxSalary <= minSalary) {
      throw new Error('Invalid max salary');
    }

    console.log('Updating grade range:', { grade, minSalary, maxSalary });

    // В реальном приложении здесь будет обновление диапазонов в базе данных
    // Сейчас просто возвращаем обновленные данные
    return {
      Intern: { min: 0, max: 60000 },
      Junior: { min: 60000, max: 150000 },
      Middle: { min: 150000, max: 260000 },
      Senior: { min: 260000, max: 350000 },
      Lead: { min: 350000, max: 470000 },
      [grade]: { min: minSalary, max: maxSalary }
    };
  } catch (error) {
    console.error('Error in updateGradeRange:', error);
    throw error;
  }
}; 