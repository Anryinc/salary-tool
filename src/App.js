import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  TextField,
  Autocomplete,
  Paper,
  Typography,
  Slider,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { searchPositions, getSalaryData, getGradeStats } from './api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const GRADES = ['Intern', 'Junior', 'Middle', 'Senior', 'Lead'];

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [salaryData, setSalaryData] = useState({ vacancies: [], resumes: [] });
  const [gradeStats, setGradeStats] = useState({ vacancies: [], resumes: [] });
  const [gradeRange, setGradeRange] = useState([0, 4]);
  const [isRangeSelectMode, setIsRangeSelectMode] = useState(false);

  const fetchData = useCallback(() => {
    const params = {
      position: selectedPosition,
      ...(startDate && { start_date: startDate.toISOString().split('T')[0] }),
      ...(endDate && { end_date: endDate.toISOString().split('T')[0] }),
    };

    Promise.all([
      getSalaryData(params),
      getGradeStats(params)
    ])
      .then(([salaryResponse, statsResponse]) => {
        setSalaryData(salaryResponse);
        setGradeStats(statsResponse);
      })
      .catch(error => console.error('Error fetching data:', error));
  }, [selectedPosition, startDate, endDate]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchPositions(searchQuery)
        .then(data => setSuggestions(data))
        .catch(error => console.error('Error fetching suggestions:', error));
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPosition) {
      fetchData();
    }
  }, [selectedPosition, startDate, endDate, fetchData]);

  const chartData = {
    labels: salaryData.vacancies.map(item => item.date),
    datasets: [
      {
        label: 'Вакансии',
        data: salaryData.vacancies.map(item => item.salary),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
      },
      {
        label: 'Резюме',
        data: salaryData.resumes.map(item => item.salary),
        borderColor: 'rgba(255, 99, 132, 0.5)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Динамика зарплат',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Зарплата (₽)',
        },
      },
    },
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Анализ зарплат
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={suggestions}
                inputValue={searchQuery}
                onInputChange={(_, newValue) => setSearchQuery(newValue)}
                onChange={(_, newValue) => setSelectedPosition(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Поиск позиции"
                    variant="outlined"
                    fullWidth
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Начальная дата"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Конечная дата"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 4 }}>
            <Box sx={{ mb: 2 }}>
              <Button
                variant={isRangeSelectMode ? "contained" : "outlined"}
                onClick={() => setIsRangeSelectMode(!isRangeSelectMode)}
                sx={{ mb: 2 }}
              >
                {isRangeSelectMode ? "Отменить выбор диапазона" : "Выбрать диапазон грейдов"}
              </Button>
              {isRangeSelectMode && (
                <Slider
                  value={gradeRange}
                  onChange={(_, newValue) => setGradeRange(newValue)}
                  valueLabelDisplay="auto"
                  step={1}
                  marks={GRADES.map((grade, index) => ({
                    value: index,
                    label: grade,
                  }))}
                  min={0}
                  max={4}
                />
              )}
            </Box>
            <Line data={chartData} options={chartOptions} />
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Грейд</TableCell>
                  <TableCell align="right">Количество вакансий</TableCell>
                  <TableCell align="right">Средняя ЗП (вакансии)</TableCell>
                  <TableCell align="right">Количество резюме</TableCell>
                  <TableCell align="right">Средняя ЗП (резюме)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {GRADES.map((grade, index) => {
                  const vacancyStat = gradeStats.vacancies.find(v => v.experience === grade);
                  const resumeStat = gradeStats.resumes.find(r => r.grade === grade);
                  return (
                    <TableRow key={grade}>
                      <TableCell>{grade}</TableCell>
                      <TableCell align="right">{vacancyStat?.count || 0}</TableCell>
                      <TableCell align="right">
                        {vacancyStat?.avg_salary ? Math.round(vacancyStat.avg_salary) : '-'} ₽
                      </TableCell>
                      <TableCell align="right">{resumeStat?.count || 0}</TableCell>
                      <TableCell align="right">
                        {resumeStat?.avg_salary ? Math.round(resumeStat.avg_salary) : '-'} ₽
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>
    </LocalizationProvider>
  );
}

export default App;
