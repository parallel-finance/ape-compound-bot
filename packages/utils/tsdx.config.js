module.exports = {
  rollup(config, options) {
    config.plugins = config.plugins.map(p =>
      p.name === 'replace' ?
      require('@rollup/plugin-replace')({
        'process.env.NODE_ENV': JSON.stringify(options.env),
        preventAssignment: true,
      }) :
      p
    );

    return config;
  },
};