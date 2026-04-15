import mongoose, { Document, Schema } from 'mongoose';

export interface IOpcoFinancement extends Document {
  opcoCode: string;
  diplomeRncp: string;
  diplomeLibelle: string;
  montantAnnuel: number;
  anneeValidite: number;
  createdAt: Date;
  updatedAt: Date;
}

const OpcoFinancementSchema = new Schema<IOpcoFinancement>(
  {
    opcoCode: { type: String, required: true, trim: true, maxlength: 20, index: true },
    diplomeRncp: { type: String, required: true, trim: true, maxlength: 30, index: true },
    diplomeLibelle: { type: String, required: true, trim: true, maxlength: 255 },
    montantAnnuel: { type: Number, required: true, min: 0 },
    anneeValidite: { type: Number, required: true, min: 2020, max: 2100, index: true },
  },
  {
    timestamps: true,
    collection: 'opco_financements',
  }
);

OpcoFinancementSchema.index({ opcoCode: 1, diplomeRncp: 1, anneeValidite: 1 }, { unique: true });

export const OpcoFinancementModel = mongoose.model<IOpcoFinancement>('OpcoFinancement', OpcoFinancementSchema);
