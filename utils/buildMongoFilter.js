const buildMongoFilter = (filterData) => {
    const mongoFilter = {};

    if (!filterData || typeof filterData !== 'object') {
        return mongoFilter; // or return {}; if you want to apply no filters
      }
  
    if (filterData.itemName) {
      mongoFilter["postData.itemName"] = { $regex: filterData.itemName, $options: "i" };
    }
  
    if (filterData.brand) {
      mongoFilter["postData.brand"] = { $regex: filterData.brand, $options: "i" };
    }
  
    if (filterData.city) {
      mongoFilter["postData.city"] = { $regex: filterData.city, $options: "i" };
    }
  
    if (filterData.pincode) {
      mongoFilter["postData.pincode"] = filterData.pincode;
    }
  
    if (filterData.subcategory) {
      mongoFilter["postData.subcategory"] = filterData.subcategory;
    }

    if (filterData.category) {
        mongoFilter["postData.category"] = filterData.category;
      }
  
    if (filterData.itemType) {
      mongoFilter["postData.itemType"] = filterData.itemType;
    }
  
    if (filterData.availableToday) {
      mongoFilter["postData.availability"] = "available";
    }
  
    if (filterData.perHour) mongoFilter["postData.priceUnit"] = "hour";
    if (filterData.perDay) mongoFilter["postData.priceUnit"] = "day";
    if (filterData.perWeek) mongoFilter["postData.priceUnit"] = "week";
    if (filterData.perMonth) mongoFilter["postData.priceUnit"] = "month";
  
    if (filterData.withImages) {
      mongoFilter["postData.postImage.0"] = { $exists: true };
    }
  
    if (filterData.withVideos) {
      mongoFilter["postData.postVideo.0"] = { $exists: true };
    }
  
    if (filterData.idProofs?.length > 0) {
      mongoFilter["postData.selectedDocuments"] = { $in: filterData.idProofs };
    }
  
    return mongoFilter;
  };
  module.exports = buildMongoFilter;