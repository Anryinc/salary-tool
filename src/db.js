import { openDB } from 'idb';

const DB_NAME = 'salary_tool_db';
const DB_VERSION = 2;

// Инициализация базы данных
export const initDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Создаем хранилище для позиций
      if (!db.objectStoreNames.contains('positions')) {
        db.createObjectStore('positions', { keyPath: 'id', autoIncrement: true });
      }

      // Создаем хранилище для вакансий
      if (!db.objectStoreNames.contains('vacancies')) {
        const vacancyStore = db.createObjectStore('vacancies', { keyPath: 'id', autoIncrement: true });
        vacancyStore.createIndex('position', 'position');
        vacancyStore.createIndex('date', 'date');
        vacancyStore.createIndex('url', 'url', { unique: true });
        vacancyStore.createIndex('month', 'month');
      }

      // Создаем хранилище для резюме
      if (!db.objectStoreNames.contains('resumes')) {
        const resumeStore = db.createObjectStore('resumes', { keyPath: 'id', autoIncrement: true });
        resumeStore.createIndex('position', 'position');
        resumeStore.createIndex('date', 'date');
        resumeStore.createIndex('url', 'url', { unique: true });
        resumeStore.createIndex('month', 'month');
      }
    },
  });
  return db;
};

// Получение или создание позиции
export const getOrCreatePosition = async (position) => {
  const db = await initDB();
  const tx = db.transaction('positions', 'readwrite');
  const store = tx.objectStore('positions');

  // Проверяем существование позиции
  const existingPositions = await store.getAll();
  const existingPosition = existingPositions.find(p => p.name === position);

  if (existingPosition) {
    return existingPosition.id;
  }

  // Создаем новую позицию
  const id = await store.add({ name: position });
  await tx.done;
  return id;
};

// Добавление вакансий с проверкой дубликатов
export const addVacancies = async (vacancies) => {
  const db = await initDB();
  const tx = db.transaction('vacancies', 'readwrite');
  const store = tx.objectStore('vacancies');
  const urlIndex = store.index('url');

  const addedCount = { total: 0, new: 0, duplicates: 0 };

  for (const vacancy of vacancies) {
    // Добавляем месяц для проверки дубликатов
    const month = vacancy.date.substring(0, 7);
    vacancy.month = month;

    try {
      // Проверяем существование вакансии по URL
      const existingVacancy = await urlIndex.get(vacancy.url);
      
      if (existingVacancy) {
        // Если вакансия существует в том же месяце, пропускаем
        if (existingVacancy.month === month) {
          addedCount.duplicates++;
          continue;
        }
      }

      // Добавляем новую вакансию
      await store.add(vacancy);
      addedCount.new++;
    } catch (error) {
      if (error.name === 'ConstraintError') {
        addedCount.duplicates++;
      } else {
        throw error;
      }
    }
    addedCount.total++;
  }

  await tx.done;
  console.log('Added vacancies:', addedCount);
  return addedCount;
};

// Добавление резюме с проверкой дубликатов
export const addResumes = async (resumes) => {
  const db = await initDB();
  const tx = db.transaction('resumes', 'readwrite');
  const store = tx.objectStore('resumes');
  const urlIndex = store.index('url');

  const addedCount = { total: 0, new: 0, duplicates: 0 };

  for (const resume of resumes) {
    // Добавляем месяц для проверки дубликатов
    const month = resume.date.substring(0, 7);
    resume.month = month;

    try {
      // Проверяем существование резюме по URL
      const existingResume = await urlIndex.get(resume.url);
      
      if (existingResume) {
        // Если резюме существует в том же месяце, пропускаем
        if (existingResume.month === month) {
          addedCount.duplicates++;
          continue;
        }
      }

      // Добавляем новое резюме
      await store.add(resume);
      addedCount.new++;
    } catch (error) {
      if (error.name === 'ConstraintError') {
        addedCount.duplicates++;
      } else {
        throw error;
      }
    }
    addedCount.total++;
  }

  await tx.done;
  console.log('Added resumes:', addedCount);
  return addedCount;
};

// Получение всех позиций
export const getAllPositions = async () => {
  const db = await initDB();
  const tx = db.transaction('positions', 'readonly');
  const store = tx.objectStore('positions');
  const positions = await store.getAll();
  await tx.done;
  return positions;
};

// Получение вакансий по позиции и датам
export const getVacancies = async (position, startDate, endDate) => {
  const db = await initDB();
  const tx = db.transaction('vacancies', 'readonly');
  const store = tx.objectStore('vacancies');
  const positionIndex = store.index('position');

  let vacancies = await positionIndex.getAll(position);
  
  if (startDate) {
    const startMonth = startDate.substring(0, 7);
    vacancies = vacancies.filter(v => v.month >= startMonth);
  }
  if (endDate) {
    const endMonth = endDate.substring(0, 7);
    vacancies = vacancies.filter(v => v.month <= endMonth);
  }

  await tx.done;
  return vacancies;
};

// Получение резюме по позиции и датам
export const getResumes = async (position, startDate, endDate) => {
  const db = await initDB();
  const tx = db.transaction('resumes', 'readonly');
  const store = tx.objectStore('resumes');
  const positionIndex = store.index('position');

  let resumes = await positionIndex.getAll(position);
  
  if (startDate) {
    const startMonth = startDate.substring(0, 7);
    resumes = resumes.filter(r => r.month >= startMonth);
  }
  if (endDate) {
    const endMonth = endDate.substring(0, 7);
    resumes = resumes.filter(r => r.month <= endMonth);
  }

  await tx.done;
  return resumes;
}; 