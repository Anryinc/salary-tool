import { getOrCreatePosition, addVacancies, addResumes, getVacancies, getResumes } from './db';

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