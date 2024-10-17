//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


var ttypes = module.exports = {};
ttypes.OptionErrorCode = {
  '0' : 'Unknown',
  'Unknown' : 0
};
ttypes.OptionType = {
  '0' : 'String',
  'String' : 0,
  '1' : 'Boolean',
  'Boolean' : 1,
  '2' : 'StringList',
  'StringList' : 2,
  '3' : 'Enumerated',
  'Enumerated' : 3,
  '4' : 'IncludePaths',
  'IncludePaths' : 4,
  '5' : 'PreprocessorSymbols',
  'PreprocessorSymbols' : 5
};
var OptionError = module.exports.OptionError = function(args) {
  this.errorCode = null;
  this.detailMessage = null;
  if (args) {
    if (args.errorCode !== undefined && args.errorCode !== null) {
      this.errorCode = args.errorCode;
    }
    if (args.detailMessage !== undefined && args.detailMessage !== null) {
      this.detailMessage = args.detailMessage;
    }
  }
};
Thrift.inherits(OptionError, Thrift.TException);
OptionError.prototype.name = 'OptionError';
OptionError.prototype.read = function(input) {
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
        this.errorCode = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.detailMessage = input.readString().value;
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

OptionError.prototype.write = function(output) {
  output.writeStructBegin('OptionError');
  if (this.errorCode !== null && this.errorCode !== undefined) {
    output.writeFieldBegin('errorCode', Thrift.Type.I32, 1);
    output.writeI32(this.errorCode);
    output.writeFieldEnd();
  }
  if (this.detailMessage !== null && this.detailMessage !== undefined) {
    output.writeFieldBegin('detailMessage', Thrift.Type.STRING, 2);
    output.writeString(this.detailMessage);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var OptionDefinition = module.exports.OptionDefinition = function(args) {
  this.id = null;
  this.name = null;
  this.type = null;
  this.enumeratedOptionTypeId = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.type !== undefined && args.type !== null) {
      this.type = args.type;
    }
    if (args.enumeratedOptionTypeId !== undefined && args.enumeratedOptionTypeId !== null) {
      this.enumeratedOptionTypeId = args.enumeratedOptionTypeId;
    }
  }
};
OptionDefinition.prototype = {};
OptionDefinition.prototype.read = function(input) {
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
        this.id = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I32) {
        this.type = input.readI32().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.enumeratedOptionTypeId = input.readString().value;
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

OptionDefinition.prototype.write = function(output) {
  output.writeStructBegin('OptionDefinition');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 2);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.type !== null && this.type !== undefined) {
    output.writeFieldBegin('type', Thrift.Type.I32, 3);
    output.writeI32(this.type);
    output.writeFieldEnd();
  }
  if (this.enumeratedOptionTypeId !== null && this.enumeratedOptionTypeId !== undefined) {
    output.writeFieldBegin('enumeratedOptionTypeId', Thrift.Type.STRING, 4);
    output.writeString(this.enumeratedOptionTypeId);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var EnumeratedOptionValue = module.exports.EnumeratedOptionValue = function(args) {
  this.id = null;
  this.label = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.label !== undefined && args.label !== null) {
      this.label = args.label;
    }
  }
};
EnumeratedOptionValue.prototype = {};
EnumeratedOptionValue.prototype.read = function(input) {
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
        this.id = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.label = input.readString().value;
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

EnumeratedOptionValue.prototype.write = function(output) {
  output.writeStructBegin('EnumeratedOptionValue');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.label !== null && this.label !== undefined) {
    output.writeFieldBegin('label', Thrift.Type.STRING, 2);
    output.writeString(this.label);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var EnumeratedOptionType = module.exports.EnumeratedOptionType = function(args) {
  this.id = null;
  this.values = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.values !== undefined && args.values !== null) {
      this.values = Thrift.copyList(args.values, [ttypes.EnumeratedOptionValue]);
    }
  }
};
EnumeratedOptionType.prototype = {};
EnumeratedOptionType.prototype.read = function(input) {
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
        this.id = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.LIST) {
        this.values = [];
        var _rtmp31 = input.readListBegin();
        var _size0 = _rtmp31.size || 0;
        for (var _i2 = 0; _i2 < _size0; ++_i2) {
          var elem3 = null;
          elem3 = new ttypes.EnumeratedOptionValue();
          elem3.read(input);
          this.values.push(elem3);
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

EnumeratedOptionType.prototype.write = function(output) {
  output.writeStructBegin('EnumeratedOptionType');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.values !== null && this.values !== undefined) {
    output.writeFieldBegin('values', Thrift.Type.LIST, 2);
    output.writeListBegin(Thrift.Type.STRUCT, this.values.length);
    for (var iter4 in this.values) {
      if (this.values.hasOwnProperty(iter4)) {
        iter4 = this.values[iter4];
        iter4.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var OptionConfiguration = module.exports.OptionConfiguration = function(args) {
  this.id = null;
  this.name = null;
  this.optionValues = null;
  this.parentConfigurationIds = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.optionValues !== undefined && args.optionValues !== null) {
      this.optionValues = Thrift.copyMap(args.optionValues, [null]);
    }
    if (args.parentConfigurationIds !== undefined && args.parentConfigurationIds !== null) {
      this.parentConfigurationIds = Thrift.copyList(args.parentConfigurationIds, [null]);
    }
  }
};
OptionConfiguration.prototype = {};
OptionConfiguration.prototype.read = function(input) {
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
        this.id = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.MAP) {
        this.optionValues = {};
        var _rtmp36 = input.readMapBegin();
        var _size5 = _rtmp36.size || 0;
        for (var _i7 = 0; _i7 < _size5; ++_i7) {
          if (_i7 > 0 ) {
            if (input.rstack.length > input.rpos[input.rpos.length -1] + 1) {
              input.rstack.pop();
            }
          }
          var key8 = null;
          var val9 = null;
          key8 = input.readString().value;
          val9 = input.readString().value;
          this.optionValues[key8] = val9;
        }
        input.readMapEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.LIST) {
        this.parentConfigurationIds = [];
        var _rtmp311 = input.readListBegin();
        var _size10 = _rtmp311.size || 0;
        for (var _i12 = 0; _i12 < _size10; ++_i12) {
          var elem13 = null;
          elem13 = input.readString().value;
          this.parentConfigurationIds.push(elem13);
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

OptionConfiguration.prototype.write = function(output) {
  output.writeStructBegin('OptionConfiguration');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 2);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.optionValues !== null && this.optionValues !== undefined) {
    output.writeFieldBegin('optionValues', Thrift.Type.MAP, 3);
    output.writeMapBegin(Thrift.Type.STRING, Thrift.Type.STRING, Thrift.objectLength(this.optionValues));
    for (var kiter14 in this.optionValues) {
      if (this.optionValues.hasOwnProperty(kiter14)) {
        var viter15 = this.optionValues[kiter14];
        output.writeString(kiter14);
        output.writeString(viter15);
      }
    }
    output.writeMapEnd();
    output.writeFieldEnd();
  }
  if (this.parentConfigurationIds !== null && this.parentConfigurationIds !== undefined) {
    output.writeFieldBegin('parentConfigurationIds', Thrift.Type.LIST, 4);
    output.writeListBegin(Thrift.Type.STRING, this.parentConfigurationIds.length);
    for (var iter16 in this.parentConfigurationIds) {
      if (this.parentConfigurationIds.hasOwnProperty(iter16)) {
        iter16 = this.parentConfigurationIds[iter16];
        output.writeString(iter16);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var OptionPresentation = module.exports.OptionPresentation = function(args) {
  this.optionId = null;
  this.enabledCondition = null;
  this.enumeratedOptionFilter = null;
  if (args) {
    if (args.optionId !== undefined && args.optionId !== null) {
      this.optionId = args.optionId;
    }
    if (args.enabledCondition !== undefined && args.enabledCondition !== null) {
      this.enabledCondition = args.enabledCondition;
    }
    if (args.enumeratedOptionFilter !== undefined && args.enumeratedOptionFilter !== null) {
      this.enumeratedOptionFilter = args.enumeratedOptionFilter;
    }
  }
};
OptionPresentation.prototype = {};
OptionPresentation.prototype.read = function(input) {
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
        this.optionId = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.enabledCondition = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.enumeratedOptionFilter = input.readString().value;
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

OptionPresentation.prototype.write = function(output) {
  output.writeStructBegin('OptionPresentation');
  if (this.optionId !== null && this.optionId !== undefined) {
    output.writeFieldBegin('optionId', Thrift.Type.STRING, 1);
    output.writeString(this.optionId);
    output.writeFieldEnd();
  }
  if (this.enabledCondition !== null && this.enabledCondition !== undefined) {
    output.writeFieldBegin('enabledCondition', Thrift.Type.STRING, 2);
    output.writeString(this.enabledCondition);
    output.writeFieldEnd();
  }
  if (this.enumeratedOptionFilter !== null && this.enumeratedOptionFilter !== undefined) {
    output.writeFieldBegin('enumeratedOptionFilter', Thrift.Type.STRING, 3);
    output.writeString(this.enumeratedOptionFilter);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var OptionCategory = module.exports.OptionCategory = function(args) {
  this.name = null;
  this.optionIds = null;
  if (args) {
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.optionIds !== undefined && args.optionIds !== null) {
      this.optionIds = Thrift.copyList(args.optionIds, [ttypes.OptionPresentation]);
    }
  }
};
OptionCategory.prototype = {};
OptionCategory.prototype.read = function(input) {
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
        this.name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.LIST) {
        this.optionIds = [];
        var _rtmp318 = input.readListBegin();
        var _size17 = _rtmp318.size || 0;
        for (var _i19 = 0; _i19 < _size17; ++_i19) {
          var elem20 = null;
          elem20 = new ttypes.OptionPresentation();
          elem20.read(input);
          this.optionIds.push(elem20);
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

OptionCategory.prototype.write = function(output) {
  output.writeStructBegin('OptionCategory');
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.optionIds !== null && this.optionIds !== undefined) {
    output.writeFieldBegin('optionIds', Thrift.Type.LIST, 2);
    output.writeListBegin(Thrift.Type.STRUCT, this.optionIds.length);
    for (var iter21 in this.optionIds) {
      if (this.optionIds.hasOwnProperty(iter21)) {
        iter21 = this.optionIds[iter21];
        iter21.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ConfigurationPresentation = module.exports.ConfigurationPresentation = function(args) {
  this.id = null;
  this.configurationId = null;
  this.categories = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.configurationId !== undefined && args.configurationId !== null) {
      this.configurationId = args.configurationId;
    }
    if (args.categories !== undefined && args.categories !== null) {
      this.categories = Thrift.copyList(args.categories, [ttypes.OptionCategory]);
    }
  }
};
ConfigurationPresentation.prototype = {};
ConfigurationPresentation.prototype.read = function(input) {
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
        this.id = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.configurationId = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.LIST) {
        this.categories = [];
        var _rtmp323 = input.readListBegin();
        var _size22 = _rtmp323.size || 0;
        for (var _i24 = 0; _i24 < _size22; ++_i24) {
          var elem25 = null;
          elem25 = new ttypes.OptionCategory();
          elem25.read(input);
          this.categories.push(elem25);
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

ConfigurationPresentation.prototype.write = function(output) {
  output.writeStructBegin('ConfigurationPresentation');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.configurationId !== null && this.configurationId !== undefined) {
    output.writeFieldBegin('configurationId', Thrift.Type.STRING, 2);
    output.writeString(this.configurationId);
    output.writeFieldEnd();
  }
  if (this.categories !== null && this.categories !== undefined) {
    output.writeFieldBegin('categories', Thrift.Type.LIST, 3);
    output.writeListBegin(Thrift.Type.STRUCT, this.categories.length);
    for (var iter26 in this.categories) {
      if (this.categories.hasOwnProperty(iter26)) {
        iter26 = this.categories[iter26];
        iter26.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var ToolDefinition = module.exports.ToolDefinition = function(args) {
  this.id = null;
  this.name = null;
  this.executableName = null;
  this.inputExtensions = null;
  this.outputExtensions = null;
  this.isTargetTool = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.executableName !== undefined && args.executableName !== null) {
      this.executableName = args.executableName;
    }
    if (args.inputExtensions !== undefined && args.inputExtensions !== null) {
      this.inputExtensions = Thrift.copyList(args.inputExtensions, [null]);
    }
    if (args.outputExtensions !== undefined && args.outputExtensions !== null) {
      this.outputExtensions = Thrift.copyList(args.outputExtensions, [null]);
    }
    if (args.isTargetTool !== undefined && args.isTargetTool !== null) {
      this.isTargetTool = args.isTargetTool;
    }
  }
};
ToolDefinition.prototype = {};
ToolDefinition.prototype.read = function(input) {
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
        this.id = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.executableName = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.LIST) {
        this.inputExtensions = [];
        var _rtmp328 = input.readListBegin();
        var _size27 = _rtmp328.size || 0;
        for (var _i29 = 0; _i29 < _size27; ++_i29) {
          var elem30 = null;
          elem30 = input.readString().value;
          this.inputExtensions.push(elem30);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.LIST) {
        this.outputExtensions = [];
        var _rtmp332 = input.readListBegin();
        var _size31 = _rtmp332.size || 0;
        for (var _i33 = 0; _i33 < _size31; ++_i33) {
          var elem34 = null;
          elem34 = input.readString().value;
          this.outputExtensions.push(elem34);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.BOOL) {
        this.isTargetTool = input.readBool().value;
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

ToolDefinition.prototype.write = function(output) {
  output.writeStructBegin('ToolDefinition');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 2);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.executableName !== null && this.executableName !== undefined) {
    output.writeFieldBegin('executableName', Thrift.Type.STRING, 3);
    output.writeString(this.executableName);
    output.writeFieldEnd();
  }
  if (this.inputExtensions !== null && this.inputExtensions !== undefined) {
    output.writeFieldBegin('inputExtensions', Thrift.Type.LIST, 4);
    output.writeListBegin(Thrift.Type.STRING, this.inputExtensions.length);
    for (var iter35 in this.inputExtensions) {
      if (this.inputExtensions.hasOwnProperty(iter35)) {
        iter35 = this.inputExtensions[iter35];
        output.writeString(iter35);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.outputExtensions !== null && this.outputExtensions !== undefined) {
    output.writeFieldBegin('outputExtensions', Thrift.Type.LIST, 5);
    output.writeListBegin(Thrift.Type.STRING, this.outputExtensions.length);
    for (var iter36 in this.outputExtensions) {
      if (this.outputExtensions.hasOwnProperty(iter36)) {
        iter36 = this.outputExtensions[iter36];
        output.writeString(iter36);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.isTargetTool !== null && this.isTargetTool !== undefined) {
    output.writeFieldBegin('isTargetTool', Thrift.Type.BOOL, 6);
    output.writeBool(this.isTargetTool);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var Toolchain = module.exports.Toolchain = function(args) {
  this.id = null;
  this.name = null;
  this.rootConfigurations = null;
  this.tools = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.rootConfigurations !== undefined && args.rootConfigurations !== null) {
      this.rootConfigurations = Thrift.copyList(args.rootConfigurations, [ttypes.OptionConfiguration]);
    }
    if (args.tools !== undefined && args.tools !== null) {
      this.tools = Thrift.copyList(args.tools, [ttypes.ToolDefinition]);
    }
  }
};
Toolchain.prototype = {};
Toolchain.prototype.read = function(input) {
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
        this.id = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.name = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.LIST) {
        this.rootConfigurations = [];
        var _rtmp338 = input.readListBegin();
        var _size37 = _rtmp338.size || 0;
        for (var _i39 = 0; _i39 < _size37; ++_i39) {
          var elem40 = null;
          elem40 = new ttypes.OptionConfiguration();
          elem40.read(input);
          this.rootConfigurations.push(elem40);
        }
        input.readListEnd();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.LIST) {
        this.tools = [];
        var _rtmp342 = input.readListBegin();
        var _size41 = _rtmp342.size || 0;
        for (var _i43 = 0; _i43 < _size41; ++_i43) {
          var elem44 = null;
          elem44 = new ttypes.ToolDefinition();
          elem44.read(input);
          this.tools.push(elem44);
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

Toolchain.prototype.write = function(output) {
  output.writeStructBegin('Toolchain');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 2);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.rootConfigurations !== null && this.rootConfigurations !== undefined) {
    output.writeFieldBegin('rootConfigurations', Thrift.Type.LIST, 3);
    output.writeListBegin(Thrift.Type.STRUCT, this.rootConfigurations.length);
    for (var iter45 in this.rootConfigurations) {
      if (this.rootConfigurations.hasOwnProperty(iter45)) {
        iter45 = this.rootConfigurations[iter45];
        iter45.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  if (this.tools !== null && this.tools !== undefined) {
    output.writeFieldBegin('tools', Thrift.Type.LIST, 4);
    output.writeListBegin(Thrift.Type.STRUCT, this.tools.length);
    for (var iter46 in this.tools) {
      if (this.tools.hasOwnProperty(iter46)) {
        iter46 = this.tools[iter46];
        iter46.write(output);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var VerifierError = module.exports.VerifierError = function(args) {
  this.optionId = null;
  this.configurationId = null;
  this.errorMessage = null;
  if (args) {
    if (args.optionId !== undefined && args.optionId !== null) {
      this.optionId = args.optionId;
    }
    if (args.configurationId !== undefined && args.configurationId !== null) {
      this.configurationId = args.configurationId;
    }
    if (args.errorMessage !== undefined && args.errorMessage !== null) {
      this.errorMessage = args.errorMessage;
    }
  }
};
VerifierError.prototype = {};
VerifierError.prototype.read = function(input) {
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
        this.optionId = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.configurationId = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.STRING) {
        this.errorMessage = input.readString().value;
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

VerifierError.prototype.write = function(output) {
  output.writeStructBegin('VerifierError');
  if (this.optionId !== null && this.optionId !== undefined) {
    output.writeFieldBegin('optionId', Thrift.Type.STRING, 1);
    output.writeString(this.optionId);
    output.writeFieldEnd();
  }
  if (this.configurationId !== null && this.configurationId !== undefined) {
    output.writeFieldBegin('configurationId', Thrift.Type.STRING, 2);
    output.writeString(this.configurationId);
    output.writeFieldEnd();
  }
  if (this.errorMessage !== null && this.errorMessage !== undefined) {
    output.writeFieldBegin('errorMessage', Thrift.Type.STRING, 3);
    output.writeString(this.errorMessage);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ttypes.OPTION_SERVICE_NAME = 'com.iar.optionmanager.service';
