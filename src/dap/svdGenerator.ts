import * as Debugger from "./thrift/bindings/Debugger";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import { create } from "xmlbuilder2";
import { NamedLocation } from "./thrift/bindings/cspy_types";
import { tmpdir } from "os";

// SVD format specification: https://www.keil.com/pack/doc/CMSIS/SVD/html/svd_Format_pg.html
export interface SvdDevice {
    name: string,
    addressUnitBits: number,
    width: number,
    resetValue: string,
    peripherals: {
        peripheral: Array<{
            name: string,
            description: string,
            baseAddress: string,
            registers: { register: Array<SvdRegister> },
        }>,
    };
}
export interface SvdRegister {
    name: string,
    displayName: string,
    description: string,
    addressOffset: string,
    size: number,
    access: string,
    fields: {
        field: Array<{
            name: string,
            description: string,
            lsb: number,
            msb: number,
        }>,
    },
}

// The data we get from cspyserver (e.g. getRegisterGroups, getLocationNames)
interface CspyRegisterData {
    groups: Array<{
        name: string,
        registers: Array<{
            location: NamedLocation;
            fields: Array<NamedLocation>;
        }>;
    }>;
}


/**
 * Functions for generating and handling System View Description (SVD) data to describe a device and its peripherals.
 * Generating this information can be slow, so we try to cache it for when the same device is debugged again.
 */
export class SvdGenerator {
    private cachedSvd: SvdDevice | undefined = undefined;
    // A unique identifier to use when loading or storing cached svd's for this session.
    private readonly cacheId: string;

    /**
     *
     * @param driverOptions
     */
    constructor(driverOptions: string[]) {
        // We identify identical "devices" by hashing all driver options. It might be more accurate to try to parse
        // out e.g. the device-description file, but that would also be more error-prone.
        this.cacheId = crypto.createHash("md5").update(driverOptions.sort().join(", ")).digest("hex");

        if (fs.existsSync(this.getCacheFile())) {
            this.cachedSvd = JSON.parse(fs.readFileSync(this.getCacheFile()).toString());
        }
    }

    /**
     * Generates svd-format data for a device by starting a temporary cspyserver session.
     * The svd data returned will describe the device specified by the supplied launch arguments.
     * The svd data will not necessarily describe the device fully, this function only guarantees correct register information.
     */
    async generateSvd(dbgr: Debugger.Client): Promise<SvdDevice> {
        if (this.cachedSvd !== undefined) {
            return this.cachedSvd;
        }

        // Create a tree of register groups, registers and register fields.
        const groupNames = await dbgr.getRegisterGroups();
        const groups: Array<{name: string, registers: string[]}> = [];
        await Promise.all(groupNames.map(async(group) => {
            // Note that getLocationNamesInGroup is _very_ slow on debug flavored EWs, especially for devices with lots of registers.
            groups.push({name: group, registers: await dbgr.getLocationNamesInGroup(group)});
        }));

        const fieldsInRegisters = new Map<string, string[]>();
        const allLocations = await dbgr.getLocationNames();
        allLocations.forEach(locationName => {
            const parts = locationName.split(".");
            const reg = parts[0];
            const field = parts[1];
            if (!reg || !field) {
                return;
            }
            if (!fieldsInRegisters.has(reg)) {
                fieldsInRegisters.set(reg, []);
            }
            fieldsInRegisters.get(reg)?.push(locationName);
        });

        const rawData: CspyRegisterData = {
            groups: [],
        };

        await Promise.all(groups.map(async(group) => {
            rawData.groups.push({
                name: group.name,
                registers: await Promise.all(group.registers.map(async(reg) => {
                    const fieldNames = fieldsInRegisters.get(reg) ?? [];
                    return {
                        location: await dbgr.getNamedLocation(reg),
                        fields: await Promise.all(fieldNames.map(field => {
                            return dbgr.getNamedLocation(field);
                        })),
                    };
                })),
            });
        }));

        // Remove cpu registers
        const filtered = SvdGenerator.filterRawData(rawData);

        // Format the data into an svd device
        const svdData = SvdGenerator.createSvdDevice(filtered, dbgr);

        this.cachedSvd = await svdData;
        fs.promises.mkdir(path.dirname(this.getCacheFile()), { recursive: true });
        fs.promises.writeFile(this.getCacheFile(), JSON.stringify(this.cachedSvd));

        return svdData;
    }

