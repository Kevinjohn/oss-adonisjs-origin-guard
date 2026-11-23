/** The origins an unsafe request may come from, in the serialized form browsers send. */
export interface OriginGuardConfig {
  /**
   * The validated origin the application is served from, in the serialized form browsers send.
   * Host code should obtain it from `resolvePublicOrigin` during startup.
   */
  publicOrigin: string
  /**
   * Further validated serialized origins trusted for writes, for example the result of
   * `parseOrigins` for the CORS origin list.
   */
  allowedOrigins?: readonly string[]
}

/** The two request headers the decision reads. */
export interface UnsafeRequestHeaders {
  origin?: string
  fetchSite?: string
}

/** One validated public origin and whether it is served over HTTPS. */
export interface PublicOrigin {
  origin: string
  secure: boolean
}
