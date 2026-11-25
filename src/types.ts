/** Host-provided settings consumed by `defineConfig`. */
export interface OriginGuardOptions {
  /** The application's canonical public origin. */
  publicOrigin: string
  /** Additional origins as a comma-separated list. */
  allowedOrigins?: string
  /** The application's runtime environment, which determines the HTTPS policy. */
  environment: 'production' | 'development' | 'test'
}

/** The origins an unsafe request may come from, in the serialized form browsers send. */
export interface OriginGuardConfig {
  /**
   * The public origin in the serialized form browsers send.
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
