import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { getCustomRepository } from "typeorm"
import { PermissionRepository } from "@repository/PermissionRepository"
import { permissionManager } from "@service/permissions"
import { InstanceUserScope, getScopeNames, getBitMaskFromScopes, getScopesFromMask } from "@service/permissions/Scopes"

const api = Router()
const { Joi } = Router

api.get("/", perm(InstanceUserScope.ACCESS), async ctx => {
  const { userId, instanceId } = ctx.state.permission!
  ctx.body = await getCustomRepository(PermissionRepository)
    .getInstanceUser(instanceId, userId)
})

api.delete("/", perm(InstanceUserScope.REMOVE), async ctx => {
  const { userId, instanceId } = ctx.state.permission!
  const ok = await permissionManager.removeInstanceAccess(userId, instanceId)
  if (ok) return ctx.status = 200
  ctx.status = 400
  ctx.body = { message: "no user has been found with access to this instance" }
})

api.route({
  method: "PATCH",
  path: "/permissions",
  validate: {
    type: "json",
    body: Joi.object({
      add: Joi.array().allow(...getScopeNames()).optional().default([]),
      remove: Joi.array().allow(...getScopeNames()).optional().default([])
    }).required()
  },
  pre: perm(InstanceUserScope.UPDATE),
  handler: async ctx => {
    const { add, remove } = ctx.request.body
    const mask = getBitMaskFromScopes([...add, ...remove])
    const ok = await permissionManager.hasPermissions({
      user: ctx.state.token!.id,
      instance: ctx.state.instance!.id,
      scope: mask
    })
    if (!ok) {
      ctx.body = { message: "you tried to update a permission which you do not have access to"}
      return ctx.status = 403
    }
    ctx.state.permission!.mask |= getBitMaskFromScopes(add)
    ctx.state.permission!.mask &= ~getBitMaskFromScopes(remove)
    await ctx.state.permission!.save()
    ctx.body = { scopes: getScopesFromMask(ctx.state.permission!.mask) }
    ctx.status = 200
  }
})

export default api