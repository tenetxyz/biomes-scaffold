import React, { useEffect } from "react";
import IWorldAbi from "@biomesaw/world/IWorld.abi.json";
import { resourceToHex } from "@latticexyz/common";
import { garnet, mudFoundry, redstone } from "@latticexyz/common/chains";
import { encodeSystemCalls } from "@latticexyz/world/internal";
import { TransactionReceipt } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

const BIOMES_MAINNET_WORLD_ADDRESS = "0xf75b1b7bdb6932e487c4aa8d210f4a682abeacf0";
const BIOMES_TESTNET_WORLD_ADDRESS = "0x641554ed9d8a6c2c362e6c3fb2835ec2ca4da95c";

interface DelegationButtonProps {
  delegateeAddress: string;
  playerAddress: string;
  delegationRegistered: boolean;
  setDelegationRegistered: (delegationRegistered: boolean) => void;
}

export const BEFORE_CALL_SYSTEM = 1;
export const AFTER_CALL_SYSTEM = 2;
export const BEFORE_AND_AFTER_CALL_SYSTEM = 3;

interface HookButtonProps {
  hookAddress: string;
  playerAddress: string;
  systemIdNames: string[];
  enabledHooksBitmap: number;
  hooksRegistered: boolean;
  setHooksRegistered: (hooksRegistered: boolean) => void;
}

function getBiomesWorldAddress(chainId: number) {
  let useBiomesWorldAddress =
    chainId === redstone.id ? BIOMES_MAINNET_WORLD_ADDRESS : chainId === garnet.id ? BIOMES_TESTNET_WORLD_ADDRESS : "";

  if (chainId === mudFoundry.id) {
    // read local worlds.json file
    const worlds = require("../../../../biomes-contracts/packages/world/worlds.json");
    useBiomesWorldAddress = worlds[chainId].address;
  }

  return useBiomesWorldAddress;
}

