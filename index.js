#!/usr/bin/env node

const fs = require('fs')
const {spawn} = require('child_process')
const path = require('path')
const nodeUrl = require('url')
const nunjucks = require('nunjucks')
const { Command, Argument } = require('commander')

const TEMPLATES_DIR = path.resolve(__dirname, 'templates')
const TEMPLATES = fs.readdirSync(TEMPLATES_DIR)
const ROOT = path.resolve(".")
const CONFIG_NAME = 'genysite.config.js'
const CONFIG_PATH = path.join(ROOT, CONFIG_NAME)
const packageJson = require('./package.json')

const ACTIONS = {
  COMPILE: 'compile',
  INSTALL: 'install',
  TEMPLATES: 'templates'
}


let config = {}

const getConfig = async () => {
  if (fs.existsSync(CONFIG_PATH) === false) {
    return {}
  }

  const configData = require(CONFIG_PATH)

  if (typeof configData === 'function') {
    config = await configData()
  } else if (typeof configData === 'object') {
    config = configData
  } else {
    console.error(`Configuration file cannot be processed`)
    process.exit(1)
  }

  return config
}

const compile = async () => {
  config = await getConfig()

  const HOMEPAGE = config.homepage || '';
  const DIST_FOLDER = path.resolve(ROOT, config.dist || 'docs')

  const SRC_FOLDER = path.resolve(ROOT, 'src')
  const PAGES_FOLDER = path.resolve(SRC_FOLDER, 'pages')
  const ASSETS_FOLDER = path.resolve(SRC_FOLDER, 'assets')
  const TEMPLATE_FOLDER = path.resolve(SRC_FOLDER, 'template')
  const TEMPLATE_ASSETS_FOLDER = path.resolve(TEMPLATE_FOLDER, 'assets') 

  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(SRC_FOLDER));

  let homepageIsUrl = false;

  try {
    const url = new nodeUrl.URL('test', HOMEPAGE)
    homepageIsUrl = true
  } catch(e) {

  }

  const joinUrl = stringToJoin => {
    if (homepageIsUrl === true) {
      const url = new nodeUrl.URL(stringToJoin, HOMEPAGE)

      return url.toString()
    }

    return path.join(HOMEPAGE, stringToJoin)
  }

  env.addFilter('assets', function(assetPath, template = false) {
    const rootAssetPath = path.join(HOMEPAGE || '', 'assets')

    const pathname = template === false ? path.join('assets', assetPath) : path.join('assets', 'template', assetPath)

    return joinUrl(pathname)
  })

  env.addFilter('link', function(linkPath) {
    return joinUrl(linkPath)
  })

  let hasAssets = true
  let hasTemplateFolder = true
  let hasTemplateAssets = true

  if (fs.existsSync(SRC_FOLDER) === false){
    console.error("Source folder 'src' does not exists")
    process.exit(1)
  }

  if (fs.existsSync(PAGES_FOLDER) === false){
    console.error("Pages folder 'src/pages' does not exists")
    process.exit(1)
  }

  if (fs.existsSync(ASSETS_FOLDER) === false){
    console.info("No assets found")
    hasAssets = false
  }


  if (fs.existsSync(TEMPLATE_FOLDER) === false){
    console.info("No template was found")
    hasTemplateFolder=false
    hasTemplateAssets=false
  }

  if (hasTemplateFolder === true && fs.existsSync(TEMPLATE_ASSETS_FOLDER) === false){
    console.info("No template's assets found")
    hasTemplateAssets=false
  }

  let dirPool = [
  ]

  let pagesPool = []

  /**
   * Get Pages Structure Informations
   */
  const performPages = (filePath, rootPath = '') => {
    const pages = fs.readdirSync(filePath, {withFileTypes: true})

    pages.forEach(pageInfo => {
      const newFilePath = path.join(filePath, pageInfo.name)
      const newRootPath = path.join(rootPath, pageInfo.name)

      if (pageInfo.isDirectory() === true) {
        dirPool.push(newRootPath)

        return performPages(newFilePath, newRootPath)
      }

      pagesPool.push({filePath: newFilePath, rootPath: newRootPath})
    })
  }

  performPages(PAGES_FOLDER)

  /**
   * Empty dist folder
   */
  if (fs.existsSync(DIST_FOLDER) === true) {
    fs.rmSync(DIST_FOLDER, {recursive: true})
  }

  fs.mkdirSync(DIST_FOLDER)

  /**
   * Create dist folders
   */

  dirPool.forEach(entry => {
    const folderPath = path.join(DIST_FOLDER, entry)

    fs.mkdirSync(folderPath)
  })

  /**
   * Copy assets
   */
  if (hasAssets === true) {
    fs.cpSync(ASSETS_FOLDER, path.join(DIST_FOLDER, 'assets'), {recursive: true})
  } else if (hasTemplateAssets === true) {
    fs.mkdirSync(path.join(DIST_FOLDER, 'assets'));
  }

  if (hasTemplateAssets === true) {
    fs.cpSync(TEMPLATE_ASSETS_FOLDER, path.join(DIST_FOLDER, 'assets', 'template'), {recursive: true})
  }


  /**
   * Get template extra data
   */
  const templateData = {
    ...(config.data || {})
  }



  /**
   * Generate Pages
   */
  const promises = pagesPool.map(pageData => new Promise((resolve, reject) => {
    const templatePath = path.join('pages/', pageData.rootPath)
    env.render(templatePath, templateData, (error, result) => {
      if (error) {
        return reject(error)
      }

      const target = path.join(DIST_FOLDER, pageData.rootPath)

      fs.writeFileSync(target.replace('.njk', '.html'), result, 'utf8')

      resolve(true)
    })
  }))

  Promise.all(promises)
    .then(results => {
      console.log('Well done')
      process.exit(0)
    })
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

const installTemplate = async (templateUrl) => {
  config = await getConfig()

  const SRC_FOLDER = path.resolve(ROOT, 'src')
  const TEMPLATE_FOLDER = path.resolve(SRC_FOLDER, 'template')

  if (fs.existsSync(TEMPLATE_FOLDER) === true) {
    fs.rmSync(TEMPLATE_FOLDER, {recursive: true})
  }

  if (TEMPLATES.indexOf(templateUrl) !== -1) {
    fs.cpSync(path.join(TEMPLATES_DIR, templateUrl), TEMPLATE_FOLDER, {recursive: true})

    console.log('Template installed')
    process.exit(0)
  }

  const clone = spawn('git', ['clone', templateUrl, TEMPLATE_FOLDER])

clone.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

clone.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});


  clone.on('close', errorCode => {
    console.log(errorCode)

    process.exit(0)
  })
}

const listTemplates = () => {
  console.log(TEMPLATES)

  process.exit(0)
}

const parseCommand = async () => {
  const program = new Command()

  program
    .name('genysite')
    .description('Simply Static Website Generator')
    .version(packageJson.version)
  ;

  program.addArgument(new Argument('[command]', 'command').choices(Object.values(ACTIONS)).default(ACTIONS.COMPILE))
  program.addArgument(new Argument('[param]', 'param'))

  program.parse(process.argv);

  const [action, param] = program.processedArgs

  switch(action) {
    case ACTIONS.COMPILE:
      return compile()
    case ACTIONS.TEMPLATES:
      return listTemplates()
    case ACTIONS.INSTALL:
      if (typeof param !== 'string') {
        console.log('Git repo or template namemust be provided')
        return process.exit(1)
      }

      return installTemplate(param)
    default:
      console.log('Unknow action')
      process.exit(1)
  }


}

const run = async () => {
  parseCommand()
}

run()
