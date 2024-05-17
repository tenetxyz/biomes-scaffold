import { ReactElement } from "react";
import { VoxelCoord } from "@latticexyz/utils";
import { TransactionBase, TransactionReceipt, formatEther, isAddress } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { replacer } from "~~/utils/scaffold-eth/common";

export interface Build {
  objectTypeIds: number[];
  relativePositions: VoxelCoord[];
}

export interface BuildWithPos {
  objectTypeIds: number[];
  relativePositions: VoxelCoord[];
  baseWorldCoord: VoxelCoord;
}

export interface Area {
  lowerSouthwestCorner: VoxelCoord;
  size: VoxelCoord;
}

interface LeaderboardEntry {
  player: string;
  balance: bigint;
}

function BuildComponent({ build }: { build: Build | BuildWithPos }) {
  // Function to render VoxelCoords
  const renderVoxelCoord = (coord: VoxelCoord) => (
    <div key={`${coord.x}-${coord.y}-${coord.z}`}>
      <div>
        x: {coord.x}, y: {coord.y}, z: {coord.z}
      </div>
    </div>
  );

  const truncateEntity = (entity: string) => {
    if (!entity || typeof entity !== "string" || entity.length < 10) return entity;
    return `${entity.slice(0, 2)}...${entity.slice(-4)}`;
  };

  return (
    <div style={{ fontFamily: "monospace" }}>
      <div>
        <div>
          <strong style={{ fontSize: "12px" }}>BLOCKS</strong>
        </div>
        {build.objectTypeIds.length > 0 ? (
          <ul>
            {build.objectTypeIds.map((id, index) => (
              <li key={index}>{truncateEntity(id)}</li>
            ))}
          </ul>
        ) : (
          <span>None</span>
        )}
      </div>
      <div>
        <div>
          <strong style={{ fontSize: "12px" }}>CONFIGURATION</strong>
        </div>
        {build.relativePositions.length > 0 ? (
          build.relativePositions.map(pos => renderVoxelCoord(pos))
        ) : (
          <span>None</span>
        )}
      </div>
      {"baseWorldCoord" in build && (
        <div>
          <strong style={{ fontSize: "12px" }}>POSITION</strong>
          {renderVoxelCoord(build.baseWorldCoord)}
        </div>
      )}
    </div>
  );
}

function BuildsComponent({ builds }: { builds: Build[] | BuildWithPos[] }) {
  return (
    <div style={{ maxHeight: "40vh", overflowY: "scroll", fontFamily: "monospace" }}>
      {builds.map((build, index) => (
        <div
          key={index}
          style={{ paddingBottom: "14px", marginBottom: "14px", borderBottom: "1px solid rgb(107, 114, 128)" }}
        >
          <BuildComponent build={build} />
        </div>
      ))}
    </div>
  );
}

function AreaComponent({ area }: { area: Area }) {
  return (
    <div style={{ fontFamily: "monospace" }}>
      <div>
        <div>
          <strong style={{ fontSize: "12px" }}>CORNER</strong>
        </div>
        <div>
          x: {area.lowerSouthwestCorner.x}, y: {area.lowerSouthwestCorner.y}, z: {area.lowerSouthwestCorner.z}
        </div>
      </div>
      <div>
        <div>
          <strong style={{ fontSize: "12px" }}>SIZE</strong>
        </div>
        <div>
          x: {area.size.x}, y: {area.size.y}, z: {area.size.z}
        </div>
      </div>
    </div>
  );
}

