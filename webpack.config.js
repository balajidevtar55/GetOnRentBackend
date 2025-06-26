const path = require('path');
const webpack = require('webpack');

module.exports = {
  target: 'node',
  mode: 'development', // or 'production'
  entry: './app.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs2'
  },
  node: {
    __dirname: false,
    __filename: false
  },
  externals: {
    // Core Node.js modules
    'bcrypt': 'commonjs bcrypt',
    'mongoose': 'commonjs mongoose',
    
    // Native build tools (not needed at runtime)
    'node-gyp': 'commonjs node-gyp',
    'npm': 'commonjs npm',
    
    // Optional MongoDB dependencies
    'bson-ext': 'commonjs bson-ext',
    'kerberos': 'commonjs kerberos',
    '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
    'snappy': 'commonjs snappy',
    'aws4': 'commonjs aws4',
    'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
    
    // Testing/mocking libraries
    'mock-aws-s3': 'commonjs mock-aws-s3',
    'nock': 'commonjs nock'
  },
  resolve: {
    extensions: ['.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    // Ignore optional dependencies that cause warnings
    new webpack.IgnorePlugin({
      checkResource(resource, context) {
        // List of optional dependencies to ignore
        const optionalDeps = [
          '@mongodb-js/zstd',
          'kerberos',
          'snappy',
          'aws4',
          'mongodb-client-encryption',
          'bson-ext',
          'mock-aws-s3',
          'nock'
        ];
        
        return optionalDeps.includes(resource);
      }
    }),
    
    // Define process.env for Node.js compatibility
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    })
  ]
};