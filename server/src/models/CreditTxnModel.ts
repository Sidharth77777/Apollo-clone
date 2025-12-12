import mongoose, { Schema, type HydratedDocument, type InferSchemaType } from "mongoose";

const CreditTxnSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  change: { type: Number, required: true }, // negative when spent, positive when topped up
  reason: { type: String, required: true }, // e.g. "create_list", "add_member", "stripe_topup_1"
  meta: { type: Schema.Types.Mixed }, // optional (listId, memberId, paymentId...)
  
}, { timestamps: true });

// after CreditTxnSchema definition
CreditTxnSchema.index({ "meta.sessionId": 1 }, { unique: true, sparse: true });


export type Credit = InferSchemaType<typeof CreditTxnSchema>;
export type CreditDoc = HydratedDocument<Credit>;

const CreditTxnModel =  mongoose.models.CreditTxn || mongoose.model("CreditTxn", CreditTxnSchema);

export default CreditTxnModel;
