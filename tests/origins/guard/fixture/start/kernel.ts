import './origin_config.js'
import server from '@adonisjs/core/services/server'

server.use([() => import('./middleware.js')])
server.getRouter().post('/write', () => 'guard reached')
