import { Schema, model, models, Document } from 'mongoose';

export interface IVideoProject extends Document {
  _id: Schema.Types.ObjectId; // Adicionado para tipar o _id
  youtubeUrl: string;
  status: 'Processing' | 'Completed' | 'Failed';
  finalVideoUrl?: string;
  renderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VideoProjectSchema = new Schema<IVideoProject>({
  youtubeUrl: { type: String, required: true },
  status: { type: String, enum: ['Processing', 'Completed', 'Failed'], default: 'Processing' },
  finalVideoUrl: { type: String },
  renderId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const VideoProject = models.VideoProject || model<IVideoProject>('VideoProject', VideoProjectSchema);

export default VideoProject;


