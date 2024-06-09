/**
 * This file is autogenerated by Scaffold-ETH.
 * You should not edit it manually or your changes might be overwritten.
 */
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const deployedContracts = {
  690: {
    Experience: {
      address: "0xaE5328d1652f59ba257F1138dC1064F58158A613",
      abi: [
        {
          inputs: [],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [],
          name: "basicGetter",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "delegatorAddress",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      inheritedFunctions: {},
    },
  },
  17069: {
    Game: {
      address: "0xaFFFd91f427b81e0e56be9A4b6369f8DE6f24994",
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "_biomeWorldAddress",
              type: "address",
            },
            {
              internalType: "address",
              name: "_delegatorAddress",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: false,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "string",
              name: "message",
              type: "string",
            },
          ],
          name: "GameNotif",
          type: "event",
        },
        {
          inputs: [],
          name: "basicGetter",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "biomeWorldAddress",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "delegator",
              type: "address",
            },
          ],
          name: "canUnregister",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "delegatorAddress",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "getRegisteredPlayers",
          outputs: [
            {
              internalType: "address[]",
              name: "",
              type: "address[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "msgSender",
              type: "address",
            },
            {
              internalType: "ResourceId",
              name: "systemId",
              type: "bytes32",
            },
            {
              internalType: "bytes",
              name: "callData",
              type: "bytes",
            },
          ],
          name: "onAfterCallSystem",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "msgSender",
              type: "address",
            },
            {
              internalType: "ResourceId",
              name: "systemId",
              type: "bytes32",
            },
            {
              internalType: "bytes",
              name: "callData",
              type: "bytes",
            },
          ],
          name: "onBeforeCallSystem",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "msgSender",
              type: "address",
            },
            {
              internalType: "ResourceId",
              name: "systemId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "enabledHooksBitmap",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "callDataHash",
              type: "bytes32",
            },
          ],
          name: "onRegisterHook",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "msgSender",
              type: "address",
            },
            {
              internalType: "ResourceId",
              name: "systemId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "enabledHooksBitmap",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "callDataHash",
              type: "bytes32",
            },
          ],
          name: "onUnregisterHook",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes4",
              name: "interfaceId",
              type: "bytes4",
            },
          ],
          name: "supportsInterface",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      ],
      inheritedFunctions: {
        canUnregister: "@latticexyz/world/src/ICustomUnregisterDelegation.sol",
        supportsInterface: "@latticexyz/world/src/IOptionalSystemHook.sol",
        onAfterCallSystem: "@latticexyz/world/src/IOptionalSystemHook.sol",
        onBeforeCallSystem: "@latticexyz/world/src/IOptionalSystemHook.sol",
        onRegisterHook: "@latticexyz/world/src/IOptionalSystemHook.sol",
        onUnregisterHook: "@latticexyz/world/src/IOptionalSystemHook.sol",
      },
    },
  },
  31337: {
    BuyChest: {
      address: "0xaC47e91215fb80462139756f43438402998E4A3a",
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "_biomeWorldAddress",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "owner",
              type: "address",
            },
          ],
          name: "OwnableInvalidOwner",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "account",
              type: "address",
            },
          ],
          name: "OwnableUnauthorizedAccount",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "bytes",
              name: "data",
              type: "bytes",
            },
            {
              internalType: "uint256",
              name: "start",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "end",
              type: "uint256",
            },
          ],
          name: "Slice_OutOfBounds",
          type: "error",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "previousOwner",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "newOwner",
              type: "address",
            },
          ],
          name: "OwnershipTransferred",
          type: "event",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "srcEntityId",
              type: "bytes32",
            },
            {
              internalType: "bytes32",
              name: "dstEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "transferObjectTypeId",
              type: "uint8",
            },
            {
              internalType: "uint16",
              name: "numToTransfer",
              type: "uint16",
            },
            {
              internalType: "bytes32",
              name: "toolEntityId",
              type: "bytes32",
            },
            {
              internalType: "bytes",
              name: "extraData",
              type: "bytes",
            },
          ],
          name: "allowTransfer",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "biomeWorldAddress",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "buyObjectTypeId",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "newPrice",
              type: "uint256",
            },
          ],
          name: "changeBuyPrice",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "buyObjectTypeId",
              type: "uint8",
            },
          ],
          name: "destroyBuyChest",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "getBalance",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "getFullShopData",
          outputs: [
            {
              components: [
                {
                  internalType: "bytes32",
                  name: "chestEntityId",
                  type: "bytes32",
                },
                {
                  components: [
                    {
                      internalType: "uint8",
                      name: "objectTypeId",
                      type: "uint8",
                    },
                    {
                      internalType: "uint256",
                      name: "price",
                      type: "uint256",
                    },
                  ],
                  internalType: "struct ShopData",
                  name: "shopData",
                  type: "tuple",
                },
                {
                  internalType: "uint256",
                  name: "balance",
                  type: "uint256",
                },
                {
                  internalType: "bool",
                  name: "isSetup",
                  type: "bool",
                },
              ],
              internalType: "struct FullShopData",
              name: "",
              type: "tuple",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "player",
              type: "address",
            },
          ],
          name: "getFullShopData",
          outputs: [
            {
              components: [
                {
                  internalType: "bytes32",
                  name: "chestEntityId",
                  type: "bytes32",
                },
                {
                  components: [
                    {
                      internalType: "uint8",
                      name: "objectTypeId",
                      type: "uint8",
                    },
                    {
                      internalType: "uint256",
                      name: "price",
                      type: "uint256",
                    },
                  ],
                  internalType: "struct ShopData",
                  name: "shopData",
                  type: "tuple",
                },
                {
                  internalType: "uint256",
                  name: "balance",
                  type: "uint256",
                },
                {
                  internalType: "bool",
                  name: "isSetup",
                  type: "bool",
                },
              ],
              internalType: "struct FullShopData[]",
              name: "",
              type: "tuple[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "player",
              type: "address",
            },
          ],
          name: "getOwnedChests",
          outputs: [
            {
              internalType: "bytes32[]",
              name: "",
              type: "bytes32[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "getShopData",
          outputs: [
            {
              components: [
                {
                  internalType: "uint8",
                  name: "objectTypeId",
                  type: "uint8",
                },
                {
                  internalType: "uint256",
                  name: "price",
                  type: "uint256",
                },
              ],
              internalType: "struct ShopData",
              name: "",
              type: "tuple",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "onHookRemoved",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "onHookSet",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "owner",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "buyObjectTypeId",
              type: "uint8",
            },
          ],
          name: "refillBuyChestBalance",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "renounceOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "buyObjectTypeId",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "buyPrice",
              type: "uint256",
            },
          ],
          name: "setupBuyChest",
          outputs: [],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes4",
              name: "interfaceId",
              type: "bytes4",
            },
          ],
          name: "supportsInterface",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "totalFees",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "newOwner",
              type: "address",
            },
          ],
          name: "transferOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
            },
          ],
          name: "withdrawBuyChestBalance",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "withdrawFees",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      inheritedFunctions: {
        allowTransfer: "@biomesaw/world/src/prototypes/IChestTransferHook.sol",
        onHookRemoved: "@biomesaw/world/src/prototypes/IChestTransferHook.sol",
        onHookSet: "@biomesaw/world/src/prototypes/IChestTransferHook.sol",
        supportsInterface: "@biomesaw/world/src/prototypes/IChestTransferHook.sol",
        owner: "@openzeppelin/contracts/access/Ownable.sol",
        renounceOwnership: "@openzeppelin/contracts/access/Ownable.sol",
        transferOwnership: "@openzeppelin/contracts/access/Ownable.sol",
      },
    },
    SellChest: {
      address: "0x9BcC604D4381C5b0Ad12Ff3Bf32bEdE063416BC7",
      abi: [
        {
          inputs: [
            {
              internalType: "address",
              name: "_biomeWorldAddress",
              type: "address",
            },
          ],
          stateMutability: "nonpayable",
          type: "constructor",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "owner",
              type: "address",
            },
          ],
          name: "OwnableInvalidOwner",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "account",
              type: "address",
            },
          ],
          name: "OwnableUnauthorizedAccount",
          type: "error",
        },
        {
          inputs: [
            {
              internalType: "bytes",
              name: "data",
              type: "bytes",
            },
            {
              internalType: "uint256",
              name: "start",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "end",
              type: "uint256",
            },
          ],
          name: "Slice_OutOfBounds",
          type: "error",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "address",
              name: "previousOwner",
              type: "address",
            },
            {
              indexed: true,
              internalType: "address",
              name: "newOwner",
              type: "address",
            },
          ],
          name: "OwnershipTransferred",
          type: "event",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "srcEntityId",
              type: "bytes32",
            },
            {
              internalType: "bytes32",
              name: "dstEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "transferObjectTypeId",
              type: "uint8",
            },
            {
              internalType: "uint16",
              name: "numToTransfer",
              type: "uint16",
            },
            {
              internalType: "bytes32",
              name: "toolEntityId",
              type: "bytes32",
            },
            {
              internalType: "bytes",
              name: "extraData",
              type: "bytes",
            },
          ],
          name: "allowTransfer",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "payable",
          type: "function",
        },
        {
          inputs: [],
          name: "biomeWorldAddress",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "sellObjectTypeId",
              type: "uint8",
            },
          ],
          name: "destroySellChest",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "getFullShopData",
          outputs: [
            {
              components: [
                {
                  internalType: "bytes32",
                  name: "chestEntityId",
                  type: "bytes32",
                },
                {
                  components: [
                    {
                      internalType: "uint8",
                      name: "objectTypeId",
                      type: "uint8",
                    },
                    {
                      internalType: "uint256",
                      name: "price",
                      type: "uint256",
                    },
                  ],
                  internalType: "struct ShopData",
                  name: "shopData",
                  type: "tuple",
                },
                {
                  internalType: "uint256",
                  name: "balance",
                  type: "uint256",
                },
                {
                  internalType: "bool",
                  name: "isSetup",
                  type: "bool",
                },
              ],
              internalType: "struct FullShopData",
              name: "",
              type: "tuple",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "player",
              type: "address",
            },
          ],
          name: "getFullShopData",
          outputs: [
            {
              components: [
                {
                  internalType: "bytes32",
                  name: "chestEntityId",
                  type: "bytes32",
                },
                {
                  components: [
                    {
                      internalType: "uint8",
                      name: "objectTypeId",
                      type: "uint8",
                    },
                    {
                      internalType: "uint256",
                      name: "price",
                      type: "uint256",
                    },
                  ],
                  internalType: "struct ShopData",
                  name: "shopData",
                  type: "tuple",
                },
                {
                  internalType: "uint256",
                  name: "balance",
                  type: "uint256",
                },
                {
                  internalType: "bool",
                  name: "isSetup",
                  type: "bool",
                },
              ],
              internalType: "struct FullShopData[]",
              name: "",
              type: "tuple[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "getShopData",
          outputs: [
            {
              components: [
                {
                  internalType: "uint8",
                  name: "objectTypeId",
                  type: "uint8",
                },
                {
                  internalType: "uint256",
                  name: "price",
                  type: "uint256",
                },
              ],
              internalType: "struct ShopData",
              name: "",
              type: "tuple",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "onHookRemoved",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
          ],
          name: "onHookSet",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "owner",
          outputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "renounceOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes32",
              name: "chestEntityId",
              type: "bytes32",
            },
            {
              internalType: "uint8",
              name: "sellObjectTypeId",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "sellPrice",
              type: "uint256",
            },
          ],
          name: "setupSellChest",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "bytes4",
              name: "interfaceId",
              type: "bytes4",
            },
          ],
          name: "supportsInterface",
          outputs: [
            {
              internalType: "bool",
              name: "",
              type: "bool",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "address",
              name: "newOwner",
              type: "address",
            },
          ],
          name: "transferOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "withdrawFees",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      inheritedFunctions: {
        allowTransfer: "@biomesaw/world/src/prototypes/IChestTransferHook.sol",
        onHookRemoved: "@biomesaw/world/src/prototypes/IChestTransferHook.sol",
        onHookSet: "@biomesaw/world/src/prototypes/IChestTransferHook.sol",
        supportsInterface: "@biomesaw/world/src/prototypes/IChestTransferHook.sol",
        owner: "@openzeppelin/contracts/access/Ownable.sol",
        renounceOwnership: "@openzeppelin/contracts/access/Ownable.sol",
        transferOwnership: "@openzeppelin/contracts/access/Ownable.sol",
      },
    },
  },
} as const;

export default deployedContracts satisfies GenericContractsDeclaration;
