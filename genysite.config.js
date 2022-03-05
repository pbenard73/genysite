const packageJson = require('./package.json')

module.exports = {
  homepage: "https://pbenard73.github.io/genysite/",
  data: {
    version: packageJson.version,
    title:'Genysite',
    subtitle: 'Simply Static Site Generator'
  },
  priority:['index', 'getStarted', 'configuration'],
  index:'index',
  names: {
    index: 'Home',
    getStarted: 'Get Started',
    configuration: 'Configuration File',
    "templating": 'Templating',
    "templating/index": 'Builtin Engine'
  }
}
