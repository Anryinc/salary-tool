import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  TextField,
  Autocomplete,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { searchPositions, getSalaryData, getGradeStats, updateGradeRange, generateTestData } from './api';
import { deleteDatabase } from './db';
import EditIcon from '@mui/icons-material/Edit';
import SalaryDistribution from './components/SalaryDistribution';
import './App.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const GRADES = ['Intern', 'Junior', 'Middle', 'Senior', 'Lead'];
const RANGE_STEPS = [
  { value: 1000, label: '1 000 ₽' },
  { value: 5000, label: '5 000 ₽' },
  { value: 10000, label: '10 000 ₽' },
  { value: 20000, label: '20 000 ₽' },
];

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [salaryData, setSalaryData] = useState({ ranges: [], vacancies: [], resumes: [], percentiles: { vacancies: [], resumes: [] } });
  const [gradeStats, setGradeStats] = useState({ vacancies: [], resumes: [] });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [rangeStep, setRangeStep] = useState(10000);
  const [selectedRange, setSelectedRange] = useState(null);
  const [assignGradeDialogOpen, setAssignGradeDialogOpen] = useState(false);
  const [gradeRanges, setGradeRanges] = useState({
    Intern: { min: 0, max: 60000 },
    Junior: { min: 60000, max: 150000 },
    Middle: { min: 150000, max: 260000 },
    Senior: { min: 260000, max: 350000 },
    Lead: { min: 350000, max: 470000 }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [notification, setNotification] = useState(null);

  const fetchData = useCallback(() => {
    try {
      console.log('Fetching data with params:', {
        position: selectedPosition,
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0],
        step: rangeStep
      });

      const params = {
        position: selectedPosition,
        ...(startDate && { start_date: startDate.toISOString().split('T')[0] }),
        ...(endDate && { end_date: endDate.toISOString().split('T')[0] }),
        step: rangeStep,
      };

      Promise.all([
        getSalaryData(params),
        getGradeStats(params)
      ])
        .then(([salaryResponse, statsResponse]) => {
          console.log('Salary data response:', salaryResponse);
          console.log('Grade stats response:', statsResponse);
          setSalaryData(salaryResponse);
          setGradeStats(statsResponse);
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          // Устанавливаем пустые данные в случае ошибки
          setSalaryData({ ranges: [], vacancies: [], resumes: [], percentiles: { vacancies: [], resumes: [] } });
          setGradeStats({ vacancies: [], resumes: [] });
        });
    } catch (error) {
      console.error('Error in fetchData:', error);
      // Устанавливаем пустые данные в случае ошибки
      setSalaryData({ ranges: [], vacancies: [], resumes: [], percentiles: { vacancies: [], resumes: [] } });
      setGradeStats({ vacancies: [], resumes: [] });
    }
  }, [selectedPosition, startDate, endDate, rangeStep]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      try {
        console.log('Searching positions with query:', searchQuery);
        searchPositions(searchQuery)
          .then(data => {
            console.log('Search results:', data);
            setSuggestions(data);
          })
          .catch(error => {
            console.error('Error fetching suggestions:', error);
            setSuggestions([]);
          });
      } catch (error) {
        console.error('Error in search effect:', error);
        setSuggestions([]);
      }
    }
  }, [searchQuery]);

  useEffect(() => {
    if (selectedPosition) {
      console.log('Selected position changed:', selectedPosition);
      // No need to auto-fetch here anymore if we have a manual button
      // Keep if you still want initial load or load on filter change
      // fetchData();
    }
  }, [selectedPosition, startDate, endDate, rangeStep, fetchData]); // Remove fetchData if you remove the call inside

  const handleEditClick = (grade) => {
    try {
      console.log('Editing grade:', grade);
      const gradeStat = gradeStats.resumes.find(r => r.grade === grade);
      if (gradeStat) {
        setSelectedGrade(grade);
        setMinSalary(gradeStat.range.min.toString());
        setMaxSalary(gradeStat.range.max.toString());
        setEditDialogOpen(true);
      }
    } catch (error) {
      console.error('Error in handleEditClick:', error);
    }
  };

  const handleSaveRange = () => {
    try {
      if (selectedGrade && minSalary && maxSalary) {
        console.log('Saving grade range:', {
          grade: selectedGrade,
          minSalary: parseInt(minSalary),
          maxSalary: parseInt(maxSalary)
        });
        updateGradeRange(selectedGrade, parseInt(minSalary), parseInt(maxSalary))
          .then(updatedStats => {
            console.log('Updated grade stats:', updatedStats);
            setGradeStats(updatedStats);
            setEditDialogOpen(false);
          })
          .catch(error => {
            console.error('Error updating grade range:', error);
          });
      }
    } catch (error) {
      console.error('Error in handleSaveRange:', error);
    }
  };

  const handleRangeClick = (range) => {
    try {
      console.log('Range clicked:', range);
      setSelectedRange(range);
      setAssignGradeDialogOpen(true);
    } catch (error) {
      console.error('Error in handleRangeClick:', error);
    }
  };

  const handleAssignGrade = (grade) => {
    try {
      if (selectedRange && grade) {
        console.log('Assigning grade:', {
          range: selectedRange,
          grade: grade
        });
        const [min, max] = selectedRange.split(' - ').map(val => 
          parseInt(val.replace(/[^\d]/g, ''))
        );
        updateGradeRange(grade, min, max)
          .then(() => {
            console.log('Grade assigned successfully');
            setAssignGradeDialogOpen(false);
            fetchData();
          })
          .catch(error => {
            console.error('Error assigning grade:', error);
          });
      }
    } catch (error) {
      console.error('Error in handleAssignGrade:', error);
    }
  };

  const handleGradeRangeUpdate = async (grade, range) => {
    try {
      const [min, max] = range.split(' - ').map(str => 
        parseInt(str.replace(/[^\d]/g, ''))
      );
      
      await updateGradeRange(grade, min, max);
      setGradeRanges(prev => ({
        ...prev,
        [grade]: { min, max }
      }));
      
      // Refresh salary data to reflect new grade ranges
      await fetchData();
    } catch (error) {
      console.error('Error updating grade range:', error);
    }
  };

  const handleLoadDataClick = async () => {
    if (!selectedPosition) {
      setNotification({
        message: 'Пожалуйста, выберите должность',
        type: 'error'
      });
      return;
    }

    setIsLoading(true);
    setLoadingProgress(0);
    setNotification(null);

    try {
      // Удаляем старую БД IndexedDB
      console.log('Removing old IndexedDB database...');
      await deleteDatabase();
      console.log('Old database removed');
      setLoadingProgress(5);

      // Генерируем или получаем тестовые данные
      console.log('Loading data for position:', selectedPosition);
      setNotification({
        message: 'Генерация данных...',
        type: 'info'
      });
      setLoadingProgress(10);

      const result = await generateTestData(selectedPosition);
      console.log('Data loading result:', result);
      setLoadingProgress(80);

      // Обновляем данные
      setNotification({
        message: 'Обновление статистики...',
        type: 'info'
      });
      setSalaryData({
        vacancies: result.vacancies,
        resumes: result.resumes,
        percentiles: {
          P25: 0,
          P50: 0,
          P75: 0
        }
      });
      setLoadingProgress(90);

      // Обновляем статистику по грейдам
      const gradeStats = await getGradeStats({ position: selectedPosition });
      setGradeStats(gradeStats);
      setLoadingProgress(100);

      // Показываем уведомление об успешной загрузке
      setNotification({
        message: 'Данные успешно загружены',
        type: 'success'
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setNotification({
        message: 'Ошибка при загрузке данных. Пожалуйста, попробуйте еще раз.',
        type: 'error'
      });
      // Устанавливаем пустые данные в случае ошибки
      setSalaryData({
        vacancies: [],
        resumes: [],
        percentiles: {
          P25: 0,
          P50: 0,
          P75: 0
        }
      });
      setGradeStats({
        vacancies: [],
        resumes: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Добавляем проверку на наличие данных перед рендерингом
  if (!salaryData || !gradeStats) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Загрузка данных...
          </Typography>
        </Box>
      </Container>
    );
  }

  const chartData = {
    labels: salaryData.ranges || [],
    datasets: [
      {
        label: 'Вакансии',
        data: salaryData.vacancies || [],
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
        order: 1,
      },
      {
        label: 'Резюме',
        data: salaryData.resumes || [],
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1,
        order: 2,
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
        text: 'Распределение зарплат',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const percentiles = salaryData.percentiles?.vacancies?.[context.dataIndex]?.percentiles;
            const resumePercentiles = salaryData.percentiles?.resumes?.[context.dataIndex]?.percentiles;
            
            const labels = [
              `${context.dataset.label}: ${(context.parsed.y || 0).toFixed(1)}%`
            ];

            if (percentiles && context.dataset.label === 'Вакансии') {
              labels.push(
                `P10: ${(percentiles.p10 || 0).toLocaleString()} ₽`,
                `P25: ${(percentiles.p25 || 0).toLocaleString()} ₽`,
                `P50: ${(percentiles.p50 || 0).toLocaleString()} ₽`,
                `P75: ${(percentiles.p75 || 0).toLocaleString()} ₽`,
                `P90: ${(percentiles.p90 || 0).toLocaleString()} ₽`
              );
            }

            if (resumePercentiles && context.dataset.label === 'Резюме') {
              labels.push(
                `P10: ${(resumePercentiles.p10 || 0).toLocaleString()} ₽`,
                `P25: ${(resumePercentiles.p25 || 0).toLocaleString()} ₽`,
                `P50: ${(resumePercentiles.p50 || 0).toLocaleString()} ₽`,
                `P75: ${(resumePercentiles.p75 || 0).toLocaleString()} ₽`,
                `P90: ${(resumePercentiles.p90 || 0).toLocaleString()} ₽`
              );
            }

            return labels;
          }
        }
      }
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        handleRangeClick(salaryData.ranges[index]);
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Диапазон зарплат',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Процент от общего количества',
        },
        ticks: {
          callback: function(value) {
            return value.toFixed(1) + '%';
          }
        }
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

          <Snackbar 
            open={!!notification} 
            autoHideDuration={6000} 
            onClose={() => setNotification(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setNotification(null)} 
              severity={notification?.type || 'info'} 
              sx={{ width: '100%' }}
            >
              {notification?.message}
            </Alert>
          </Snackbar>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
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
            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleLoadDataClick}
                fullWidth
                sx={{ height: '56px' }}
                disabled={isLoading || !selectedPosition}
              >
                {isLoading ? 'Загрузка...' : 'Подгрузить данные'}
              </Button>
              {isLoading && (
                <Box sx={{ width: '100%', mt: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={loadingProgress} 
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                    {loadingProgress}%
                  </Typography>
                </Box>
              )}
            </Grid>
            <Grid item xs={12} md={2}>
              <DatePicker
                label="Начальная дата"
                value={startDate}
                onChange={setStartDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <DatePicker
                label="Конечная дата"
                value={endDate}
                onChange={setEndDate}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Шаг диапазона</InputLabel>
                <Select
                  value={rangeStep}
                  label="Шаг диапазона"
                  onChange={(e) => setRangeStep(e.target.value)}
                >
                  {RANGE_STEPS.map((step) => (
                    <MenuItem key={step.value} value={step.value}>
                      {step.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 4 }}>
            <Bar data={chartData} options={chartOptions} />
          </Paper>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Грейд</TableCell>
                  <TableCell>Диапазон ЗП</TableCell>
                  <TableCell>Перцентили</TableCell>
                  <TableCell align="right">Количество вакансий</TableCell>
                  <TableCell align="right">Средняя ЗП (вакансии)</TableCell>
                  <TableCell align="right">Количество резюме</TableCell>
                  <TableCell align="right">Средняя ЗП (резюме)</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {GRADES.map((grade) => {
                  const vacancyStat = gradeStats.vacancies.find(v => v.grade === grade);
                  const resumeStat = gradeStats.resumes.find(r => r.grade === grade);
                  return (
                    <TableRow key={grade}>
                      <TableCell>{grade}</TableCell>
                      <TableCell>
                        {resumeStat && (
                          `${(resumeStat.min || 0).toLocaleString()} - ${(resumeStat.max || 0).toLocaleString()} ₽`
                        )}
                      </TableCell>
                      <TableCell>
                        {resumeStat && (
                          <Box>
                            <Typography variant="body2">
                              P25: {(resumeStat.p25 || 0).toLocaleString()} ₽
                            </Typography>
                            <Typography variant="body2">
                              P50: {(resumeStat.median || 0).toLocaleString()} ₽
                            </Typography>
                            <Typography variant="body2">
                              P75: {(resumeStat.p75 || 0).toLocaleString()} ₽
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">{vacancyStat?.count || 0}</TableCell>
                      <TableCell align="right">
                        {vacancyStat?.avg_salary ? Math.round(vacancyStat.avg_salary).toLocaleString() : '-'} ₽
                      </TableCell>
                      <TableCell align="right">{resumeStat?.count || 0}</TableCell>
                      <TableCell align="right">
                        {resumeStat?.avg_salary ? Math.round(resumeStat.avg_salary).toLocaleString() : '-'} ₽
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleEditClick(grade)}>
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Редактировать диапазон зарплат</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <TextField
                label="Минимальная ЗП"
                type="number"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                fullWidth
                sx={{ mb: 2 }}
              />
              <TextField
                label="Максимальная ЗП"
                type="number"
                value={maxSalary}
                onChange={(e) => setMaxSalary(e.target.value)}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveRange} variant="contained">Сохранить</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={assignGradeDialogOpen} onClose={() => setAssignGradeDialogOpen(false)}>
          <DialogTitle>Назначить грейд для диапазона</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Выбранный диапазон: {selectedRange}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Грейд</InputLabel>
                <Select
                  value={selectedGrade || ''}
                  label="Грейд"
                  onChange={(e) => setSelectedGrade(e.target.value)}
                >
                  {GRADES.map((grade) => (
                    <MenuItem key={grade} value={grade}>
                      {grade}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAssignGradeDialogOpen(false)}>Отмена</Button>
            <Button 
              onClick={() => handleAssignGrade(selectedGrade)} 
              variant="contained"
              disabled={!selectedGrade}
            >
              Назначить
            </Button>
          </DialogActions>
        </Dialog>

        <SalaryDistribution 
          salaryData={salaryData}
          gradeRanges={gradeRanges}
          onGradeRangeUpdate={handleGradeRangeUpdate}
        />
      </Container>
    </LocalizationProvider>
  );
}

export default App;
