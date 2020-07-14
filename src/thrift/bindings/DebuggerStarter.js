//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
"use strict";

var thrift = require('thrift');
var Thrift = thrift.Thrift;
var Q = thrift.Q;
var Int64 = require('node-int64');

var shared_ttypes = require('./shared_types');
var cspy_ttypes = require('./cspy_types');
var ServiceRegistry_ttypes = require('./ServiceRegistry_types');


var HeartbeatService = require('./HeartbeatService');
var HeartbeatServiceClient = HeartbeatService.Client;
var HeartbeatServiceProcessor = HeartbeatService.Processor;
var ttypes = require('./ampsync_types');
//HELPER FUNCTIONS AND STRUCTURES

var DebuggerStarter_Configure_args = function(args) {
  this.stageDir = null;
  this.defaultTool = null;
  if (args) {
    if (args.stageDir !== undefined && args.stageDir !== null) {
      this.stageDir = args.stageDir;
    }
    if (args.defaultTool !== undefined && args.defaultTool !== null) {
      this.defaultTool = args.defaultTool;
    }
  }
};
DebuggerStarter_Configure_args.prototype = {};
DebuggerStarter_Configure_args.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.STRING) {
        this.stageDir = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I32) {
        this.defaultTool = input.readI32();
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

DebuggerStarter_Configure_args.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_Configure_args');
  if (this.stageDir !== null && this.stageDir !== undefined) {
    output.writeFieldBegin('stageDir', Thrift.Type.STRING, 1);
    output.writeString(this.stageDir);
    output.writeFieldEnd();
  }
  if (this.defaultTool !== null && this.defaultTool !== undefined) {
    output.writeFieldBegin('defaultTool', Thrift.Type.I32, 2);
    output.writeI32(this.defaultTool);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_Configure_result = function(args) {
};
DebuggerStarter_Configure_result.prototype = {};
DebuggerStarter_Configure_result.prototype.read = function(input) {
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

DebuggerStarter_Configure_result.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_Configure_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_StartServiceRegistry_args = function(args) {
};
DebuggerStarter_StartServiceRegistry_args.prototype = {};
DebuggerStarter_StartServiceRegistry_args.prototype.read = function(input) {
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

DebuggerStarter_StartServiceRegistry_args.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_StartServiceRegistry_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_StartServiceRegistry_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new ServiceRegistry_ttypes.ServiceLocation(args.success);
    }
  }
};
DebuggerStarter_StartServiceRegistry_result.prototype = {};
DebuggerStarter_StartServiceRegistry_result.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.STRUCT) {
        this.success = new ServiceRegistry_ttypes.ServiceLocation();
        this.success.read(input);
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

DebuggerStarter_StartServiceRegistry_result.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_StartServiceRegistry_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_StartDebuggers_args = function(args) {
  this.parentServiceRegistryLoc = null;
  this.sharedServiceRegistryLoc = null;
  if (args) {
    if (args.parentServiceRegistryLoc !== undefined && args.parentServiceRegistryLoc !== null) {
      this.parentServiceRegistryLoc = new ServiceRegistry_ttypes.ServiceLocation(args.parentServiceRegistryLoc);
    }
    if (args.sharedServiceRegistryLoc !== undefined && args.sharedServiceRegistryLoc !== null) {
      this.sharedServiceRegistryLoc = new ServiceRegistry_ttypes.ServiceLocation(args.sharedServiceRegistryLoc);
    }
  }
};
DebuggerStarter_StartDebuggers_args.prototype = {};
DebuggerStarter_StartDebuggers_args.prototype.read = function(input) {
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
        this.parentServiceRegistryLoc = new ServiceRegistry_ttypes.ServiceLocation();
        this.parentServiceRegistryLoc.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.sharedServiceRegistryLoc = new ServiceRegistry_ttypes.ServiceLocation();
        this.sharedServiceRegistryLoc.read(input);
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

DebuggerStarter_StartDebuggers_args.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_StartDebuggers_args');
  if (this.parentServiceRegistryLoc !== null && this.parentServiceRegistryLoc !== undefined) {
    output.writeFieldBegin('parentServiceRegistryLoc', Thrift.Type.STRUCT, 1);
    this.parentServiceRegistryLoc.write(output);
    output.writeFieldEnd();
  }
  if (this.sharedServiceRegistryLoc !== null && this.sharedServiceRegistryLoc !== undefined) {
    output.writeFieldBegin('sharedServiceRegistryLoc', Thrift.Type.STRUCT, 2);
    this.sharedServiceRegistryLoc.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_StartDebuggers_result = function(args) {
  this.success = null;
  this.fsp = null;
  this.se = null;
  if (args instanceof ttypes.FailedToStartPartner) {
    this.fsp = args;
    return;
  }
  if (args instanceof ServiceRegistry_ttypes.ServiceException) {
    this.se = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = Thrift.copyList(args.success, [ServiceRegistry_ttypes.ServiceLocation]);
    }
    if (args.fsp !== undefined && args.fsp !== null) {
      this.fsp = args.fsp;
    }
    if (args.se !== undefined && args.se !== null) {
      this.se = args.se;
    }
  }
};
DebuggerStarter_StartDebuggers_result.prototype = {};
DebuggerStarter_StartDebuggers_result.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.LIST) {
        this.success = [];
        var _rtmp342 = input.readListBegin();
        var _size41 = _rtmp342.size || 0;
        for (var _i43 = 0; _i43 < _size41; ++_i43) {
          var elem44 = null;
          elem44 = new ServiceRegistry_ttypes.ServiceLocation();
          elem44.read(input);
          this.success.push(elem44);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.fsp = new ttypes.FailedToStartPartner();
        this.fsp.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.se = new ServiceRegistry_ttypes.ServiceException();
        this.se.read(input);
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

DebuggerStarter_StartDebuggers_result.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_StartDebuggers_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.LIST, 0);
    output.writeListBegin(Thrift.Type.STRUCT, this.success.length);
    for (var iter45 in this.success) {
      if (this.success.hasOwnProperty(iter45)) {
        iter45 = this.success[iter45];
        iter45.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.fsp !== null && this.fsp !== undefined) {
    output.writeFieldBegin('fsp', Thrift.Type.STRUCT, 1);
    this.fsp.write(output);
    output.writeFieldEnd();
  }
  if (this.se !== null && this.se !== undefined) {
    output.writeFieldBegin('se', Thrift.Type.STRUCT, 2);
    this.se.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_TerminateDebuggers_args = function(args) {
};
DebuggerStarter_TerminateDebuggers_args.prototype = {};
DebuggerStarter_TerminateDebuggers_args.prototype.read = function(input) {
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

DebuggerStarter_TerminateDebuggers_args.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_TerminateDebuggers_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_TerminateDebuggers_result = function(args) {
  this.se = null;
  if (args instanceof ServiceRegistry_ttypes.ServiceException) {
    this.se = args;
    return;
  }
  if (args) {
    if (args.se !== undefined && args.se !== null) {
      this.se = args.se;
    }
  }
};
DebuggerStarter_TerminateDebuggers_result.prototype = {};
DebuggerStarter_TerminateDebuggers_result.prototype.read = function(input) {
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
        this.se = new ServiceRegistry_ttypes.ServiceException();
        this.se.read(input);
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

DebuggerStarter_TerminateDebuggers_result.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_TerminateDebuggers_result');
  if (this.se !== null && this.se !== undefined) {
    output.writeFieldBegin('se', Thrift.Type.STRUCT, 1);
    this.se.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_GetPartnerNamespace_args = function(args) {
  this.partnerId = null;
  this.sharedServiceRegistryLoc = null;
  if (args) {
    if (args.partnerId !== undefined && args.partnerId !== null) {
      this.partnerId = args.partnerId;
    }
    if (args.sharedServiceRegistryLoc !== undefined && args.sharedServiceRegistryLoc !== null) {
      this.sharedServiceRegistryLoc = new ServiceRegistry_ttypes.ServiceLocation(args.sharedServiceRegistryLoc);
    }
  }
};
DebuggerStarter_GetPartnerNamespace_args.prototype = {};
DebuggerStarter_GetPartnerNamespace_args.prototype.read = function(input) {
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
        this.partnerId = input.readI32();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.sharedServiceRegistryLoc = new ServiceRegistry_ttypes.ServiceLocation();
        this.sharedServiceRegistryLoc.read(input);
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

DebuggerStarter_GetPartnerNamespace_args.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_GetPartnerNamespace_args');
  if (this.partnerId !== null && this.partnerId !== undefined) {
    output.writeFieldBegin('partnerId', Thrift.Type.I32, 1);
    output.writeI32(this.partnerId);
    output.writeFieldEnd();
  }
  if (this.sharedServiceRegistryLoc !== null && this.sharedServiceRegistryLoc !== undefined) {
    output.writeFieldBegin('sharedServiceRegistryLoc', Thrift.Type.STRUCT, 2);
    this.sharedServiceRegistryLoc.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarter_GetPartnerNamespace_result = function(args) {
  this.success = null;
  this.partner = null;
  if (args instanceof ttypes.UnknownPartner) {
    this.partner = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
    if (args.partner !== undefined && args.partner !== null) {
      this.partner = args.partner;
    }
  }
};
DebuggerStarter_GetPartnerNamespace_result.prototype = {};
DebuggerStarter_GetPartnerNamespace_result.prototype.read = function(input) {
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
        this.success = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.partner = new ttypes.UnknownPartner();
        this.partner.read(input);
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

DebuggerStarter_GetPartnerNamespace_result.prototype.write = function(output) {
  output.writeStructBegin('DebuggerStarter_GetPartnerNamespace_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRING, 0);
    output.writeString(this.success);
    output.writeFieldEnd();
  }
  if (this.partner !== null && this.partner !== undefined) {
    output.writeFieldBegin('partner', Thrift.Type.STRUCT, 1);
    this.partner.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DebuggerStarterClient = exports.Client = function(output, pClass) {
  this.output = output;
  this.pClass = pClass;
  this._seqid = 0;
  this._reqs = {};
};
Thrift.inherits(DebuggerStarterClient, HeartbeatServiceClient);
DebuggerStarterClient.prototype.seqid = function() { return this._seqid; };
DebuggerStarterClient.prototype.new_seqid = function() { return this._seqid += 1; };

DebuggerStarterClient.prototype.Configure = function(stageDir, defaultTool, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_Configure(stageDir, defaultTool);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_Configure(stageDir, defaultTool);
  }
};

DebuggerStarterClient.prototype.send_Configure = function(stageDir, defaultTool) {
  var output = new this.pClass(this.output);
  var params = {
    stageDir: stageDir,
    defaultTool: defaultTool
  };
  var args = new DebuggerStarter_Configure_args(params);
  try {
    output.writeMessageBegin('Configure', Thrift.MessageType.CALL, this.seqid());
    args.write(output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

DebuggerStarterClient.prototype.recv_Configure = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new DebuggerStarter_Configure_result();
  result.read(input);
  input.readMessageEnd();

  callback(null);
};

DebuggerStarterClient.prototype.StartServiceRegistry = function(callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_StartServiceRegistry();
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_StartServiceRegistry();
  }
};

DebuggerStarterClient.prototype.send_StartServiceRegistry = function() {
  var output = new this.pClass(this.output);
  var args = new DebuggerStarter_StartServiceRegistry_args();
  try {
    output.writeMessageBegin('StartServiceRegistry', Thrift.MessageType.CALL, this.seqid());
    args.write(output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

DebuggerStarterClient.prototype.recv_StartServiceRegistry = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new DebuggerStarter_StartServiceRegistry_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('StartServiceRegistry failed: unknown result');
};

DebuggerStarterClient.prototype.StartDebuggers = function(parentServiceRegistryLoc, sharedServiceRegistryLoc, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_StartDebuggers(parentServiceRegistryLoc, sharedServiceRegistryLoc);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_StartDebuggers(parentServiceRegistryLoc, sharedServiceRegistryLoc);
  }
};

DebuggerStarterClient.prototype.send_StartDebuggers = function(parentServiceRegistryLoc, sharedServiceRegistryLoc) {
  var output = new this.pClass(this.output);
  var params = {
    parentServiceRegistryLoc: parentServiceRegistryLoc,
    sharedServiceRegistryLoc: sharedServiceRegistryLoc
  };
  var args = new DebuggerStarter_StartDebuggers_args(params);
  try {
    output.writeMessageBegin('StartDebuggers', Thrift.MessageType.CALL, this.seqid());
    args.write(output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

DebuggerStarterClient.prototype.recv_StartDebuggers = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new DebuggerStarter_StartDebuggers_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.fsp) {
    return callback(result.fsp);
  }
  if (null !== result.se) {
    return callback(result.se);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('StartDebuggers failed: unknown result');
};

DebuggerStarterClient.prototype.TerminateDebuggers = function(callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_TerminateDebuggers();
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_TerminateDebuggers();
  }
};

DebuggerStarterClient.prototype.send_TerminateDebuggers = function() {
  var output = new this.pClass(this.output);
  var args = new DebuggerStarter_TerminateDebuggers_args();
  try {
    output.writeMessageBegin('TerminateDebuggers', Thrift.MessageType.CALL, this.seqid());
    args.write(output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

DebuggerStarterClient.prototype.recv_TerminateDebuggers = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new DebuggerStarter_TerminateDebuggers_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.se) {
    return callback(result.se);
  }
  callback(null);
};

DebuggerStarterClient.prototype.GetPartnerNamespace = function(partnerId, sharedServiceRegistryLoc, callback) {
  this._seqid = this.new_seqid();
  if (callback === undefined) {
    var _defer = Q.defer();
    this._reqs[this.seqid()] = function(error, result) {
      if (error) {
        _defer.reject(error);
      } else {
        _defer.resolve(result);
      }
    };
    this.send_GetPartnerNamespace(partnerId, sharedServiceRegistryLoc);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_GetPartnerNamespace(partnerId, sharedServiceRegistryLoc);
  }
};

DebuggerStarterClient.prototype.send_GetPartnerNamespace = function(partnerId, sharedServiceRegistryLoc) {
  var output = new this.pClass(this.output);
  var params = {
    partnerId: partnerId,
    sharedServiceRegistryLoc: sharedServiceRegistryLoc
  };
  var args = new DebuggerStarter_GetPartnerNamespace_args(params);
  try {
    output.writeMessageBegin('GetPartnerNamespace', Thrift.MessageType.CALL, this.seqid());
    args.write(output);
    output.writeMessageEnd();
    return this.output.flush();
  }
  catch (e) {
    delete this._reqs[this.seqid()];
    if (typeof output.reset === 'function') {
      output.reset();
    }
    throw e;
  }
};

DebuggerStarterClient.prototype.recv_GetPartnerNamespace = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new DebuggerStarter_GetPartnerNamespace_result();
  result.read(input);
  input.readMessageEnd();

  if (null !== result.partner) {
    return callback(result.partner);
  }
  if (null !== result.success) {
    return callback(null, result.success);
  }
  return callback('GetPartnerNamespace failed: unknown result');
};
var DebuggerStarterProcessor = exports.Processor = function(handler) {
  this._handler = handler;
};
Thrift.inherits(DebuggerStarterProcessor, HeartbeatServiceProcessor);
DebuggerStarterProcessor.prototype.process = function(input, output) {
  var r = input.readMessageBegin();
  if (this['process_' + r.fname]) {
    return this['process_' + r.fname].call(this, r.rseqid, input, output);
  } else {
    input.skip(Thrift.Type.STRUCT);
    input.readMessageEnd();
    var x = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN_METHOD, 'Unknown function ' + r.fname);
    output.writeMessageBegin(r.fname, Thrift.MessageType.EXCEPTION, r.rseqid);
    x.write(output);
    output.writeMessageEnd();
    output.flush();
  }
};
DebuggerStarterProcessor.prototype.process_Configure = function(seqid, input, output) {
  var args = new DebuggerStarter_Configure_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.Configure.length === 2) {
    Q.fcall(this._handler.Configure.bind(this._handler),
      args.stageDir,
      args.defaultTool
    ).then(function(result) {
      var result_obj = new DebuggerStarter_Configure_result({success: result});
      output.writeMessageBegin("Configure", Thrift.MessageType.REPLY, seqid);
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
      output.writeMessageBegin("Configure", Thrift.MessageType.EXCEPTION, seqid);
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.Configure(args.stageDir, args.defaultTool, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined')) {
        result_obj = new DebuggerStarter_Configure_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("Configure", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("Configure", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
DebuggerStarterProcessor.prototype.process_StartServiceRegistry = function(seqid, input, output) {
  var args = new DebuggerStarter_StartServiceRegistry_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.StartServiceRegistry.length === 0) {
    Q.fcall(this._handler.StartServiceRegistry.bind(this._handler)
    ).then(function(result) {
      var result_obj = new DebuggerStarter_StartServiceRegistry_result({success: result});
      output.writeMessageBegin("StartServiceRegistry", Thrift.MessageType.REPLY, seqid);
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
      output.writeMessageBegin("StartServiceRegistry", Thrift.MessageType.EXCEPTION, seqid);
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.StartServiceRegistry(function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined')) {
        result_obj = new DebuggerStarter_StartServiceRegistry_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("StartServiceRegistry", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("StartServiceRegistry", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
DebuggerStarterProcessor.prototype.process_StartDebuggers = function(seqid, input, output) {
  var args = new DebuggerStarter_StartDebuggers_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.StartDebuggers.length === 2) {
    Q.fcall(this._handler.StartDebuggers.bind(this._handler),
      args.parentServiceRegistryLoc,
      args.sharedServiceRegistryLoc
    ).then(function(result) {
      var result_obj = new DebuggerStarter_StartDebuggers_result({success: result});
      output.writeMessageBegin("StartDebuggers", Thrift.MessageType.REPLY, seqid);
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.FailedToStartPartner || err instanceof ServiceRegistry_ttypes.ServiceException) {
        result = new DebuggerStarter_StartDebuggers_result(err);
        output.writeMessageBegin("StartDebuggers", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("StartDebuggers", Thrift.MessageType.EXCEPTION, seqid);
      }
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.StartDebuggers(args.parentServiceRegistryLoc, args.sharedServiceRegistryLoc, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.FailedToStartPartner || err instanceof ServiceRegistry_ttypes.ServiceException) {
        result_obj = new DebuggerStarter_StartDebuggers_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("StartDebuggers", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("StartDebuggers", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
DebuggerStarterProcessor.prototype.process_TerminateDebuggers = function(seqid, input, output) {
  var args = new DebuggerStarter_TerminateDebuggers_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.TerminateDebuggers.length === 0) {
    Q.fcall(this._handler.TerminateDebuggers.bind(this._handler)
    ).then(function(result) {
      var result_obj = new DebuggerStarter_TerminateDebuggers_result({success: result});
      output.writeMessageBegin("TerminateDebuggers", Thrift.MessageType.REPLY, seqid);
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ServiceRegistry_ttypes.ServiceException) {
        result = new DebuggerStarter_TerminateDebuggers_result(err);
        output.writeMessageBegin("TerminateDebuggers", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("TerminateDebuggers", Thrift.MessageType.EXCEPTION, seqid);
      }
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.TerminateDebuggers(function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ServiceRegistry_ttypes.ServiceException) {
        result_obj = new DebuggerStarter_TerminateDebuggers_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("TerminateDebuggers", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("TerminateDebuggers", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
DebuggerStarterProcessor.prototype.process_GetPartnerNamespace = function(seqid, input, output) {
  var args = new DebuggerStarter_GetPartnerNamespace_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.GetPartnerNamespace.length === 2) {
    Q.fcall(this._handler.GetPartnerNamespace.bind(this._handler),
      args.partnerId,
      args.sharedServiceRegistryLoc
    ).then(function(result) {
      var result_obj = new DebuggerStarter_GetPartnerNamespace_result({success: result});
      output.writeMessageBegin("GetPartnerNamespace", Thrift.MessageType.REPLY, seqid);
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      if (err instanceof ttypes.UnknownPartner) {
        result = new DebuggerStarter_GetPartnerNamespace_result(err);
        output.writeMessageBegin("GetPartnerNamespace", Thrift.MessageType.REPLY, seqid);
      } else {
        result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("GetPartnerNamespace", Thrift.MessageType.EXCEPTION, seqid);
      }
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.GetPartnerNamespace(args.partnerId, args.sharedServiceRegistryLoc, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined') || err instanceof ttypes.UnknownPartner) {
        result_obj = new DebuggerStarter_GetPartnerNamespace_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("GetPartnerNamespace", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("GetPartnerNamespace", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
