import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

export const crawl = () => api.get('/crawl')

export const generate = () => api.post('/generate')

export const getPosts = (status = null, skip = 0, limit = 50) => {
  const params = { skip, limit }
  if (status) params.status = status
  return api.get('/posts', { params })
}

export const approvePost = (id) => api.post(`/posts/approve/${id}`)

export const rejectPost = (id) => api.post(`/posts/reject/${id}`)

export const publishPost = (id) => api.post(`/posts/publish/${id}`)

// GitHub
export const getGitHubConfig = () => api.get('/github/config')

export const saveGitHubConfig = (data) => api.post('/github/config', data)

export const getGitHubStatus = () => api.get('/github/status')

export const pushToGitHub = (data) => api.post('/github/push', data)

export default api
