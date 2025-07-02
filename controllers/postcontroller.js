
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const DynamicPostData = require('../models/Addpost');
const { default: mongoose } = require('mongoose');
const AWS = require('aws-sdk');
const cloudinary = require('cloudinary');
const jwt = require('jsonwebtoken');
const businessowner = require('../models/businessowner');
const redisClient = require('../config/redisClient');
const buildMongoFilter = require('../utils/buildMongoFilter');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-south-1'
});


// const uploadPostImage = asyncHandler(async (req, res) => {
//   const { postId } = req.body;
//   const files = req.files;

//   // Check if postId and file are present
//   if (!postId || !files) {
//     return res.status(400).json({ message: "Post ID and files are required." });
//   }

//   const uploadedFileUrls = [];
//   const s3Keys = []; // Array to store object keys

//   try {
//     // Iterate through each file and upload to S3
//     for (const file of files) {
//       const objectKey = `post-files/${Date.now()}-${file.originalname}`; // Unique file key

//       const uploadParams = {
//         Bucket: process.env.AWS_BUCKET_NAME, // Replace with your S3 bucket name
//         Key: objectKey,
//         Body: file.buffer,
//         ContentType: file.mimetype,
//         ACL: 'public-read', // Make file publicly readable (optional)
//       };

//       // Upload to S3
//       const uploadResponse = await s3.upload(uploadParams).promise();

//       // Store the uploaded URL and key
//       uploadedFileUrls.push(uploadResponse.Location);
//       s3Keys.push(objectKey); // Add only the S3 object key
//     }

//     // Update the post with the file URLs and S3 keys
//     const updatedPost = await  DynamicPostData.updateOne(
//       { _id: postId }, // Find the document by its ID
//       {
//         $set: {
//           "postData.postImage": uploadedFileUrls, 
//           "s3Keys": s3Keys,
//         },
//       }
//     );


//     if (!updatedPost) {
//       return res.status(404).json({ message: "Post not found." });
//     }

//     // Respond with success
//     return res.status(200).json({
//       message: "Files uploaded to S3 and post updated successfully.",
//       fileUrls: uploadedFileUrls,
//       s3Keys: s3Keys, // Include keys in the response for debugging or reference
//     });
//   } catch (error) {
//     // Handle errors
//     console.error("Error uploading files to S3:", error);
//     return res.status(500).json({
//       message: "An error occurred while uploading files to S3.",
//       error: error.message,
//     });
//   }
// });



