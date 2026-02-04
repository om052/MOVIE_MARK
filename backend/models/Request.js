const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Script',
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['Writer', 'Director', 'Producer', 'Cinematographer', 'Editor', 'Sound Designer', 'Actor', 'Other']
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Request", requestSchema);
