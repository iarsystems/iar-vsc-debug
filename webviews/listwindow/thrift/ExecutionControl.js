//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var ExecutionControl_Go_args = function(args) {
  this.core = null;
  if (args) {
    if (args.core !== undefined && args.core !== null) {
      this.core = args.core;
    }
  }
};
ExecutionControl_Go_args.prototype = {};
ExecutionControl_Go_args.prototype.read = function(input) {
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

ExecutionControl_Go_args.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_Go_args');
  if (this.core !== null && this.core !== undefined) {
    output.writeFieldBegin('core', Thrift.Type.I32, 1);
    output.writeI32(this.core);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_Go_result = function(args) {
};
ExecutionControl_Go_result.prototype = {};
ExecutionControl_Go_result.prototype.read = function(input) {
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

ExecutionControl_Go_result.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_Go_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_Stop_args = function(args) {
  this.core = null;
  if (args) {
    if (args.core !== undefined && args.core !== null) {
      this.core = args.core;
    }
  }
};
ExecutionControl_Stop_args.prototype = {};
ExecutionControl_Stop_args.prototype.read = function(input) {
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

ExecutionControl_Stop_args.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_Stop_args');
  if (this.core !== null && this.core !== undefined) {
    output.writeFieldBegin('core', Thrift.Type.I32, 1);
    output.writeI32(this.core);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_Stop_result = function(args) {
};
ExecutionControl_Stop_result.prototype = {};
ExecutionControl_Stop_result.prototype.read = function(input) {
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

ExecutionControl_Stop_result.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_Stop_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_MultiStop_args = function(args) {
};
ExecutionControl_MultiStop_args.prototype = {};
ExecutionControl_MultiStop_args.prototype.read = function(input) {
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

ExecutionControl_MultiStop_args.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_MultiStop_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_MultiStop_result = function(args) {
};
ExecutionControl_MultiStop_result.prototype = {};
ExecutionControl_MultiStop_result.prototype.read = function(input) {
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

ExecutionControl_MultiStop_result.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_MultiStop_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_MultiGo_args = function(args) {
};
ExecutionControl_MultiGo_args.prototype = {};
ExecutionControl_MultiGo_args.prototype.read = function(input) {
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

ExecutionControl_MultiGo_args.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_MultiGo_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_MultiGo_result = function(args) {
};
ExecutionControl_MultiGo_result.prototype = {};
ExecutionControl_MultiGo_result.prototype.read = function(input) {
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

ExecutionControl_MultiGo_result.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_MultiGo_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_SetRunAll_args = function(args) {
  this.all = null;
  if (args) {
    if (args.all !== undefined && args.all !== null) {
      this.all = args.all;
    }
  }
};
ExecutionControl_SetRunAll_args.prototype = {};
ExecutionControl_SetRunAll_args.prototype.read = function(input) {
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
        this.all = input.readBool().value;
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

ExecutionControl_SetRunAll_args.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_SetRunAll_args');
  if (this.all !== null && this.all !== undefined) {
    output.writeFieldBegin('all', Thrift.Type.BOOL, 1);
    output.writeBool(this.all);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControl_SetRunAll_result = function(args) {
};
ExecutionControl_SetRunAll_result.prototype = {};
ExecutionControl_SetRunAll_result.prototype.read = function(input) {
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

ExecutionControl_SetRunAll_result.prototype.write = function(output) {
  output.writeStructBegin('ExecutionControl_SetRunAll_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ExecutionControlClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
ExecutionControlClient.prototype = {};

ExecutionControlClient.prototype.Go = function(core, callback) {
  this.send_Go(core, callback); 
};

ExecutionControlClient.prototype.send_Go = function(core, callback) {
  var params = {
    core: core
  };
  var args = new ExecutionControl_Go_args(params);
  try {
    this.output.writeMessageBegin('Go', Thrift.MessageType.ONEWAY, this.seqid);
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

ExecutionControlClient.prototype.Stop = function(core, callback) {
  this.send_Stop(core, callback); 
};

ExecutionControlClient.prototype.send_Stop = function(core, callback) {
  var params = {
    core: core
  };
  var args = new ExecutionControl_Stop_args(params);
  try {
    this.output.writeMessageBegin('Stop', Thrift.MessageType.ONEWAY, this.seqid);
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

ExecutionControlClient.prototype.MultiStop = function(callback) {
  this.send_MultiStop(callback); 
};

ExecutionControlClient.prototype.send_MultiStop = function(callback) {
  var args = new ExecutionControl_MultiStop_args();
  try {
    this.output.writeMessageBegin('MultiStop', Thrift.MessageType.ONEWAY, this.seqid);
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

ExecutionControlClient.prototype.MultiGo = function(callback) {
  this.send_MultiGo(callback); 
};

ExecutionControlClient.prototype.send_MultiGo = function(callback) {
  var args = new ExecutionControl_MultiGo_args();
  try {
    this.output.writeMessageBegin('MultiGo', Thrift.MessageType.ONEWAY, this.seqid);
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

ExecutionControlClient.prototype.SetRunAll = function(all, callback) {
  this.send_SetRunAll(all, callback); 
};

ExecutionControlClient.prototype.send_SetRunAll = function(all, callback) {
  var params = {
    all: all
  };
  var args = new ExecutionControl_SetRunAll_args(params);
  try {
    this.output.writeMessageBegin('SetRunAll', Thrift.MessageType.ONEWAY, this.seqid);
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
