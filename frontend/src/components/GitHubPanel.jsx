import { useState, useEffect } from 'react'
import { getGitHubConfig, saveGitHubConfig, getGitHubStatus, pushToGitHub } from '../api'

export default function GitHubPanel({ onClose }) {
  // --- Config state ---
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')
  const [repo, setRepo] = useState('')
  const [branch, setBranch] = useState('main')
  const [tokenSet, setTokenSet] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [configMsg, setConfigMsg] = useState(null)

  // --- Push state ---
  const [commitMsg, setCommitMsg] = useState('chore: update via AI Affiliate dashboard')
  const [pushing, setPushing] = useState(false)
  const [pushLogs, setPushLogs] = useState([])
  const [pushError, setPushError] = useState(null)
  const [repoUrl, setRepoUrl] = useState('')

  // --- Git status ---
  const [gitStatus, setGitStatus] = useState(null)

  // Load existing config on mount
  useEffect(() => {
    getGitHubConfig()
      .then((res) => {
        const d = res.data
        setUsername(d.username || '')
        setRepo(d.repo || '')
        setBranch(d.branch || 'main')
        setTokenSet(d.token_set)
      })
      .catch(() => {})

    getGitHubStatus()
      .then((res) => setGitStatus(res.data))
      .catch(() => {})
  }, [])

  const handleSaveConfig = async () => {
    if (!username.trim() || !repo.trim()) {
      setConfigMsg({ type: 'error', text: 'Username và Repository là bắt buộc.' })
      return
    }
    setSavingConfig(true)
    setConfigMsg(null)
    try {
      const res = await saveGitHubConfig({ username, token: token || undefined, repo, branch })
      setTokenSet(res.data.token_set)
      setToken('')
      setConfigMsg({ type: 'success', text: '✅ Đã lưu cấu hình GitHub.' })
    } catch (err) {
      setConfigMsg({ type: 'error', text: err.response?.data?.detail || 'Lưu thất bại.' })
    } finally {
      setSavingConfig(false)
    }
  }

  const handlePush = async () => {
    if (!commitMsg.trim()) {
      setPushError('Vui lòng nhập commit message.')
      return
    }
    setPushing(true)
    setPushLogs([])
    setPushError(null)
    setRepoUrl('')
    try {
      const res = await pushToGitHub({ commit_message: commitMsg })
      setPushLogs(res.data.logs)
      setRepoUrl(res.data.repo_url)
      // Refresh git status
      getGitHubStatus()
        .then((r) => setGitStatus(r.data))
        .catch(() => {})
    } catch (err) {
      setPushError(err.response?.data?.detail || 'Push thất bại.')
    } finally {
      setPushing(false)
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current text-gray-800" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Push lên GitHub
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* ---- SECTION: Cấu hình tài khoản ---- */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            🔑 Tài khoản GitHub
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">GitHub Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vd: octocat"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Personal Access Token (PAT){' '}
                {tokenSet && (
                  <span className="ml-1 text-green-600 font-medium">[Đã lưu]</span>
                )}
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={tokenSet ? '••••••••••• (để trống = giữ nguyên)' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Tạo PAT tại{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,workflow&description=AI+Affiliate+Push"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-blue-500 hover:underline"
                >
                  github.com/settings/tokens
                </a>{' '}
                — chọn scope <strong>repo</strong> (full) + <strong>workflow</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Repository Name</label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder="vd: ai-affiliate"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="w-28">
                <label className="block text-xs text-gray-500 mb-1">Branch</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="mt-3 w-full bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2 transition"
          >
            {savingConfig ? '⏳ Đang lưu...' : '💾 Lưu cấu hình'}
          </button>

          {configMsg && (
            <p className={`mt-2 text-xs ${configMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {configMsg.text}
            </p>
          )}
        </section>

        {/* ---- SECTION: Git Status ---- */}
        {gitStatus && (
          <section className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              📋 Trạng thái Git
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 space-y-1">
              <div>
                <span className="text-gray-400">Repo:</span>{' '}
                {gitStatus.is_repo ? '✅ Đã khởi tạo' : '⚠️ Chưa khởi tạo (sẽ được tạo khi push)'}
              </div>
              {gitStatus.branch && (
                <div>
                  <span className="text-gray-400">Branch:</span> {gitStatus.branch}
                </div>
              )}
              {gitStatus.status && (
                <div>
                  <span className="text-gray-400">Changes:</span>
                  <pre className="whitespace-pre-wrap mt-1 text-yellow-700">{gitStatus.status}</pre>
                </div>
              )}
              {gitStatus.recent_commits.length > 0 && (
                <div>
                  <span className="text-gray-400">Recent commits:</span>
                  <ul className="mt-1 space-y-0.5">
                    {gitStatus.recent_commits.map((c, i) => (
                      <li key={i} className="text-gray-600">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---- SECTION: Push ---- */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            🚀 Push lên GitHub
          </h3>

          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Commit Message</label>
            <input
              type="text"
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handlePush}
            disabled={pushing || !tokenSet}
            title={!tokenSet ? 'Vui lòng lưu cấu hình trước' : ''}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2 transition flex items-center justify-center gap-2"
          >
            {pushing ? (
              <>
                <span className="animate-spin">⟳</span> Đang push...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                Push to GitHub
              </>
            )}
          </button>

          {/* Push logs */}
          {pushLogs.length > 0 && (
            <div className="mt-3 bg-gray-900 rounded-lg p-3 text-xs font-mono text-green-400 space-y-1 max-h-48 overflow-y-auto">
              {pushLogs.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {repoUrl && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <a
                    href={repoUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-blue-400 hover:underline"
                  >
                    🔗 {repoUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {pushError && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 font-mono whitespace-pre-wrap">
              ❌ {pushError}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
