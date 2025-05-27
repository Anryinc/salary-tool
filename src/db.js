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
    await tx.done;
    return existingPosition.id;
  }

  // Если должность не найдена, создаем новую
  const newPosition = { name: positionName };
  const id = await store.add(newPosition);
  await tx.done;
  return id;
};

// Добавление вакансий
export const addVacancies = async (db, positionId, vacancies) => {
  const tx = db.transaction('vacancies', 'readwrite');
  const store = tx.objectStore('vacancies');

  for (const vacancy of vacancies) {
    await store.add({
      position_id: positionId,
      date: vacancy.date,
      salary: vacancy.salary
    });
  }
  await tx.done;
};

// Добавление резюме
export const addResumes = async (db, positionId, resumes) => {
  const tx = db.transaction('resumes', 'readwrite');
  const store = tx.objectStore('resumes');

  for (const resume of resumes) {
    await store.add({
      position_id: positionId,
      date: resume.date,
      salary: resume.salary
    });
  }
  await tx.done;
};

// Получение всех должностей
export const getAllPositions = async (db) => {
  const tx = db.transaction('positions', 'readonly');
  const store = tx.objectStore('positions');
  const positions = await store.getAll();
  await tx.done;
  return positions;
};

// Получение вакансий с фильтрацией
export const getVacancies = async (db, params) => {
  const tx = db.transaction('vacancies', 'readonly');
  const store = tx.objectStore('vacancies');
  const positionIndex = store.index('position_id');

  let vacancies = [];

  if (params.position) {
    const positionId = await getOrCreatePosition(db, params.position);
    vacancies = await positionIndex.getAll(positionId);
  } else {
    vacancies = await store.getAll();
  }

  await tx.done;

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
  const tx = db.transaction('resumes', 'readonly');
  const store = tx.objectStore('resumes');
  const positionIndex = store.index('position_id');

  let resumes = [];

  if (params.position) {
    const positionId = await getOrCreatePosition(db, params.position);
    resumes = await positionIndex.getAll(positionId);
  } else {
    resumes = await store.getAll();
  }

  await tx.done;

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