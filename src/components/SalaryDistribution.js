import React, { useState } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SalaryDistribution = ({ salaryData, gradeRanges, onGradeRangeUpdate }) => {
  const [selectedRange, setSelectedRange] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('');

  const data = {
    labels: salaryData.ranges,
    datasets: [
      {
        label: 'Вакансии',
        data: salaryData.vacancies,
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
      },
      {
        label: 'Резюме',
        data: salaryData.resumes,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Распределение зарплат',
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Процент',
        },
      },
    },
  };

  const handleGradeChange = (e) => {
    const grade = e.target.value;
    setSelectedGrade(grade);
    if (selectedRange && grade) {
      onGradeRangeUpdate(grade, selectedRange);
    }
  };

  return (
    <div className="salary-distribution">
      <div className="chart-container">
        <Bar data={data} options={options} />
      </div>
      <div className="grade-customization">
        <h3>Настройка грейдов</h3>
        <div className="range-selector">
          <p>Выберите диапазон: {selectedRange || 'Не выбран'}</p>
          <select value={selectedGrade} onChange={handleGradeChange}>
            <option value="">Выберите грейд</option>
            <option value="Intern">Intern</option>
            <option value="Junior">Junior</option>
            <option value="Middle">Middle</option>
            <option value="Senior">Senior</option>
            <option value="Lead">Lead</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SalaryDistribution; 