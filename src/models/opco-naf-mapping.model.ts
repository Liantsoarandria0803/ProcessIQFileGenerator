import mongoose, { Document, Schema } from 'mongoose';

export interface IOpcoNafMapping extends Document {
  codeNaf: string;
  libelleActivite: string;
  opcoCode: string;
  opcoNom: string;
  opcoPortail?: string | null;
  isAmbiguous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OpcoNafMappingSchema = new Schema<IOpcoNafMapping>(
  {
    codeNaf: { type: String, required: true, trim: true, maxlength: 5, index: true },
    libelleActivite: { type: String, required: true, trim: true, maxlength: 255 },
    opcoCode: { type: String, required: true, trim: true, maxlength: 20, index: true },
    opcoNom: { type: String, required: true, trim: true, maxlength: 255 },
    opcoPortail: { type: String, default: null, maxlength: 500 },
    isAmbiguous: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'opco_naf_mappings',
  }
);

OpcoNafMappingSchema.index({ codeNaf: 1, opcoCode: 1 }, { unique: true });

export const OpcoNafMappingModel = mongoose.model<IOpcoNafMapping>('OpcoNafMapping', OpcoNafMappingSchema);
