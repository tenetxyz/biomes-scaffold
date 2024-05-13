// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import { Slice, SliceLib } from "@latticexyz/store/src/Slice.sol";

bytes4 constant TRANSFER_SELECTOR = bytes4(keccak256("transfer(bytes32,bytes32,uint8,uint16)"));
bytes4 constant TRANSFER_TOOL_SELECTOR = bytes4(keccak256("transferTool(bytes32,bytes32,bytes32)"));
bytes4 constant DROP_SELECTOR = bytes4(keccak256("drop(uint8,uint16,(uint16,uint16,uint16))"));
bytes4 constant DROP_TOOL_SELECTOR = bytes4(keccak256("dropTool(bytes32,(uint16,uint16,uint16))"));

function decodeCallData(bytes memory callData) pure returns (bytes4, bytes memory) {
  Slice selectorSlice = SliceLib.getSubslice(callData, 0, 4);
  Slice callDataArgs = SliceLib.getSubslice(callData, 4);
  return (bytes4(selectorSlice.toBytes()), callDataArgs.toBytes());
}
