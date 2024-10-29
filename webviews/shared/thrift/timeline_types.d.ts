//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
import Int64 = require('node-int64');


/**
 * Sent to notify of new data being available in all the channels whose id matches the 'channelId' regexp
 */
export declare class DbuTimelineDataAvailableNotification {
  channelId: string;
  startCycles: Int64;
  endCycles: Int64;
  dummy: boolean;

    constructor(args?: { channelId: string; startCycles: Int64; endCycles: Int64; dummy: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Sent to notify of a new data channel being available
 */
export declare class DbuTimelineChannelAvailableNotification {
  id: string;
  formatDescriptor: string;

    constructor(args?: { id: string; formatDescriptor: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Sent to notify of a data channel having been removed
 */
export declare class DbuTimelineChannelRemovedNotification {
  id: string;

    constructor(args?: { id: string; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Sent to notify that the CPU frequency has changed
 */
export declare class DbuTimelineCpuClockChangedNotification {
  cyclesPerSecond: Int64;

    constructor(args?: { cyclesPerSecond: Int64; });
  read(input: Object): void;
  write(input: Object): void;
}

/**
 * Sent to notify that the enablement state of all the channels matching the provided id regexp has changed
 */
export declare class DbuTimelineEnablementChangedNotification {
  channelId: string;
  enabled: boolean;

    constructor(args?: { channelId: string; enabled: boolean; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare class TimelineChannelInfo {
  id: string;
  formatDescriptor: string;

    constructor(args?: { id: string; formatDescriptor: string; });
  read(input: Object): void;
  write(input: Object): void;
}

export declare var TIMELINE_FRONTEND_SERVICE: string;

export declare var TIMELINE_BACKEND_SERVICE: string;