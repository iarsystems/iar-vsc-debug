//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var DebugEventListener_postDebugEvent_args = function(args) {
  this.event = null;
  if (args) {
    if (args.event !== undefined && args.event !== null) {
      this.event = new ttypes.DebugEvent(args.event);
    }
  }
};
DebugEventListener_postDebugEvent_args.prototype = {};
DebugEventListener_postDebugEvent_args.prototype.read = function(input) {
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
        this.event = new ttypes.DebugEvent();
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

DebugEventListener_postDebugEvent_args.prototype.write = function(output) {
  output.writeStructBegin('DebugEventListener_postDebugEvent_args');
  if (this.event !== null && this.event !== undefined) {
    output.writeFieldBegin('event', Thrift.Type.STRUCT, 1);
    this.event.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebugEventListener_postDebugEvent_result = function(args) {
};
DebugEventListener_postDebugEvent_result.prototype = {};
DebugEventListener_postDebugEvent_result.prototype.read = function(input) {
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

DebugEventListener_postDebugEvent_result.prototype.write = function(output) {
  output.writeStructBegin('DebugEventListener_postDebugEvent_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebugEventListener_postLogEvent_args = function(args) {
  this.event = null;
  if (args) {
    if (args.event !== undefined && args.event !== null) {
      this.event = new ttypes.LogEvent(args.event);
    }
  }
};
DebugEventListener_postLogEvent_args.prototype = {};
DebugEventListener_postLogEvent_args.prototype.read = function(input) {
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
        this.event = new ttypes.LogEvent();
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

DebugEventListener_postLogEvent_args.prototype.write = function(output) {
  output.writeStructBegin('DebugEventListener_postLogEvent_args');
  if (this.event !== null && this.event !== undefined) {
    output.writeFieldBegin('event', Thrift.Type.STRUCT, 1);
    this.event.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebugEventListener_postLogEvent_result = function(args) {
};
DebugEventListener_postLogEvent_result.prototype = {};
DebugEventListener_postLogEvent_result.prototype.read = function(input) {
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

DebugEventListener_postLogEvent_result.prototype.write = function(output) {
  output.writeStructBegin('DebugEventListener_postLogEvent_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebugEventListener_postInspectionContextChangedEvent_args = function(args) {
  this.event = null;
  if (args) {
    if (args.event !== undefined && args.event !== null) {
      this.event = new ttypes.InspectionContextChangedEvent(args.event);
    }
  }
};
DebugEventListener_postInspectionContextChangedEvent_args.prototype = {};
DebugEventListener_postInspectionContextChangedEvent_args.prototype.read = function(input) {
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
        this.event = new ttypes.InspectionContextChangedEvent();
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

DebugEventListener_postInspectionContextChangedEvent_args.prototype.write = function(output) {
  output.writeStructBegin('DebugEventListener_postInspectionContextChangedEvent_args');
  if (this.event !== null && this.event !== undefined) {
    output.writeFieldBegin('event', Thrift.Type.STRUCT, 1);
    this.event.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebugEventListener_postInspectionContextChangedEvent_result = function(args) {
};
DebugEventListener_postInspectionContextChangedEvent_result.prototype = {};
DebugEventListener_postInspectionContextChangedEvent_result.prototype.read = function(input) {
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

DebugEventListener_postInspectionContextChangedEvent_result.prototype.write = function(output) {
  output.writeStructBegin('DebugEventListener_postInspectionContextChangedEvent_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebugEventListener_postBaseContextChangedEvent_args = function(args) {
  this.event = null;
  if (args) {
    if (args.event !== undefined && args.event !== null) {
      this.event = new ttypes.BaseContextChangedEvent(args.event);
    }
  }
};
DebugEventListener_postBaseContextChangedEvent_args.prototype = {};
DebugEventListener_postBaseContextChangedEvent_args.prototype.read = function(input) {
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
        this.event = new ttypes.BaseContextChangedEvent();
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

DebugEventListener_postBaseContextChangedEvent_args.prototype.write = function(output) {
  output.writeStructBegin('DebugEventListener_postBaseContextChangedEvent_args');
  if (this.event !== null && this.event !== undefined) {
    output.writeFieldBegin('event', Thrift.Type.STRUCT, 1);
    this.event.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebugEventListener_postBaseContextChangedEvent_result = function(args) {
};
DebugEventListener_postBaseContextChangedEvent_result.prototype = {};
DebugEventListener_postBaseContextChangedEvent_result.prototype.read = function(input) {
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

DebugEventListener_postBaseContextChangedEvent_result.prototype.write = function(output) {
  output.writeStructBegin('DebugEventListener_postBaseContextChangedEvent_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebugEventListenerClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
DebugEventListenerClient.prototype = {};

DebugEventListenerClient.prototype.postDebugEvent = function(event, callback) {
  this.send_postDebugEvent(event, callback); 
};

DebugEventListenerClient.prototype.send_postDebugEvent = function(event, callback) {
  var params = {
    event: event
  };
  var args = new DebugEventListener_postDebugEvent_args(params);
  try {
    this.output.writeMessageBegin('postDebugEvent', Thrift.MessageType.ONEWAY, this.seqid);
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

DebugEventListenerClient.prototype.postLogEvent = function(event, callback) {
  this.send_postLogEvent(event, callback); 
  if (!callback) {
  this.recv_postLogEvent();
  }
};

DebugEventListenerClient.prototype.send_postLogEvent = function(event, callback) {
  var params = {
    event: event
  };
  var args = new DebugEventListener_postLogEvent_args(params);
  try {
    this.output.writeMessageBegin('postLogEvent', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_postLogEvent();
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

DebugEventListenerClient.prototype.recv_postLogEvent = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new DebugEventListener_postLogEvent_result();
  result.read(this.input);
  this.input.readMessageEnd();

  return;
};

DebugEventListenerClient.prototype.postInspectionContextChangedEvent = function(event, callback) {
  this.send_postInspectionContextChangedEvent(event, callback); 
};

DebugEventListenerClient.prototype.send_postInspectionContextChangedEvent = function(event, callback) {
  var params = {
    event: event
  };
  var args = new DebugEventListener_postInspectionContextChangedEvent_args(params);
  try {
    this.output.writeMessageBegin('postInspectionContextChangedEvent', Thrift.MessageType.ONEWAY, this.seqid);
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

DebugEventListenerClient.prototype.postBaseContextChangedEvent = function(event, callback) {
  this.send_postBaseContextChangedEvent(event, callback); 
};

DebugEventListenerClient.prototype.send_postBaseContextChangedEvent = function(event, callback) {
  var params = {
    event: event
  };
  var args = new DebugEventListener_postBaseContextChangedEvent_args(params);
  try {
    this.output.writeMessageBegin('postBaseContextChangedEvent', Thrift.MessageType.ONEWAY, this.seqid);
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
