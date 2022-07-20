export default config => ({
    assets: (path, isTemplate = false) => `${config.homepage}/assets/${isTemplate ? 'template/' : ''}${path}`
})