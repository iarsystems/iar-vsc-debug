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

var ServiceRegistry_ttypes = require('./ServiceRegistry_types');
var shared_ttypes = require('./shared_types');


var ListWindowBackend = require('./ListWindowBackend');
var ListWindowBackendClient = ListWindowBackend.Client;
var ListWindowBackendProcessor = ListWindowBackend.Processor;
var ttypes = require('./listwindow_types');
//HELPER FUNCTIONS AND STRUCTURES

var Watch_add_args = function(args) {
  this.expr = null;
  if (args) {
    if (args.expr !== undefined && args.expr !== null) {
      this.expr = args.expr;
    }
  }
};
Watch_add_args.prototype = {};
Watch_add_args.prototype.read = function(input) {
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
        this.expr = input.readString();
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

Watch_add_args.prototype.write = function(output) {
  output.writeStructBegin('Watch_add_args');
  if (this.expr !== null && this.expr !== undefined) {
    output.writeFieldBegin('expr', Thrift.Type.STRING, 1);
    output.writeString(this.expr);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var Watch_add_result = function(args) {
};
Watch_add_result.prototype = {};
Watch_add_result.prototype.read = function(input) {
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

Watch_add_result.prototype.write = function(output) {
  output.writeStructBegin('Watch_add_result');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var WatchClient = exports.Client = function(output, pClass) {
  this.output = output;
  this.pClass = pClass;
  this._seqid = 0;
  this._reqs = {};
};
Thrift.inherits(WatchClient, ListWindowBackendClient);
WatchClient.prototype.seqid = function() { return this._seqid; };
WatchClient.prototype.new_seqid = function() { return this._seqid += 1; };

WatchClient.prototype.add = function(expr, callback) {
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
    this.send_add(expr);
    return _defer.promise;
  } else {
    this._reqs[this.seqid()] = callback;
    this.send_add(expr);
  }
};

WatchClient.prototype.send_add = function(expr) {
  var output = new this.pClass(this.output);
  var params = {
    expr: expr
  };
  var args = new Watch_add_args(params);
  try {
    output.writeMessageBegin('add', Thrift.MessageType.CALL, this.seqid());
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

WatchClient.prototype.recv_add = function(input,mtype,rseqid) {
  var callback = this._reqs[rseqid] || function() {};
  delete this._reqs[rseqid];
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(input);
    input.readMessageEnd();
    return callback(x);
  }
  var result = new Watch_add_result();
  result.read(input);
  input.readMessageEnd();

  callback(null);
};
var WatchProcessor = exports.Processor = function(handler) {
  this._handler = handler;
};
Thrift.inherits(WatchProcessor, ListWindowBackendProcessor);
WatchProcessor.prototype.process = function(input, output) {
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
WatchProcessor.prototype.process_add = function(seqid, input, output) {
  var args = new Watch_add_args();
  args.read(input);
  input.readMessageEnd();
  if (this._handler.add.length === 1) {
    Q.fcall(this._handler.add.bind(this._handler),
      args.expr
    ).then(function(result) {
      var result_obj = new Watch_add_result({success: result});
      output.writeMessageBegin("add", Thrift.MessageType.REPLY, seqid);
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    }).catch(function (err) {
      var result;
      result = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
      output.writeMessageBegin("add", Thrift.MessageType.EXCEPTION, seqid);
      result.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  } else {
    this._handler.add(args.expr, function (err, result) {
      var result_obj;
      if ((err === null || typeof err === 'undefined')) {
        result_obj = new Watch_add_result((err !== null || typeof err === 'undefined') ? err : {success: result});
        output.writeMessageBegin("add", Thrift.MessageType.REPLY, seqid);
      } else {
        result_obj = new Thrift.TApplicationException(Thrift.TApplicationExceptionType.UNKNOWN, err.message);
        output.writeMessageBegin("add", Thrift.MessageType.EXCEPTION, seqid);
      }
      result_obj.write(output);
      output.writeMessageEnd();
      output.flush();
    });
  }
};
