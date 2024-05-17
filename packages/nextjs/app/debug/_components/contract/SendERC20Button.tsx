"use client";

import React, { useEffect } from "react";
import { Abi, parseAbi } from "abitype";
import { TransactionReceipt, parseEther } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

interface SendERC20Button {
  playerAddress: string;
  contractAddress: string;
  abi: Abi;
  functionName: string;
  erc20Address: string;
  erc20Amount: string;
  onWrite: (txnReceipt: TransactionReceipt) => void;
}

export const SendERC20Button: React.FC<SendERC20Button> = ({
  playerAddress,
  contractAddress,
  abi,
  functionName,
  erc20Address,
  erc20Amount,
  onWrite,
}) => {
  const writeTxn = useTransactor();
  const [isLoading, setIsLoading] = React.useState(false);
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [isAllowed, setIsAllowed] = React.useState(false);
  const [erc20Name, setErc20Name] = React.useState<string>("");
  const [erc20Symbol, setErc20Symbol] = React.useState<string>("");

  const { writeContractAsync } = useWriteContract();

  const fetchErc20Info = async () => {
    if (publicClient === undefined) return;

    const name = await publicClient.readContract({
      address: erc20Address,
      abi: parseAbi(["function name() external view returns (string)"]),
      functionName: "name",
    });
    setErc20Name(name);

    const symbol = await publicClient.readContract({
      address: erc20Address,
      abi: parseAbi(["function symbol() external view returns (string)"]),
      functionName: "symbol",
    });
    setErc20Symbol(symbol);
  };

  const checkIsAllowed = async () => {
    // check if the holder has allowed the contract to spend their tokens
    if (publicClient === undefined) return;
    const allowance = await publicClient.readContract({
      address: erc20Address,
      abi: parseAbi(["function allowance(address owner, address spender) external view returns (uint256)"]),
      functionName: "allowance",
      args: [playerAddress, contractAddress],
    });
    setIsAllowed(allowance >= parseEther(erc20Amount));
  };

  useEffect(() => {
    fetchErc20Info();
    checkIsAllowed();
  }, []);

  const handleWriteTransaction = async () => {
    if (publicClient === undefined) return;

    try {
      setIsLoading(true);

      let makeWriteWithParams = undefined;

      if (isAllowed) {
        makeWriteWithParams = () =>
          writeContractAsync({
            address: contractAddress,
            abi: abi,
            functionName: functionName,
          });
      } else {
        makeWriteWithParams = () =>
          writeContractAsync({
            address: erc20Address,
            abi: parseAbi(["function approve(address spender, uint256 amount) external returns (bool)"]),
            functionName: "approve",
            args: [contractAddress, parseEther(erc20Amount)],
          });
      }

      return await writeTxn(makeWriteWithParams, {
        onBlockConfirmation: (txnReceipt: TransactionReceipt) => {
          (async () => {
            await onWrite(txnReceipt);
            if (!isAllowed) {
              await checkIsAllowed();
            }
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
        {isAllowed ? "Send" : "Approve"} {erc20Amount} {erc20Name + " (" + erc20Symbol + ")"}{" "}
      </button>
    </div>
  );
};
