const webpush = require('web-push');
// import fastifyCors from 'fastify-cors';
// import Fastify from 'fastify';

// const fastify = Fastify({
//   logger: true,
// });
// fastify.register(fastifyCors, {});

const express = require('express')
const cors = require('cors')
const app = express()
var bodyParser = require('body-parser')
var corsOptions = {
  origin: 'https://ui5todo.cfapps.us10-001.hana.ondemand.com',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(cors(corsOptions))
app.use(bodyParser.json())


// domo only! keys should be stored in a secure way outside of the code
const pubkey = 'BH19JAvACS1b2J9qa2kLXq0bEmP9NNfAqJMJyzlMtVef36wvt3HX_1KGSdzRmfhqXPj460ZP7WzBKRk1Fl6O6pc';
const privatekey = 'FHAee6f4Af0KzE81At2UmHxY5eM3gaj-dU715KfKvQQ';

webpush.setVapidDetails(
  // used in case the push service notice a problem with your feed and need to contact you
  'mailto:you@example.com',
  pubkey,
  privatekey
);

const pushSubscriptions = new Map();



app.get('/pubkey', async (request, reply) => {
  reply.send({ pubkey }) ;
})

app.post('/subscription', async (request, reply) => {
  console.log(request.body);
  if (!pushSubscriptions.has(request.body.keys.auth)) pushSubscriptions.set(request.body.keys.auth,request.body);
  reply.send();
});
app.post('/unsubscription', async (request, reply) => {
  try {
    pushSubscriptions.delete(request.body.keys.auth);
  } catch (error) {
    console.log(error)
  }
  reply.send();
});

app.get('/subscribers', async (req,res) => {
  const result = [];
  for (const [key,value] of pushSubscriptions) {
    result.push(key);
  }
  res.send(result);
});

app.get('/send', async (request, reply) => {
  // const message = request.body.message;
  if (!pushSubscriptions.size) {
    return reply.status(400).send('Error: missing subscription');
  }
  // webpush.sendNotification()
  try {
    for (const [key, value] of pushSubscriptions) {
      const a = await webpush.sendNotification(value, "Test");
      console.log(JSON.stringify(a))
    }
  } catch (error) {
    console.log(error)
  }
  
  reply.send(JSON.stringify(pushSubscriptions));
});

app.listen(process.env.PORT || 3000, function () {
  console.log(`CORS-enabled web server listening on port ${process.env.PORT}`)
})

// fastify.listen(3000, '0.0.0.0').catch((error) => fastify.log.error(error));