    /** Create an xml string from an svd device. */
    toSvdXml(svdData: SvdDevice): string {
        const root = create({device: svdData});

        // convert the XML tree to string
        const xml = root.end({ prettyPrint: true });
        return xml;
    }

    private getCacheFile() {
        return path.join(tmpdir(), "iar-vsc-svdcache", this.cacheId + ".json");
    }


    // Filters out CPU registers (only memory-mapped registers can be described in SVD format),
    // and filters out empty groups.
    private static filterRawData(data: CspyRegisterData): CspyRegisterData {
        data.groups.forEach(group => {
            group.registers = group.registers.filter(register => register.location.realLocation.zone.id === 0);
        });
        data.groups = data.groups.filter(group => group.registers.length > 0);
        return data;
    }

    private static async createSvdDevice(data: CspyRegisterData, dbgr: Debugger.Client): Promise<SvdDevice> {
        return {
            name: "Auto-Generated",
            addressUnitBits: (await dbgr.getZoneById(0)).bitsPerUnit,
            width: 32,
            resetValue: "0",
            peripherals: { peripheral: data.groups.map(group => {
                const baseAddress = group.registers.reduce((currentMin, register) => currentMin.compare(register.location.realLocation.address.buffer) === -1 ? currentMin : register.location.realLocation.address.buffer, Buffer.from("ffffffffffffffff", "hex"));
                const baseAddressInt = BigInt("0x" + baseAddress.toString("hex"));
                const registers: SvdRegister[] = group.registers.map(reg => SvdGenerator.createSvdRegister(reg, baseAddressInt));

                return {
                    name: group.name,
                    description: "",
                    baseAddress: "0x" + baseAddress.toString("hex"),
                    registers: { register: registers },
                };
            })},
        };
    }

    private static createSvdRegister(register: { location: NamedLocation, fields: Array<NamedLocation> }, baseAddress: bigint): SvdRegister {
        const addrOffset = BigInt("0x" + register.location.realLocation.address.toString(16)) - baseAddress;
        return {
            name: register.location.name,
            displayName: register.location.nameAlias ? register.location.nameAlias : register.location.name,
            description: register.location.description,
            addressOffset: addrOffset.toString(),
            size: register.location.fullBitSize,
            access: register.location.readonly ? "read-only" : register.location.writeonly ? "write-only" : "read-write",
            fields: { field: register.fields.map(field => {
                let msb: number;
                let lsb: number;
                const usedMasks = field.masks.filter(mask => mask.used);
                if (usedMasks.length > 0) {
                    // cspy supports having multiple bit ranges for a field, but the svd format does not.
                    // Instead we use the largest range that includes all cspy ranges.
                    [lsb, msb] = usedMasks.reduce(([lsb, msb], mask) => {
                        return [Math.min(lsb, SvdGenerator.getLeastSignificantBit(mask.mask.buffer)), Math.max(msb, SvdGenerator.getMostSignificantBit(mask.mask.buffer))];
                    }, [register.location.fullBitSize, 0]);
                } else {
                    lsb = 0;
                    msb = register.location.fullBitSize;
                }
                return {
                    name: field.nameAlias ? field.nameAlias : field.name,
                    description: field.description,
                    msb: msb,
                    lsb: lsb,
                };
            })},
        };
    }

    // Returns the index of the least significant 1 bit in a big-endian integer
    private static getLeastSignificantBit(buffer: Buffer): number {
        for (let byte = 0; byte < buffer.length; byte++) {
            const byteVal = buffer[buffer.length - 1 - byte];
            if (byteVal !== undefined && byteVal !== 0) {
                const lsbVal = byteVal & -byteVal;
                return 8*byte + Math.log2(lsbVal);
            }
        }
        return 0;
    }
    // Returns the index of the most significant 1 bit in a big-endian integer
    private static getMostSignificantBit(buffer: Buffer): number {
        for (let byte = buffer.length - 1; byte >= 0; byte--) {
            const byteVal = buffer[buffer.length - 1 - byte];
            if (byteVal !== undefined && byteVal !== 0) {
                return 8*byte + Math.floor(Math.log2(byteVal));
            }
        }
        return 0;
    }
}