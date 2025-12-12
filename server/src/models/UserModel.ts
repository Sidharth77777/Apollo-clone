import mongoose, { Schema, type InferSchemaType, type HydratedDocument } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, trim: true },
    password: { type: String, required: true, trim: true },
    // hashed password

    isAdmin: { type: Boolean, default: false },
    credits: { type: Number, default: 100 },
  },
  { timestamps: true }
);

// Document middleware: triggers when calling userDoc.deleteOne()
UserSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function () {
    try {
      const ListModel = mongoose.model("List");
      await ListModel.deleteMany({ owner: (this as any)._id });
    } catch (err) {
      console.error("Error in pre-deleteOne hook (deleting lists):", err);
      throw err;
    }
  }
);

// Query middleware: covers findOneAndDelete / findByIdAndDelete
UserSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (!doc) return;
    const ListModel = mongoose.model("List");
    await ListModel.deleteMany({ owner: (doc as any)._id });
  } catch (err) {
    console.error("Error cascading list delete after user deletion:", err);
  }
});

export type User = InferSchemaType<typeof UserSchema>;
export type UserDoc = HydratedDocument<User>;

const UserModel = mongoose.models.User || mongoose.model<User>("User", UserSchema);
export default UserModel;
