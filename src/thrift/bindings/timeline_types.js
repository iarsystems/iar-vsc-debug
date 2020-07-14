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


var ttypes = module.exports = {};
var DbuTimelineDataAvailableNotification = module.exports.DbuTimelineDataAvailableNotification = function(args) {
  this.channelId = null;
  this.startCycles = null;
  this.endCycles = null;
  this.dummy = null;
  if (args) {
    if (args.channelId !== undefined && args.channelId !== null) {
      this.channelId = args.channelId;
    }
    if (args.startCycles !== undefined && args.startCycles !== null) {
      this.startCycles = args.startCycles;
    }
    if (args.endCycles !== undefined && args.endCycles !== null) {
      this.endCycles = args.endCycles;
    }
    if (args.dummy !== undefined && args.dummy !== null) {
      this.dummy = args.dummy;
    }
  }
};
DbuTimelineDataAvailableNotification.prototype = {};
DbuTimelineDataAvailableNotification.prototype.read = function(input) {
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
        this.channelId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.I64) {
        this.startCycles = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 3:
      if (ftype == Thrift.Type.I64) {
        this.endCycles = input.readI64();
      } else {
        input.skip(ftype);
      }
      break;
      case 4:
      if (ftype == Thrift.Type.BOOL) {
        this.dummy = input.readBool();
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

DbuTimelineDataAvailableNotification.prototype.write = function(output) {
  output.writeStructBegin('DbuTimelineDataAvailableNotification');
  if (this.channelId !== null && this.channelId !== undefined) {
    output.writeFieldBegin('channelId', Thrift.Type.STRING, 1);
    output.writeString(this.channelId);
    output.writeFieldEnd();
  }
  if (this.startCycles !== null && this.startCycles !== undefined) {
    output.writeFieldBegin('startCycles', Thrift.Type.I64, 2);
    output.writeI64(this.startCycles);
    output.writeFieldEnd();
  }
  if (this.endCycles !== null && this.endCycles !== undefined) {
    output.writeFieldBegin('endCycles', Thrift.Type.I64, 3);
    output.writeI64(this.endCycles);
    output.writeFieldEnd();
  }
  if (this.dummy !== null && this.dummy !== undefined) {
    output.writeFieldBegin('dummy', Thrift.Type.BOOL, 4);
    output.writeBool(this.dummy);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DbuTimelineChannelAvailableNotification = module.exports.DbuTimelineChannelAvailableNotification = function(args) {
  this.id = null;
  this.formatDescriptor = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.formatDescriptor !== undefined && args.formatDescriptor !== null) {
      this.formatDescriptor = args.formatDescriptor;
    }
  }
};
DbuTimelineChannelAvailableNotification.prototype = {};
DbuTimelineChannelAvailableNotification.prototype.read = function(input) {
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
        this.id = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.formatDescriptor = input.readString();
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

DbuTimelineChannelAvailableNotification.prototype.write = function(output) {
  output.writeStructBegin('DbuTimelineChannelAvailableNotification');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.formatDescriptor !== null && this.formatDescriptor !== undefined) {
    output.writeFieldBegin('formatDescriptor', Thrift.Type.STRING, 2);
    output.writeString(this.formatDescriptor);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DbuTimelineChannelRemovedNotification = module.exports.DbuTimelineChannelRemovedNotification = function(args) {
  this.id = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
  }
};
DbuTimelineChannelRemovedNotification.prototype = {};
DbuTimelineChannelRemovedNotification.prototype.read = function(input) {
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
        this.id = input.readString();
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

DbuTimelineChannelRemovedNotification.prototype.write = function(output) {
  output.writeStructBegin('DbuTimelineChannelRemovedNotification');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DbuTimelineCpuClockChangedNotification = module.exports.DbuTimelineCpuClockChangedNotification = function(args) {
  this.cyclesPerSecond = null;
  if (args) {
    if (args.cyclesPerSecond !== undefined && args.cyclesPerSecond !== null) {
      this.cyclesPerSecond = args.cyclesPerSecond;
    }
  }
};
DbuTimelineCpuClockChangedNotification.prototype = {};
DbuTimelineCpuClockChangedNotification.prototype.read = function(input) {
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
      if (ftype == Thrift.Type.I64) {
        this.cyclesPerSecond = input.readI64();
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

DbuTimelineCpuClockChangedNotification.prototype.write = function(output) {
  output.writeStructBegin('DbuTimelineCpuClockChangedNotification');
  if (this.cyclesPerSecond !== null && this.cyclesPerSecond !== undefined) {
    output.writeFieldBegin('cyclesPerSecond', Thrift.Type.I64, 1);
    output.writeI64(this.cyclesPerSecond);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var DbuTimelineEnablementChangedNotification = module.exports.DbuTimelineEnablementChangedNotification = function(args) {
  this.channelId = null;
  this.enabled = null;
  if (args) {
    if (args.channelId !== undefined && args.channelId !== null) {
      this.channelId = args.channelId;
    }
    if (args.enabled !== undefined && args.enabled !== null) {
      this.enabled = args.enabled;
    }
  }
};
DbuTimelineEnablementChangedNotification.prototype = {};
DbuTimelineEnablementChangedNotification.prototype.read = function(input) {
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
        this.channelId = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.BOOL) {
        this.enabled = input.readBool();
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

DbuTimelineEnablementChangedNotification.prototype.write = function(output) {
  output.writeStructBegin('DbuTimelineEnablementChangedNotification');
  if (this.channelId !== null && this.channelId !== undefined) {
    output.writeFieldBegin('channelId', Thrift.Type.STRING, 1);
    output.writeString(this.channelId);
    output.writeFieldEnd();
  }
  if (this.enabled !== null && this.enabled !== undefined) {
    output.writeFieldBegin('enabled', Thrift.Type.BOOL, 2);
    output.writeBool(this.enabled);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

var TimelineChannelInfo = module.exports.TimelineChannelInfo = function(args) {
  this.id = null;
  this.formatDescriptor = null;
  if (args) {
    if (args.id !== undefined && args.id !== null) {
      this.id = args.id;
    }
    if (args.formatDescriptor !== undefined && args.formatDescriptor !== null) {
      this.formatDescriptor = args.formatDescriptor;
    }
  }
};
TimelineChannelInfo.prototype = {};
TimelineChannelInfo.prototype.read = function(input) {
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
        this.id = input.readString();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.formatDescriptor = input.readString();
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

TimelineChannelInfo.prototype.write = function(output) {
  output.writeStructBegin('TimelineChannelInfo');
  if (this.id !== null && this.id !== undefined) {
    output.writeFieldBegin('id', Thrift.Type.STRING, 1);
    output.writeString(this.id);
    output.writeFieldEnd();
  }
  if (this.formatDescriptor !== null && this.formatDescriptor !== undefined) {
    output.writeFieldBegin('formatDescriptor', Thrift.Type.STRING, 2);
    output.writeString(this.formatDescriptor);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

ttypes.TIMELINE_FRONTEND_SERVICE = 'timeline.frontend';
ttypes.TIMELINE_BACKEND_SERVICE = 'timeline.backend';
