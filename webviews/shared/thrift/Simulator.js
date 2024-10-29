//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var Simulator_getFrequency_args = function(args) {
};
Simulator_getFrequency_args.prototype = {};
Simulator_getFrequency_args.prototype.read = function(input) {
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

Simulator_getFrequency_args.prototype.write = function(output) {
  output.writeStructBegin('Simulator_getFrequency_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var Simulator_getFrequency_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
Simulator_getFrequency_result.prototype = {};
Simulator_getFrequency_result.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 0:
      if (ftype == Thrift.Type.I64) {
        this.success = input.readI64().value;
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

Simulator_getFrequency_result.prototype.write = function(output) {
  output.writeStructBegin('Simulator_getFrequency_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.I64, 0);
    output.writeI64(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var Simulator_setFrequency_args = function(args) {
  this.freq = null;
  if (args) {
    if (args.freq !== undefined && args.freq !== null) {
      this.freq = args.freq;
    }
  }
};
Simulator_setFrequency_args.prototype = {};
Simulator_setFrequency_args.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.I64) {
        this.freq = input.readI64().value;
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

Simulator_setFrequency_args.prototype.write = function(output) {
  output.writeStructBegin('Simulator_setFrequency_args');
  if (this.freq !== null && this.freq !== undefined) {
    output.writeFieldBegin('freq', Thrift.Type.I64, 1);
    output.writeI64(this.freq);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var Simulator_setFrequency_result = function(args) {
};
Simulator_setFrequency_result.prototype = {};
Simulator_setFrequency_result.prototype.read = function(input) {
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

Simulator_setFrequency_result.prototype.write = function(output) {
  output.writeStructBegin('Simulator_setFrequency_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SimulatorClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
SimulatorClient.prototype = {};

SimulatorClient.prototype.getFrequency = function(callback) {
  this.send_getFrequency(callback); 
  if (!callback) {
    return this.recv_getFrequency();
  }
};

SimulatorClient.prototype.send_getFrequency = function(callback) {
  var args = new Simulator_getFrequency_args();
  try {
    this.output.writeMessageBegin('getFrequency', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_getFrequency();
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

SimulatorClient.prototype.recv_getFrequency = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new Simulator_getFrequency_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'getFrequency failed: unknown result';
};

SimulatorClient.prototype.setFrequency = function(freq, callback) {
  this.send_setFrequency(freq, callback); 
  if (!callback) {
  this.recv_setFrequency();
  }
};

SimulatorClient.prototype.send_setFrequency = function(freq, callback) {
  var params = {
    freq: freq
  };
  var args = new Simulator_setFrequency_args(params);
  try {
    this.output.writeMessageBegin('setFrequency', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_setFrequency();
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

SimulatorClient.prototype.recv_setFrequency = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new Simulator_setFrequency_result();
  result.read(this.input);
  this.input.readMessageEnd();

  return;
};