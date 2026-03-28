import { useState } from 'react'
import Controls from './components/Controls'
import PostList from './components/PostList'
import Home from './components/Home'
import DBViewer from './components/DBViewer'

// Bật Content Dashboard bằng cách đặt VITE_ENABLE_DASHBOARD=true trong file .env
const ENABLE_DASHBOARD = import.meta.env.VITE_ENABLE_DASHBOARD === 'true'

const TABS = [
  { id: 'home', label: '🛍️ Shopee Affiliate' },
  ...(ENABLE_DASHBOARD ? [
    { id: 'dashboard', label: '📰 Content Dashboard' },
    { id: 'db', label: '🗄️ DB Viewer' },
  ] : []),
]

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [refreshSignal, setRefreshSignal] = useState(0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center justify-between py-3 gap-3">
            <span className="text-base font-bold text-gray-900 whitespace-nowrap">AI Affiliate</span>

            {/* Dashboard controls — only show on dashboard tab */}
            <div className="flex items-center gap-2">
              {ENABLE_DASHBOARD && activeTab === 'dashboard' && (
                <Controls onRefresh={() => setRefreshSignal((s) => s + 1)} />
              )}
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors focus:outline-none
                  ${activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      {activeTab === 'home' && <Home />}

      {ENABLE_DASHBOARD && activeTab === 'dashboard' && (
        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Content Dashboard</h2>
            <p className="text-sm text-gray-500">Crawl RSS → AI Generate → Duyệt → Đăng Facebook</p>
          </div>
          <PostList refreshSignal={refreshSignal} />
        </main>
      )}

      {ENABLE_DASHBOARD && activeTab === 'db' && <DBViewer />}


    </div>
  )
}
