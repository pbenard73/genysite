const webpack = require('webpack');
const fs = require('fs')
const path = require('path')
const makeWebpackConfig = require('./webpack.config')

const makeReact = (pagesData, templateData, config, constants) => new Promise(async (resolve, reject) => {
    if (constants.verbose) {
      console.log('Generate pagesData')
    }
    await fs.writeFileSync(path.resolve(constants.tmp, './pageData.js'), `export default ${JSON.stringify(pagesData)}`);

    if (constants.verbose) {
      console.log('Generate config.js')
    }
    await fs.writeFileSync(path.resolve(constants.tmp, './config.js'), `export default ${JSON.stringify(config)}`);

    if (constants.verbose) {
      console.log('Generate templateData')
    }
    await fs.writeFileSync(path.resolve(constants.tmp, './templateData.js'), `export default ${JSON.stringify(templateData)}`);

    if (constants.verbose) {
      console.log('Generate App.js')
    }
    await fs.copyFileSync(config.App || path.resolve(__dirname, './BaseApp.js'), path.resolve(constants.tmp, './App.js'))

    if (constants.verbose) {
      console.log('app_index.js')
    }    
    await fs.copyFileSync(path.resolve(__dirname, './app_index.js'), path.resolve(constants.tmp, './app_index.js'))


    const webpackConfig = makeWebpackConfig(constants, config, templateData)
    if (constants.verbose) {
      console.log('Webpack Config : ', JSON.stringify(webpackConfig, null, 4))
    }

    webpack(webpackConfig, (err, stats) => { 
      if (constants.verbose) {
        console.log('Remove temp folder')
      }
      fs.rmdirSync(constants.tmp, {recursive: true})

        if (err || stats.hasErrors()) {
          return reject(err || stats.hasErrors())
        }

        resolve()
      });
})

module.exports = makeReact
