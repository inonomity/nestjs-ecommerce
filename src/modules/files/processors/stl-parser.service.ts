import { Injectable, Logger } from '@nestjs/common';
import { FileAnalysis } from '../entities/file.entity';

/**
 * Basic STL Parser Service
 * Provides simple geometry analysis for STL files
 * For production, consider using a more robust library or external service
 */
@Injectable()
export class StlParserService {
  private readonly logger = new Logger(StlParserService.name);

  /**
   * Parse and analyze STL file buffer
   * Currently provides basic analysis - can be enhanced with proper STL parsing
   */
  async analyzeStl(buffer: Buffer): Promise<FileAnalysis> {
    try {
      const isBinary = this.isBinaryStl(buffer);
      
      if (isBinary) {
        return this.analyzeBinaryStl(buffer);
      } else {
        return this.analyzeAsciiStl(buffer);
      }
    } catch (error) {
      this.logger.error(`STL analysis failed: ${error.message}`);
      return this.getDefaultAnalysis(error.message);
    }
  }

  private isBinaryStl(buffer: Buffer): boolean {
    // Binary STL starts with 80-byte header, then 4-byte triangle count
    // ASCII STL starts with "solid"
    const header = buffer.slice(0, 5).toString('ascii').toLowerCase();
    return !header.startsWith('solid');
  }

  private analyzeBinaryStl(buffer: Buffer): FileAnalysis {
    // Binary STL format:
    // 80 bytes: header
    // 4 bytes: number of triangles (uint32 little-endian)
    // For each triangle (50 bytes each):
    //   12 bytes: normal vector (3 x float32)
    //   36 bytes: 3 vertices (3 x 3 x float32)
    //   2 bytes: attribute byte count

    if (buffer.length < 84) {
      throw new Error('Invalid binary STL: file too small');
    }

    const triangleCount = buffer.readUInt32LE(80);
    const expectedSize = 84 + (triangleCount * 50);

    if (buffer.length < expectedSize) {
      throw new Error('Invalid binary STL: unexpected file size');
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let totalVolume = 0;
    let totalSurfaceArea = 0;

    for (let i = 0; i < triangleCount; i++) {
      const offset = 84 + (i * 50);
      
      // Skip normal (12 bytes)
      // Read 3 vertices
      const vertices: number[][] = [];
      for (let v = 0; v < 3; v++) {
        const vOffset = offset + 12 + (v * 12);
        const x = buffer.readFloatLE(vOffset);
        const y = buffer.readFloatLE(vOffset + 4);
        const z = buffer.readFloatLE(vOffset + 8);
        
        vertices.push([x, y, z]);
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
      }

      // Calculate triangle area using cross product
      const area = this.calculateTriangleArea(vertices);
      totalSurfaceArea += area;

      // Calculate signed volume contribution (for watertight meshes)
      const volume = this.calculateSignedVolume(vertices);
      totalVolume += volume;
    }

    // Convert from mm³ to cm³ (assuming STL is in mm)
    const volumeCm3 = Math.abs(totalVolume) / 1000;
    const surfaceAreaCm2 = totalSurfaceArea / 100;

    return {
      volume: Math.round(volumeCm3 * 100) / 100,
      surfaceArea: Math.round(surfaceAreaCm2 * 100) / 100,
      boundingBox: {
        x: Math.round((maxX - minX) * 100) / 100,
        y: Math.round((maxY - minY) * 100) / 100,
        z: Math.round((maxZ - minZ) * 100) / 100,
      },
      triangleCount,
      isWatertight: totalVolume > 0, // Simplified check
      hasErrors: false,
    };
  }

  private analyzeAsciiStl(buffer: Buffer): FileAnalysis {
    const content = buffer.toString('ascii');
    const lines = content.split('\n');
    
    let triangleCount = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let totalSurfaceArea = 0;
    let totalVolume = 0;
    let currentVertices: number[][] = [];

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('vertex')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 4) {
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          const z = parseFloat(parts[3]);
          
          currentVertices.push([x, y, z]);
          
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          minZ = Math.min(minZ, z);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          maxZ = Math.max(maxZ, z);
        }
      } else if (trimmed.startsWith('endfacet')) {
        if (currentVertices.length === 3) {
          triangleCount++;
          totalSurfaceArea += this.calculateTriangleArea(currentVertices);
          totalVolume += this.calculateSignedVolume(currentVertices);
        }
        currentVertices = [];
      }
    }

    // Convert from mm³ to cm³
    const volumeCm3 = Math.abs(totalVolume) / 1000;
    const surfaceAreaCm2 = totalSurfaceArea / 100;

    return {
      volume: Math.round(volumeCm3 * 100) / 100,
      surfaceArea: Math.round(surfaceAreaCm2 * 100) / 100,
      boundingBox: {
        x: Math.round((maxX - minX) * 100) / 100,
        y: Math.round((maxY - minY) * 100) / 100,
        z: Math.round((maxZ - minZ) * 100) / 100,
      },
      triangleCount,
      isWatertight: totalVolume > 0,
      hasErrors: false,
    };
  }

  private calculateTriangleArea(vertices: number[][]): number {
    // Cross product method for triangle area
    const [v0, v1, v2] = vertices;
    
    const ax = v1[0] - v0[0];
    const ay = v1[1] - v0[1];
    const az = v1[2] - v0[2];
    
    const bx = v2[0] - v0[0];
    const by = v2[1] - v0[1];
    const bz = v2[2] - v0[2];
    
    const cx = ay * bz - az * by;
    const cy = az * bx - ax * bz;
    const cz = ax * by - ay * bx;
    
    return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }

  private calculateSignedVolume(vertices: number[][]): number {
    // Calculate signed volume contribution using the origin
    const [v0, v1, v2] = vertices;
    
    return (
      v0[0] * (v1[1] * v2[2] - v2[1] * v1[2]) +
      v1[0] * (v2[1] * v0[2] - v0[1] * v2[2]) +
      v2[0] * (v0[1] * v1[2] - v1[1] * v0[2])
    ) / 6;
  }

  private getDefaultAnalysis(errorMessage: string): FileAnalysis {
    return {
      volume: 0,
      surfaceArea: 0,
      boundingBox: { x: 0, y: 0, z: 0 },
      triangleCount: 0,
      isWatertight: false,
      hasErrors: true,
      errors: [errorMessage],
    };
  }
}
