
const express = require('express');
//const dotenv = require('dotenv');
const morgan = require('morgan');
const bodyparser = require("body-parser");
const path = require('path');

const connectDB = require('./db/connectionMdb');
const swaggerUi = require('swagger-ui-express'),
swaggerDocument = require('./swagger.json');


const app = express();
var socket = require("socket.io")

//dotenv.config( { path : 'config.env'} )
const PORT = process.env.PORT || 3000

// log requests
app.use(morgan('tiny'));


// Upload File
app.use('/uploads', express.static('uploads'));
// mongodb connection
connectDB();

// parse request to body-parser
app.use(bodyparser.json({ etype: 'application/json'}))
app.use(bodyparser.urlencoded({ extended : true}))







// load routers
app.use('/', require('./routes/index'))
app.use('/api', require('./routes/users'))
app.use('/api', require('./routes/booksroute'))
app.use('/api', require('./routes/playlistroute'))
app.use("/api/messagerie", require("./routes/messagerie-route"))
app.use("/api/panier", require("./routes/panier-route"))

var server = app.listen(PORT, ()=> { console.log(`Server is running on http://localhost:${PORT}`)});



// SWAGGER 
app.use(
    '/api-docs',
    swaggerUi.serve, 
    swaggerUi.setup(swaggerDocument)
  );
  
  const stripe = require('stripe')('sk_test_51L09uwHoL1yiQJoDhnfOuFi3OQ7WDCQM6FztQK0gGyAkxb3fqEXKqxrnpb3uTOrwDbN1g6iZumBvl9zNFM9hhjgN00QchaZ0j3');
// This example sets up an endpoint using the Express framework.
// Watch this video to get started: https://youtu.be/rPR2aJ6XnAc.

app.post('/payment-sheet', async (req, res) => {
  // Use an existing Customer ID if this is a returning customer.
  const customer = await stripe.customers.create();
  const ephemeralKey = await stripe.ephemeralKeys.create(
    {customer: customer.id},
    {apiVersion: '2020-08-27'}
  );
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 1099,
    currency: 'eur',
    customer: customer.id,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    publishableKey: 'pk_test_51L09uwHoL1yiQJoDBzpUvtRiJVmYwWBVIyvnERgrVuWDGzE48mIvzx1O8VNPuDBlBtn8CCx1irPc7PA7TrywLRHB00L0up49Jf'
  });
});

const io = socket(server)



let users = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) &&
    users.push({ userId, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

io.on("connection", (socket) => {
  //when ceonnect
  console.log("a user connected.");

  console.log(socket.id);


  //take userId and socketId from user
  socket.on("addUser", (userId) => {

    console.log(userId)
    addUser(userId, socket.id);
    io.emit("getUsers", users);
    console.log(users)


  });

  //send and get message
  socket.on("sendMessage",  (data)  => {

    const messageData = JSON.parse(data)

    const receiverId = messageData.receiverId
    const text = messageData.text



    const user = getUser(receiverId);


    if(user!=null){


      io.to(user.socketId).emit("getMessage",text);

  


    }else {

        console.log("user not connected")

  

    }


  });

  //when disconnect
  socket.on("disconnect", () => {
    console.log("a user disconnected!");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});