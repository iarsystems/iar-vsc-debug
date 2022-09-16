/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as Q from "q";
import ttypes = require("iar-vsc-common/thrift/bindings/timeline_types");
import DbuTimelineDataAvailableNotification = ttypes.DbuTimelineDataAvailableNotification
import DbuTimelineChannelAvailableNotification = ttypes.DbuTimelineChannelAvailableNotification
import DbuTimelineChannelRemovedNotification = ttypes.DbuTimelineChannelRemovedNotification
import DbuTimelineCpuClockChangedNotification = ttypes.DbuTimelineCpuClockChangedNotification
import DbuTimelineEnablementChangedNotification = ttypes.DbuTimelineEnablementChangedNotification

/**
 * A mock implementation of the timeline window frontend service, which simply discards any messages received.
 * This is needed because some versions of cspyserver become extremely slow to set up sessions when no timeline
 * frontend is available (see VSC-309).
 */
export class TimelineFrontendHandler {
    dataAvailable(_note: DbuTimelineDataAvailableNotification, _partnerNamespace: string): Q.Promise<void> {
        return Q.resolve();
    }

    channelAvailable(_note: DbuTimelineChannelAvailableNotification, _partnerNamespace: string): Q.Promise<void> {
        return Q.resolve();
    }

    channelRemoved(_note: DbuTimelineChannelRemovedNotification, _partnerNamespace: string): Q.Promise<void> {
        return Q.resolve();
    }

    cpuClockChanged(_note: DbuTimelineCpuClockChangedNotification, _partnerNamespace: string): Q.Promise<void> {
        return Q.resolve();
    }

    enablementChanged(_note: DbuTimelineEnablementChangedNotification, _partnerNamespace: string): Q.Promise<void> {
        return Q.resolve();
    }
}