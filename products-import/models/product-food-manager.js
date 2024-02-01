const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    code: {type: String, required: true, unique: true},
    lang: String,
    productName: String,
    productFormat: String, 
    brands: String,
    productNamesLangs: {},
    image: String,
    frontImage: String,
    frontImageRev: Number,
    creator: String,
    ingredients: {},
    creationDate : Date
});

module.exports = dataSchema;