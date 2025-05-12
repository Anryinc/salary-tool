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
  if (!data.length) return null;
  const sorted = [...data].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper === lower) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

// Функция для генерации диапазонов
const generateRanges = (step, maxSalary = 700000) => {
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
  const totalCount = data.length;
  if (totalCount === 0) return ranges.map(() => 0);

  return ranges.map(range => {
    const count = data.filter(item => {
      const salary = item.salary;
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
  return ranges.map(range => {
    const salariesInRange = data
      .filter(item => {
        const salary = item.salary;
        if (range.max === Infinity) {
          return salary >= range.min;
        }
        return salary >= range.min && salary < range.max;
      })
      .map(item => item.salary);

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
  return Object.entries(gradeRanges).map(([grade, range]) => {
    const salariesInRange = data
      .filter(item => {
        const salary = item.salary;
        return salary >= range.min && salary < range.max;
      })
      .map(item => item.salary);

    return {
      grade,
      range,
      percentiles: {
        grade1: calculatePercentile(salariesInRange, 15), // 15-й перцентиль для grade1
        grade2: calculatePercentile(salariesInRange, 50), // 50-й перцентиль для grade2
        grade3: calculatePercentile(salariesInRange, 85)  // 85-й перцентиль для grade3
      }
    };
  });
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
      const step = params.step || 10000;
      const ranges = generateRanges(step);
      const vacancyPercentages = countInRanges(mockData.salaryData.vacancies, ranges);
      const resumePercentages = countInRanges(mockData.salaryData.resumes, ranges);
      const vacancyPercentiles = calculateRangePercentiles(mockData.salaryData.vacancies, ranges);
      const resumePercentiles = calculateRangePercentiles(mockData.salaryData.resumes, ranges);

      resolve({
        ranges: ranges.map(r => r.label),
        vacancies: vacancyPercentages,
        resumes: resumePercentages,
        percentiles: {
          vacancies: vacancyPercentiles,
          resumes: resumePercentiles
        }
      });
    }, 300);
  });
};

export const getGradeStats = (params) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const vacancyGrades = calculateGradePercentiles(mockData.salaryData.vacancies, mockData.gradeRanges);
      const resumeGrades = calculateGradePercentiles(mockData.salaryData.resumes, mockData.gradeRanges);

      resolve({
        vacancies: vacancyGrades,
        resumes: resumeGrades
      });
    }, 300);
  });
};

export const updateGradeRange = (grade, minSalary, maxSalary) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (mockData.gradeRanges[grade]) {
        mockData.gradeRanges[grade] = { min: minSalary, max: maxSalary };
      }
      resolve(mockData.gradeRanges);
    }, 300);
  });
}; 