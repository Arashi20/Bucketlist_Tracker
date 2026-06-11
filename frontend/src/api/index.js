import axios from 'axios'

const TOKEN_KEY = 'trav_token'

const api = axios.create({ baseURL: '/api' })

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 (expired/invalid token), clear and redirect — but NOT on the login endpoint itself
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }).then(r => r.data.access_token),
}

export const bucketlist = {
  list:   ()         => api.get('/items/').then(r => r.data),
  create: (data)     => api.post('/items/', data).then(r => r.data),
  update: (id, data) => api.patch(`/items/${id}`, data).then(r => r.data),
  remove: (id)       => api.delete(`/items/${id}`).then(r => r.data),
}

export const visitedCountries = {
  list:   ()         => api.get('/visited-countries/').then(r => r.data),
  create: (data)     => api.post('/visited-countries/', data).then(r => r.data),
  update: (id, data) => api.patch(`/visited-countries/${id}`, data).then(r => r.data),
  remove: (id)       => api.delete(`/visited-countries/${id}`).then(r => r.data),
}

export const trips = {
  list:   ()         => api.get('/trips/').then(r => r.data),
  create: (data)     => api.post('/trips/', data).then(r => r.data),
  update: (id, data) => api.patch(`/trips/${id}`, data).then(r => r.data),
  remove: (id)       => api.delete(`/trips/${id}`).then(r => r.data),
}
