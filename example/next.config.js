const nextLoad = require('next-load-plugin')

module.exports = nextLoad({
  experimental: {
    appDir: true,
  }
})