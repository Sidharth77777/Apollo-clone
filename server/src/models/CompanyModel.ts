import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const CompanySchema = new Schema(
  {
    externalId: { type: String, required: true, unique: true, index: true },

    name: { type: String, required: true },
    description: { type: String },
    website: { type: String },

    industries: [{ type: String }],
    keywords: [{ type: String }],

    parentCompany: { type: String },
    subsidiariesCount: { type: Number },
    stockSymbol: { type: String },

    founded: { type: Number },
    employees: { type: String }, 
    location: { type: String },
    logo: { type: String },

    fundingStage: { type: String },
    totalFundingMillion: { type: Number },
    revenueBillion: { type: Number },
  },
  { timestamps: true }
);

export type Company = InferSchemaType<typeof CompanySchema>;
export type CompanyDoc = HydratedDocument<Company>;

const CompanyModel = mongoose.models.Company || mongoose.model<Company>("Company", CompanySchema);
export default CompanyModel;
