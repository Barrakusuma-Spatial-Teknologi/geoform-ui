import type { JSendBase } from "~/service/api/base"

export interface LoginResponse {
  access_token: string
}

export interface UserInfoResponse {
  id: string
  username: string
  roleNames: string[]
}

async function login(username: string, password: string) {
  const res = await $fetch<LoginResponse>(`${useRuntimeConfig().public.apiUrl}/auth/access-token`, {
    method: "POST",
    body: {
      username,
      password,
    },
  })
  return res.access_token
}

async function getUserInfo(token: string) {
  const res = await $fetch<JSendBase<UserInfoResponse>>(`${useRuntimeConfig().public.apiUrl}/auth/userinfo`, {
    method: "GET",
    headers: {
      Authorization: token,
    },
  })
  return res.data
}

export const AuthService = { login, getUserInfo }
