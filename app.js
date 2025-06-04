const express = require('express');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const app = express();
const PORT = process.env.PORT || 5000;
const cors = require('cors');
const bodyParser = require("body-parser");

// Implement clustering
if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);
  
  // Fork workers based on CPU cores
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // If a worker dies, create a new one
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker');
    cluster.fork();
  });
} else {
  // Worker processes share the same port
  require('dotenv').config({
    override: true,
    path: '.env'
  });
  
  require("./config/dbconnect");
  
  app.use(bodyParser.json());
  app.use(express.json());
  app.use(cors());
  app.use(express.urlencoded({ extended: true }));
  app.get('/cluster-test', (req, res) => {
    res.send(`Request handled by worker ${process.pid}`);
  });
  app.use('/api', require('./routes/useroute'));
  app.use('/api', require('./routes/category'));
  app.use('/api', require('./routes/subcategory'));
  app.use('/api', require('./routes/postroute'));
  app.use('/api', require('./routes/booking'));
  app.use('/api', require('./routes/payment'));
  app.use('/api', require('./routes/itemtypes'));


  
  require("./utils/cronJob"); 
  
  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} listening on port ${PORT}`);
  });
}