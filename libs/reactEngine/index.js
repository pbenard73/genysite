const webpack = require('webpack');
const fs = require('fs')
const path = require('path')
const makeWebpackConfig = require('./webpack.config')

const makeReact = (pagesData, templateData, config, constants) => new Promise(async (resolve, reject) => {
    const webpackConfig = makeWebpackConfig(constants)
console.log(config)
await fs.writeFileSync(path.resolve(constants.tmp, './pageData.js'), `export default ${JSON.stringify(pagesData)}`);
await fs.writeFileSync(path.resolve(constants.tmp, './config.js'), `export default ${JSON.stringify(config)}`);

    webpack(webpackConfig, (err, stats) => { // [Stats Object](#stats-object)
        if (err || stats.hasErrors()) {
            console.log('HA ERROR', err, stats)
          return reject(err || stats.hasErrors())
        }

        resolve()
      });
})

module.exports = makeReact
