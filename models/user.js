const mongoose = require('mongoose');





  const addressSchema = new mongoose.Schema(
    {
      name: { type: String },
      phone: { type: Number },
      address: { type: String },
      city: { type: String },
      district: { type: String },
      state: { type: String },
      pincode:{ type: Number },
      email: { type: String },
    },
    { _id: true }
  );



  const orderSchema = new mongoose.Schema(
    {
      orderId: { type: String,  unique: true },
      products: [
        {
          productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
          name:{type:String},
          qty:{type:Number},
          price:{type:Number,required:true},    
          image:[String],
          orderStatus: {
            type: String,
            default: "Pending",
          },
          cancelReason: { type: String }, // New field for cancellation reason
        },
      ],
      totalAmount: { type: Number },
      orderDate: { type: Date, default: Date.now },
      expectedDeliveryDate: { type: String },
      shippingAddress: { type: addressSchema },
      paymentMethod: { type: String, require: true },
    },
    { _id: false }
  );



const userSchema = new mongoose.Schema({
    googleId: String,
    name: String,
    email: String,
    phoneNumber: String,
    password: String,
    image: String,
    blocked: { type: Boolean, default: false },
    cart: {
        products: [{
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Reference to the Product model
            image: [String],
            productName: String,
            productPrice: String,
            quantity: { type: Number, default: 1 },
            disable:Boolean
        }],
        total: String
    },
    wishlist: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        image: [String],
        productName: String,
        productPrice: String,
        color: { type: Boolean, default: false } // Set default color to red
    }],

    orders: [orderSchema],
    address:[addressSchema]
 
});


const User = mongoose.model('User', userSchema);

module.exports = User;