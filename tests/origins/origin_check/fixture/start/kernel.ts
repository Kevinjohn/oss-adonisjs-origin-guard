import './origin_config.ts'
import server from '@adonisjs/core/services/server'

server.use([() => import('./middleware.js')])
server.getRouter().post('/write', () => 'handler reached')
