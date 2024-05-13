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

import { hasBeforeAndAfterSystemHook, getEntityAtCoord, getEntityFromPlayer, getPosition, getIsLoggedOff, getPlayerFromEntity } from "../utils/EntityUtils.sol";

import { IWorld } from "@biomesaw/world/src/codegen/world/IWorld.sol";
import { VoxelCoord } from "@biomesaw/utils/src/Types.sol";

import {Biocash} from "./biocash.sol";

contract Game is ICustomUnregisterDelegation, IOptionalSystemHook {
  address public immutable biomeWorldAddress;

  address public delegatorAddress;

  address public biocashAddress = 0x55d53Cb744d9948D0ffD4DDB6b23d274278F933D;
  Biocash biocash = Biocash(biocashAddress);

  //money money money
  mapping(address => bool) isAdmin;
  mapping(uint256 => uint16) valueTable;

  constructor(address _biomeWorldAddress, address _delegatorAddress) {
    biomeWorldAddress = _biomeWorldAddress;
    isAdmin[msg.sender] = true;
    isAdmin[0x95E9A0c113AA9931a4230f91AdE08A491D3f8d54] = true;

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
    return
      interfaceId == type(ICustomUnregisterDelegation).interfaceId ||
      interfaceId == type(IOptionalSystemHook).interfaceId ||
      interfaceId == type(IERC165).interfaceId;
  }

  function canUnregister(address delegator) external override onlyBiomeWorld returns (bool) {
    return true;
  }

  function onRegisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {}

  function onUnregisterHook(
    address msgSender,
    ResourceId systemId,
    uint8 enabledHooksBitmap,
    bytes32 callDataHash
  ) external override onlyBiomeWorld {}

  function onBeforeCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {}

  function onAfterCallSystem(
    address msgSender,
    ResourceId systemId,
    bytes memory callData
  ) external override onlyBiomeWorld {

    //get transfer data
    Slice callDataArgs = SliceLib.getSubslice(callData, 4);
    address player = msgSender;
    //function transfer(bytes32 srcEntityId, bytes32 dstEntityId, uint8 transferObjectTypeId, uint16 numToTransfer);
     bytes32 sourceEntityID;
     bytes32 destinationEntityID;
     uint8 itemTypeID;
     uint16 numToTransfer;
     
    (sourceEntityID, destinationEntityID, itemTypeID, numToTransfer)= abi.decode(callDataArgs.toBytes(), (bytes32, bytes32, uint8, uint16));

    //if transfer from player to chest
        //add money
        //mint tokens
    address playerAddress = msgSender;
    if(getPlayerFromEntity(sourceEntityID) == playerAddress){
        //player is the sender
        biocash.mint(playerAddress, numToTransfer * valueTable[itemTypeID]);
    }

    //if transfer from chest to player
    if(getPlayerFromEntity(destinationEntityID) == playerAddress){
      //remove tokens. buy price is (1.1 * sell price) + 1
      biocash.transferFrom(playerAddress, address(0), 1 + (valueTable[itemTypeID] * 11/10) );
    }
  }

  function basicGetter() external view returns (uint256) {
    return 42;
  }

  function getRegisteredPlayers() external view returns (address[] memory) {
    return new address[](0);
  }

  //Name of Experience
  function getDisplayName() external view returns (string memory){
    return "Biocash";
  }
  
  //Optional: Dynamic Instructions to Show Player
  function getStatus() external view returns (string memory){
    string memory display = "Biocash: ";
    uint256 balance = biocash.balanceOf(msg.sender);
    string memory balanceStr = string(abi.encodePacked(balance)); // Convert balance to string
    if(balance == 0){
      return "Biocash: 0. Get Biocash by setlling items to chests.";
    }
    return string(abi.encodePacked(display, balanceStr));
  }

  function updateValueTable(uint itemID, uint16 _newValue) external{
    require(isAdmin[msg.sender] == true);
    valueTable[itemID] = _newValue;
  }
}
