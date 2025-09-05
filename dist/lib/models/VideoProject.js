"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const VideoProjectSchema = new mongoose_1.Schema({
    youtubeUrl: { type: String, required: true },
    status: { type: String, enum: ['Processing', 'Completed', 'Failed'], default: 'Processing' },
    finalVideoUrl: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
const VideoProject = mongoose_1.models.VideoProject || (0, mongoose_1.model)('VideoProject', VideoProjectSchema);
exports.default = VideoProject;
