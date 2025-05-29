import { getOrCreatePosition, addVacancies, addResumes, getVacancies, getResumes } from './db';

// Генерация случайной даты за последний год
const getRandomDate = () => {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const randomTime = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
};

// Генерация тестовых данных
export const generateTestData = async (position) => {
  try {
    console.log('Generating test data for position:', position);
    
    // Проверяем наличие данных в основной БД
    const existingData = await fetch(`/api/data/${position}`)
      .then(res => res.json())
      .catch(() => null);

    if (existingData && existingData.vacancies && existingData.resumes) {
      console.log('Found existing data in main database:', {
        vacancies: existingData.vacancies.length,
        resumes: existingData.resumes.length
      });

      // Сохраняем существующие данные в IndexedDB
      await addVacancies(existingData.vacancies);
      await addResumes(existingData.resumes);

      return {
        positionId: existingData.positionId,
        vacancies: existingData.vacancies,
        resumes: existingData.resumes,
        source: 'existing'
      };
    }

    // Генерируем новые данные
    const positionId = 1; // В реальном приложении это будет ID из БД
    const vacancies = [];
    const resumes = [];

    // Генерируем вакансии
    for (let i = 0; i < 60; i++) {
      const salary = getRandomSalary();
      const experience = getRandomExperience();
      const date = getRandomDate();
      
      vacancies.push({
        id: `v_${positionId}_${i}`,
        positionId,
        title: `${position} Developer`,
        company: `Company ${i + 1}`,
        salary,
        experience,
        date,
        skills: getRandomSkills(),
        grade: getGradeBySalary(salary)
      });
    }

    // Генерируем резюме
    for (let i = 0; i < 60; i++) {
      const salary = getRandomSalary();
      const experience = getRandomExperience();
      const date = getRandomDate();
      
      resumes.push({
        id: `r_${positionId}_${i}`,
        positionId,
        title: `${position} Developer`,
        salary,
        experience,
        date,
        skills: getRandomSkills(),
        grade: getGradeBySalary(salary)
      });
    }

    // Сохраняем новые данные в основную БД
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          positionId,
          position,
          vacancies,
          resumes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save data to main database');
      }

      console.log('Successfully saved data to main database');
    } catch (error) {
      console.error('Error saving to main database:', error);
      // Продолжаем выполнение, так как данные уже сохранены в IndexedDB
    }

    // Сохраняем в IndexedDB
    await addVacancies(vacancies);
    await addResumes(resumes);

    return {
      positionId,
      vacancies,
      resumes,
      source: 'new'
    };
  } catch (error) {
    console.error('Error generating test data:', error);
    throw error;
  }
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
export const getSalaryData = async (params) => {
  const { position, start_date, end_date, step = 10000 } = params;
  
  if (!position) {
    console.warn('No position provided for getSalaryData');
    return {
      ranges: [],
      vacancies: [],
      resumes: [],
      percentiles: { vacancies: [], resumes: [] }
    };
  }

  console.log('Getting salary data for position:', position, 'from', start_date, 'to', end_date);

  try {
    const vacancies = await getVacancies(position, start_date, end_date);
    const resumes = await getResumes(position, start_date, end_date);

    console.log('Retrieved data:', {
      vacancies: vacancies.length,
      resumes: resumes.length
    });

    // Находим минимальную и максимальную зарплату
    const allSalaries = [...vacancies, ...resumes].map(item => item.salary);
    const minSalary = Math.floor(Math.min(...allSalaries) / step) * step;
    const maxSalary = Math.ceil(Math.max(...allSalaries) / step) * step;

    // Создаем диапазоны
    const ranges = [];
    for (let i = minSalary; i < maxSalary; i += step) {
      ranges.push(`${i.toLocaleString()} - ${(i + step).toLocaleString()} ₽`);
    }

    // Функция для подсчета количества в диапазоне
    const countInRange = (items, min, max) => {
      return items.filter(item => item.salary >= min && item.salary < max).length;
    };

    // Функция для расчета перцентилей
    const calculatePercentiles = (items, min, max) => {
      const filtered = items.filter(item => item.salary >= min && item.salary < max)
        .map(item => item.salary)
        .sort((a, b) => a - b);
      
      if (filtered.length === 0) return null;

      const p10 = filtered[Math.floor(filtered.length * 0.1)];
      const p25 = filtered[Math.floor(filtered.length * 0.25)];
      const p50 = filtered[Math.floor(filtered.length * 0.5)];
      const p75 = filtered[Math.floor(filtered.length * 0.75)];
      const p90 = filtered[Math.floor(filtered.length * 0.9)];

      return { p10, p25, p50, p75, p90 };
    };

    // Считаем количество в каждом диапазоне
    const vacancyCounts = ranges.map((_, i) => {
      const min = minSalary + i * step;
      const max = min + step;
      return countInRange(vacancies, min, max);
    });

    const resumeCounts = ranges.map((_, i) => {
      const min = minSalary + i * step;
      const max = min + step;
      return countInRange(resumes, min, max);
    });

    // Рассчитываем перцентили для каждого диапазона
    const percentiles = {
      vacancies: ranges.map((range, i) => {
        const min = minSalary + i * step;
        const max = min + step;
        return {
          range,
          percentiles: calculatePercentiles(vacancies, min, max)
        };
      }),
      resumes: ranges.map((range, i) => {
        const min = minSalary + i * step;
        const max = min + step;
        return {
          range,
          percentiles: calculatePercentiles(resumes, min, max)
        };
      })
    };

    // Нормализуем данные для отображения в процентах
    const totalVacancies = vacancies.length;
    const totalResumes = resumes.length;

    const normalizedVacancies = vacancyCounts.map(count => 
      totalVacancies > 0 ? (count / totalVacancies) * 100 : 0
    );

    const normalizedResumes = resumeCounts.map(count => 
      totalResumes > 0 ? (count / totalResumes) * 100 : 0
    );

    return {
      ranges,
      vacancies: normalizedVacancies,
      resumes: normalizedResumes,
      percentiles
    };
  } catch (error) {
    console.error('Error in getSalaryData:', error);
    return {
      ranges: [],
      vacancies: [],
      resumes: [],
      percentiles: { vacancies: [], resumes: [] }
    };
  }
};

