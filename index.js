#!/usr/bin/env node

const fs = require('fs')
const sass = require('sass')
const {spawn} = require('child_process')
const path = require('path')
const marked = require('marked')
const { Command, Argument } = require('commander')
const merge = require('merge-deep');
const { v4: uuidv4 } = require('uuid');
const createTemplateEngine = require('./libs/templateEngine')
const reactTemplateEngine = require('./libs/reactEngine/index')

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

let programConfig = {
  verbose: false,
  debug: false
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
  const FILE_EXTENSION = config.fileExtension || '.njk'
  const HOMEPAGE = config.homepage || '';
  const DIST_FOLDER = path.resolve(ROOT, config.dist || 'docs')

  const SRC_FOLDER = path.resolve(ROOT, 'src')
  const TMP_FOLDER = path.resolve(__dirname, 'tmp')
  const PAGES_FOLDER = path.resolve(SRC_FOLDER, 'pages')
  const ASSETS_FOLDER = path.resolve(SRC_FOLDER, 'assets')
  const TEMPLATE_FOLDER = path.resolve(SRC_FOLDER, 'template')
  const TEMPLATE_ASSETS_FOLDER = path.resolve(TEMPLATE_FOLDER, 'assets') 
  const TEMPLATE_CONFIG_FILE = path.resolve(TEMPLATE_FOLDER, 'config.js') 

  if (fs.existsSync(TMP_FOLDER) === false) {
    fs.mkdirSync(TMP_FOLDER)
  }

  if (fs.existsSync(TEMPLATE_CONFIG_FILE) === true) {
    const templateConfig = require(TEMPLATE_CONFIG_FILE)

    config = merge(templateConfig, config)
  }

  /**
   * Set nunjucks environment
   */
    const env = createTemplateEngine(SRC_FOLDER, HOMEPAGE, config)

    /**
     *  Check FileSystem
     */
    let hasAssets = true
    let hasTemplateFolder = true
    let hasTemplateAssets = true

    if (fs.existsSync(SRC_FOLDER) === false){
      console.error("Source folder 'src' does not exists")
      process.exit(1)
    } else if (programConfig.verbose) {
      console.info('Source folder: ', SRC_FOLDER)
    }

    if (fs.existsSync(PAGES_FOLDER) === false){
      console.error("Pages folder 'src/pages' does not exists")
      process.exit(1)
    } else if (programConfig.verbose) {
      console.info('Page folder: ', SRC_FOLDER)
    }

    if (fs.existsSync(ASSETS_FOLDER) === false){
      console.info("No assets found")
      hasAssets = false
    } else if (programConfig.verbose) {
      console.info('Assets found : ', ASSETS_FOLDER)
    }

    if (fs.existsSync(TEMPLATE_FOLDER) === false){
      console.info("No template was found")
      hasTemplateFolder=false
      hasTemplateAssets=false
    } else if (programConfig.verbose) {
      console.info('Template found: ', TEMPLATE_FOLDER)
    }

    if (hasTemplateFolder === true && fs.existsSync(TEMPLATE_ASSETS_FOLDER) === false){
      console.info("No template's assets found")
      hasTemplateAssets=false
    } else if (programConfig.verbose) {
      console.info('Template assets found: ', TEMPLATE_ASSETS_FOLDER)
    }

    let dirPool = []

    let pagesPool = []

    /**
     * Get Pages Structure Informations
     */
    const performPages = (filePath, rootPath = '') => {
      const priority = Array.isArray(config.priority) === true ? config.priority : null
      const pages = fs.readdirSync(filePath, {withFileTypes: true})

      return pages
     // .filter(pageInfo => path.extname(pageInfo.name) === FILE_EXTENSION || pageInfo.isDirectory() === true)
      .map(pageInfo => {
        const newFilePath = path.join(filePath, pageInfo.name)
        const newRootPath = path.join(rootPath, pageInfo.name)
        const withoutExtension = path.join(rootPath, pageInfo.name.replace(path.extname(pageInfo.name), ''))
        const newFrontPath = path.join(rootPath, pageInfo.name.replace(path.extname(pageInfo.name), config.react === true ? '' : '.html'))

        if (pageInfo.isDirectory() === true) {
          const name = config.names?.[newRootPath] || pageInfo.name

          dirPool.push(newRootPath)

          return {name, brutName: pageInfo.name, children: performPages(newFilePath, newRootPath)}
        }

        const name = config.names?.[newRootPath.replace(path.extname(pageInfo.name), '')] || pageInfo.name
        pagesPool.push({filePath: newFilePath, rootPath: newRootPath})

        return {name: name.replace(path.extname(pageInfo.name), ''), brutName: pageInfo.name.replace(path.extname(pageInfo.name), ''), path: config.index === withoutExtension ? '' : newFrontPath}
      }).sort((a, b) => {
        /**
         * Order the tree,
         * First By priority,
         * Secondy By name
         */
        if (priority === null) {
          return 0;
        }

        const reversePriority = [...priority].reverse()

        const aIndex = reversePriority.indexOf(a.brutName)
        const bIndex = reversePriority.indexOf(b.brutName)

        if (aIndex === bIndex) {
          return a.brutName > b.brutName ? 1 : -1
        }

        if (aIndex > bIndex) {
          return -1
        }

        if (bIndex > aIndex) {
          return 1
        }

        return 0;
      })
    }

    const tree = performPages(PAGES_FOLDER)

    /**
     * Empty dist folder
     */
    if (fs.existsSync(DIST_FOLDER) === true) {
      fs.rmSync(DIST_FOLDER, {recursive: true})
      if (programConfig.verbose) {
        console.log('Delete dist folder: ', DIST_FOLDER)
      }
    }

    fs.mkdirSync(DIST_FOLDER)

    /**
     * Create dist folders
     */
    if (programConfig.verbose && dirPool.length > 0) {
      console.log('Create Dist Folders', dirPool)
    }

    dirPool.forEach(entry => {
      const folderPath = path.join(DIST_FOLDER, entry)

      fs.mkdirSync(folderPath)
    })

    /**
     * Copy assets
     */
    if (hasAssets === true) {
      if (programConfig.verbose) {
        console.log('Create Dist Assets Folder')
      }

      fs.cpSync(ASSETS_FOLDER, path.join(DIST_FOLDER, 'assets'), {recursive: true})
    } else if (hasTemplateAssets === true) {
      if (programConfig.verbose) {
        console.log('Create Dist Assets Folder')
      }
      fs.mkdirSync(path.join(DIST_FOLDER, 'assets'));
    }

    if (hasTemplateAssets === true) {
      if (programConfig.verbose) {
        console.log('Create Dist Template Assets Folder')
      }
      fs.cpSync(TEMPLATE_ASSETS_FOLDER, path.join(DIST_FOLDER, 'assets', 'template'), {recursive: true})
    }

    /**
     *  Compile Sass file
     */
    const performSass = (rootDir) => {
      if (fs.existsSync(rootDir) === false) {
        return;
      }

      const files = fs.readdirSync(rootDir, {withFileTypes: true})

      files.forEach(fileInfo => {
        const fullPath = path.join(rootDir, fileInfo.name)

        if (fileInfo.isDirectory() === true) {
          return performSass(fullPath)
        }

        if (['.scss', '.sass'].indexOf(path.extname(fileInfo.name)) !== -1) {
          const compiledSass =  sass.compile(fullPath);
          const cssFileName = `${path.basename(fileInfo.name, path.extname(fileInfo.name))}.css`
          if (programConfig.verbose) {
            console.log('Perform Sass File: ', fullPath)
          }

          fs.writeFileSync(path.join(rootDir, cssFileName), compiledSass.css)
        }
      })
    }

    performSass(path.join(DIST_FOLDER, 'assets'))

    /**
     * Get template extra data
     */
    const templateData = {
      ...(config.data || {}),
      tree
    }

    if (programConfig.verbose) {
      console.log('Template Variables: ', JSON.stringify(templateData, null, 4))
      console.log('Engine: ', config.react !== true ? 'Default' : 'React')
    }

    /**
     * Generate Pages
     */
    if (config.react !== true) {
      const promises = pagesPool.map(pageData => new Promise((resolve, reject) => {
        const templatePath = path.join('pages/', pageData.rootPath)

        env.render(templatePath, templateData, (error, result) => {
          if (error) {
            return reject(error)
          }

          if (path.extname(templatePath) === '.md') {
            result = marked.parse(result)
          }
  
          const target = path.join(DIST_FOLDER, pageData.rootPath)
  
          fs.writeFileSync(target.replace(path.extname(target), '.html'), result, 'utf8')
  
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
    } else {      
      const tmpFolder = path.resolve(TMP_FOLDER, `./${uuidv4()}`)
      fs.mkdirSync(tmpFolder);

      if (programConfig.verbose) {
        console.log('Temp folder created: ', tmpFolder)
      }

      const promises = pagesPool.map(pageData => new Promise((resolve, reject) => {
        const templatePath = path.join('pages/', pageData.rootPath)
        env.render(templatePath, templateData, (error, result) => {
          if (error) {
            return reject(error)
          }

          if (path.extname(templatePath) === '.md') {
            result = marked.parse(result)
          }
          
          resolve({...pageData, content: result, path: pageData.filePath.replace(PAGES_FOLDER, '').replace(path.extname(pageData.filePath), '')})
        })
      }))

      Promise.all(promises)
      .then(results => {
        const workDone = () => {
          reactTemplateEngine(results, templateData, config, {dist: DIST_FOLDER, tmp: tmpFolder, verbose: programConfig.verbose})
          .then(() => {
            console.log('Well done')
            process.exit(0)
          })
          .catch(error => {
            console.error(error)
            process.exit(1)
          })
        }

        if (!config.index_html) {
          fs.copyFileSync(path.resolve(__dirname, './libs/reactEngine/base_index.html'), path.resolve(tmpFolder, './index.html'))
          
          return workDone()
        }

        if (programConfig.verbose) {
          console.log('index.html Generation ')
        }

        env.render(config.index_html, templateData, (error, result) => {
          if (error) {
            console.error(error)
            process.exit(1)
          }

          fs.writeFileSync(path.resolve(tmpFolder, './index.html'), result)

          return workDone()
        })
      })
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
    }

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
      .option('-d, --debug', 'output extra debugging')
      .option('-v, --verbose', 'output verbose')
    ;

    program.addArgument(new Argument('[command]', 'command').choices(Object.values(ACTIONS)).default(ACTIONS.COMPILE))
    program.addArgument(new Argument('[param]', 'param'))

    program.parse(process.argv);

    const [action, param] = program.processedArgs

    const options = program.opts();

    if (options.debug) {
      console.info('Options :', options)
    }

    if (options.verbose) {
      console.info('Run with verbose level')
    }

    programConfig = options

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
