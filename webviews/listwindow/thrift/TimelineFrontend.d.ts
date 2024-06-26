//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { timeline } from "./timeline_types";


/**
 * Listener service for timeline notifications, hosted by the frontend. As we only run a single frontend per session, we must include the partnerId in the communication.
 */
export declare class Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  dataAvailable(note: DbuTimelineDataAvailableNotification, partnerNamespace: string): Q.Promise<void>;

  dataAvailable(note: DbuTimelineDataAvailableNotification, partnerNamespace: string, callback?: (data: void)=>void): void;

  channelAvailable(note: DbuTimelineChannelAvailableNotification, partnerNamespace: string): Q.Promise<void>;

  channelAvailable(note: DbuTimelineChannelAvailableNotification, partnerNamespace: string, callback?: (data: void)=>void): void;

  channelRemoved(note: DbuTimelineChannelRemovedNotification, partnerNamespace: string): Q.Promise<void>;

  channelRemoved(note: DbuTimelineChannelRemovedNotification, partnerNamespace: string, callback?: (data: void)=>void): void;

  cpuClockChanged(note: DbuTimelineCpuClockChangedNotification, partnerNamespace: string): Q.Promise<void>;

  cpuClockChanged(note: DbuTimelineCpuClockChangedNotification, partnerNamespace: string, callback?: (data: void)=>void): void;

  enablementChanged(note: DbuTimelineEnablementChangedNotification, partnerNamespace: string): Q.Promise<void>;

  enablementChanged(note: DbuTimelineEnablementChangedNotification, partnerNamespace: string, callback?: (data: void)=>void): void;
}
