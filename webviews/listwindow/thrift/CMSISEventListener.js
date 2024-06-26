//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var CMSISEventListener_onRteEvent_args = function(args) {
  this.event = null;
  if (args) {
    if (args.event !== undefined && args.event !== null) {
      this.event = new ttypes.RteEvent(args.event);
    }
  }
};
CMSISEventListener_onRteEvent_args.prototype = {};
CMSISEventListener_onRteEvent_args.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.event = new ttypes.RteEvent();
        this.event.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 0:
        input.skip(ftype);
        break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

CMSISEventListener_onRteEvent_args.prototype.write = function(output) {
  output.writeStructBegin('CMSISEventListener_onRteEvent_args');
  if (this.event !== null && this.event !== undefined) {
    output.writeFieldBegin('event', Thrift.Type.STRUCT, 1);
    this.event.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CMSISEventListener_onRteEvent_result = function(args) {
};
CMSISEventListener_onRteEvent_result.prototype = {};
CMSISEventListener_onRteEvent_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    input.skip(ftype);
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

CMSISEventListener_onRteEvent_result.prototype.write = function(output) {
  output.writeStructBegin('CMSISEventListener_onRteEvent_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CMSISEventListenerClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
CMSISEventListenerClient.prototype = {};

CMSISEventListenerClient.prototype.onRteEvent = function(event, callback) {
  this.send_onRteEvent(event, callback); 
  if (!callback) {
  this.recv_onRteEvent();
  }
};

CMSISEventListenerClient.prototype.send_onRteEvent = function(event, callback) {
  var params = {
    event: event
  };
  var args = new CMSISEventListener_onRteEvent_args(params);
  try {
    this.output.writeMessageBegin('onRteEvent', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_onRteEvent();
        } catch (e) {
          result = e;
        }
        callback(result);
      });
    } else {
      return this.output.getTransport().flush();
    }
  }
  catch (e) {
    if (typeof this.output.getTransport().reset === 'function') {
      this.output.getTransport().reset();
    }
    throw e;
  }
};

CMSISEventListenerClient.prototype.recv_onRteEvent = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CMSISEventListener_onRteEvent_result();
  result.read(this.input);
  this.input.readMessageEnd();

  return;
};
