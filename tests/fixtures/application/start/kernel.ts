import server from '@adonisjs/core/services/server'

server.use([])
server.getRouter().post('/write', () => 'handler reached')
