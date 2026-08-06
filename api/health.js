export default function handler(request, response) {
  response.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
    env: process.env.VERCEL_ENV || 'development',
    region: process.env.VERCEL_REGION || null,
  })
}
