const express = require('express');
const connector = require('./Connector')
var requestHandlerPrincipal = require('./DataRequestHandler')

const routing = express.Router();

var count = 1;
// Code inspired from https://stackoverflow.com/questions/36443406/connecting-nodejs-and-cloud-mqtt

var options = {
  host: 'mqtt.cgmu.io',
  port: '1883',
  ClientId: 'LOG430-07',
  clean: true
}

var topic = "worldcongress2017/pilot_resologi/odtf1/#";
var qos = "0";

var mqtt = require('mqtt');
var client = mqtt.connect('http://mqtt.cgmu.io/',options);
client.subscribe(topic, {qos: Number(qos)});
var countRequest = 0;

function requestHandlerProxy() {
  
  var requestHandlercache = {};

  return {
      getData: function() {
        var d;
        if(count > 3 && count < 6){
        count++;
        d = new error("error");
        }        
        else
        d = requestHandlerPrincipal.data;
        try{
        requestHandlercache[countRequest] = d;
        countRequest++;
        count++;
        return requestHandlercache[countRequest-1];}
        catch(e){
          return d;
        }
        
      },
      getCount: function() {
          var count = 0;
          for (var code in requestHandlercache) { count++; }
          return count;
      }
  };
};

function EventHandlers() {
  var count = 0;
  var events = {};
  
      return {
          addData: function(data) {
            events[count] = data;
            count++;
            return events[count-1];
          },
          getLastData: function() {
              if(count == 0)
              return null;
              else
              return events[count-1];
          }
      };
  }

var eventHandlers = new EventHandlers();
var requestHandler = new requestHandlerProxy();

client.on("connect",function(){	
  // console.log("connected");
});

client.on("message",function(topic, message){	
  // console.log('received message' + topic + message);
  connector.publish(message); // READ MESSAGE FROM MQTT
});

client.on("error",function(error){
  console.log("Can't connect =>" + error);
  process.exit(1)});

routing.get('/', function(req,res,next){


  var answer = [];
try{
  answer.push(eventHandlers.addData(requestHandler.getData()));
  answer.push("The request was successful");  
}catch(e){
 answer.push("There was an error with the request or was too long, here is the last agregators we have :");
 answer.push(eventHandlers.getLastData());
}

  res.json(answer);

});



module.exports = routing;