const uploadPostImage = asyncHandler(async (req, res) => {
  const { postId } = req.body;
  const files = req.files;

  // Check if postId and files are present
  if (!postId || !files || files.length === 0) {
    return res.status(400).json({
      message: "Post ID and at least one file are required."
    });
  }

  try {
    // Test AWS credentials
    const credentials = await AWS.config.credentials.getPromise();
    console.log('AWS credentials loaded successfully');
  } catch (credError) {
    console.error('AWS credentials error:', credError);
    return res.status(500).json({
      message: "Failed to load AWS credentials",
      error: credError.message
    });
  }

  // Check if post exists before uploading
  let existingPost;
  try {
    existingPost = await DynamicPostData.findById(postId);
    if (!existingPost) {
      return res.status(404).json({ message: "Post not found." });
    }
  } catch (error) {
    console.error('Error finding post:', error);
    return res.status(500).json({
      message: "Error finding post",
      error: error.message
    });
  }

  const uploadedFileUrls = [];
  const s3Keys = [];
  const uploadErrors = [];

  try {
    // Upload files to S3
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Validate file
        if (!file.buffer || !file.originalname) {
          uploadErrors.push(`File ${i + 1}: Invalid file data`);
          continue;
        }

        const fileContent = file.buffer;
        const fileExtension = file.originalname.split('.').pop();
        const key = `post-files/${postId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: file.mimetype,
          ACL: 'public-read',
        };

        // Upload file to S3
        const s3Response = await s3.upload(params).promise();
        uploadedFileUrls.push(s3Response.Location);
        s3Keys.push(key);

        console.log(`Successfully uploaded file ${i + 1}:`, s3Response.Location);

      } catch (fileError) {
        console.error(`Error uploading file ${i + 1}:`, fileError);
        uploadErrors.push(`File ${i + 1}: ${fileError.message}`);
      }
    }

    // Check if any files were uploaded successfully
    if (uploadedFileUrls.length === 0) {
      return res.status(500).json({
        message: "Failed to upload any files",
        errors: uploadErrors
      });
    }

    // Get existing images to preserve them
    const existingImages = existingPost.postData?.postImage || [];
    const existingS3Keys = existingPost.postData?.s3Keys || [];

    // Filter out duplicates
    const newImages = uploadedFileUrls.filter(url => !existingImages.includes(url));
    const newS3Keys = s3Keys.filter(key => !existingS3Keys.includes(key));

    console.log(`Adding ${newImages.length} new images to existing ${existingImages.length} images`);

    // Update the post - APPEND new images to existing ones
    const updatedPost = await DynamicPostData.findByIdAndUpdate(
      postId,
      {
        $push: {
          "postData.postImage": { $each: newImages },
          "postData.s3Keys": { $each: newS3Keys },
        },
      },
      {
        new: true,
        runValidators: true
      }
    );



    // Prepare response
    const response = {
      message: "Files uploaded and post updated successfully.",
      uploadedFiles: uploadedFileUrls,
      totalImages: updatedPost.postData?.postImage?.length || 0,
      newImagesAdded: newImages.length,
      post: updatedPost
    };

    // Include upload errors if any
    if (uploadErrors.length > 0) {
      response.partialSuccess = true;
      response.uploadErrors = uploadErrors;
      response.message = `${uploadedFileUrls.length} files uploaded successfully, ${uploadErrors.length} failed.`;
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in upload process:', error);

    // If some files were uploaded but database update failed, 
    // you might want to clean up S3 files here
    if (uploadedFileUrls.length > 0) {
      console.log('Note: Some files were uploaded to S3 but database update failed. Consider cleanup.');
    }

    return res.status(500).json({
      message: "An error occurred during the upload process.",
      error: error.message,
      uploadedFiles: uploadedFileUrls, // Show which files were uploaded
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

const AddPost = asyncHandler(async (req, res) => {
  try {
    const { postData, userId, category, isSubmit, step } = req.body;

    if (!userId || !postData) {
      return res.status(400).json({
        message: "User ID and post data are required",
      });
    }

    // 🧭 Migrate lat/lng to GeoJSON location if available
    if (postData?.lat && postData?.lng) {
      postData.location = {
        type: "Point",
        coordinates: [postData.lng, postData.lat], // GeoJSON format
      };
    }

    // Create a new post entry
    const dynamicPostDataEntry = new DynamicPostData({
      createdBy: mongoose.Types.ObjectId(userId),
      isSubmit,
      step,
      postData,
    });

    const savedData = await dynamicPostDataEntry.save();

    res.status(201).json({
      message: "Dynamic data stored successfully",
      data: savedData,
      success: true,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error storing dynamic data",
      error: error.message,
    });
  }
});


const updatePost = asyncHandler(async (req, res) => {
  try {
    const { postData, postId, category } = req.body;

    if (!postId || !postData) {
      return res.status(400).json({
        message: "Post ID and post data are required",
      });
    }

    const existingPost = await DynamicPostData.findById(postId);
    if (!existingPost) {
      return res.status(404).json({
        message: "Post not found",
      });
    }

    const existingPostData = existingPost.postData || {};
    const preservedData = {
      s3Keys: existingPostData.s3Keys || [],
      postImage: existingPostData.postImage || [],
    };

    

    // 🧭 Migrate lat/lng to location if present
    if (postData.lat && postData.lng) {
      postData.location = {
        type: "Point",
        coordinates: [postData.lng, postData.lat],
      };
    }

    const updatedPostData = {
      ...postData,
      ...preservedData,
    };

   const updateFields = JSON.parse(JSON.stringify({
  postData: updatedPostData, // assuming this was constructed correctly
}));


if (category) {
  updateFields.category = mongoose.Types.ObjectId(category);
}

 
const updatedPost = await DynamicPostData.findByIdAndUpdate( 
  postId,
  { $set: updateFields },
  { new: true, useFindAndModify: false } // `useFindAndModify` helps with some Mongo versions
);




    res.status(200).json({
      message: "Post updated successfully",
      data: updatedPost,
      success: true,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating post",
      error: error.message,
    });
  }
});


const getPostData = asyncHandler(async (req, res) => {
  try {
    const { filterData } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: No user ID found in token' });
    }

    const matchFilter = buildMongoFilter(filterData);

    let posts = [];
    // ✅ If lat/lng is present, use $geoNear
    if (filterData?.latitude && filterData?.longitude) {
      const pipeline = [
        {
          $geoNear: {
        near: {
          type: "Point",
          coordinates: [parseFloat(filterData.longitude), parseFloat(filterData.latitude)]
        },
        distanceField: "distance",
        spherical: true,
        query: Object.keys(matchFilter).length > 0 ? matchFilter : {} // Apply filters directly in geoNear
      }
    }
      ];
    
      // Apply additional filters if available
      if (Object.keys(matchFilter).length > 0) {
        pipeline.push({ $match: matchFilter });
      }

      posts = await DynamicPostData.aggregate(pipeline);
    } else {
      // ✅ Fall back to regular find
      posts = await DynamicPostData.find(matchFilter);
    }


    // Attach isOwner flag
    const updatedPosts = posts.map(post => {
      const plainPost = typeof post.toObject === 'function' ? post.toObject() : post;
      return {
        ...plainPost,
        isOwner: plainPost.createdBy?.toString() === userId.toString(),
      };
    });


    res.status(200).json({
      message: 'Dynamic data fetched successfully',
      data: updatedPosts,
      success: true
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching dynamic data',
      error: error.message,
      success: false
    });
  }
});




const getWithoutLoginPostData = asyncHandler(async (req, res) => {
  try {
    const { filterData } = req.body;

    // Get logged-in user from request (populated by auth middleware)




    // If cache miss, fetch from database
    const posts = await DynamicPostData.find(filterData).lean();

    const updatedPosts = posts.map(post => ({
      ...post,
    }));



    res.status(200).json({
      message: 'Dynamic data fetched successfully',
      data: updatedPosts,
      success: true

    });
  } catch (error) {
    res.status(500).json({
      message: 'Error fetching dynamic data',
      error: error.message,
      success: false

    });
  }
});

const deletePostData = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.body;

    // Fetch the document to get S3 file keys
    const posts = await DynamicPostData.find({ _id: postId });

    if (posts.length > 0) {
      // Collect S3 keys for deletion (assuming each post has image keys stored in `s3Keys`)
      const s3KeysToDelete = posts.flatMap(post => post.postData.s3Keys || []);


      // Delete files from S3 bucket
      if (s3KeysToDelete.length > 0) {
        const deleteParams = {
          Bucket: "getonrent", // Replace with your bucket name
          Delete: {
            Objects: s3KeysToDelete.map(key => ({ Key: key })),
          },
        };


        const deleteResponse = await s3.deleteObjects(deleteParams).promise();

        // Handle partial failures
        if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
          console.error("S3 Deletion Errors:", deleteResponse.Errors);
          return res.status(500).json({
            message: 'Some files could not be deleted from S3',
            errors: deleteResponse.Errors,
          });
        }
      }

      // Delete the database entries
      const deletedCount = await DynamicPostData.deleteMany({ _id: postId });

      res.status(200).json({
        message: 'Post and associated S3 images deleted successfully',
        deletedCount: deletedCount.deletedCount, // Number of posts deleted
        success: true
      });
    } else {
      res.status(404).json({
        message: 'No post found with the specified ID',
      });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      message: 'Error deleting post and S3 images',
      error: error.message,
    });
  }
});

const deletePostImage = asyncHandler(async (req, res) => {
  try {
    const { postId, imageUrl } = req.body;

    if (!postId || !imageUrl) {
      return res.status(400).json({ message: "postId and imageUrl are required" });
    }

    // Get the post document
    const post = await DynamicPostData.findOne({ _id: postId });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    console.log("post", post)

    // Find the S3 key for the image to delete
    const s3KeyToDelete = post.postData.s3Keys.find(key =>
      imageUrl.includes(key.split("/").pop()) // match filename in URL
    );

    if (!s3KeyToDelete) {
      return res.status(404).json({ message: "Image key not found in post" });
    }

    // Delete from S3
    const deleteParams = {
      Bucket: "getonrent",
      Delete: {
        Objects: [{ Key: s3KeyToDelete }],
      },
    };

    const deleteResult = await s3.deleteObjects(deleteParams).promise();
    if (deleteResult.Errors && deleteResult.Errors.length > 0) {
      return res.status(500).json({
        message: "Failed to delete image from S3",
        errors: deleteResult.Errors,
      });
    }

    // Update MongoDB: remove image from both arrays
    const updatedPost = await DynamicPostData.findByIdAndUpdate(
      postId,
      {
        $pull: {
          "postData.postImage": imageUrl,
          "postData.s3Keys": s3KeyToDelete,
        },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Image deleted successfully from S3 and post",
      updatedPost,
      success: true,
    });

  } catch (error) {
    console.error("Delete Image Error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

const migratePostLocations = async (req, res) => {
  try {
    // Find posts with lat/lng but without GeoJSON location
    const posts = await DynamicPostData.find({
      "postData.lat": { $exists: true },
      "postData.lng": { $exists: true },
      "postData.location": { $exists: false }
    });

    if (!posts.length) {
      return res.status(200).json({
        message: "No posts found that require migration.",
        migratedCount: 0,
      });
    }

    let migratedCount = 0;

    for (const post of posts) {
      post.postData.location = {
        type: "Point",
        coordinates: [post.postData.lng, post.postData.lat]
      };
      await post.save();
      migratedCount++;
    }

    // Ensure 2dsphere index exists
    await DynamicPostData.collection.createIndex({ "postData.location": "2dsphere" });

    return res.status(200).json({
      message: "Location migration completed successfully.",
      migratedCount,
    });

  } catch (error) {
    console.error("Migration error:", error);
    return res.status(500).json({
      message: "An error occurred during migration.",
      error: error.message
    });
  }
};




const getPostDetailsBtUserId = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    // Check if a post by this user already exists
    const posts = await DynamicPostData.find({ createdBy: userId }).lean();


    res.status(201).json({
      message: 'Your Data generated!',
      data: posts,
      success: true
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error storing dynamic data',
      error: error.message,
    });
  }
});

const getPostDetailsByPostId = asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    // Check if a post by this user already exists
    const posts = await DynamicPostData.find({ _id: postId }).lean();


    res.status(201).json({
      message: 'Your Data generated!',
      data: posts,
      success: true
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error storing dynamic data',
      error: error.message,
    });
  }
});




module.exports = {
  AddPost,
  getPostData,
  uploadPostImage,
  deletePostData,
  getPostDetailsBtUserId,
  getPostDetailsByPostId,
  getWithoutLoginPostData,
  deletePostImage,
  updatePost,
  migratePostLocations
}
