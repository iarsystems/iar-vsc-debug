//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


var ttypes = module.exports = {};
ttypes.LogSeverity = {
  '-1' : 'kDebug',
  'kDebug' : -1,
  '0' : 'kUser',
  'kUser' : 0,
  '1' : 'kMinorInfo',
  'kMinorInfo' : 1,
  '2' : 'kInfo',
  'kInfo' : 2,
  '3' : 'kWarning',
  'kWarning' : 3,
  '4' : 'kError',
  'kError' : 4,
  '5' : 'kAlert',
  'kAlert' : 5,
  '6' : 'kSuper',
  'kSuper' : 6
};
var SrcPos = module.exports.SrcPos = function(args) {
  this.row = null;
  this.col = null;
  this.valid = null;
  if (args) {
    if (args.row !== undefined && args.row !== null) {
      this.row = args.row;
    }
    if (args.col !== undefined && args.col !== null) {
      this.col = args.col;
    }
    if (args.valid !== undefined && args.valid !== null) {
      this.valid = args.valid;
    }
  }
};
SrcPos.prototype = {};
SrcPos.prototype.read = function(input) {
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
        this.row = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I32) {
        this.col = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.BOOL) {
        this.valid = input.readBool().value;
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

SrcPos.prototype.write = function(output) {
  output.writeStructBegin('SrcPos');
  if (this.row !== null && this.row !== undefined) {
    output.writeFieldBegin('row', Thrift.Type.I32, 1);
    output.writeI32(this.row);
    output.writeFieldEnd();
  }
  if (this.col !== null && this.col !== undefined) {
    output.writeFieldBegin('col', Thrift.Type.I32, 2);
    output.writeI32(this.col);
    output.writeFieldEnd();
  }
  if (this.valid !== null && this.valid !== undefined) {
    output.writeFieldBegin('valid', Thrift.Type.BOOL, 3);
    output.writeBool(this.valid);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var LogEntry = module.exports.LogEntry = function(args) {
  this.category = null;
  this.sender = null;
  this.text = null;
  this.severity = null;
  this.path = null;
  this.srcPos = null;
  this.srcEndPos = null;
  this.timestamp = null;
  this.entryId = null;
  this.isSubEntry = null;
  if (args) {
    if (args.category !== undefined && args.category !== null) {
      this.category = args.category;
    }
    if (args.sender !== undefined && args.sender !== null) {
      this.sender = args.sender;
    }
    if (args.text !== undefined && args.text !== null) {
      this.text = args.text;
    }
    if (args.severity !== undefined && args.severity !== null) {
      this.severity = args.severity;
    }
    if (args.path !== undefined && args.path !== null) {
      this.path = args.path;
    }
    if (args.srcPos !== undefined && args.srcPos !== null) {
      this.srcPos = new ttypes.SrcPos(args.srcPos);
    }
    if (args.srcEndPos !== undefined && args.srcEndPos !== null) {
      this.srcEndPos = new ttypes.SrcPos(args.srcEndPos);
    }
    if (args.timestamp !== undefined && args.timestamp !== null) {
      this.timestamp = args.timestamp;
    }
    if (args.entryId !== undefined && args.entryId !== null) {
      this.entryId = args.entryId;
    }
    if (args.isSubEntry !== undefined && args.isSubEntry !== null) {
      this.isSubEntry = args.isSubEntry;
    }
  }
};
LogEntry.prototype = {};
LogEntry.prototype.read = function(input) {
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
        this.category = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.sender = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.text = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.I32) {
        this.severity = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.path = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.STRUCT) {
        this.srcPos = new ttypes.SrcPos();
        this.srcPos.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.STRUCT) {
        this.srcEndPos = new ttypes.SrcPos();
        this.srcEndPos.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.I64) {
        this.timestamp = input.readI64().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.I64) {
        this.entryId = input.readI64().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.BOOL) {
        this.isSubEntry = input.readBool().value;
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

LogEntry.prototype.write = function(output) {
  output.writeStructBegin('LogEntry');
  if (this.category !== null && this.category !== undefined) {
    output.writeFieldBegin('category', Thrift.Type.STRING, 1);
    output.writeString(this.category);
    output.writeFieldEnd();
  }
  if (this.sender !== null && this.sender !== undefined) {
    output.writeFieldBegin('sender', Thrift.Type.STRING, 2);
    output.writeString(this.sender);
    output.writeFieldEnd();
  }
  if (this.text !== null && this.text !== undefined) {
    output.writeFieldBegin('text', Thrift.Type.STRING, 3);
    output.writeString(this.text);
    output.writeFieldEnd();
  }
  if (this.severity !== null && this.severity !== undefined) {
    output.writeFieldBegin('severity', Thrift.Type.I32, 4);
    output.writeI32(this.severity);
    output.writeFieldEnd();
  }
  if (this.path !== null && this.path !== undefined) {
    output.writeFieldBegin('path', Thrift.Type.STRING, 5);
    output.writeString(this.path);
    output.writeFieldEnd();
  }
  if (this.srcPos !== null && this.srcPos !== undefined) {
    output.writeFieldBegin('srcPos', Thrift.Type.STRUCT, 6);
    this.srcPos.write(output);
    output.writeFieldEnd();
  }
  if (this.srcEndPos !== null && this.srcEndPos !== undefined) {
    output.writeFieldBegin('srcEndPos', Thrift.Type.STRUCT, 7);
    this.srcEndPos.write(output);
    output.writeFieldEnd();
  }
  if (this.timestamp !== null && this.timestamp !== undefined) {
    output.writeFieldBegin('timestamp', Thrift.Type.I64, 8);
    output.writeI64(this.timestamp);
    output.writeFieldEnd();
  }
  if (this.entryId !== null && this.entryId !== undefined) {
    output.writeFieldBegin('entryId', Thrift.Type.I64, 9);
    output.writeI64(this.entryId);
    output.writeFieldEnd();
  }
  if (this.isSubEntry !== null && this.isSubEntry !== undefined) {
    output.writeFieldBegin('isSubEntry', Thrift.Type.BOOL, 10);
    output.writeBool(this.isSubEntry);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ttypes.LOGSERVICE_ID = 'com.iar.thrift.service.logservice';
