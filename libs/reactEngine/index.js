const webpack = require('webpack');
const fs = require('fs')
const path = require('path')
const makeWebpackConfig = require('./webpack.config')

const makeReact = (pagesData, templateData, config, constants) => new Promise(async (resolve, reject) => {
    await fs.writeFileSync(path.resolve(constants.tmp, './pageData.js'), `export default ${JSON.stringify(pagesData)}`);
    await fs.writeFileSync(path.resolve(constants.tmp, './config.js'), `export default ${JSON.stringify(config)}`);
    await fs.writeFileSync(path.resolve(constants.tmp, './templateData.js'), `export default ${JSON.stringify(templateData)}`);
    await fs.copyFileSync(config.App || path.resolve(__dirname, './BaseApp.js'), path.resolve(constants.tmp, './App.js'))


    const webpackConfig = makeWebpackConfig(constants, config, templateData)


    webpack(webpackConfig, (err, stats) => { // [Stats Object](#stats-object)
        if (err || stats.hasErrors()) {
            console.log('HA ERROR', err, stats)
          return reject(err || stats.hasErrors())
        }

        resolve()
      });
})

module.exports = makeReact
