//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var Disassembly_disassembleRange_args = function(args) {
  this._from = null;
  this._to = null;
  this.context = null;
  if (args) {
    if (args._from !== undefined && args._from !== null) {
      this._from = new shared_ttypes.Location(args._from);
    }
    if (args._to !== undefined && args._to !== null) {
      this._to = new shared_ttypes.Location(args._to);
    }
    if (args.context !== undefined && args.context !== null) {
      this.context = new shared_ttypes.ContextRef(args.context);
    }
  }
};
Disassembly_disassembleRange_args.prototype = {};
Disassembly_disassembleRange_args.prototype.read = function(input) {
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
        this._from = new shared_ttypes.Location();
        this._from.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this._to = new shared_ttypes.Location();
        this._to.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRUCT) {
        this.context = new shared_ttypes.ContextRef();
        this.context.read(input);
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

Disassembly_disassembleRange_args.prototype.write = function(output) {
  output.writeStructBegin('Disassembly_disassembleRange_args');
  if (this._from !== null && this._from !== undefined) {
    output.writeFieldBegin('_from', Thrift.Type.STRUCT, 1);
    this._from.write(output);
    output.writeFieldEnd();
  }
  if (this._to !== null && this._to !== undefined) {
    output.writeFieldBegin('_to', Thrift.Type.STRUCT, 2);
    this._to.write(output);
    output.writeFieldEnd();
  }
  if (this.context !== null && this.context !== undefined) {
    output.writeFieldBegin('context', Thrift.Type.STRUCT, 3);
    this.context.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var Disassembly_disassembleRange_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof shared_ttypes.CSpyException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = Thrift.copyList(args.success, [ttypes.DisassembledLocation]);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
Disassembly_disassembleRange_result.prototype = {};
Disassembly_disassembleRange_result.prototype.read = function(input) {
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
        var _rtmp36 = input.readListBegin();
        var _size5 = _rtmp36.size || 0;
        for (var _i7 = 0; _i7 < _size5; ++_i7) {
          var elem8 = null;
          elem8 = new ttypes.DisassembledLocation();
          elem8.read(input);
          this.success.push(elem8);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new shared_ttypes.CSpyException();
        this.e.read(input);
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

Disassembly_disassembleRange_result.prototype.write = function(output) {
  output.writeStructBegin('Disassembly_disassembleRange_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.LIST, 0);
    output.writeListBegin(Thrift.Type.STRUCT, this.success.length);
    for (var iter9 in this.success) {
      if (this.success.hasOwnProperty(iter9)) {
        iter9 = this.success[iter9];
        iter9.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var Disassembly_disassembleLines_args = function(args) {
  this._from = null;
  this.numLines = null;
  this.context = null;
  if (args) {
    if (args._from !== undefined && args._from !== null) {
      this._from = new shared_ttypes.Location(args._from);
    }
    if (args.numLines !== undefined && args.numLines !== null) {
      this.numLines = args.numLines;
    }
    if (args.context !== undefined && args.context !== null) {
      this.context = new shared_ttypes.ContextRef(args.context);
    }
  }
};
Disassembly_disassembleLines_args.prototype = {};
Disassembly_disassembleLines_args.prototype.read = function(input) {
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
        this._from = new shared_ttypes.Location();
        this._from.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I32) {
        this.numLines = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRUCT) {
        this.context = new shared_ttypes.ContextRef();
        this.context.read(input);
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

Disassembly_disassembleLines_args.prototype.write = function(output) {
  output.writeStructBegin('Disassembly_disassembleLines_args');
  if (this._from !== null && this._from !== undefined) {
    output.writeFieldBegin('_from', Thrift.Type.STRUCT, 1);
    this._from.write(output);
    output.writeFieldEnd();
  }
  if (this.numLines !== null && this.numLines !== undefined) {
    output.writeFieldBegin('numLines', Thrift.Type.I32, 2);
    output.writeI32(this.numLines);
    output.writeFieldEnd();
  }
  if (this.context !== null && this.context !== undefined) {
    output.writeFieldBegin('context', Thrift.Type.STRUCT, 3);
    this.context.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var Disassembly_disassembleLines_result = function(args) {
  this.success = null;
  this.e = null;
  if (args instanceof shared_ttypes.CSpyException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = Thrift.copyList(args.success, [ttypes.DisassembledLocation]);
    }
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
Disassembly_disassembleLines_result.prototype = {};
Disassembly_disassembleLines_result.prototype.read = function(input) {
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
        var _rtmp311 = input.readListBegin();
        var _size10 = _rtmp311.size || 0;
        for (var _i12 = 0; _i12 < _size10; ++_i12) {
          var elem13 = null;
          elem13 = new ttypes.DisassembledLocation();
          elem13.read(input);
          this.success.push(elem13);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 1:
      if (ftype == Thrift.Type.STRUCT) {
        this.e = new shared_ttypes.CSpyException();
        this.e.read(input);
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

Disassembly_disassembleLines_result.prototype.write = function(output) {
  output.writeStructBegin('Disassembly_disassembleLines_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.LIST, 0);
    output.writeListBegin(Thrift.Type.STRUCT, this.success.length);
    for (var iter14 in this.success) {
      if (this.success.hasOwnProperty(iter14)) {
        iter14 = this.success[iter14];
        iter14.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DisassemblyClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
Thrift.inherits(DisassemblyClient, HeartbeatServiceClient);

DisassemblyClient.prototype.disassembleRange = function(_from, _to, context, callback) {
  this.send_disassembleRange(_from, _to, context, callback); 
  if (!callback) {
    return this.recv_disassembleRange();
  }
};

DisassemblyClient.prototype.send_disassembleRange = function(_from, _to, context, callback) {
  var params = {
    _from: _from,
    _to: _to,
    context: context
  };
  var args = new Disassembly_disassembleRange_args(params);
  try {
    this.output.writeMessageBegin('disassembleRange', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_disassembleRange();
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

DisassemblyClient.prototype.recv_disassembleRange = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new Disassembly_disassembleRange_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.e) {
    throw result.e;
  }
  if (null !== result.success) {
    return result.success;
  }
  throw 'disassembleRange failed: unknown result';
};

DisassemblyClient.prototype.disassembleLines = function(_from, numLines, context, callback) {
  this.send_disassembleLines(_from, numLines, context, callback); 
  if (!callback) {
    return this.recv_disassembleLines();
  }
};

DisassemblyClient.prototype.send_disassembleLines = function(_from, numLines, context, callback) {
  var params = {
    _from: _from,
    numLines: numLines,
    context: context
  };
  var args = new Disassembly_disassembleLines_args(params);
  try {
    this.output.writeMessageBegin('disassembleLines', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_disassembleLines();
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

DisassemblyClient.prototype.recv_disassembleLines = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new Disassembly_disassembleLines_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.e) {
    throw result.e;
  }
  if (null !== result.success) {
    return result.success;
  }
  throw 'disassembleLines failed: unknown result';
};
