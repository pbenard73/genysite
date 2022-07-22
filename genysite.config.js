const packageJson = require('./package.json')

module.exports = {
 homepage: "https://pbenard73.github.io/genysite/",
  // homepage: "file:///home/patrick/Workspace/geny/docs/",
  data: {
    version: packageJson.version,
    title:'Genysite',
    subtitle: 'Simply Static Site Generator',
    favicon: 'favicon.png',
  },
  priority:['index', 'getStarted', 'configuration'],
  index:'index',
  names: {
    index: 'Home',
    getStarted: 'Get Started',
    configuration: 'Configuration File',
    "templating": 'Templating',
    "templating/htmlEngine": 'To HTML',
    "templating/reactEngine": 'To React'
  }
}
