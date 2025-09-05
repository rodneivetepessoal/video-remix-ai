"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoProcessingQueue = void 0;
var bullmq_1 = require("bullmq");
var ioredis_1 = __importDefault(require("ioredis"));
var connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
});
exports.videoProcessingQueue = new bullmq_1.Queue('videoProcessing', { connection: connection });
