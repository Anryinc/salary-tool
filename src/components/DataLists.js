import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid,
  Alert
} from '@mui/material';

const DataLists = ({ vacancies = [], resumes = [] }) => {
  // Функция для безопасного форматирования зарплаты
  const formatSalary = (salary) => {
    if (typeof salary !== 'number' || isNaN(salary)) {
      return 'Не указана';
    }
    return `${salary.toLocaleString()} ₽`;
  };

  // Функция для безопасного форматирования навыков
  const formatSkills = (skills) => {
    if (!Array.isArray(skills) || skills.length === 0) {
      return 'Не указаны';
    }
    return skills.join(', ');
  };

  // Функция для безопасного форматирования опыта
  const formatExperience = (experience) => {
    if (typeof experience === 'string') {
      return experience;
    }
    if (typeof experience === 'number') {
      return `${experience} лет`;
    }
    return 'Не указан';
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Загруженные данные
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="subtitle1" gutterBottom>
              Вакансии ({vacancies.length})
            </Typography>
            {vacancies.length === 0 ? (
              <Alert severity="info">Нет данных о вакансиях</Alert>
            ) : (
              <List>
                {vacancies.map((vacancy, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={vacancy.title || 'Без названия'}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {vacancy.company || 'Компания не указана'}
                            </Typography>
                            <br />
                            {`Зарплата: ${formatSalary(vacancy.salary)}`}
                            <br />
                            {`Опыт: ${formatExperience(vacancy.experience)}`}
                          </>
                        }
                      />
                    </ListItem>
                    {index < vacancies.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="subtitle1" gutterBottom>
              Резюме ({resumes.length})
            </Typography>
            {resumes.length === 0 ? (
              <Alert severity="info">Нет данных о резюме</Alert>
            ) : (
              <List>
                {resumes.map((resume, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={resume.title || 'Без названия'}
                        secondary={
                          <>
                            {`Зарплата: ${formatSalary(resume.salary)}`}
                            <br />
                            {`Опыт: ${formatExperience(resume.experience)}`}
                            <br />
                            {`Навыки: ${formatSkills(resume.skills)}`}
                          </>
                        }
                      />
                    </ListItem>
                    {index < resumes.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataLists; 