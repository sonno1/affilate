import { useState } from 'react'
import Controls from './components/Controls'
import PostList from './components/PostList'
import GitHubPanel from './components/GitHubPanel'

export default function App() {
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [showGitHub, setShowGitHub] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">📰 Value Content Dashboard</h1>
            <p className="text-sm text-gray-500">Crawl RSS → AI Generate → Duyệt → Đăng Facebook</p>
          </div>
          <div className="flex items-center gap-3">
            <Controls onRefresh={() => setRefreshSignal((s) => s + 1)} />
            {/* GitHub push button */}
            <button
              onClick={() => setShowGitHub(true)}
              title="Push lên GitHub"
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <PostList refreshSignal={refreshSignal} />
      </main>

      {/* GitHub Panel Modal */}
      {showGitHub && <GitHubPanel onClose={() => setShowGitHub(false)} />}
    </div>
  )
}
