//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


var ttypes = module.exports = {};
var ServiceConfig = module.exports.ServiceConfig = function(args) {
  this.name = null;
  this.libraryName = null;
  this.spawnNewProcess = null;
  this.startupEntryPoint = null;
  this.shutdownEntryPoint = null;
  this.registerInLauncher = null;
  if (args) {
    if (args.name !== undefined && args.name !== null) {
      this.name = args.name;
    }
    if (args.libraryName !== undefined && args.libraryName !== null) {
      this.libraryName = args.libraryName;
    }
    if (args.spawnNewProcess !== undefined && args.spawnNewProcess !== null) {
      this.spawnNewProcess = args.spawnNewProcess;
    }
    if (args.startupEntryPoint !== undefined && args.startupEntryPoint !== null) {
      this.startupEntryPoint = args.startupEntryPoint;
    }
    if (args.shutdownEntryPoint !== undefined && args.shutdownEntryPoint !== null) {
      this.shutdownEntryPoint = args.shutdownEntryPoint;
    }
    if (args.registerInLauncher !== undefined && args.registerInLauncher !== null) {
      this.registerInLauncher = args.registerInLauncher;
    }
  }
};
ServiceConfig.prototype = {};
ServiceConfig.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.STRING) {
        this.libraryName = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.BOOL) {
        this.spawnNewProcess = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.STRING) {
        this.startupEntryPoint = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 5:
      if (ftype == Thrift.Type.STRING) {
        this.shutdownEntryPoint = input.readString().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 6:
      if (ftype == Thrift.Type.BOOL) {
        this.registerInLauncher = input.readBool().value;
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

ServiceConfig.prototype.write = function(output) {
  output.writeStructBegin('ServiceConfig');
  if (this.name !== null && this.name !== undefined) {
    output.writeFieldBegin('name', Thrift.Type.STRING, 1);
    output.writeString(this.name);
    output.writeFieldEnd();
  }
  if (this.libraryName !== null && this.libraryName !== undefined) {
    output.writeFieldBegin('libraryName', Thrift.Type.STRING, 2);
    output.writeString(this.libraryName);
    output.writeFieldEnd();
  }
  if (this.spawnNewProcess !== null && this.spawnNewProcess !== undefined) {
    output.writeFieldBegin('spawnNewProcess', Thrift.Type.BOOL, 3);
    output.writeBool(this.spawnNewProcess);
    output.writeFieldEnd();
  }
  if (this.startupEntryPoint !== null && this.startupEntryPoint !== undefined) {
    output.writeFieldBegin('startupEntryPoint', Thrift.Type.STRING, 4);
    output.writeString(this.startupEntryPoint);
    output.writeFieldEnd();
  }
  if (this.shutdownEntryPoint !== null && this.shutdownEntryPoint !== undefined) {
    output.writeFieldBegin('shutdownEntryPoint', Thrift.Type.STRING, 5);
    output.writeString(this.shutdownEntryPoint);
    output.writeFieldEnd();
  }
  if (this.registerInLauncher !== null && this.registerInLauncher !== undefined) {
    output.writeFieldBegin('registerInLauncher', Thrift.Type.BOOL, 6);
    output.writeBool(this.registerInLauncher);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var LauncherConfig = module.exports.LauncherConfig = function(args) {
  this.useInternalRegistry = null;
  this.externalRegistryLocation = null;
  this.preferredTransports = null;
  if (args) {
    if (args.useInternalRegistry !== undefined && args.useInternalRegistry !== null) {
      this.useInternalRegistry = args.useInternalRegistry;
    }
    if (args.externalRegistryLocation !== undefined && args.externalRegistryLocation !== null) {
      this.externalRegistryLocation = new ServiceRegistry_ttypes.ServiceLocation(args.externalRegistryLocation);
    }
    if (args.preferredTransports !== undefined && args.preferredTransports !== null) {
      this.preferredTransports = Thrift.copyList(args.preferredTransports, [null]);
    }
  }
};
LauncherConfig.prototype = {};
LauncherConfig.prototype.read = function(input) {
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
        this.useInternalRegistry = input.readBool().value;
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRUCT) {
        this.externalRegistryLocation = new ServiceRegistry_ttypes.ServiceLocation();
        this.externalRegistryLocation.read(input);
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.LIST) {
        this.preferredTransports = [];
        var _rtmp31 = input.readListBegin();
        var _size0 = _rtmp31.size || 0;
        for (var _i2 = 0; _i2 < _size0; ++_i2) {
          var elem3 = null;
          elem3 = input.readI32().value;
          this.preferredTransports.push(elem3);
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

LauncherConfig.prototype.write = function(output) {
  output.writeStructBegin('LauncherConfig');
  if (this.useInternalRegistry !== null && this.useInternalRegistry !== undefined) {
    output.writeFieldBegin('useInternalRegistry', Thrift.Type.BOOL, 1);
    output.writeBool(this.useInternalRegistry);
    output.writeFieldEnd();
  }
  if (this.externalRegistryLocation !== null && this.externalRegistryLocation !== undefined) {
    output.writeFieldBegin('externalRegistryLocation', Thrift.Type.STRUCT, 2);
    this.externalRegistryLocation.write(output);
    output.writeFieldEnd();
  }
  if (this.preferredTransports !== null && this.preferredTransports !== undefined) {
    output.writeFieldBegin('preferredTransports', Thrift.Type.LIST, 3);
    output.writeListBegin(Thrift.Type.I32, this.preferredTransports.length);
    for (var iter4 in this.preferredTransports) {
      if (this.preferredTransports.hasOwnProperty(iter4)) {
        iter4 = this.preferredTransports[iter4];
        output.writeI32(iter4);
      }
    }
    output.writeListEnd();
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ttypes.SERVICE_MANAGER_SERVICE = 'com.iar.thrift.service.manager';