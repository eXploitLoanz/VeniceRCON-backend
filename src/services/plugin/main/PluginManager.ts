import { promises as fs } from "fs"
import winston from "winston"
import path from "path"
import { parse } from "yaml"
import { PluginBlueprint } from "./PluginBlueprint"

export class PluginManager {

  readonly baseDir: string
  private blueprints: Record<string, PluginBlueprint> = {}

  constructor(props: PluginManager.Props) {
    this.baseDir = props.path
  }

  async init() {
    try {
      const stat = await fs.stat(this.baseDir)
      if (!stat.isDirectory)
        return winston.error(`plugin folder is not a directory ${this.baseDir}`)
    } catch (e) {
      winston.info(`plugin folder not found ${this.baseDir}`)
      return
    }
    await this.reloadPlugins()
  }

  /** retrieves all available plugins for a specific backend */
  getPlugins(backend: "BF3"|"VU"|"ALL" = "ALL") {
    return Object.values(this.blueprints).filter(({ meta }) => {
      switch (backend) {
        default:
        case "BF3": return meta.backend === "BF3"
        case "ALL":
        case "VU": return true
      }
    })
  }

  getBlueprint(name: string, backend?: "BF3"|"VU"|"ALL") {
    return this.getPlugins(backend).find(bp => bp.id === name)
  }

  private async reloadPlugins() {
    const plugins = await fs.readdir(this.baseDir)
    for (const name of plugins) {
      const folder = path.join(this.baseDir, name)
      winston.verbose(`loading plugin meta.yaml from folder ${folder}`)
      const meta = parse(await fs.readFile(path.join(folder, "meta.yaml"), "utf8"))
      try {
        await PluginBlueprint.validateMeta(meta)
      } catch (e) {
        winston.error(`invalid schema.yaml in ${path.join(folder, "meta.yaml")}, skipping...`)
        winston.error(e)
        continue
      }
      const current = this.blueprints[name]
      if (current) await current.stop()
      delete this.blueprints[name]
      this.blueprints[name] = new PluginBlueprint({ id: name, basePath: folder, meta })
    }
  }
}

export namespace PluginManager {
  export interface Props {
    path: string
  }
}