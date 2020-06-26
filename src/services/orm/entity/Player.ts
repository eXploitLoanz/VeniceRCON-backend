import { Entity, Column, OneToMany } from "typeorm"
import { AbstractEntity } from "./Abstract"
import { ChatMessage } from "./ChatMessage"

@Entity()
export class Player extends AbstractEntity<Player> {

  protected entityClass = Player

  @Column({ unique: true })
  guid!: string

  @Column()
  name!: string

  @OneToMany(type => ChatMessage, msg => msg.player)
  chats!: ChatMessage

  /** creates a new instance */
  static async from(props: Player.ICreate) {
    const player = new Player()
    player.guid = props.guid
    player.name = props.name
    return player.save()
  }

}

export namespace Player {

  export interface ICreate {
    guid: string
    name: string
  }
}