// Получение статистики по грейдам
export const getGradeStats = async (params) => {
  const { position } = params;
  
  if (!position) {
    console.warn('No position provided for getGradeStats');
    return {
      vacancies: [],
      resumes: []
    };
  }

  console.log('Getting grade stats for position:', position);

  try {
    const vacancies = await getVacancies(position);
    const resumes = await getResumes(position);

    // Определение грейда по опыту
    const getGrade = (experience) => {
      if (typeof experience === 'string') {
        if (experience.includes('Нет опыта')) return 'Intern';
        if (experience.includes('От 1 до 3')) return 'Junior';
        if (experience.includes('От 3 до 6')) return 'Middle';
        if (experience.includes('Более 6')) return 'Senior';
        return 'Lead';
      }
      if (typeof experience === 'number') {
        if (experience < 1) return 'Intern';
        if (experience < 3) return 'Junior';
        if (experience < 6) return 'Middle';
        if (experience < 10) return 'Senior';
        return 'Lead';
      }
      return 'Unknown';
    };

    // Группировка по грейдам
    const groupByGrade = (items, getExperience) => {
      const grades = {};
      items.forEach(item => {
        const grade = getGrade(getExperience(item));
        if (!grades[grade]) {
          grades[grade] = {
            grade,
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
          grade,
          count: len,
          min: salaries[0],
          max: salaries[len - 1],
          median: len % 2 === 0 
            ? (salaries[len/2 - 1] + salaries[len/2]) / 2 
            : salaries[Math.floor(len/2)],
          p25: salaries[Math.floor(len * 0.25)],
          p75: salaries[Math.floor(len * 0.75)],
          avg_salary: salaries.reduce((a, b) => a + b, 0) / len
        };
      });

      return Object.values(grades);
    };

    return {
      vacancies: groupByGrade(vacancies, v => v.experience),
      resumes: groupByGrade(resumes, r => r.experience)
    };
  } catch (error) {
    console.error('Error in getGradeStats:', error);
    return {
      vacancies: [],
      resumes: []
    };
  }
};

// Обновление диапазонов зарплат для грейдов
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