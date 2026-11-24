import { BlockList, isIP } from 'node:net'

const privateAddressRanges = new BlockList()
privateAddressRanges.addSubnet('127.0.0.0', 8, 'ipv4')
privateAddressRanges.addSubnet('10.0.0.0', 8, 'ipv4')
privateAddressRanges.addSubnet('172.16.0.0', 12, 'ipv4')
privateAddressRanges.addSubnet('192.168.0.0', 16, 'ipv4')
privateAddressRanges.addAddress('::1', 'ipv6')
privateAddressRanges.addSubnet('fc00::', 7, 'ipv6')

/**
 * Whether a peer address is loopback or on a private network: 127/8, 10/8, 172.16/12, 192.168/16,
 * `::1` and `fc00::/7`, including IPv4-mapped IPv6. Anything that is not an IP address is not
 * private. Suits the `trustProxy` option when a proxy on the same host or network forwards requests.
 *
 * @example
 * ```ts
 * import { isPrivatePeer } from '@kevinjohn/adonisjs-origin-guard'
 * import { defineConfig } from '@adonisjs/core/http'
 *
 * export const http = defineConfig({ trustProxy: isPrivatePeer })
 * ```
 */
export function isPrivatePeer(address: string): boolean {
  const peerAddress = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1] ?? address
  const addressVersion = isIP(peerAddress)
  if (addressVersion === 0) return false
  return privateAddressRanges.check(peerAddress, addressVersion === 4 ? 'ipv4' : 'ipv6')
}
