import Router from "koa-joi-router"
import { perm } from "@service/koa/permission"
import { MapScope } from "@service/permissions/Scopes"
import mapRouter from "./map"
import { Instance } from "@service/battlefield/libs/Instance"

const api = Router()
const { Joi } = Router

/** retrieves a list of maps */
api.get("/", async ctx => {
  ctx.body = await ctx.state.instance!.battlefield.getMaps()
})

/** retrieves the current map index */
api.get("/current", async ctx => {
  ctx.body = await ctx.state.instance!.currentMapIndices()
})

/** start next round */
api.post("/nextRound", perm(MapScope.SWITCH), async ctx => {
  await ctx.state.instance!.battlefield.nextRound()
  ctx.status = 200
})

/** start next round */
api.post("/restartRound", perm(MapScope.SWITCH), async ctx => {
  await ctx.state.instance!.battlefield.restartRound()
  ctx.status = 200
})

/** ends the round with a set winner team */
api.route({
  method: "POST",
  path: "/endRound",
  validate: {
    type: "json",
    body: Joi.object({
      winner: Joi.number().required()
    }).required()
  },
  pre: perm(MapScope.SWITCH),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    await battlefield.endRound(ctx.request.body.winner)
    ctx.status = 200
  }
})

/** adds a map */
api.route({
  method: "POST",
  path: "/",
  validate: {
    type: "json",
    body: Joi.object({
      map: Joi.string().required(),
      mode: Joi.string().required(),
      rounds: Joi.number().required(),
      index: Joi.number().optional()
    }).required()
  },
  pre: perm(MapScope.MANAGE),
  handler: async ctx => {
    const { battlefield } = ctx.state.instance!
    const { map, mode, rounds, index } = ctx.request.body
    await battlefield.addMap(map, mode, rounds, index)
    ctx.state.instance!.mapList()
    ctx.state.instance!.currentMapIndices()
    ctx.status = 200
  }
})


api.param("index", async (index, ctx, next) => {
  const instance = ctx.state.instance as Instance
  const maps = await instance.battlefield.getMaps()
  ctx.state.map = maps.find(m => m.index === parseInt(index, 10))
  if (!ctx.state.map) return ctx.status = 404
  await next()
})

api.use("/:index", mapRouter.middleware())

export default api