function LeaderboardComponent({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const sortedLeaderboard = leaderboard.sort((a, b) => {
    if (a.balance > b.balance) {
      return -1;
    } else if (a.balance < b.balance) {
      return 1;
    } else {
      return 0;
    }
  });
  return (
    <div style={{ fontFamily: "monospace", width: "100%" }}>
      <div style={{ fontFamily: "monospace", width: "100%", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "0.5px solid #ffffff47", padding: "8px", textAlign: "left" }}>Player</th>
              <th style={{ border: "0.5px solid #ffffff47", padding: "8px", textAlign: "left" }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {sortedLeaderboard.map((entry, index) => (
              <tr key={index}>
                <td style={{ border: "0.5px solid #ffffff47", padding: "8px" }}>{displayTxResult(entry.player)}</td>
                <td style={{ border: "0.5px solid #ffffff47", padding: "8px" }}>{formatEther(entry.balance) + " Ξ"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AreasComponent({ areas }: { areas: Area[] }) {
  return (
    <div style={{ maxHeight: "40vh", overflowY: "scroll", fontFamily: "monospace" }}>
      {areas.map((area, index) => (
        <div
          key={index}
          style={{ paddingBottom: "14px", marginBottom: "14px", borderBottom: "1px solid rgb(107 114 128)" }}
        >
          <AreaComponent area={area} />
        </div>
      ))}
    </div>
  );
}

function EntityDisplayComponent({ entity }: { entity: string }) {
  // Function to truncate the entity string
  const truncateEntity = (entity: string) => {
    if (!entity || entity.length < 10) return entity;
    return `${entity.slice(0, 2)}...${entity.slice(-4)}`;
  };

  return (
    <div className="text-md" style={{ fontFamily: "monospace" }}>
      {truncateEntity(entity)}
    </div>
  );
}

function EntitiesComponent({ entities }: { entities: string[] }) {
  return (
    <div style={{ maxHeight: "40vh", overflowY: "scroll", fontFamily: "monospace" }}>
      {entities.map((entity, index) => (
        <div
          key={index}
          style={{ paddingBottom: "8px", marginBottom: "8px", borderBottom: "1px solid rgb(107 114 128)" }}
        >
          <EntityDisplayComponent entity={entity} />
        </div>
      ))}
    </div>
  );
}

const bytes32Regex = /^0x[a-fA-F0-9]{64}$/;

export function isBytes32(value: string) {
  return bytes32Regex.test(value);
}

export function isArrayofBytes32(values: DisplayContent | DisplayContent[]) {
  // Check each element in the array
  if (!Array.isArray(values)) return false;
  return values.every(value => typeof value === "string" && bytes32Regex.test(value));
}

export function isArrayofNumber(values: DisplayContent | DisplayContent[]) {
  // Check each element in the array
  if (!Array.isArray(values)) return false;
  return values.every(value => typeof value === "number");
}

function isVoxelCoord(coord: DisplayContent | DisplayContent[]) {
  // Checks if coord is an object and has x, y, z properties of type number
  if (coord === undefined || coord === null) return false;
  if (typeof coord !== "object") return false;

  return Number.isInteger(coord.x) && Number.isInteger(coord.y) && Number.isInteger(coord.z);
}

export function isValidArea(area: DisplayContent | DisplayContent[]) {
  // Checks if area has the correct structure for lowerSouthwestCorner and size
  if (area === undefined || area === null) return false;
  if (typeof area !== "object") return false;

  return isVoxelCoord(area.lowerSouthwestCorner) && isVoxelCoord(area.size);
}

export function isLeaderboardEntry(entry: DisplayContent | DisplayContent[]) {
  // Checks if entry has the correct structure for address and balance
  if (entry === undefined || entry === null) return false;
  if (typeof entry !== "object") return false;

  return isAddress(entry.player) && typeof entry.balance === "bigint";
}

export function isLeaderboard(leaderboard: DisplayContent | DisplayContent[]) {
  if (leaderboard === undefined || leaderboard === null) return false;
  if (!Array.isArray(leaderboard)) return false;

  return leaderboard.every(isLeaderboardEntry);
}

export function isAreaArray(value: DisplayContent | DisplayContent[]) {
  // Checks if value is an array of valid Area objects
  if (value === undefined || value === null) return false;
  if (!Array.isArray(value)) return false;

  return value.every(isValidArea);
}

// Validates an array of VoxelCoord objects
function areVoxelCoords(coords: DisplayContent | DisplayContent[]) {
  if (coords === undefined || coords === null) return false;
  if (!Array.isArray(coords)) return false;
  return coords.every(isVoxelCoord);
}

// Validates the Build structure
export function isValidBuild(build: DisplayContent | DisplayContent[]) {
  if (build === undefined || build === null) return false;
  if (typeof build !== "object") return false;

  return isArrayofNumber(build.objectTypeIds) && areVoxelCoords(build.relativePositions);
}

export function isValidBuildWithPos(build: DisplayContent | DisplayContent[]) {
  // Validate the base Build structure first
  if (build === undefined || build === null) return false;
  if (!isValidBuild(build)) return false;

  // Check if baseWorldCoord is present. If so, validate it; otherwise, consider it valid.
  const hasValidBaseWorldCoord = "baseWorldCoord" in build ? isVoxelCoord(build.baseWorldCoord) : true;

  return hasValidBaseWorldCoord;
}

export function areValidBuilds(builds: DisplayContent | DisplayContent[]) {
  if (builds === undefined || builds === null) return false;
  if (!Array.isArray(builds)) return false;

  // Check if it's an array and every item is a valid Build
  return builds.every(build => isValidBuild(build));
}

export function areValidBuildsWithPos(builds: DisplayContent | DisplayContent[]) {
  if (builds === undefined || builds === null) return false;
  if (!Array.isArray(builds)) return false;

  // Check if it's an array and every item is a valid BuildWithPos
  return builds.every(build => isValidBuildWithPos(build));
}

export type DisplayContent =
  | string
  | number
  | bigint
  | Record<string, any>
  | TransactionBase
  | TransactionReceipt
  | undefined
  | unknown;

export const displayTxResult = (
  displayContent: DisplayContent | DisplayContent[],
  asText = false,
): string | ReactElement | number => {
  if (displayContent == null) {
    return "";
  }

  if (typeof displayContent === "bigint") {
    try {
      const asNumber = Number(displayContent);
      if (asNumber <= Number.MAX_SAFE_INTEGER && asNumber >= Number.MIN_SAFE_INTEGER) {
        return asNumber;
      } else {
        const truncated = parseFloat(parseFloat(formatEther(displayContent)).toFixed(4));
        return "Ξ " + (truncated === 0 ? displayContent : truncated);
      }
    } catch (e) {
      return "Could not convert to number";
    }
  }

  if (typeof displayContent === "string") {
    if (isBytes32(displayContent)) {
      return <EntityDisplayComponent entity={displayContent} />;
    }

    if (isAddress(displayContent)) {
      return asText ? displayContent : <Address address={displayContent} />;
    }
  }

  if (typeof displayContent === "object") {
    if (isValidArea(displayContent)) {
      return <AreaComponent area={displayContent as Area} />;
    }

    if (isValidBuild(displayContent)) {
      return <BuildComponent build={displayContent as Build} />;
    }

    if (isValidBuildWithPos(displayContent)) {
      return <BuildComponent build={displayContent as BuildWithPos} />;
    }
  }

  if (Array.isArray(displayContent)) {
    if (displayContent.length === 0) {
      return <></>;
    }
    if (isLeaderboard(displayContent)) {
      return <LeaderboardComponent leaderboard={displayContent} />;
    } else if (isAreaArray(displayContent)) {
      return <AreasComponent areas={displayContent} />;
    } else if (isArrayofBytes32(displayContent)) {
      return <EntitiesComponent entities={displayContent} />;
    } else if (areValidBuilds(displayContent)) {
      return <BuildsComponent builds={displayContent} />;
    } else if (areValidBuildsWithPos(displayContent)) {
      return <BuildsComponent builds={displayContent} />;
    } else {
      const mostReadable = (v: DisplayContent) =>
        ["number", "boolean"].includes(typeof v) ? v : displayTxResultAsText(v);
      const displayable = JSON.stringify(displayContent.map(mostReadable), replacer);

      return asText ? (
        displayable
      ) : (
        <span style={{ overflowWrap: "break-word", width: "100%" }}>{displayable.replaceAll(",", ",\n")}</span>
      );
    }
  }

  return JSON.stringify(displayContent, replacer, 2);
};

const displayTxResultAsText = (displayContent: DisplayContent) => displayTxResult(displayContent, true);
