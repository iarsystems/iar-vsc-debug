//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


var ttypes = module.exports = {};
ttypes.MsgIcon = {
  '0' : 'kMsgIconInfo',
  'kMsgIconInfo' : 0,
  '1' : 'kMsgIconQuestion',
  'kMsgIconQuestion' : 1,
  '2' : 'kMsgIconExclaim',
  'kMsgIconExclaim' : 2,
  '3' : 'kMsgIconStop',
  'kMsgIconStop' : 3
};
ttypes.MsgKind = {
  '0' : 'kMsgOk',
  'kMsgOk' : 0,
  '1' : 'kMsgOkCancel',
  'kMsgOkCancel' : 1,
  '2' : 'kMsgYesNo',
  'kMsgYesNo' : 2,
  '3' : 'kMsgYesNoCancel',
  'kMsgYesNoCancel' : 3
};
ttypes.MsgResult = {
  '0' : 'kMsgResOk',
  'kMsgResOk' : 0,
  '1' : 'kMsgResCancel',
  'kMsgResCancel' : 1,
  '2' : 'kMsgResYes',
  'kMsgResYes' : 2,
  '3' : 'kMsgResNo',
  'kMsgResNo' : 3
};
ttypes.FileDialogType = {
  '0' : 'kOpen',
  'kOpen' : 0,
  '1' : 'kSaveAs',
  'kSaveAs' : 1
};
ttypes.FileDialogReturnType = {
  '0' : 'kAny',
  'kAny' : 0,
  '1' : 'kExistingFile',
  'kExistingFile' : 1,
  '2' : 'kDirectory',
  'kDirectory' : 2,
  '3' : 'kExistingFiles',
  'kExistingFiles' : 3
};
ttypes.FileDialogOptions = {
  '0' : 'kNoOverwritePrompt',
  'kNoOverwritePrompt' : 0,
  '1' : 'kFileMustExist',
  'kFileMustExist' : 1,
  '2' : 'kPathMustExist',
  'kPathMustExist' : 2,
  '3' : 'kAllowReturningReadOnlyFile',
  'kAllowReturningReadOnlyFile' : 3
};
ttypes.GenericDialogReturnType = {
  '0' : 'kOk',
  'kOk' : 0,
  '1' : 'kCancel',
  'kCancel' : 1,
  '2' : 'kUnknown',
  'kUnknown' : 2
};
var FileDialogFilter = module.exports.FileDialogFilter = function(args) {
  this.displayName = null;
  this.filtering = null;
  if (args) {
    if (args.displayName !== undefined && args.displayName !== null) {
      this.displayName = args.displayName;
    }
    if (args.filtering !== undefined && args.filtering !== null) {
      this.filtering = Thrift.copyList(args.filtering, [null]);
    }
  }
};
FileDialogFilter.prototype = {};
FileDialogFilter.prototype.read = function(input) {
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
        this.displayName = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.LIST) {
        this.filtering = [];
        var _rtmp31 = input.readListBegin();
        var _size0 = _rtmp31.size || 0;
        for (var _i2 = 0; _i2 < _size0; ++_i2) {
          var elem3 = null;
          elem3 = input.readString().value;
          this.filtering.push(elem3);
        }
        input.readListEnd();
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

FileDialogFilter.prototype.write = function(output) {
  output.writeStructBegin('FileDialogFilter');
  if (this.displayName !== null && this.displayName !== undefined) {
    output.writeFieldBegin('displayName', Thrift.Type.STRING, 1);
    output.writeString(this.displayName);
    output.writeFieldEnd();
  }
  if (this.filtering !== null && this.filtering !== undefined) {
    output.writeFieldBegin('filtering', Thrift.Type.LIST, 2);
    output.writeListBegin(Thrift.Type.STRING, this.filtering.length);
    for (var iter4 in this.filtering) {
      if (this.filtering.hasOwnProperty(iter4)) {
        iter4 = this.filtering[iter4];
        output.writeString(iter4);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var GenericDialogResults = module.exports.GenericDialogResults = function(args) {
  this.type = null;
  this.items = null;
  if (args) {
    if (args.type !== undefined && args.type !== null) {
      this.type = args.type;
    }
    if (args.items !== undefined && args.items !== null) {
      this.items = new shared_ttypes.PropertyTreeItem(args.items);
    }
  }
};
GenericDialogResults.prototype = {};
GenericDialogResults.prototype.read = function(input) {
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
        this.type = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.items = new shared_ttypes.PropertyTreeItem();
        this.items.read(input);
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

GenericDialogResults.prototype.write = function(output) {
  output.writeStructBegin('GenericDialogResults');
  if (this.type !== null && this.type !== undefined) {
    output.writeFieldBegin('type', Thrift.Type.I32, 1);
    output.writeI32(this.type);
    output.writeFieldEnd();
  }
  if (this.items !== null && this.items !== undefined) {
    output.writeFieldBegin('items', Thrift.Type.STRUCT, 2);
    this.items.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ttypes.FRONTEND_SERVICE = 'frontend';