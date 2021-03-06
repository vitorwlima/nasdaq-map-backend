import { Router } from 'express'
import { UserController } from '../controllers/UserController'

export const UserRoutes = Router()
const userController = new UserController()

UserRoutes.post('/register', userController.register)
UserRoutes.post('/login', userController.login)
UserRoutes.get('/refresh-token', userController.authenticateByRefresh)
UserRoutes.get('/logout', userController.logout)
