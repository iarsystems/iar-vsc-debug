//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
if (typeof Int64 === 'undefined' && typeof require === 'function') {
  var Int64 = require('node-int64');
}


//HELPER FUNCTIONS AND STRUCTURES

var DialogService_SetValue_args = function(args) {
  this.itemId = null;
  this.items = null;
  if (args) {
    if (args.itemId !== undefined && args.itemId !== null) {
      this.itemId = args.itemId;
    }
    if (args.items !== undefined && args.items !== null) {
      this.items = new shared_ttypes.PropertyTreeItem(args.items);
    }
  }
};
DialogService_SetValue_args.prototype = {};
DialogService_SetValue_args.prototype.read = function(input) {
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
        this.itemId = input.readString().value;
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

DialogService_SetValue_args.prototype.write = function(output) {
  output.writeStructBegin('DialogService_SetValue_args');
  if (this.itemId !== null && this.itemId !== undefined) {
    output.writeFieldBegin('itemId', Thrift.Type.STRING, 1);
    output.writeString(this.itemId);
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

var DialogService_SetValue_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = args.success;
    }
  }
};
DialogService_SetValue_result.prototype = {};
DialogService_SetValue_result.prototype.read = function(input) {
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

DialogService_SetValue_result.prototype.write = function(output) {
  output.writeStructBegin('DialogService_SetValue_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.BOOL, 0);
    output.writeBool(this.success);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DialogService_GetState_args = function(args) {
  this.itemId = null;
  if (args) {
    if (args.itemId !== undefined && args.itemId !== null) {
      this.itemId = args.itemId;
    }
  }
};
DialogService_GetState_args.prototype = {};
DialogService_GetState_args.prototype.read = function(input) {
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
        this.itemId = input.readString().value;
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

DialogService_GetState_args.prototype.write = function(output) {
  output.writeStructBegin('DialogService_GetState_args');
  if (this.itemId !== null && this.itemId !== undefined) {
    output.writeFieldBegin('itemId', Thrift.Type.STRING, 1);
    output.writeString(this.itemId);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DialogService_GetState_result = function(args) {
  this.success = null;
  if (args) {
    if (args.success !== undefined && args.success !== null) {
      this.success = new listwindow_ttypes.ToolbarItemState(args.success);
    }
  }
};
DialogService_GetState_result.prototype = {};
DialogService_GetState_result.prototype.read = function(input) {
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
        this.success = new listwindow_ttypes.ToolbarItemState();
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

DialogService_GetState_result.prototype.write = function(output) {
  output.writeStructBegin('DialogService_GetState_result');
  if (this.success !== null && this.success !== undefined) {
    output.writeFieldBegin('success', Thrift.Type.STRUCT, 0);
    this.success.write(output);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DialogServiceClient = exports.Client = function(input, output) {
  this.input = input;
  this.output = (!output) ? input : output;
  this.seqid = 0;
};
Thrift.inherits(DialogServiceClient, HeartbeatServiceClient);

DialogServiceClient.prototype.SetValue = function(itemId, items, callback) {
  this.send_SetValue(itemId, items, callback); 
  if (!callback) {
    return this.recv_SetValue();
  }
};

DialogServiceClient.prototype.send_SetValue = function(itemId, items, callback) {
  var params = {
    itemId: itemId,
    items: items
  };
  var args = new DialogService_SetValue_args(params);
  try {
    this.output.writeMessageBegin('SetValue', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_SetValue();
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

DialogServiceClient.prototype.recv_SetValue = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new DialogService_SetValue_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'SetValue failed: unknown result';
};

DialogServiceClient.prototype.GetState = function(itemId, callback) {
  this.send_GetState(itemId, callback); 
  if (!callback) {
    return this.recv_GetState();
  }
};

DialogServiceClient.prototype.send_GetState = function(itemId, callback) {
  var params = {
    itemId: itemId
  };
  var args = new DialogService_GetState_args(params);
  try {
    this.output.writeMessageBegin('GetState', Thrift.MessageType.CALL, this.seqid);
    args.write(this.output);
    this.output.writeMessageEnd();
    if (callback) {
      var self = this;
      this.output.getTransport().flush(true, function() {
        var result = null;
        try {
          result = self.recv_GetState();
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

DialogServiceClient.prototype.recv_GetState = function() {
  var ret = this.input.readMessageBegin();
  var mtype = ret.mtype;
  if (mtype == Thrift.MessageType.EXCEPTION) {
    var x = new Thrift.TApplicationException();
    x.read(this.input);
    this.input.readMessageEnd();
    throw x;
  }
  var result = new DialogService_GetState_result();
  result.read(this.input);
  this.input.readMessageEnd();

  if (null !== result.success) {
    return result.success;
  }
  throw 'GetState failed: unknown result';
};
