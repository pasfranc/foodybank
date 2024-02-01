const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
    deltafile: {type: String, required: true, unique: true}
});

module.exports = dataSchema;