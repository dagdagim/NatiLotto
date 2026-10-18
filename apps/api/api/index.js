// Vercel Serverless Function entry point
// Bridges incoming HTTP requests to the precompiled NestJS Express handler
const handler = require('../dist/src/main').default;

module.exports = async (req, res) => {
  return handler(req, res);
};
