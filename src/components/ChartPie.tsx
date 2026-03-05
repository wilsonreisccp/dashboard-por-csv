import React from 'react'
import { Pie } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function ChartPie({ labels, values }: { labels: string[]; values: number[] }) {
  const background = [
    '#4dc9f6',
    '#f67019',
    '#f53794',
    '#537bc4',
    '#acc236',
    '#166a8f',
    '#00a950',
    '#58595b',
    '#8549ba'
  ]

  const data = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, i) => background[i % background.length])
      }
    ]
  }

  const options = { responsive: true, maintainAspectRatio: false }
  return <div style={{ width: '100%', height: 420 }}><Pie data={data} options={options} /></div>
}
