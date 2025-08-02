const authRoute = require('./authRoute');
const smmRoutes = require('./smm');
const serviceRoute = require('./serviceRoute');
const productRoute = require('./productRoute');
const postRoute = require('./postRoute');
const adminRoute = require('./adminRoute');
const walletRoute = require('./walletRoute');
const messageRoute = require('./messageRoute');

const mountRoutes = (app) => {
  // Mount Authentication Routes
  app.use('/api/v1/auth', authRoute);
  
  // Mount SMM Routes
  app.use('/api/v1/smm', smmRoutes);
  
  // Mount Service Routes
  app.use('/api/v1/services', serviceRoute);
  
  // Mount Product Routes
  app.use('/api/v1/products', productRoute);
  
  // Mount Post Routes
  app.use('/api/v1/posts', postRoute);
  
  // Mount Admin Routes
  app.use('/api/v1/admin', adminRoute);
  
  // Mount Wallet Routes
  app.use('/api/v1/wallet', walletRoute);
  
  // Mount Message Routes
  app.use('/api/v1/messages', messageRoute);
};

module.exports = mountRoutes;
