import config from './config'

export default {
  cloudName: config.cloudinaryCloudName,
  apiKey: config.cloudinaryAPIKey,
  apiSecret: config.cloudinaryAPISecret,
  secure: true,
  useComponent: true,
}
