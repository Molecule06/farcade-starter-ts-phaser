export const isDevEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'development'
}