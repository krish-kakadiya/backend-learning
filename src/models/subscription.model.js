import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber: {
        type : mongoose.Schema.Types.ObjectId, //One who is subscribing
        ref : "User",
    },
    channel: {
        type : mongoose.Schema.Types.ObjectId, //Channel being subscribed to
        ref : "User",
    }
},{
    timestamps: true
})


const Subscription = mongoose.model("Subscription",subscriptionSchema);
export { Subscription };
// This code defines a Mongoose model for a Subscription.