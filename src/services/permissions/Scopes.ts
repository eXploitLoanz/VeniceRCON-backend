export type Scopes = InstanceScope | InstanceUserScope

export enum InstanceScope {
  ACCESS = 0x01,
  CREATE = 0x02,
  UPDATE = 0x04,
  DELETE = 0x08
}

export enum InstanceUserScope {
  ACCESS = 0x100,
  CREATE = 0x200,
  UPDATE = 0x400,
  REMOVE = 0x800
}

const translation = {
  INSTANCE: InstanceScope,
  INSTANCEUSER: InstanceUserScope
}

/**
 * gets all available scope names
 */
export function getScopeNames() {
  return Object.keys(translation).map((k: any) => {
    //@ts-ignore
    return Object.values(translation[k])
      .filter(v => typeof v === "string")
      .map(v => `${k}#${v}`)
  }).flat(1)
}

/**
 * gets the mask for the bit from a name
 * @param name name of the bit to retrieve
 */
export function getBitFromName(name: string): Scopes {
  const [prefix, scope]: string[] = name.split("#")
  //@ts-ignore
  if (!translation[prefix] || !translation[prefix][scope]) return 0
  //@ts-ignore
  return translation[prefix][scope]
}

/**
 * checks if the mask has a specific permission
 * @param mask mask to check
 * @param scope permission to check
 */
export function hasPermission(mask: string, scope: Scopes) {
  const nodes = mask.split(":").map(hex => parseInt(hex, 16))
  let index = 0
  while (scope > 255) {
    index++
    scope = scope >>> 8
  }
  if (nodes.length < index) return false
  return (nodes[index] & scope) === scope
}

/**
 * gets an array of scope names from a mask
 * @param mask mask to retrieve scope names from
 */
export function getScopesFromMask(mask: string) {
  const scopes: string[] = []
  const validateScope = (prefix: string, e: any) => {
    return (val: Scopes) => {
      if (!hasPermission(mask, val)) return
      scopes.push(`${prefix}#${e[val]}`)
    }
  }
  Array(2).fill(null).map((_, index) => {
    switch(index) {
      case 0:
        const instance = validateScope("INSTANCE", InstanceScope)
        instance(InstanceScope.ACCESS)
        instance(InstanceScope.CREATE)
        instance(InstanceScope.DELETE)
        instance(InstanceScope.UPDATE)
        return
      case 1:
        const user = validateScope("INSTANCEUSER", InstanceUserScope)
        user(InstanceUserScope.ACCESS)
        user(InstanceUserScope.CREATE)
        user(InstanceUserScope.UPDATE)
        user(InstanceUserScope.REMOVE)
        return
    }
  })
  return scopes
}