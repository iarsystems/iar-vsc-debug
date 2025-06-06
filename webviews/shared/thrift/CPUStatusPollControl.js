//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var CPUStatusPollControl_SetCPUStatusPoll_args = function(args) {
  this.core = null;
  this.on = null;
  if (args) {
    if (args.core !== undefined && args.core !== null) {
      this.core = args.core;
    }
    if (args.on !== undefined && args.on !== null) {
      this.on = args.on;
    }
  }
};
CPUStatusPollControl_SetCPUStatusPoll_args.prototype = {};
CPUStatusPollControl_SetCPUStatusPoll_args.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.I32) {
        this.core = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.BOOL) {
        this.on = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

CPUStatusPollControl_SetCPUStatusPoll_args.prototype.write = function(output) {
  output.writeStructBegin('CPUStatusPollControl_SetCPUStatusPoll_args');
  if (this.core !== null && this.core !== undefined) {
    output.writeFieldBegin('core', Thrift.Type.I32, 1);
    output.writeI32(this.core);
    output.writeFieldEnd();
  }
  if (this.on !== null && this.on !== undefined) {
    output.writeFieldBegin('on', Thrift.Type.BOOL, 2);
    output.writeBool(this.on);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CPUStatusPollControl_SetCPUStatusPoll_result = function(args) {
};
CPUStatusPollControl_SetCPUStatusPoll_result.prototype = {};
CPUStatusPollControl_SetCPUStatusPoll_result.prototype.read = function(input) {
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

CPUStatusPollControl_SetCPUStatusPoll_result.prototype.write = function(output) {
  output.writeStructBegin('CPUStatusPollControl_SetCPUStatusPoll_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CPUStatusPollControl_GetCPUStatusPoll_args = function(args) {
};
CPUStatusPollControl_GetCPUStatusPoll_args.prototype = {};
CPUStatusPollControl_GetCPUStatusPoll_args.prototype.read = function(input) {
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

CPUStatusPollControl_GetCPUStatusPoll_args.prototype.write = function(output) {
  output.writeStructBegin('CPUStatusPollControl_GetCPUStatusPoll_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CPUStatusPollControl_GetCPUStatusPoll_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
CPUStatusPollControl_GetCPUStatusPoll_result.prototype = {};
CPUStatusPollControl_GetCPUStatusPoll_result.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.BOOL) {
        this.success = input.readBool().value;
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

CPUStatusPollControl_GetCPUStatusPoll_result.prototype.write = function(output) {
  output.writeStructBegin('CPUStatusPollControl_GetCPUStatusPoll_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 0);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CPUStatusPollControlClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
CPUStatusPollControlClient.prototype = {};

CPUStatusPollControlClient.prototype.SetCPUStatusPoll = function(core, on, callback) {
  this.send_SetCPUStatusPoll(core, on, callback); 
  if (!callback) {
  this.recv_SetCPUStatusPoll();
  }
};

CPUStatusPollControlClient.prototype.send_SetCPUStatusPoll = function(core, on, callback) {
  var params = {
    core: core,
    on: on
  };
  var args = new CPUStatusPollControl_SetCPUStatusPoll_args(params);
  try {
    this.output.writeMessageBegin('SetCPUStatusPoll', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_SetCPUStatusPoll();
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

CPUStatusPollControlClient.prototype.recv_SetCPUStatusPoll = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CPUStatusPollControl_SetCPUStatusPoll_result();
  result.read(this.input);
  this.input.readMessageEnd();

  return;
};

CPUStatusPollControlClient.prototype.GetCPUStatusPoll = function(callback) {
  this.send_GetCPUStatusPoll(callback); 
  if (!callback) {
    return this.recv_GetCPUStatusPoll();
  }
};

CPUStatusPollControlClient.prototype.send_GetCPUStatusPoll = function(callback) {
  var args = new CPUStatusPollControl_GetCPUStatusPoll_args();
  try {
    this.output.writeMessageBegin('GetCPUStatusPoll', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_GetCPUStatusPoll();
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

CPUStatusPollControlClient.prototype.recv_GetCPUStatusPoll = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CPUStatusPollControl_GetCPUStatusPoll_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'GetCPUStatusPoll failed: unknown result';
};
