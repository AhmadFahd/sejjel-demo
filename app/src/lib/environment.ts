/**
 * What the running server is. Reported on the home route until there is
 * something better to show, and useful for telling a preview from production.
 */
export type Environment = {
  mode: 'development' | 'production'
  nodeEnv: string
  node: string
  startedAt: string
}

export type EnvironmentInput = {
  isProduction: boolean
  nodeEnv: string | undefined
  nodeVersion: string
  now: Date
}

export function describeEnvironment(input: EnvironmentInput): Environment {
  return {
    mode: input.isProduction ? 'production' : 'development',
    nodeEnv: input.nodeEnv ?? 'unset',
    node: input.nodeVersion,
    startedAt: input.now.toISOString(),
  }
}