export const RegisterHookButton: React.FC<HookButtonProps> = ({
  hookAddress,
  playerAddress,
  systemIdNames,
  enabledHooksBitmap,
  hooksRegistered,
  setHooksRegistered,
}) => {
  const writeTxn = useTransactor();
  const { writeContractAsync } = useWriteContract();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [isLoading, setIsLoading] = React.useState(false);

  const useBiomesWorldAddress = (publicClient && getBiomesWorldAddress(publicClient.chain.id)) || "";

  const anyCallDataHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const registerSystemCalls = systemIdNames.map(systemIdName => {
    const systemId = resourceToHex({
      type: "system",
      namespace: "",
      name: systemIdName,
    });

    return {
      systemId: resourceToHex({
        type: "system",
        namespace: "",
        name: "ExtendedRegistrationSystem",
      }),
      functionName: "registerOptionalSystemHook",
      args: [systemId, hookAddress, enabledHooksBitmap, anyCallDataHash],
    };
  });
  const unRegisterSystemCalls = systemIdNames.map(systemIdName => {
    const systemId = resourceToHex({
      type: "system",
      namespace: "",
      name: systemIdName,
    });

    return {
      systemId: resourceToHex({
        type: "system",
        namespace: "",
        name: "ExtendedRegistrationSystem",
      }),
      functionName: "unregisterOptionalSystemHook",
      args: [systemId, hookAddress, anyCallDataHash],
    };
  });

  const readAllSystemHooks = async () => {
    if (!publicClient) return;

    const readPromises = systemIdNames.map(systemIdName => {
      const systemId = resourceToHex({
        type: "system",
        namespace: "",
        name: systemIdName,
      });

      return publicClient.readContract({
        address: useBiomesWorldAddress,
        abi: IWorldAbi,
        functionName: "getOptionalSystemHooks",
        args: [playerAddress, systemId, anyCallDataHash],
      });
    });
    const playerSystemHooks = await Promise.all(readPromises);
    updatePlayerHasHook(playerSystemHooks);
  };

  const updatePlayerHasHook = (allPlayerSystemHooks: unknown) => {
    for (const playerHooks of allPlayerSystemHooks) {
      const requireHookTableValue = (hookAddress + "0" + enabledHooksBitmap.toString()).toLowerCase();
      const isRegistered = Array.isArray(playerHooks)
        ? playerHooks.some(hookTableValue => hookTableValue.toLowerCase() === requireHookTableValue)
        : false;
      setHooksRegistered(isRegistered);
    }
  };

  useEffect(() => {
    readAllSystemHooks();
  }, []);

  const handleRegisterTransaction = async () => {
    try {
      setIsLoading(true);
      const makeWriteWithParams = () =>
        writeContractAsync({
          address: useBiomesWorldAddress,
          abi: IWorldAbi,
          functionName: "batchCall",
          args: [encodeSystemCalls(IWorldAbi, registerSystemCalls)],
        });
      return await writeTxn(makeWriteWithParams, {
        onBlockConfirmation: (txnReceipt: TransactionReceipt) => {
          (async () => {
            await readAllSystemHooks();
            setIsLoading(false);
          })();
          console.log("Transaction receipt:", txnReceipt);
        },
      });
    } catch (error) {
      console.error("Transaction failed:", error);
      setIsLoading(false);
    }
  };

  const handleUnregisterTransaction = async () => {
    try {
      setIsLoading(true);
      const makeWriteWithParams = () =>
        writeContractAsync({
          address: useBiomesWorldAddress,
          abi: IWorldAbi,
          functionName: "batchCall",
          args: [encodeSystemCalls(IWorldAbi, unRegisterSystemCalls)],
        });
      return await writeTxn(makeWriteWithParams, {
        onBlockConfirmation: (txnReceipt: TransactionReceipt) => {
          (async () => {
            await readAllSystemHooks();
            setIsLoading(false);
          })();
          console.log("Transaction receipt:", txnReceipt);
        },
      });
    } catch (error) {
      console.error("Unregister transaction failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-left space-y-2">
      {hooksRegistered ? (
        <div>
          <button
            className="flex items-center gap-4 border border-white/20 p-2 font-mono uppercase text-sm leading-none transition bg-biomesNeg hover:border-white"
            onClick={handleUnregisterTransaction}
            disabled={isLoading}
          >
            {isLoading ? "Unregistering..." : `Unregister Hook`}
          </button>
        </div>
      ) : (
        <div>
          <button
            className="flex items-center gap-4 border border-white/20 p-2 font-mono uppercase text-sm leading-none transition bg-biomes hover:border-white"
            onClick={handleRegisterTransaction}
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : `Register Hook` + (systemIdNames.length > 1 ? "s" : "")}
          </button>
        </div>
      )}
    </div>
  );
};

export const RegisterDelegationButton: React.FC<DelegationButtonProps> = ({
  delegateeAddress,
  playerAddress,
  delegationRegistered,
  setDelegationRegistered,
}) => {
  const writeTxn = useTransactor();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });

  const useBiomesWorldAddress = (publicClient && getBiomesWorldAddress(publicClient.chain.id)) || "";

  const emptyInitCallData = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const UNLIMITED_DELEGATION = resourceToHex({ type: "system", namespace: "", name: "unlimited" });

  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = React.useState(false);

  const updateDelegateeHasDelegation = async () => {
    if (!publicClient) return;

    const userDelegation = await publicClient.readContract({
      address: useBiomesWorldAddress,
      abi: IWorldAbi,
      functionName: "getUserDelegation",
      args: [playerAddress, delegateeAddress],
    });

    const isDelegated = userDelegation === UNLIMITED_DELEGATION;
    setDelegationRegistered(isDelegated);
  };

  useEffect(() => {
    updateDelegateeHasDelegation();
  }, []);

  const handleRegisterDelegation = async () => {
    try {
      setIsLoading(true);
      const makeWriteWithParams = () =>
        writeContractAsync({
          address: useBiomesWorldAddress,
          abi: IWorldAbi,
          functionName: "registerDelegation",
          args: [delegateeAddress, UNLIMITED_DELEGATION, emptyInitCallData],
        });
      return await writeTxn(makeWriteWithParams, {
        onBlockConfirmation: (txnReceipt: TransactionReceipt) => {
          (async () => {
            await updateDelegateeHasDelegation();
            setIsLoading(false);
          })();
          console.log("Transaction receipt:", txnReceipt);
        },
      });
    } catch (error) {
      console.error("Transaction failed:", error);
      setIsLoading(false);
    }
  };

  const handleUnregisterDelegation = async () => {
    try {
      setIsLoading(true);
      const makeWriteWithParams = () =>
        writeContractAsync({
          address: useBiomesWorldAddress,
          abi: IWorldAbi,
          functionName: "unregisterDelegation",
          args: [delegateeAddress],
        });
      return await writeTxn(makeWriteWithParams, {
        onBlockConfirmation: (txnReceipt: TransactionReceipt) => {
          (async () => {
            await updateDelegateeHasDelegation();
            setIsLoading(false);
          })();
          console.log("Transaction receipt:", txnReceipt);
        },
      });
    } catch (error) {
      console.error("Unregister transaction failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-left space-y-2">
      {delegationRegistered ? (
        <div>
          <button
            className="flex items-center gap-4 border border-white/20 p-2 font-mono uppercase text-sm leading-none transition bg-biomesNeg hover:border-white"
            onClick={handleUnregisterDelegation}
            disabled={isLoading}
          >
            {isLoading ? "Unregistering..." : "Unregister Delegatee"}
          </button>
        </div>
      ) : (
        <div>
          <button
            className="flex items-center gap-4 border border-white/20 p-2 font-mono uppercase text-sm leading-none transition bg-biomes hover:border-white"
            onClick={handleRegisterDelegation}
            disabled={isLoading}
          >
            {isLoading ? "Registering..." : "Register Delegatee"}
          </button>
        </div>
      )}
    </div>
  );
};
