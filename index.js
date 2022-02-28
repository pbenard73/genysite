#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const nodeUrl = require('url')
const nunjucks = require('nunjucks')

const ROOT = path.resolve(".")
const CONFIG_PATH = path.join(ROOT, 'genysite.json')

let config = {}

if (fs.existsSync(CONFIG_PATH) === true) {
  config = require(CONFIG_PATH)
}

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




