// redisClient.js
const { createClient } = require('redis');

// Create and configure the Redis client
const redisClient = createClient();

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis client connected successfully');
  } catch (error) {
    console.error('Redis connection error:', error);
  }
};

// Call this function when your application starts
// connectRedis();

// Handle Redis connection errors
redisClient.on('error', (err) => {
  console.error('Redis Error:', err);
});

module.exports = redisClient;