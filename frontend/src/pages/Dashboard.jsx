import Layout from '../components/Layout'
import AmountCard from '../components/AmountCard'
import Chart from '../components/Chart'
import ActivityLog from '../components/ActivityLog'
import DashboardCards from '../components/DashBoardCards'

export default function Dashboard() {
  return (
    <Layout>
      <DashboardCards />

      {/* phone: stacked · laptop: gauge + chart, log below · wide: all three in a row */}
      <div className='mt-6 grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,460px)_minmax(0,1fr)] gap-6 items-end justify-items-center lg:justify-items-stretch'>
        <AmountCard />
        <Chart />
        <div className='w-full lg:col-span-2 xl:col-span-1'>
          <ActivityLog />
        </div>
      </div>
    </Layout>
  )
}
