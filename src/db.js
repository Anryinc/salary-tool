import { openDB } from 'idb';

const DB_NAME = 'salary_tool_db';
const DB_VERSION = 1;

// Инициализация базы данных
export const initializeDatabase = async () => {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Создаем таблицу для должностей
      if (!db.objectStoreNames.contains('positions')) {
        db.createObjectStore('positions', { keyPath: 'id', autoIncrement: true });
      }

      // Создаем таблицу для вакансий
      if (!db.objectStoreNames.contains('vacancies')) {
        const vacancyStore = db.createObjectStore('vacancies', { keyPath: 'id', autoIncrement: true });
        vacancyStore.createIndex('position_id', 'position_id');
        vacancyStore.createIndex('date', 'date');
      }

      // Создаем таблицу для резюме
      if (!db.objectStoreNames.contains('resumes')) {
        const resumeStore = db.createObjectStore('resumes', { keyPath: 'id', autoIncrement: true });
        resumeStore.createIndex('position_id', 'position_id');
        resumeStore.createIndex('date', 'date');
      }
    },
  });

  return db;
};

// Получение или создание должности
export const getOrCreatePosition = async (db, positionName) => {
  const tx = db.transaction('positions', 'readwrite');
  const store = tx.objectStore('positions');

  // Ищем должность по имени
  const positions = await store.getAll();
  const existingPosition = positions.find(p => p.name === positionName);

  if (existingPosition) {
    return existingPosition.id;
  }

  // Если должность не найдена, создаем новую
  const newPosition = { name: positionName };
  return store.add(newPosition);
};

// Добавление вакансий
export const addVacancies = async (db, positionId, vacancies) => {
  const tx = db.transaction('vacancies', 'readwrite');
  const store = tx.objectStore('vacancies');

  const promises = vacancies.map(vacancy => 
    store.add({
      position_id: positionId,
      date: vacancy.date,
      salary: vacancy.salary
    })
  );

  await Promise.all(promises);
};

// Добавление резюме
export const addResumes = async (db, positionId, resumes) => {
  const tx = db.transaction('resumes', 'readwrite');
  const store = tx.objectStore('resumes');

  const promises = resumes.map(resume => 
    store.add({
      position_id: positionId,
      date: resume.date,
      salary: resume.salary
    })
  );

  await Promise.all(promises);
};

// Получение всех должностей
export const getAllPositions = async (db) => {
  const tx = db.transaction('positions', 'readonly');
  const store = tx.objectStore('positions');
  return store.getAll();
};

// Получение вакансий с фильтрацией
export const getVacancies = async (db, params) => {
  let positionId;
  if (params.position) {
    positionId = await getOrCreatePosition(db, params.position);
  }

  const tx = db.transaction('vacancies', 'readonly');
  const store = tx.objectStore('vacancies');
  const positionIndex = store.index('position_id');

  let vacancies;
  if (positionId) {
    vacancies = await positionIndex.getAll(positionId);
  } else {
    vacancies = await store.getAll();
  }

  // Фильтрация по дате
  if (params.start_date || params.end_date) {
    vacancies = vacancies.filter(vacancy => {
      const date = new Date(vacancy.date);
      if (params.start_date && date < new Date(params.start_date)) {
        return false;
      }
      if (params.end_date && date > new Date(params.end_date)) {
        return false;
      }
      return true;
    });
  }

  return vacancies;
};

// Получение резюме с фильтрацией
export const getResumes = async (db, params) => {
  let positionId;
  if (params.position) {
    positionId = await getOrCreatePosition(db, params.position);
  }

  const tx = db.transaction('resumes', 'readonly');
  const store = tx.objectStore('resumes');
  const positionIndex = store.index('position_id');

  let resumes;
  if (positionId) {
    resumes = await positionIndex.getAll(positionId);
  } else {
    resumes = await store.getAll();
  }

  // Фильтрация по дате
  if (params.start_date || params.end_date) {
    resumes = resumes.filter(resume => {
      const date = new Date(resume.date);
      if (params.start_date && date < new Date(params.start_date)) {
        return false;
      }
      if (params.end_date && date > new Date(params.end_date)) {
        return false;
      }
      return true;
    });
  }

  return resumes;
}; 