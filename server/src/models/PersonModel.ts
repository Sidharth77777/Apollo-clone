import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const SocialSchema = new Schema(
  {
    linkedin: { type: String, default: null },
    google: { type: String, default: null },
    twitter: { type: String, default: null },
    facebook: { type: String, default: null },
    instagram: { type: String, default: null },
    // allow other handles as free-form key-value pairs if needed
    others: { type: Map, of: String, default: {} },
  },
  { _id: false }
);

const PersonSchema = new Schema(
  {
    externalId: { type: String, index: true },

    name: { type: String, required: true },
    designation: { type: String },
    department: { type: String },

    // keep company reference required (as before)
    company: { type: Schema.Types.ObjectId, ref: "Company", required: true },

    location: { type: String },

    // NEW fields (optional)
    phone: { type: String, default: null },           // phone number (any format)
    email: { type: String, default: null },           // personal email
    companyEmail: { type: String, default: null },    // email at company domain
    corporateEmail: { type: String, default: null },  // alternate corporate email
    social: { type: SocialSchema, default: {} },      // social handles object
  },
  { timestamps: true }
);

// helpful indexes (optional)
PersonSchema.index({ email: 1 });
PersonSchema.index({ phone: 1 });

export type Person = InferSchemaType<typeof PersonSchema>;
export type PersonDoc = HydratedDocument<Person>;

const PersonModel = mongoose.models.Person || mongoose.model<Person>("Person", PersonSchema);
export default PersonModel;
