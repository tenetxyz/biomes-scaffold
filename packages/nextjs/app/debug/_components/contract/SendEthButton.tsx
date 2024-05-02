"use client";

import React from "react";
import { Abi } from "abitype";
import { TransactionReceipt, parseEther, parseGwei } from "viem";
import { useWriteContract } from "wagmi";
import { useTransactor } from "~~/hooks/scaffold-eth";

interface SendEthButton {
  contractAddress: string;
  abi: Abi;
  functionName: string;
  value: string;
  onWrite: (txnReceipt: TransactionReceipt) => void;
}

export const SendEthButton: React.FC<SendEthButton> = ({ contractAddress, abi, functionName, value, onWrite }) => {
  const writeTxn = useTransactor();
  const [isLoading, setIsLoading] = React.useState(false);

  const { writeContractAsync } = useWriteContract();

  const handleWriteTransaction = async () => {
    try {
      setIsLoading(true);
      const makeWriteWithParams = () =>
        writeContractAsync({
          address: contractAddress,
          abi: abi,
          maxFeePerGas: parseGwei("0.01"),
          maxPriorityFeePerGas: parseGwei("0.001"),
          functionName: functionName,
          value: parseEther(value),
        });
      return await writeTxn(makeWriteWithParams, {
        onBlockConfirmation: (txnReceipt: TransactionReceipt) => {
          (async () => {
            await onWrite(txnReceipt);
            setIsLoading(false);
          })();
        },
      });
    } catch (error) {
      console.error("Transaction failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        className="w-full text-center border border-white/20 p-2 font-mono uppercase text-sm transition bg-biomes hover:border-white"
        onClick={() => handleWriteTransaction()}
        disabled={isLoading}
      >
        {" "}
        Send {value} Eth{" "}
      </button>
    </div>
  );
};
