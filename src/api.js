import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000/api'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function getGames() {
  return api.get('/games')
}

export function login(username, password) {
  return api.post('/login', { username: username, password: password })
}

export function createGame(game) {
  return api.post('/games', game)
}

export function updateGame(id, game) {
  return api.put(`/games/${id}`, game)
}

export function deleteGame(id) {
  return api.delete(`/games/${id}`)
}