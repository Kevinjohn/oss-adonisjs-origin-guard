import server from '@adonisjs/core/services/server'

server.use([() => import('./existing_middleware.js')])
server.getRouter().post('/write', () => 'handler reached')
