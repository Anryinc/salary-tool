// Удаляем неиспользуемый импорт
// import { API_URLS } from './config';
import { getOrCreatePosition, addVacancies, addResumes, getVacancies, getResumes } from './db';

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

// Генерация случайной даты в текущем месяце
const getRandomDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = Math.floor(Math.random() * now.getDate()) + 1;
  return new Date(year, month, day).toISOString().split('T')[0];
};

// Генерация тестовых данных
export const generateTestData = async (position) => {
  console.log('Generating test data for position:', position);

  // Генерируем 1500 вакансий (лимит HH.ru в день)
  const vacancies = Array.from({ length: 1500 }, (_, i) => ({
    position,
    title: `Вакансия ${position} #${i + 1}`,
    company: `Компания ${Math.floor(Math.random() * 100) + 1}`,
    salary: Math.floor(Math.random() * 200000) + 50000,
    date: getRandomDate(),
    url: `https://hh.ru/vacancy/${Math.floor(Math.random() * 1000000)}`,
    description: 'Описание вакансии...',
    requirements: 'Требования к кандидату...',
    responsibilities: 'Обязанности...',
    location: 'Москва',
    experience: ['Нет опыта', 'От 1 до 3 лет', 'От 3 до 6 лет', 'Более 6 лет'][Math.floor(Math.random() * 4)],
    employment: ['Полная занятость', 'Частичная занятость', 'Проектная работа'][Math.floor(Math.random() * 3)],
    schedule: ['Полный день', 'Удаленная работа', 'Гибкий график'][Math.floor(Math.random() * 3)]
  }));

  // Генерируем 1500 резюме
  const resumes = Array.from({ length: 1500 }, (_, i) => ({
    position,
    title: `Резюме ${position} #${i + 1}`,
    salary: Math.floor(Math.random() * 300000) + 50000,
    date: getRandomDate(),
    url: `https://hh.ru/resume/${Math.floor(Math.random() * 1000000)}`,
    experience: Math.floor(Math.random() * 10),
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Java', 'C++'].slice(0, Math.floor(Math.random() * 6) + 1),
    education: ['Высшее', 'Неоконченное высшее', 'Среднее специальное'][Math.floor(Math.random() * 3)],
    location: 'Москва',
    employment: ['Полная занятость', 'Частичная занятость', 'Проектная работа'][Math.floor(Math.random() * 3)],
    schedule: ['Полный день', 'Удаленная работа', 'Гибкий график'][Math.floor(Math.random() * 3)]
  }));

  console.log('Generated test data:', {
    vacancies: vacancies.length,
    resumes: resumes.length,
    sampleVacancy: vacancies[0],
    sampleResume: resumes[0]
  });

  // Сохраняем данные в базу
  const positionId = await getOrCreatePosition(position);
  const vacancyResults = await addVacancies(vacancies);
  const resumeResults = await addResumes(resumes);

  return {
    positionId,
    vacancies: vacancyResults,
    resumes: resumeResults
  };
};

// Поиск позиций
export const searchPositions = async (query) => {
  console.log('Searching positions with query:', query);
  
  // Список популярных позиций
  const positions = [
    'iOS разработчик',
    'iOS Developer',
    'Swift разработчик',
    'Swift Developer',
    'iOS инженер',
    'iOS Engineer',
    'Мобильный разработчик iOS',
    'Mobile iOS Developer',
    'Разработчик приложений iOS',
    'iOS Application Developer'
  ];

  // Фильтруем позиции по запросу
  const filteredPositions = positions.filter(position => 
    position.toLowerCase().includes(query.toLowerCase())
  );

  console.log('Found positions:', filteredPositions);
  return filteredPositions;
};

// Получение данных о зарплатах
export const getSalaryData = async (position, startDate, endDate) => {
  console.log('Getting salary data for position:', position, 'from', startDate, 'to', endDate);

  const vacancies = await getVacancies(position, startDate, endDate);
  const resumes = await getResumes(position, startDate, endDate);

  console.log('Retrieved data:', {
    vacancies: vacancies.length,
    resumes: resumes.length
  });

  // Расчет статистики
  const calculateStats = (items) => {
    if (items.length === 0) return null;

    const salaries = items.map(item => item.salary).sort((a, b) => a - b);
    const len = salaries.length;

    return {
      min: salaries[0],
      max: salaries[len - 1],
      median: len % 2 === 0 
        ? (salaries[len/2 - 1] + salaries[len/2]) / 2 
        : salaries[Math.floor(len/2)],
      p25: salaries[Math.floor(len * 0.25)],
      p75: salaries[Math.floor(len * 0.75)],
      count: len
    };
  };

  return {
    vacancies: calculateStats(vacancies),
    resumes: calculateStats(resumes)
  };
};

// Получение статистики по грейдам
export const getGradeStats = async (position) => {
  console.log('Getting grade stats for position:', position);

  const vacancies = await getVacancies(position);
  const resumes = await getResumes(position);

  // Определение грейда по опыту
  const getGrade = (experience) => {
    if (experience < 1) return 'Junior';
    if (experience < 3) return 'Middle';
    if (experience < 6) return 'Senior';
    return 'Lead';
  };

  // Группировка по грейдам
  const groupByGrade = (items, getExperience) => {
    const grades = {};
    items.forEach(item => {
      const grade = getGrade(getExperience(item));
      if (!grades[grade]) {
        grades[grade] = {
          count: 0,
          salaries: []
        };
      }
      grades[grade].count++;
      grades[grade].salaries.push(item.salary);
    });

    // Расчет статистики для каждого грейда
    Object.keys(grades).forEach(grade => {
      const salaries = grades[grade].salaries.sort((a, b) => a - b);
      const len = salaries.length;
      grades[grade] = {
        count: len,
        min: salaries[0],
        max: salaries[len - 1],
        median: len % 2 === 0 
          ? (salaries[len/2 - 1] + salaries[len/2]) / 2 
          : salaries[Math.floor(len/2)],
        p25: salaries[Math.floor(len * 0.25)],
        p75: salaries[Math.floor(len * 0.75)]
      };
    });

    return grades;
  };

  return {
    vacancies: groupByGrade(vacancies, v => v.experience),
    resumes: groupByGrade(resumes, r => r.experience)
  };
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