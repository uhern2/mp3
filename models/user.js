// Load required packages
var mongoose = require('mongoose');

// Define our user schema
var UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    pendingTasks: [String],
    dateCreated: { type: Date, default: Date.now }
});

var TaskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    deadline: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    assignedUser: String,
    assignedUserName: String,
    dateCreated: { type: Date, default: Date.now }
});
// Export the Mongoose model
module.exports = {
    User: mongoose.model('User', UserSchema),
    Task: mongoose.model ('Task', TaskSchema)
}

