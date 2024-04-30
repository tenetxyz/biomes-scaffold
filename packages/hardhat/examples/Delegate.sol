// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { StoreSwitch } from "@latticexyz/store/src/StoreSwitch.sol";
import { ResourceId, WorldResourceIdLib, WorldResourceIdInstance } from "@latticexyz/world/src/WorldResourceId.sol";
import { Slice, SliceLib } from "@latticexyz/store/src/Slice.sol";
import { Hook } from "@latticexyz/store/src/Hook.sol";
import { IERC165 } from "@latticexyz/world/src/IERC165.sol";
import { ICustomUnregisterDelegation } from "@latticexyz/world/src/ICustomUnregisterDelegation.sol";
import { IOptionalSystemHook } from "@latticexyz/world/src/IOptionalSystemHook.sol";
import { BEFORE_CALL_SYSTEM, AFTER_CALL_SYSTEM, ALL } from "@latticexyz/world/src/systemHookTypes.sol";
import { RESOURCE_SYSTEM } from "@latticexyz/world/src/worldResourceTypes.sol";
import { OptionalSystemHooks } from "@latticexyz/world/src/codegen/tables/OptionalSystemHooks.sol";

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";

contract Delegate is ICustomUnregisterDelegation {
  address public immutable biomeWorldAddress;

  address public delegatorAddress;

  constructor(address _biomeWorldAddress, address _delegatorAddress) {
    biomeWorldAddress = _biomeWorldAddress;

    // Set the store address, so that when reading from MUD tables in the
    // Biomes world, we don't need to pass the store address every time.
    StoreSwitch.setStoreAddress(_biomeWorldAddress);

    delegatorAddress = _delegatorAddress;
  }

  // Use this modifier to restrict access to the Biomes World contract only
  // eg. for hooks that are only allowed to be called by the Biomes World contract
  modifier onlyBiomeWorld() {
    require(msg.sender == biomeWorldAddress, "Caller is not the Biomes World contract");
    _; // Continue execution
  }

  function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
    return interfaceId == type(ICustomUnregisterDelegation).interfaceId || interfaceId == type(IERC165).interfaceId;
  }

  function canUnregister(address delegator) external override onlyBiomeWorld returns (bool) {
    return true;
  }

  // **Note**: This function is just an example and not required to be implemented in your delegate contract
  // It allows the delegatee trigger drops from the delegator
  // ---
  // To use this function, you need to add the following import to the top of the file:
  // import { IDropSystem } from "@biomesaw/world/src/codegen/world/IDropSystem.sol";
  // ---
  // function drop(bytes32 itemInventoryEntityId, VoxelCoord memory dropCoord) external {
  //   bytes32[] memory inventoryEntityIds = new bytes32[](1);
  //   inventoryEntityIds[0] = itemInventoryEntityId;
  //   bytes memory dropCallData = abi.encodeCall(IDropSystem.drop, (inventoryEntityIds, dropCoord));
  //   ResourceId DropSystemId = WorldResourceIdLib.encode({ typeId: RESOURCE_SYSTEM, namespace: "", name: "DropSystem" });
  //   IWorld(biomeWorldAddress).callFrom(delegatorAddress, DropSystemId, dropCallData);
  // }
}
