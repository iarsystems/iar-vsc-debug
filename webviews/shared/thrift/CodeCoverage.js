//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var CodeCoverage_getSessionId_args = function(args) {
};
CodeCoverage_getSessionId_args.prototype = {};
CodeCoverage_getSessionId_args.prototype.read = function(input) {
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

CodeCoverage_getSessionId_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_getSessionId_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_getSessionId_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
CodeCoverage_getSessionId_result.prototype = {};
CodeCoverage_getSessionId_result.prototype.read = function(input) {
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

CodeCoverage_getSessionId_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_getSessionId_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.I64, 0);
    output.writeI64(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_enable_args = function(args) {
  this.enable = null;
  if (args) {
    if (args.enable !== undefined && args.enable !== null) {
      this.enable = args.enable;
    }
  }
};
CodeCoverage_enable_args.prototype = {};
CodeCoverage_enable_args.prototype.read = function(input) {
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
        this.enable = input.readBool().value;
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

CodeCoverage_enable_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_enable_args');
  if (this.enable !== null && this.enable !== undefined) {
    output.writeFieldBegin('enable', Thrift.Type.BOOL, 1);
    output.writeBool(this.enable);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_enable_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
CodeCoverage_enable_result.prototype = {};
CodeCoverage_enable_result.prototype.read = function(input) {
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

CodeCoverage_enable_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_enable_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 0);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_isEnabled_args = function(args) {
};
CodeCoverage_isEnabled_args.prototype = {};
CodeCoverage_isEnabled_args.prototype.read = function(input) {
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

CodeCoverage_isEnabled_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_isEnabled_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_isEnabled_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
CodeCoverage_isEnabled_result.prototype = {};
CodeCoverage_isEnabled_result.prototype.read = function(input) {
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

CodeCoverage_isEnabled_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_isEnabled_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 0);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_hasMetaDataSupport_args = function(args) {
};
CodeCoverage_hasMetaDataSupport_args.prototype = {};
CodeCoverage_hasMetaDataSupport_args.prototype.read = function(input) {
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

CodeCoverage_hasMetaDataSupport_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_hasMetaDataSupport_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_hasMetaDataSupport_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
CodeCoverage_hasMetaDataSupport_result.prototype = {};
CodeCoverage_hasMetaDataSupport_result.prototype.read = function(input) {
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

CodeCoverage_hasMetaDataSupport_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_hasMetaDataSupport_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 0);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_clearCachedData_args = function(args) {
};
CodeCoverage_clearCachedData_args.prototype = {};
CodeCoverage_clearCachedData_args.prototype.read = function(input) {
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

CodeCoverage_clearCachedData_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_clearCachedData_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_clearCachedData_result = function(args) {
};
CodeCoverage_clearCachedData_result.prototype = {};
CodeCoverage_clearCachedData_result.prototype.read = function(input) {
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

CodeCoverage_clearCachedData_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_clearCachedData_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_isInitialized_args = function(args) {
};
CodeCoverage_isInitialized_args.prototype = {};
CodeCoverage_isInitialized_args.prototype.read = function(input) {
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

CodeCoverage_isInitialized_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_isInitialized_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_isInitialized_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
CodeCoverage_isInitialized_result.prototype = {};
CodeCoverage_isInitialized_result.prototype.read = function(input) {
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

CodeCoverage_isInitialized_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_isInitialized_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 0);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_initializeMetaData_args = function(args) {
};
CodeCoverage_initializeMetaData_args.prototype = {};
CodeCoverage_initializeMetaData_args.prototype.read = function(input) {
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

CodeCoverage_initializeMetaData_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_initializeMetaData_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_initializeMetaData_result = function(args) {
};
CodeCoverage_initializeMetaData_result.prototype = {};
CodeCoverage_initializeMetaData_result.prototype.read = function(input) {
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

CodeCoverage_initializeMetaData_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_initializeMetaData_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_reinitMetaData_args = function(args) {
};
CodeCoverage_reinitMetaData_args.prototype = {};
CodeCoverage_reinitMetaData_args.prototype.read = function(input) {
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

CodeCoverage_reinitMetaData_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_reinitMetaData_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_reinitMetaData_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
CodeCoverage_reinitMetaData_result.prototype = {};
CodeCoverage_reinitMetaData_result.prototype.read = function(input) {
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

CodeCoverage_reinitMetaData_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_reinitMetaData_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 0);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_refreshMetaData_args = function(args) {
};
CodeCoverage_refreshMetaData_args.prototype = {};
CodeCoverage_refreshMetaData_args.prototype.read = function(input) {
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

CodeCoverage_refreshMetaData_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_refreshMetaData_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_refreshMetaData_result = function(args) {
};
CodeCoverage_refreshMetaData_result.prototype = {};
CodeCoverage_refreshMetaData_result.prototype.read = function(input) {
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

CodeCoverage_refreshMetaData_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_refreshMetaData_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_getXMLData_args = function(args) {
};
CodeCoverage_getXMLData_args.prototype = {};
CodeCoverage_getXMLData_args.prototype.read = function(input) {
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

CodeCoverage_getXMLData_args.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_getXMLData_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverage_getXMLData_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
CodeCoverage_getXMLData_result.prototype = {};
CodeCoverage_getXMLData_result.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.STRING) {
        this.success = input.readString().value;
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

CodeCoverage_getXMLData_result.prototype.write = function(output) {
  output.writeStructBegin('CodeCoverage_getXMLData_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRING, 0);
    output.writeString(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CodeCoverageClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
Thrift.inherits(CodeCoverageClient, HeartbeatServiceClient);

CodeCoverageClient.prototype.getSessionId = function(callback) {
  this.send_getSessionId(callback); 
  if (!callback) {
    return this.recv_getSessionId();
  }
};

CodeCoverageClient.prototype.send_getSessionId = function(callback) {
  var args = new CodeCoverage_getSessionId_args();
  try {
    this.output.writeMessageBegin('getSessionId', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_getSessionId();
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

CodeCoverageClient.prototype.recv_getSessionId = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_getSessionId_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'getSessionId failed: unknown result';
};

CodeCoverageClient.prototype.enable = function(enable, callback) {
  this.send_enable(enable, callback); 
  if (!callback) {
    return this.recv_enable();
  }
};

CodeCoverageClient.prototype.send_enable = function(enable, callback) {
  var params = {
    enable: enable
  };
  var args = new CodeCoverage_enable_args(params);
  try {
    this.output.writeMessageBegin('enable', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_enable();
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

CodeCoverageClient.prototype.recv_enable = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_enable_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'enable failed: unknown result';
};

CodeCoverageClient.prototype.isEnabled = function(callback) {
  this.send_isEnabled(callback); 
  if (!callback) {
    return this.recv_isEnabled();
  }
};

CodeCoverageClient.prototype.send_isEnabled = function(callback) {
  var args = new CodeCoverage_isEnabled_args();
  try {
    this.output.writeMessageBegin('isEnabled', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_isEnabled();
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

CodeCoverageClient.prototype.recv_isEnabled = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_isEnabled_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'isEnabled failed: unknown result';
};

CodeCoverageClient.prototype.hasMetaDataSupport = function(callback) {
  this.send_hasMetaDataSupport(callback); 
  if (!callback) {
    return this.recv_hasMetaDataSupport();
  }
};

CodeCoverageClient.prototype.send_hasMetaDataSupport = function(callback) {
  var args = new CodeCoverage_hasMetaDataSupport_args();
  try {
    this.output.writeMessageBegin('hasMetaDataSupport', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_hasMetaDataSupport();
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

CodeCoverageClient.prototype.recv_hasMetaDataSupport = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_hasMetaDataSupport_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'hasMetaDataSupport failed: unknown result';
};

CodeCoverageClient.prototype.clearCachedData = function(callback) {
  this.send_clearCachedData(callback); 
  if (!callback) {
  this.recv_clearCachedData();
  }
};

CodeCoverageClient.prototype.send_clearCachedData = function(callback) {
  var args = new CodeCoverage_clearCachedData_args();
  try {
    this.output.writeMessageBegin('clearCachedData', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_clearCachedData();
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

CodeCoverageClient.prototype.recv_clearCachedData = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_clearCachedData_result();
  result.read(this.input);
  this.input.readMessageEnd();

  return;
};

CodeCoverageClient.prototype.isInitialized = function(callback) {
  this.send_isInitialized(callback); 
  if (!callback) {
    return this.recv_isInitialized();
  }
};

CodeCoverageClient.prototype.send_isInitialized = function(callback) {
  var args = new CodeCoverage_isInitialized_args();
  try {
    this.output.writeMessageBegin('isInitialized', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_isInitialized();
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

CodeCoverageClient.prototype.recv_isInitialized = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_isInitialized_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'isInitialized failed: unknown result';
};

CodeCoverageClient.prototype.initializeMetaData = function(callback) {
  this.send_initializeMetaData(callback); 
  if (!callback) {
  this.recv_initializeMetaData();
  }
};

CodeCoverageClient.prototype.send_initializeMetaData = function(callback) {
  var args = new CodeCoverage_initializeMetaData_args();
  try {
    this.output.writeMessageBegin('initializeMetaData', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_initializeMetaData();
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

CodeCoverageClient.prototype.recv_initializeMetaData = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_initializeMetaData_result();
  result.read(this.input);
  this.input.readMessageEnd();

  return;
};

CodeCoverageClient.prototype.reinitMetaData = function(callback) {
  this.send_reinitMetaData(callback); 
  if (!callback) {
    return this.recv_reinitMetaData();
  }
};

CodeCoverageClient.prototype.send_reinitMetaData = function(callback) {
  var args = new CodeCoverage_reinitMetaData_args();
  try {
    this.output.writeMessageBegin('reinitMetaData', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_reinitMetaData();
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

CodeCoverageClient.prototype.recv_reinitMetaData = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_reinitMetaData_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'reinitMetaData failed: unknown result';
};

CodeCoverageClient.prototype.refreshMetaData = function(callback) {
  this.send_refreshMetaData(callback); 
  if (!callback) {
  this.recv_refreshMetaData();
  }
};

CodeCoverageClient.prototype.send_refreshMetaData = function(callback) {
  var args = new CodeCoverage_refreshMetaData_args();
  try {
    this.output.writeMessageBegin('refreshMetaData', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_refreshMetaData();
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

CodeCoverageClient.prototype.recv_refreshMetaData = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_refreshMetaData_result();
  result.read(this.input);
  this.input.readMessageEnd();

  return;
};

CodeCoverageClient.prototype.getXMLData = function(callback) {
  this.send_getXMLData(callback); 
  if (!callback) {
    return this.recv_getXMLData();
  }
};

CodeCoverageClient.prototype.send_getXMLData = function(callback) {
  var args = new CodeCoverage_getXMLData_args();
  try {
    this.output.writeMessageBegin('getXMLData', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_getXMLData();
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

CodeCoverageClient.prototype.recv_getXMLData = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CodeCoverage_getXMLData_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'getXMLData failed: unknown result';
};
