"use client";

import { useEffect, useState } from "react";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { displayTxResult } from "./utilsDisplay";
import {
  areValidBuilds,
  areValidBuildsWithPos,
  isAreaArray,
  isArrayofBytes32,
  isBytes32,
  isValidArea,
  isValidBuild,
  isValidBuildWithPos,
} from "./utilsDisplay";
import { Abi, AbiFunction } from "abitype";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Address } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useAnimationConfig } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getParsedError, notification } from "~~/utils/scaffold-eth";

export function Copy({ result }: { result: unknown }) {
  const [copied, setCopied] = useState(false);
  const resultString = JSON.stringify(result, null, 2);

  return (
    <div>
      {copied ? (
        <div className="flex gap-2 items-center border border-white p-1 cursor-pointer px-2 hover:bg-white hover:text-black hover:border-black">
          <CheckCircleIcon className="text-xl font-normal h-5 w-5 cursor-pointer" aria-hidden="true" />
          <div>Copied</div>
        </div>
      ) : (
        <CopyToClipboard
          text={resultString}
          onCopy={() => {
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 800);
          }}
        >
          <div className="flex gap-2 items-center border border-white p-1 cursor-pointer px-2 hover:bg-white hover:text-black hover:border-black">
            <DocumentDuplicateIcon className="text-xl font-normal h-5 w-5" aria-hidden="true" />
            <div>Copy</div>
          </div>
        </CopyToClipboard>
      )}
    </div>
  );
}

export function BigCopy({ result }: { result: unknown }) {
  const [copied, setCopied] = useState(false);
  const resultString = JSON.stringify(result, null, 2);

  return (
    <div>
      {copied ? (
        <div className="flex gap-2 items-center justify-center w-full cursor-pointer border border-white p-2 font-mono uppercase text-lg transition bg-biomes hover:border-white">
          <CheckCircleIcon className="text-xl font-normal h-6 w-6 cursor-pointer" aria-hidden="true" />
          <div>Copied</div>
        </div>
      ) : (
        <CopyToClipboard
          text={resultString}
          onCopy={() => {
            setCopied(true);
            setTimeout(() => {
              setCopied(false);
            }, 800);
          }}
        >
          <div className="flex gap-2 items-center justify-center w-full cursor-pointer border border-white/20 p-2 font-mono uppercase text-lg transition bg-biomes hover:border-white">
            <DocumentDuplicateIcon className="text-xl font-normal h-6 w-6" aria-hidden="true" />
            <div>Copy</div>
          </div>
        </CopyToClipboard>
      )}
    </div>
  );
}

type DisplayVariableProps = {
  contractAddress: Address;
  abiFunction: AbiFunction;
  refreshDisplayVariables: boolean;
  inheritedFrom?: string;
  abi: Abi;
  poll?: number;
  bigCopy?: boolean;
};

export const DisplayVariable = ({
  contractAddress,
  abiFunction,
  refreshDisplayVariables,
  abi,
  inheritedFrom,
  children,
  poll,
  bigCopy = false,
}: DisplayVariableProps & {
  children?: (props: {
    result: any;
    isFetching: boolean;
    CopyButton: React.ReactNode;
    RefreshButton: React.ReactNode;
  }) => React.ReactNode;
}) => {
  const { targetNetwork } = useTargetNetwork();
  const { address: connectedAddress } = useAccount();

  const {
    data: result,
    isFetching,
    refetch,
    error,
  } = useReadContract({
    address: contractAddress,
    functionName: abiFunction.name,
    abi: abi,
    account: connectedAddress,
    chainId: targetNetwork.id,
    query: {
      retry: false,
    },
  });

  const { showAnimation } = useAnimationConfig(result);

  useEffect(() => {
    refetch();

    if (poll) {
      const interval = setInterval(() => {
        refetch();
      }, poll);
      return () => clearInterval(interval);
    }
  }, [refetch, refreshDisplayVariables]);

  useEffect(() => {
    if (error) {
      const parsedError = getParsedError(error);
      notification.error(parsedError);
    }
  }, [error]);

  // Render Copy button as a component for easy use in children
  const CopyComponent = bigCopy ? BigCopy : Copy;

  const CopyButton =
    isValidArea(result) ||
    isAreaArray(result) ||
    isBytes32(result) ||
    isArrayofBytes32(result) ||
    isValidBuild(result) ||
    isValidBuildWithPos(result) ||
    areValidBuilds(result) ||
    areValidBuildsWithPos(result) ? (
      <CopyComponent result={result} />
    ) : null;

  const RefreshButton = (
    <button className="btn btn-ghost btn-xs" onClick={async () => await refetch()}>
      {!poll && isFetching ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <ArrowPathIcon className="h-3 w-3 cursor-pointer" aria-hidden="true" />
      )}
    </button>
  );

  if (children) {
    return <>{children({ result, isFetching, CopyButton, RefreshButton })}</>;
  }

  return (
    <div className="space-y-1 pb-4">
      <div className="flex items-center">
        <h3 className="font-medium text-md mb-0 break-all">{abiFunction.name}</h3>
        {RefreshButton}
        {CopyButton}
        <InheritanceTooltip inheritedFrom={inheritedFrom} />
      </div>
      <div className="text-gray-500 font-medium flex flex-col items-start">
        <div
          className={`break-all block transition bg-transparent ${
            showAnimation ? "bg-warning rounded-sm animate-pulse-fast" : ""
          }`}
        >
          {displayTxResult(result)}
        </div>
      </div>
    </div>
  );
};
