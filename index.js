const fs = require('fs')
const path = require('path')
const nunjucks = require('nunjucks')

const HOME_PAGE = "/geny"

const ROOT = path.resolve(".")
const SRC_FOLDER = path.resolve(ROOT, 'src')
const PAGES_FOLDER = path.resolve(SRC_FOLDER, 'pages')
const ASSETS_FOLDER = path.resolve(SRC_FOLDER, 'assets')
const TEMPLATE_FOLDER = path.resolve(SRC_FOLDER, 'template')
const TEMPLATE_ASSETS_FOLDER = path.resolve(TEMPLATE_FOLDER, 'assets') 
const DIST_FOLDER = path.resolve(ROOT, 'dist')

const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(SRC_FOLDER));

env.addFilter('assets', function(assetPath, template = false) {
  const rootAssetPath = path.join(HOME_PAGE || '', 'assets')

  return template === false ? path.join(rootAssetPath, assetPath) : path.join(rootAssetPath, 'template', assetPath)
})

env.addFilter('link', function(linkPath) {
  return path.join(HOME_PAGE || '', linkPath)
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
  fs.mkddirSync(path.join(DIST_FOLDER, 'assets'));
}

if (hasTemplateAssets === true) {
  fs.cpSync(TEMPLATE_ASSETS_FOLDER, path.join(DIST_FOLDER, 'assets', 'template'), {recursive: true})
}


/**
 * Generate Pages
 */
const promises = pagesPool.map(pageData => new Promise((resolve, reject) => {
  const templatePath = path.join('pages/', pageData.rootPath)
  env.render(templatePath, {}, (error, result) => {
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




