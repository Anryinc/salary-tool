import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Grid
} from '@mui/material';

const DataLists = ({ vacancies, resumes }) => {
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
            <List>
              {vacancies.map((vacancy, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={vacancy.title}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {vacancy.company}
                          </Typography>
                          <br />
                          {`Зарплата: ${vacancy.salary.toLocaleString()} ₽`}
                          <br />
                          {`Опыт: ${vacancy.experience}`}
                        </>
                      }
                    />
                  </ListItem>
                  {index < vacancies.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="subtitle1" gutterBottom>
              Резюме ({resumes.length})
            </Typography>
            <List>
              {resumes.map((resume, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={resume.title}
                      secondary={
                        <>
                          {`Зарплата: ${resume.salary.toLocaleString()} ₽`}
                          <br />
                          {`Опыт: ${resume.experience} лет`}
                          <br />
                          {`Навыки: ${resume.skills.join(', ')}`}
                        </>
                      }
                    />
                  </ListItem>
                  {index < resumes.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DataLists; 