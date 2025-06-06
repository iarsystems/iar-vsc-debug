//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var SoftCTI_SetSoftCTI_args = function(args) {
  this.on = null;
  if (args) {
    if (args.on !== undefined && args.on !== null) {
      this.on = args.on;
    }
  }
};
SoftCTI_SetSoftCTI_args.prototype = {};
SoftCTI_SetSoftCTI_args.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.BOOL) {
        this.on = input.readBool().value;
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

SoftCTI_SetSoftCTI_args.prototype.write = function(output) {
  output.writeStructBegin('SoftCTI_SetSoftCTI_args');
  if (this.on !== null && this.on !== undefined) {
    output.writeFieldBegin('on', Thrift.Type.BOOL, 1);
    output.writeBool(this.on);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SoftCTI_SetSoftCTI_result = function(args) {
};
SoftCTI_SetSoftCTI_result.prototype = {};
SoftCTI_SetSoftCTI_result.prototype.read = function(input) {
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

SoftCTI_SetSoftCTI_result.prototype.write = function(output) {
  output.writeStructBegin('SoftCTI_SetSoftCTI_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SoftCTI_GetSoftCTI_args = function(args) {
};
SoftCTI_GetSoftCTI_args.prototype = {};
SoftCTI_GetSoftCTI_args.prototype.read = function(input) {
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

SoftCTI_GetSoftCTI_args.prototype.write = function(output) {
  output.writeStructBegin('SoftCTI_GetSoftCTI_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SoftCTI_GetSoftCTI_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
SoftCTI_GetSoftCTI_result.prototype = {};
SoftCTI_GetSoftCTI_result.prototype.read = function(input) {
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

SoftCTI_GetSoftCTI_result.prototype.write = function(output) {
  output.writeStructBegin('SoftCTI_GetSoftCTI_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 0);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SoftCTI_CoreStarting_args = function(args) {
  this.core = null;
  if (args) {
    if (args.core !== undefined && args.core !== null) {
      this.core = args.core;
    }
  }
};
SoftCTI_CoreStarting_args.prototype = {};
SoftCTI_CoreStarting_args.prototype.read = function(input) {
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

SoftCTI_CoreStarting_args.prototype.write = function(output) {
  output.writeStructBegin('SoftCTI_CoreStarting_args');
  if (this.core !== null && this.core !== undefined) {
    output.writeFieldBegin('core', Thrift.Type.I32, 1);
    output.writeI32(this.core);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SoftCTI_CoreStarting_result = function(args) {
};
SoftCTI_CoreStarting_result.prototype = {};
SoftCTI_CoreStarting_result.prototype.read = function(input) {
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

SoftCTI_CoreStarting_result.prototype.write = function(output) {
  output.writeStructBegin('SoftCTI_CoreStarting_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SoftCTI_CoreStopping_args = function(args) {
  this.core = null;
  if (args) {
    if (args.core !== undefined && args.core !== null) {
      this.core = args.core;
    }
  }
};
SoftCTI_CoreStopping_args.prototype = {};
SoftCTI_CoreStopping_args.prototype.read = function(input) {
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

SoftCTI_CoreStopping_args.prototype.write = function(output) {
  output.writeStructBegin('SoftCTI_CoreStopping_args');
  if (this.core !== null && this.core !== undefined) {
    output.writeFieldBegin('core', Thrift.Type.I32, 1);
    output.writeI32(this.core);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SoftCTI_CoreStopping_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
SoftCTI_CoreStopping_result.prototype = {};
SoftCTI_CoreStopping_result.prototype.read = function(input) {
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

SoftCTI_CoreStopping_result.prototype.write = function(output) {
  output.writeStructBegin('SoftCTI_CoreStopping_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.I64, 0);
    output.writeI64(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var SoftCTIClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
SoftCTIClient.prototype = {};

SoftCTIClient.prototype.SetSoftCTI = function(on, callback) {
  this.send_SetSoftCTI(on, callback); 
  if (!callback) {
  this.recv_SetSoftCTI();
  }
};

SoftCTIClient.prototype.send_SetSoftCTI = function(on, callback) {
  var params = {
    on: on
  };
  var args = new SoftCTI_SetSoftCTI_args(params);
  try {
    this.output.writeMessageBegin('SetSoftCTI', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_SetSoftCTI();
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

SoftCTIClient.prototype.recv_SetSoftCTI = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new SoftCTI_SetSoftCTI_result();
  result.read(this.input);
  this.input.readMessageEnd();

  return;
};

SoftCTIClient.prototype.GetSoftCTI = function(callback) {
  this.send_GetSoftCTI(callback); 
  if (!callback) {
    return this.recv_GetSoftCTI();
  }
};

SoftCTIClient.prototype.send_GetSoftCTI = function(callback) {
  var args = new SoftCTI_GetSoftCTI_args();
  try {
    this.output.writeMessageBegin('GetSoftCTI', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_GetSoftCTI();
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

SoftCTIClient.prototype.recv_GetSoftCTI = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new SoftCTI_GetSoftCTI_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'GetSoftCTI failed: unknown result';
};

SoftCTIClient.prototype.CoreStarting = function(core, callback) {
  this.send_CoreStarting(core, callback); 
};

SoftCTIClient.prototype.send_CoreStarting = function(core, callback) {
  var params = {
    core: core
  };
  var args = new SoftCTI_CoreStarting_args(params);
  try {
    this.output.writeMessageBegin('CoreStarting', Thrift.MessageType.ONEWAY, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      this.output.getTransport().flush(true, null);
      callback();
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

SoftCTIClient.prototype.CoreStopping = function(core, callback) {
  this.send_CoreStopping(core, callback); 
  if (!callback) {
    return this.recv_CoreStopping();
  }
};

SoftCTIClient.prototype.send_CoreStopping = function(core, callback) {
  var params = {
    core: core
  };
  var args = new SoftCTI_CoreStopping_args(params);
  try {
    this.output.writeMessageBegin('CoreStopping', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_CoreStopping();
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

SoftCTIClient.prototype.recv_CoreStopping = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new SoftCTI_CoreStopping_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'CoreStopping failed: unknown result';
};
