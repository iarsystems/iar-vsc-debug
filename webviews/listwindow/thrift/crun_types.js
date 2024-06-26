//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


var ttypes = module.exports = {};
ttypes.CRunBreakAction = {
  '0' : 'kStopAndLog',
  'kStopAndLog' : 0,
  '1' : 'kLog',
  'kLog' : 1,
  '2' : 'kIgnore',
  'kIgnore' : 2
};
var CRunMessage = module.exports.CRunMessage = function(args) {
  this.id = null;
  this.index = null;
  this.core = null;
  this.name = null;
  this.text = null;
  this.cycle = null;
  this.repeatCount = null;
  this.subMessages = null;
  this.callStack = null;
  this.noStop = null;
  this.runTo = null;
  this.userProgramCounter = null;
  this.extraSourceRanges = null;
  this.pcSourceRange = null;
  this.tooltip = null;
  this.breakAction = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.index !== undefined && args.index !== null) {
      this.index = args.index;
    }
    if (args.core !== undefined && args.core !== null) {
      this.core = args.core;
    }
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.text !== undefined && args.text !== null) {
      this.text = args.text;
    }
    if (args.cycle !== undefined && args.cycle !== null) {
      this.cycle = args.cycle;
    }
    if (args.repeatCount !== undefined && args.repeatCount !== null) {
      this.repeatCount = args.repeatCount;
    }
    if (args.subMessages !== undefined && args.subMessages !== null) {
      this.subMessages = Thrift.copyList(args.subMessages, [null]);
    }
    if (args.callStack !== undefined && args.callStack !== null) {
      this.callStack = Thrift.copyList(args.callStack, [null]);
    }
    if (args.noStop !== undefined && args.noStop !== null) {
      this.noStop = args.noStop;
    }
    if (args.runTo !== undefined && args.runTo !== null) {
      this.runTo = new shared_ttypes.Location(args.runTo);
    }
    if (args.userProgramCounter !== undefined && args.userProgramCounter !== null) {
      this.userProgramCounter = new shared_ttypes.Location(args.userProgramCounter);
    }
    if (args.extraSourceRanges !== undefined && args.extraSourceRanges !== null) {
      this.extraSourceRanges = Thrift.copyList(args.extraSourceRanges, [shared_ttypes.SourceRange]);
    }
    if (args.pcSourceRange !== undefined && args.pcSourceRange !== null) {
      this.pcSourceRange = new shared_ttypes.SourceRange(args.pcSourceRange);
    }
    if (args.tooltip !== undefined && args.tooltip !== null) {
      this.tooltip = args.tooltip;
    }
    if (args.breakAction !== undefined && args.breakAction !== null) {
      this.breakAction = args.breakAction;
    }
  }
};
CRunMessage.prototype = {};
CRunMessage.prototype.read = function(input) {
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
        this.id = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I32) {
        this.index = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I32) {
        this.core = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.text = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.I64) {
        this.cycle = input.readI64().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 7:
      if (ftype == Thrift.Type.I32) {
        this.repeatCount = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 8:
      if (ftype == Thrift.Type.LIST) {
        this.subMessages = [];
        var _rtmp31 = input.readListBegin();
        var _size0 = _rtmp31.size || 0;
        for (var _i2 = 0; _i2 < _size0; ++_i2) {
          var elem3 = null;
          elem3 = new ttypes.CRunMessage();
          elem3.read(input);
          this.subMessages.push(elem3);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 9:
      if (ftype == Thrift.Type.LIST) {
        this.callStack = [];
        var _rtmp35 = input.readListBegin();
        var _size4 = _rtmp35.size || 0;
        for (var _i6 = 0; _i6 < _size4; ++_i6) {
          var elem7 = null;
          elem7 = input.readString().value;
          this.callStack.push(elem7);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 10:
      if (ftype == Thrift.Type.BOOL) {
        this.noStop = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 11:
      if (ftype == Thrift.Type.STRUCT) {
        this.runTo = new shared_ttypes.Location();
        this.runTo.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 12:
      if (ftype == Thrift.Type.STRUCT) {
        this.userProgramCounter = new shared_ttypes.Location();
        this.userProgramCounter.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 13:
      if (ftype == Thrift.Type.LIST) {
        this.extraSourceRanges = [];
        var _rtmp39 = input.readListBegin();
        var _size8 = _rtmp39.size || 0;
        for (var _i10 = 0; _i10 < _size8; ++_i10) {
          var elem11 = null;
          elem11 = new shared_ttypes.SourceRange();
          elem11.read(input);
          this.extraSourceRanges.push(elem11);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 14:
      if (ftype == Thrift.Type.STRUCT) {
        this.pcSourceRange = new shared_ttypes.SourceRange();
        this.pcSourceRange.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 15:
      if (ftype == Thrift.Type.STRING) {
        this.tooltip = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 16:
      if (ftype == Thrift.Type.I32) {
        this.breakAction = input.readI32().value;
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

CRunMessage.prototype.write = function(output) {
  output.writeStructBegin('CRunMessage');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.I32, 1);
    output.writeI32(this.id);
    output.writeFieldEnd();
  }
  if (this.index !== null && this.index !== undefined) {
    output.writeFieldBegin('index', Thrift.Type.I32, 2);
    output.writeI32(this.index);
    output.writeFieldEnd();
  }
  if (this.core !== null && this.core !== undefined) {
    output.writeFieldBegin('core', Thrift.Type.I32, 3);
    output.writeI32(this.core);
    output.writeFieldEnd();
  }
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 4);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.text !== null && this.text !== undefined) {
    output.writeFieldBegin('text', Thrift.Type.STRING, 5);
    output.writeString(this.text);
    output.writeFieldEnd();
  }
  if (this.cycle !== null && this.cycle !== undefined) {
    output.writeFieldBegin('cycle', Thrift.Type.I64, 6);
    output.writeI64(this.cycle);
    output.writeFieldEnd();
  }
  if (this.repeatCount !== null && this.repeatCount !== undefined) {
    output.writeFieldBegin('repeatCount', Thrift.Type.I32, 7);
    output.writeI32(this.repeatCount);
    output.writeFieldEnd();
  }
  if (this.subMessages !== null && this.subMessages !== undefined) {
    output.writeFieldBegin('subMessages', Thrift.Type.LIST, 8);
    output.writeListBegin(Thrift.Type.STRUCT, this.subMessages.length);
    for (var iter12 in this.subMessages) {
      if (this.subMessages.hasOwnProperty(iter12)) {
        iter12 = this.subMessages[iter12];
        iter12.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.callStack !== null && this.callStack !== undefined) {
    output.writeFieldBegin('callStack', Thrift.Type.LIST, 9);
    output.writeListBegin(Thrift.Type.STRING, this.callStack.length);
    for (var iter13 in this.callStack) {
      if (this.callStack.hasOwnProperty(iter13)) {
        iter13 = this.callStack[iter13];
        output.writeString(iter13);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.noStop !== null && this.noStop !== undefined) {
    output.writeFieldBegin('noStop', Thrift.Type.BOOL, 10);
    output.writeBool(this.noStop);
    output.writeFieldEnd();
  }
  if (this.runTo !== null && this.runTo !== undefined) {
    output.writeFieldBegin('runTo', Thrift.Type.STRUCT, 11);
    this.runTo.write(output);
    output.writeFieldEnd();
  }
  if (this.userProgramCounter !== null && this.userProgramCounter !== undefined) {
    output.writeFieldBegin('userProgramCounter', Thrift.Type.STRUCT, 12);
    this.userProgramCounter.write(output);
    output.writeFieldEnd();
  }
  if (this.extraSourceRanges !== null && this.extraSourceRanges !== undefined) {
    output.writeFieldBegin('extraSourceRanges', Thrift.Type.LIST, 13);
    output.writeListBegin(Thrift.Type.STRUCT, this.extraSourceRanges.length);
    for (var iter14 in this.extraSourceRanges) {
      if (this.extraSourceRanges.hasOwnProperty(iter14)) {
        iter14 = this.extraSourceRanges[iter14];
        iter14.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.pcSourceRange !== null && this.pcSourceRange !== undefined) {
    output.writeFieldBegin('pcSourceRange', Thrift.Type.STRUCT, 14);
    this.pcSourceRange.write(output);
    output.writeFieldEnd();
  }
  if (this.tooltip !== null && this.tooltip !== undefined) {
    output.writeFieldBegin('tooltip', Thrift.Type.STRING, 15);
    output.writeString(this.tooltip);
    output.writeFieldEnd();
  }
  if (this.breakAction !== null && this.breakAction !== undefined) {
    output.writeFieldBegin('breakAction', Thrift.Type.I32, 16);
    output.writeI32(this.breakAction);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ttypes.CRUN_DISPLAY_SERVICE = 'crun.display';
ttypes.CRUN_BACKEND_SERVICE = 'crun.backend';
