import { openDB, deleteDB } from 'idb';

const DB_NAME = 'salary_tool_db';
const DB_VERSION = 2;

// Удаление базы данных
export const deleteDatabase = async () => {
  try {
    await deleteDB(DB_NAME);
    console.log('Database deleted successfully');
  } catch (error) {
    console.error('Error deleting database:', error);
  }
};

// Инициализация базы данных
export const initDB = async () => {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

        // Удаляем старые хранилища
        if (db.objectStoreNames.contains('positions')) {
          db.deleteObjectStore('positions');
        }
        if (db.objectStoreNames.contains('vacancies')) {
          db.deleteObjectStore('vacancies');
        }
        if (db.objectStoreNames.contains('resumes')) {
          db.deleteObjectStore('resumes');
        }

        // Создаем хранилище для позиций
        db.createObjectStore('positions', { keyPath: 'id', autoIncrement: true });

        // Создаем хранилище для вакансий
        const vacancyStore = db.createObjectStore('vacancies', { keyPath: 'id', autoIncrement: true });
        vacancyStore.createIndex('position', 'position');
        vacancyStore.createIndex('date', 'date');
        vacancyStore.createIndex('url', 'url', { unique: true });
        vacancyStore.createIndex('month', 'month');

        // Создаем хранилище для резюме
        const resumeStore = db.createObjectStore('resumes', { keyPath: 'id', autoIncrement: true });
        resumeStore.createIndex('position', 'position');
        resumeStore.createIndex('date', 'date');
        resumeStore.createIndex('url', 'url', { unique: true });
        resumeStore.createIndex('month', 'month');
      },
    });
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    // Если произошла ошибка, удаляем базу и пробуем снова
    await deleteDatabase();
    return initDB();
  }
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
  
  const results = [];
  const duplicates = [];
  
  for (const vacancy of vacancies) {
    try {
      // Проверяем, существует ли уже вакансия с таким ID
      const existing = await store.get(vacancy.id);
      
      if (existing) {
        // Если вакансия существует и датируется тем же месяцем, обновляем её
        const existingDate = new Date(existing.date);
        const newDate = new Date(vacancy.date);
        
        if (existingDate.getMonth() === newDate.getMonth() && 
            existingDate.getFullYear() === newDate.getFullYear()) {
          await store.put(vacancy);
          results.push(vacancy);
        } else {
          // Если вакансия из другого месяца, добавляем как новую
          const newId = `${vacancy.id}_${Date.now()}`;
          vacancy.id = newId;
          await store.add(vacancy);
          results.push(vacancy);
        }
      } else {
        // Если вакансии нет, добавляем как новую
        await store.add(vacancy);
        results.push(vacancy);
      }
    } catch (error) {
      console.error('Error adding vacancy:', error);
      duplicates.push(vacancy);
    }
  }
  
  await tx.complete;
  return { total: vacancies.length, new: results.length, duplicates: duplicates.length };
};

// Добавление резюме с проверкой дубликатов
export const addResumes = async (resumes) => {
  const db = await initDB();
  const tx = db.transaction('resumes', 'readwrite');
  const store = tx.objectStore('resumes');
  
  const results = [];
  const duplicates = [];
  
  for (const resume of resumes) {
    try {
      // Проверяем, существует ли уже резюме с таким ID
      const existing = await store.get(resume.id);
      
      if (existing) {
        // Если резюме существует и датируется тем же месяцем, обновляем его
        const existingDate = new Date(existing.date);
        const newDate = new Date(resume.date);
        
        if (existingDate.getMonth() === newDate.getMonth() && 
            existingDate.getFullYear() === newDate.getFullYear()) {
          await store.put(resume);
          results.push(resume);
        } else {
          // Если резюме из другого месяца, добавляем как новое
          const newId = `${resume.id}_${Date.now()}`;
          resume.id = newId;
          await store.add(resume);
          results.push(resume);
        }
      } else {
        // Если резюме нет, добавляем как новое
        await store.add(resume);
        results.push(resume);
      }
    } catch (error) {
      console.error('Error adding resume:', error);
      duplicates.push(resume);
    }
  }
  
  await tx.complete;
  return { total: resumes.length, new: results.length, duplicates: duplicates.length };
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
  if (!position) {
    console.warn('No position provided for getVacancies');
    return [];
  }

  const db = await initDB();
  const tx = db.transaction('vacancies', 'readonly');
  const store = tx.objectStore('vacancies');
  const positionIndex = store.index('position');

  try {
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
  } catch (error) {
    console.error('Error getting vacancies:', error);
    return [];
  }
};

// Получение резюме по позиции и датам
export const getResumes = async (position, startDate, endDate) => {
  if (!position) {
    console.warn('No position provided for getResumes');
    return [];
  }

  const db = await initDB();
  const tx = db.transaction('resumes', 'readonly');
  const store = tx.objectStore('resumes');
  const positionIndex = store.index('position');

  try {
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
  } catch (error) {
    console.error('Error getting resumes:', error);
    return [];
  }
}; 