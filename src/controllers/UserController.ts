import { Request, Response } from 'express'
import { compare, hash } from 'bcryptjs'
import dayjs from 'dayjs'

import { RefreshTokenModel, UserModel } from '../models'
import { generateAccessToken, generateRefreshToken } from '../utils/TokenGenerator'

export class UserController {
  async register(request: Request, response: Response) {
    const { name, email, password } = request.body

    const userAlreadyExists = await UserModel.findOne({ email })
    if (userAlreadyExists) {
      throw new Error('Email já cadastrado.')
    }

    const passwordHash = await hash(password, 8)
    const user = await new UserModel({ name, email, password: passwordHash }).save()

    const token = generateAccessToken(user._id)
    const refreshToken = await generateRefreshToken(user._id)

    response.cookie('@NASDAQ-refresh', refreshToken._id.toString(), { httpOnly: true })

    return response.json({ user, token })
  }

  async login(request: Request, response: Response) {
    const { email, password } = request.body

    const user = await UserModel.findOne({ email })
    if (!user) {
      throw new Error('Email não cadastrado.')
    }

    const passwordMatch = await compare(password, user.password)
    if (!passwordMatch) {
      throw new Error('Senha incorreta.')
    }

    await RefreshTokenModel.deleteMany({ userId: user._id })

    const token = generateAccessToken(user._id)
    const refreshToken = await generateRefreshToken(user._id)

    response.cookie('@NASDAQ-refresh', refreshToken._id.toString(), { httpOnly: true })

    return response.json({ user, token })
  }

  async authenticateByRefresh(request: Request, response: Response) {
    const refreshTokenId = request.cookies['@NASDAQ-refresh']

    const refreshToken = await RefreshTokenModel.findById(refreshTokenId)
    if (!refreshToken) {
      return response.status(401).end()
    }

    const user = await UserModel.findById(refreshToken.userId)

    await RefreshTokenModel.deleteMany({ userId: refreshToken.userId })
    const newRefreshToken = await generateRefreshToken(refreshToken.userId)

    const token = generateAccessToken(refreshToken.userId)

    const refreshTokenExpired = dayjs().isAfter(dayjs.unix(refreshToken.expiresIn))
    if (refreshTokenExpired) {
      return response.status(401).end()
    }

    response.cookie('@NASDAQ-refresh', newRefreshToken._id.toString(), { httpOnly: true })

    return response.json({ user, token })
  }

  async logout(request: Request, response: Response) {
    response.cookie('@NASDAQ-refresh', '', { httpOnly: true })
    return response.end()
  }
}
