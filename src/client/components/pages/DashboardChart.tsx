import { useMemo } from 'react'
import type { ChartData, ChartOptions } from 'chart.js'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

export type DashboardRange = '7d'

type DashboardChartProps = {
  range: DashboardRange
  trendData?: { label: string; cases: number; resolved: number }[]
}

function DashboardChart({ range, trendData }: DashboardChartProps) {
  const data = useMemo<ChartData<'line', number[], string>>(() => {
    const labels = trendData?.map(t => t.label) ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const cases = trendData?.map(t => t.cases) ?? [12, 19, 15, 8, 22, 30, 18]
    const resolved = trendData?.map(t => t.resolved) ?? [8, 15, 12, 10, 18, 25, 15]

    return {
      labels,
      datasets: [
        {
          label: 'Cases in',
          data: cases,
          borderColor: '#ff7a18',
          backgroundColor: 'rgba(255, 122, 24, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#ff7a18',
          borderWidth: 2,
        },
        {
          label: 'Cases solved',
          data: resolved,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#3b82f6',
          borderWidth: 2,
        },
      ],
    }
  }, [trendData])

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#11141b',
        titleColor: 'rgba(255, 255, 255, 0.5)',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: {
            size: 11,
          },
        },
      },
      y: {
        border: {
          dash: [4, 4],
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.4)',
          font: {
            size: 11,
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  }

  return <Line data={data} options={options} />
}

export default DashboardChart
