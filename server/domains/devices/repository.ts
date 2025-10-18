import type { Device, InsertDevice } from "@shared/schema";
import { storage } from "../../storage";

/**
 * Devices Repository
 * Handles all data access for devices domain
 */
export class DeviceRepository {
  
  async findAll(orgId?: string): Promise<Device[]> {
    return storage.getDevices(orgId);
  }
  
  async findById(id: string, orgId?: string): Promise<Device | undefined> {
    return storage.getDevice(id, orgId);
  }
  
  async create(device: InsertDevice): Promise<Device> {
    return storage.createDevice(device);
  }
  
  async update(id: string, data: Partial<InsertDevice>): Promise<Device> {
    return storage.updateDevice(id, data);
  }
  
  async delete(id: string): Promise<void> {
    return storage.deleteDevice(id);
  }
  
  async getDevicesWithStatus(orgId?: string) {
    return storage.getDevicesWithStatus(orgId);
  }
}

// Export singleton instance
export const deviceRepository = new DeviceRepository();
