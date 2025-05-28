const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAYKEY,
  key_secret: process.env.RAZORPAYKEYSECRET,
});

exports.paymentController = async (req, res) => {
  const { amount, currency } = req.body;
  
  console.log("amount",amount)
  try {
    const order = await razorpayInstance.orders.create({
      amount: amount * 100, // Amount in paise
      currency: currency,
    });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
