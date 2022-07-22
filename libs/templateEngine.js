const path = require('path')
const nunjucks = require('nunjucks')
const nodeUrl = require('url')
const hljs = require('highlight.js')
const marked = require('marked')

const createNewEnvironment = (SRC_FOLDER,  HOMEPAGE) => {
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

  /**
   * Set nunjucks environment
   */
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(SRC_FOLDER));

  env.addFilter('highlightTheme', function(theme) {
    return new nunjucks.runtime.SafeString(`<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.4.0/styles/${theme}.min.css" />`)
  })

  env.addFilter('isArray', function(variable) {
    return Array.isArray(variable)
  })

  env.addFilter('assets', function(assetPath, template = false) {
    const rootAssetPath = path.join(HOMEPAGE || '', 'assets')

    const pathname = template === false ? path.join('assets', assetPath) : path.join('assets', 'template', assetPath)

    return joinUrl(pathname)
  })

  env.addFilter('link', function(linkPath) {
    return joinUrl(linkPath)
  })

  const performMetadata = (metadata = []) => metadata.map(meta => {
      if (typeof meta === 'string') {
        return meta
      }
      if (typeof meta === 'function') {
        return meta()
      }
    }).join(`
`);

  env.addFilter('meta', function(metadata) {
    const metaTags = performMetadata(metadata)
    
    return new nunjucks.runtime.SafeString(metaTags)
  })

  function HighlightExtension(){
    this.tags = ['highlight']

    this.parse = function(parser, nodes) {
      const token = parser.nextToken()

      const args = parser.parseSignature(null, true)
      parser.advanceAfterBlockEnd(token.value)

      const body = parser.parseUntilBlocks('highlight', 'endhighlight')

      let errorBody = null

      if (parser.skipSymbol('error')){
        parser.skip(lexer.TOKEN_BLOCK_END)
        errorBody = parser.parseUntilBloks('endhighlight')
      }

      parser.advanceAfterBlockEnd()

      return new nodes.CallExtension(this, 'run', args, [body, errorBody])
    }

    this.run = function(context, args, body, errorBody) {
      const language = typeof args === 'function' ? 'js' : args
      const bodyFunc = typeof args === 'function' ? args : body

      return new nunjucks.runtime.SafeString(`<pre><code class="hljs">${hljs.highlight(bodyFunc(), {language}).value}</code></pre>`)
      }
    }


    function MarkdownExtension(){
      this.tags = ['markdown']

      this.parse = function(parser, nodes) {
        const token = parser.nextToken()

        const args = parser.parseSignature(null, true)
        parser.advanceAfterBlockEnd(token.value)

        const body = parser.parseUntilBlocks('markdown', 'endmarkdown')

        let errorBody = null

        if (parser.skipSymbol('error')){
          parser.skip(lexer.TOKEN_BLOCK_END)
          errorBody = parser.parseUntilBloks('endmarkdown')
        }

        parser.advanceAfterBlockEnd()

        return new nodes.CallExtension(this, 'run', args, [body, errorBody])
      }

      this.run = function(context, body, errorBody) {

        return new nunjucks.runtime.SafeString(marked.parse(body()))
      }
    }

    env.addExtension('HighlightExtension', new HighlightExtension())
    env.addExtension('MardownExtension', new MarkdownExtension())

    return env;
  }

  module.exports = createNewEnvironment
