import "reflect-metadata"
import { randomBytes } from "crypto"
import { createConnection, Connection } from "typeorm"
import winston from "winston"
import { WinstonLogger } from "./WinstonLogger"
import chalk from "chalk"
import { Instance } from "@entity/Instance"
import { User } from "@entity/User"
import { Config } from "@entity/Config"
import { config } from "@service/config"
import { Permission } from "@entity/Permission"
import { createToken } from "@service/koa/jwt"
import { Invite } from "@entity/Invite"
import { Plugin } from "@entity/Plugin"
import { Player } from "@entity/Player"
import { ChatMessage } from "@entity/ChatMessage"
import { Kill } from "@entity/Kill"
import { Weapon } from "@entity/Weapon"
import { LogMessage } from "@entity/LogMessage"

export let connection: Connection

export async function connect(args: Record<string, string>) {
  connection = await createConnection({
    type: config.database.use,
    synchronize: config.development,
    logging: config.development,
    maxQueryExecutionTime: 200,
    ...config.database[config.database.use] as any,
    logger: new WinstonLogger(),
    entities: [
      Instance,
      User,
      Config,
      Permission,
      Invite,
      Plugin,
      Player,
      ChatMessage,
      Kill,
      Weapon,
      LogMessage
    ]
  })

  //create default configuration
  const configs = await Config.find()
  await Promise.all(
    Config.DEFAULTS
      .filter(({ name }) => !configs.map(c => c.name).includes(name))
      .map(c => Config.from(c))
  )

  //create default user
  if (!await User.findOne({ username: "admin" })) {
    const password = randomBytes(15).toString("base64")
    const user = await User.from({ username: "admin", password })
    await user.save()
    await Permission.from({
      user, root: true, mask: Array(32).fill("ff").join(":")
    })
    setTimeout(async () => {
      const token = await createToken({ user })
      winston.info(`created default user "${chalk.red.bold("admin")}" with password "${chalk.red.bold(password)}"`)
      winston.info(`jwt token: ${chalk.red.bold(token)}`)
    }, 1000)
  }

  if (Object.keys(args).includes("--override-password")) {
    const password = args["--override-password"]
    if (password.length < 6) throw new Error(`override password should have a minimum length of 6 characters! (got ${password.length})`)
    const admin = await User.findOne({ username: "admin" })
    if (!admin) throw new Error("could not find admin user")
    await admin.updatePassword(password)
    await admin.save()
    winston.info("admin password has been overwritten")
  }
}