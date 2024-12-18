//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var CSpyServiceManager_startService_args = function(args) {
  this.serviceConfig = null;
  if (args) {
    if (args.serviceConfig !== undefined && args.serviceConfig !== null) {
      this.serviceConfig = new ttypes.ServiceConfig(args.serviceConfig);
    }
  }
};
CSpyServiceManager_startService_args.prototype = {};
CSpyServiceManager_startService_args.prototype.read = function(input) {
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
        this.serviceConfig = new ttypes.ServiceConfig();
        this.serviceConfig.read(input);
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

CSpyServiceManager_startService_args.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_startService_args');
  if (this.serviceConfig !== null && this.serviceConfig !== undefined) {
    output.writeFieldBegin('serviceConfig', Thrift.Type.STRUCT, 1);
    this.serviceConfig.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_startService_result = function(args) {
  this.e = null;
  if (args instanceof ServiceRegistry_ttypes.ServiceException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
CSpyServiceManager_startService_result.prototype = {};
CSpyServiceManager_startService_result.prototype.read = function(input) {
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
        this.e = new ServiceRegistry_ttypes.ServiceException();
        this.e.read(input);
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

CSpyServiceManager_startService_result.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_startService_result');
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_stopService_args = function(args) {
  this.serviceConfig = null;
  if (args) {
    if (args.serviceConfig !== undefined && args.serviceConfig !== null) {
      this.serviceConfig = new ttypes.ServiceConfig(args.serviceConfig);
    }
  }
};
CSpyServiceManager_stopService_args.prototype = {};
CSpyServiceManager_stopService_args.prototype.read = function(input) {
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
        this.serviceConfig = new ttypes.ServiceConfig();
        this.serviceConfig.read(input);
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

CSpyServiceManager_stopService_args.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_stopService_args');
  if (this.serviceConfig !== null && this.serviceConfig !== undefined) {
    output.writeFieldBegin('serviceConfig', Thrift.Type.STRUCT, 1);
    this.serviceConfig.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_stopService_result = function(args) {
  this.e = null;
  if (args instanceof ServiceRegistry_ttypes.ServiceException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
CSpyServiceManager_stopService_result.prototype = {};
CSpyServiceManager_stopService_result.prototype.read = function(input) {
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
        this.e = new ServiceRegistry_ttypes.ServiceException();
        this.e.read(input);
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

CSpyServiceManager_stopService_result.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_stopService_result');
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_startServicesFromJsonManifest_args = function(args) {
  this.jsonFilePath = null;
  if (args) {
    if (args.jsonFilePath !== undefined && args.jsonFilePath !== null) {
      this.jsonFilePath = args.jsonFilePath;
    }
  }
};
CSpyServiceManager_startServicesFromJsonManifest_args.prototype = {};
CSpyServiceManager_startServicesFromJsonManifest_args.prototype.read = function(input) {
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
        this.jsonFilePath = input.readString().value;
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

CSpyServiceManager_startServicesFromJsonManifest_args.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_startServicesFromJsonManifest_args');
  if (this.jsonFilePath !== null && this.jsonFilePath !== undefined) {
    output.writeFieldBegin('jsonFilePath', Thrift.Type.STRING, 1);
    output.writeString(this.jsonFilePath);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_startServicesFromJsonManifest_result = function(args) {
  this.e = null;
  if (args instanceof ServiceRegistry_ttypes.ServiceException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
CSpyServiceManager_startServicesFromJsonManifest_result.prototype = {};
CSpyServiceManager_startServicesFromJsonManifest_result.prototype.read = function(input) {
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
        this.e = new ServiceRegistry_ttypes.ServiceException();
        this.e.read(input);
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

CSpyServiceManager_startServicesFromJsonManifest_result.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_startServicesFromJsonManifest_result');
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_stopServicesFromJsonManifest_args = function(args) {
  this.jsonFilePath = null;
  if (args) {
    if (args.jsonFilePath !== undefined && args.jsonFilePath !== null) {
      this.jsonFilePath = args.jsonFilePath;
    }
  }
};
CSpyServiceManager_stopServicesFromJsonManifest_args.prototype = {};
CSpyServiceManager_stopServicesFromJsonManifest_args.prototype.read = function(input) {
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
        this.jsonFilePath = input.readString().value;
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

CSpyServiceManager_stopServicesFromJsonManifest_args.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_stopServicesFromJsonManifest_args');
  if (this.jsonFilePath !== null && this.jsonFilePath !== undefined) {
    output.writeFieldBegin('jsonFilePath', Thrift.Type.STRING, 1);
    output.writeString(this.jsonFilePath);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_stopServicesFromJsonManifest_result = function(args) {
  this.e = null;
  if (args instanceof ServiceRegistry_ttypes.ServiceException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
CSpyServiceManager_stopServicesFromJsonManifest_result.prototype = {};
CSpyServiceManager_stopServicesFromJsonManifest_result.prototype.read = function(input) {
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
        this.e = new ServiceRegistry_ttypes.ServiceException();
        this.e.read(input);
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

CSpyServiceManager_stopServicesFromJsonManifest_result.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_stopServicesFromJsonManifest_result');
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_shutdown_args = function(args) {
};
CSpyServiceManager_shutdown_args.prototype = {};
CSpyServiceManager_shutdown_args.prototype.read = function(input) {
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

CSpyServiceManager_shutdown_args.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_shutdown_args');
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManager_shutdown_result = function(args) {
  this.e = null;
  if (args instanceof ServiceRegistry_ttypes.ServiceException) {
    this.e = args;
    return;
  }
  if (args) {
    if (args.e !== undefined && args.e !== null) {
      this.e = args.e;
    }
  }
};
CSpyServiceManager_shutdown_result.prototype = {};
CSpyServiceManager_shutdown_result.prototype.read = function(input) {
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
        this.e = new ServiceRegistry_ttypes.ServiceException();
        this.e.read(input);
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

CSpyServiceManager_shutdown_result.prototype.write = function(output) {
  output.writeStructBegin('CSpyServiceManager_shutdown_result');
  if (this.e !== null && this.e !== undefined) {
    output.writeFieldBegin('e', Thrift.Type.STRUCT, 1);
    this.e.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var CSpyServiceManagerClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
CSpyServiceManagerClient.prototype = {};

CSpyServiceManagerClient.prototype.startService = function(serviceConfig, callback) {
  this.send_startService(serviceConfig, callback); 
  if (!callback) {
  this.recv_startService();
  }
};

CSpyServiceManagerClient.prototype.send_startService = function(serviceConfig, callback) {
  var params = {
    serviceConfig: serviceConfig
  };
  var args = new CSpyServiceManager_startService_args(params);
  try {
    this.output.writeMessageBegin('startService', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_startService();
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

CSpyServiceManagerClient.prototype.recv_startService = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CSpyServiceManager_startService_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.e) {
    throw result.e;
  }
  return;
};

CSpyServiceManagerClient.prototype.stopService = function(serviceConfig, callback) {
  this.send_stopService(serviceConfig, callback); 
  if (!callback) {
  this.recv_stopService();
  }
};

CSpyServiceManagerClient.prototype.send_stopService = function(serviceConfig, callback) {
  var params = {
    serviceConfig: serviceConfig
  };
  var args = new CSpyServiceManager_stopService_args(params);
  try {
    this.output.writeMessageBegin('stopService', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_stopService();
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

CSpyServiceManagerClient.prototype.recv_stopService = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CSpyServiceManager_stopService_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.e) {
    throw result.e;
  }
  return;
};

CSpyServiceManagerClient.prototype.startServicesFromJsonManifest = function(jsonFilePath, callback) {
  this.send_startServicesFromJsonManifest(jsonFilePath, callback); 
  if (!callback) {
  this.recv_startServicesFromJsonManifest();
  }
};

CSpyServiceManagerClient.prototype.send_startServicesFromJsonManifest = function(jsonFilePath, callback) {
  var params = {
    jsonFilePath: jsonFilePath
  };
  var args = new CSpyServiceManager_startServicesFromJsonManifest_args(params);
  try {
    this.output.writeMessageBegin('startServicesFromJsonManifest', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_startServicesFromJsonManifest();
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

CSpyServiceManagerClient.prototype.recv_startServicesFromJsonManifest = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CSpyServiceManager_startServicesFromJsonManifest_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.e) {
    throw result.e;
  }
  return;
};

CSpyServiceManagerClient.prototype.stopServicesFromJsonManifest = function(jsonFilePath, callback) {
  this.send_stopServicesFromJsonManifest(jsonFilePath, callback); 
  if (!callback) {
  this.recv_stopServicesFromJsonManifest();
  }
};

CSpyServiceManagerClient.prototype.send_stopServicesFromJsonManifest = function(jsonFilePath, callback) {
  var params = {
    jsonFilePath: jsonFilePath
  };
  var args = new CSpyServiceManager_stopServicesFromJsonManifest_args(params);
  try {
    this.output.writeMessageBegin('stopServicesFromJsonManifest', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_stopServicesFromJsonManifest();
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

CSpyServiceManagerClient.prototype.recv_stopServicesFromJsonManifest = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CSpyServiceManager_stopServicesFromJsonManifest_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.e) {
    throw result.e;
  }
  return;
};

CSpyServiceManagerClient.prototype.shutdown = function(callback) {
  this.send_shutdown(callback); 
  if (!callback) {
  this.recv_shutdown();
  }
};

CSpyServiceManagerClient.prototype.send_shutdown = function(callback) {
  var args = new CSpyServiceManager_shutdown_args();
  try {
    this.output.writeMessageBegin('shutdown', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_shutdown();
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

CSpyServiceManagerClient.prototype.recv_shutdown = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new CSpyServiceManager_shutdown_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.e) {
    throw result.e;
  }
  return;
};
