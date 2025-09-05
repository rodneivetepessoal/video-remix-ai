"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
let cached = global.mongooseGlobal;
if (!cached) {
    cached = global.mongooseGlobal = { conn: null, promise: null };
}
async function connectToDatabase(mongodbUri) {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };
        cached.promise = mongoose_1.default.connect(mongodbUri, opts).then((mongooseInstance) => {
            return mongooseInstance;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
}
exports.default = connectToDatabase;
