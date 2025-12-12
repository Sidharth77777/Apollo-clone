import mongoose, { Schema, type InferSchemaType, type HydratedDocument, Types } from "mongoose";

const ListSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        target: { type: String, enum: ["people", "company"], required: true, default: "people" },
        members: [{ type: Schema.Types.ObjectId, ref: "Person" }],
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true }
        
    }, { timestamps: true });

export type List = InferSchemaType<typeof ListSchema>;
export type ListDoc = HydratedDocument<List>;

const ListModel = mongoose.models.List || mongoose.model<List>("List", ListSchema);
export default ListModel;
