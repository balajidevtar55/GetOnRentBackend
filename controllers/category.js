const fs = require('fs');
const AWS = require('aws-sdk');
const Category = require('../models/category');
const redisClient = require('../config/redisClient');

// Set up AWS S3
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'eu-north-1'
});



const s3 = new AWS.S3();

const categoryController = {
  
  uploadCategory: async (req, res) => {
    try {
      const { name, neams } = req.body;
      const file = req.file;
       
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded.' });
      }

      // Read the uploaded file
      const fileContent = fs.readFileSync(file.path);

      // Set up S3 upload parameters
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME, 
        Key: `categoryicons/${file.originalname}`,
        Body: fileContent,
        ContentType: file.mimetype,
        ACL: 'public-read', 
      };

      // Upload the file to S3
      const s3UploadResult = await s3.upload(params).promise();

      // Save category details in MongoDB
      const newCategory = new Category({
        name,
        icon: s3UploadResult.Location, // URL of the uploaded icon in S3
        neams,
        s3Keys: [s3UploadResult.Key],
      });

      await newCategory.save();

      // Clean up the uploaded file from the local server
      fs.unlinkSync(file.path);

      res.status(201).json({ message: 'Category created successfully!', data: newCategory });
    } catch (error) {
      console.error('Error uploading category:', error);
      res.status(500).json({ message: 'An error occurred while creating the category.' });
    }
  },
  getCategory: async (req, res) => {
    try {
      // Define cache key for categories
      const cacheKey = 'all_categoriesdata';
      
      // Check if Redis is connected and try to get cached data
      let categories;
      if (redisClient.isReady) {
        try {
          const cachedData = await redisClient.get(cacheKey);
          if (cachedData) {
            // Return data from cache if available
            categories = JSON.parse(cachedData);
            return res.status(200).json({ 
              message: 'Categories retrieved successfully from cache',
              data: categories 
            });
          }
        } catch (redisError) {
          console.error('Redis get error:', redisError);
          // Continue to database query if Redis fails
        }
      }
      
      // If no cache hit or Redis error, fetch from database
      categories = await Category.find();
      
      // Store result in Redis if connected
      if (redisClient.isReady) {
        try {
          await redisClient.set(
            cacheKey,
            JSON.stringify(categories),
            { EX: 3600 } // Cache for 1 hour
          );
        } catch (redisError) {
          console.error('Redis set error:', redisError);
        }
      }
      
      // Return the fetched data
      res.status(200).json({ 
        message: 'Categories retrieved successfully', 
        data: categories 
      });
    } catch (error) {
      console.error('Error retrieving categories:', error);
      res.status(500).json({ 
        message: 'An error occurred while retrieving categories.' 
      });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { categoryId } = req.body;
  
      // Fetch the document to get S3 file keys (assuming you have stored the keys)
      const category = await Category.find({ _id: categoryId }).lean();
  
      if (category.length > 0) {
        // Collect S3 keys for deletion (assuming each post has image keys stored in an array `s3Keys`)
        const s3KeysToDelete = category.flatMap(category => category.s3Keys || []);
          
        console.log("s3KeysToDelete",category)
        // Delete files from S3 bucket
        if (s3KeysToDelete.length > 0) {
          const deleteParams = {
            Bucket: "localbusinessconnect",
            Delete: {
              Objects: s3KeysToDelete.map(key => ({ Key: key })),
              Quiet: false,
            },
          };
  
          await s3.deleteObjects(deleteParams).promise();
        }
  
        // Delete the database entry
        await Category.deleteMany({ _id: categoryId });
  
        res.status(200).json({
          message: 'Category and associated S3 images deleted successfully',
          deletedCount: category,
        });
      } else {
        res.status(404).json({
          message: 'No Category found with the specified ID',
        });
      }
    } catch (error) {
      res.status(500).json({
        message: 'Error deleting post and S3 images',
        error: error.message,
      });
    }
  },

   updateCategory: async (req, res) => {
    try {
      const { categoryId, name, neams } = req.body;
      const file = req.file;
  
      // Check if the category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: 'Category not found.' });
      }
  
      // Handle file upload to S3 if a new file is provided
      let s3UploadResult;
      if (file) {
        // Read the uploaded file
        const fileContent = fs.readFileSync(file.path);
  
        // Set up S3 upload parameters
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `categoryicons/${file.originalname}`,
          Body: fileContent,
          ContentType: file.mimetype,
          ACL: 'public-read',
        };
  
        // Upload the file to S3
        s3UploadResult = await s3.upload(params).promise();
  
        // Clean up the uploaded file from the local server
        fs.unlinkSync(file.path);
  
        // Update the category with the new icon URL and s3Key
        category.icon = s3UploadResult.Location;
        category.s3Keys = [s3UploadResult.Key];
      }
  
      // Update other category fields (e.g., name, neams)
      if (name) category.name = name;
      if (neams) category.neams = neams;
  
      // Save the updated category
      await category.save();
  
      res.status(200).json({ message: 'Category updated successfully!', data: category });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ message: 'An error occurred while updating the category.' });
    }
  }
};



module.exports = categoryController;
