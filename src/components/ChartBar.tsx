import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

type Dataset = { label: string; data: number[]; backgroundColor?: string }

export default function ChartBar({ labels, values, datasets }: { labels: string[]; values?: number[]; datasets?: Dataset[] }) {
  const data = datasets
    ? { labels, datasets: datasets.map((d) => ({ ...d, backgroundColor: d.backgroundColor || 'rgba(53, 162, 235, 0.6)' })) }
    : { labels, datasets: [{ label: 'Quantidade', data: values || [], backgroundColor: 'rgba(53, 162, 235, 0.6)' }] }

  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: datasets ? true : false } } }

  return <div style={{ width: '100%', height: 420 }}><Bar data={data} options={options} /></div>
}
